import OpenAI from "openai";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

type ProfileContext = {
  age?: number;
  city?: string;
  country?: string;
  educationTaxonomy?: string;
  targetSectors?: string[];
};

type EvidenceCategory =
  | "education"
  | "experience"
  | "language"
  | "tool"
  | "competency"
  | "goal";

type ExtractedEvidence = {
  id: string;
  category: EvidenceCategory;
  evidence_quote: string;
  competency: string;
  plain_language_label: string;
};

type ExtractedSkill = ExtractedEvidence & {
  skill_label: string;
};

type ExtractedProfile = {
  person_summary: string;
  education: string;
  languages: string[];
  experience_evidence: ExtractedEvidence[];
  extracted_skills: ExtractedSkill[];
};

type SkillCandidate = {
  id: number;
  concept_uri: string;
  preferred_label: string;
  alt_labels: string[] | null;
  skill_type: string | null;
  reuse_level: string | null;
  description: string | null;
  definition: string | null;
  similarity: number;
};

type SkillCandidateSummary = {
  concept_uri: string;
  preferred_label: string;
  similarity: number;
};

type GroundingTrace = {
  evidence_id: string;
  extracted_skill: string;
  evidence_quote: string;
  database_query: string;
  top_skill_candidates: SkillCandidateSummary[];
};

type GroundedSkill = {
  concept_uri: string;
  preferred_label: string;
  plain_language_label: string;
  evidence_quote: string;
  database_query: string;
  top_skill_candidates: SkillCandidateSummary[];
  similarity: number;
  confidence: "strong" | "medium" | "needs_review";
  explanation: string;
  sources: {
    esco_uri: string;
    esco_text: string;
    embedding_search: string;
    llm_evidence_extraction: string;
  };
};

type OccupationRequiredSkill = {
  skill_uri: string;
  skill_label: string;
  relation_types: string[];
  skill_types: string[];
  person_has: boolean;
};

type OccupationPath = {
  occupation_uri: string;
  preferred_label: string;
  relation_types: string[];
  matched_skill_labels: string[];
  required_skills: OccupationRequiredSkill[];
  matched_required_skills: OccupationRequiredSkill[];
  required_skill_count: number;
  matched_skill_count: number;
  essential_skill_count: number;
  matched_essential_skill_count: number;
  skill_coverage: number;
  rank_score: number;
  explanation: string;
};

type OccupationSkillRelation = {
  occupation_uri: string;
  relation_type: string | null;
  skill_type: string | null;
  skill_uri: string;
  skill_label: string | null;
};

type ExplanationItem = {
  concept_uri: string;
  plain_language_label: string;
  explanation: string;
};

type ExplanationResponse = {
  explanations: ExplanationItem[];
};

const extractionSchema = {
  name: "skill_signal_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "person_summary",
      "education",
      "languages",
      "experience_evidence",
      "extracted_skills",
    ],
    properties: {
      person_summary: {
        type: "string",
        description:
          "A short, plain-language summary of the person based only on the interview.",
      },
      education: {
        type: "string",
        description:
          "The education level or training described by the person. Use an empty string if absent.",
      },
      languages: {
        type: "array",
        items: { type: "string" },
      },
      experience_evidence: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "category",
            "evidence_quote",
            "competency",
            "plain_language_label",
          ],
          properties: {
            id: { type: "string" },
            category: {
              type: "string",
              enum: [
                "education",
                "experience",
                "language",
                "tool",
                "competency",
                "goal",
              ],
            },
            evidence_quote: {
              type: "string",
              description:
                "A short exact or near-exact user statement that supports this evidence item.",
            },
            competency: {
              type: "string",
              description:
                "The inferred ability, action, or competency to ground against ESCO.",
            },
            plain_language_label: {
              type: "string",
              description: "A non-technical label the user can understand.",
            },
          },
        },
      },
      extracted_skills: {
        type: "array",
        maxItems: 20,
        description:
          "Every distinct skill the person claims or demonstrates, split as specifically as possible.",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "category",
            "skill_label",
            "evidence_quote",
            "competency",
            "plain_language_label",
          ],
          properties: {
            id: { type: "string" },
            category: {
              type: "string",
              enum: [
                "education",
                "experience",
                "language",
                "tool",
                "competency",
                "goal",
              ],
            },
            skill_label: {
              type: "string",
              description:
                "A concise skill phrase extracted from the person's statement, such as 'phone repair' or 'customer communication'.",
            },
            evidence_quote: {
              type: "string",
              description:
                "A short exact or near-exact user statement that supports this skill.",
            },
            competency: {
              type: "string",
              description:
                "The inferred ability, action, or competency to ground against ESCO.",
            },
            plain_language_label: {
              type: "string",
              description: "A non-technical label the user can understand.",
            },
          },
        },
      },
    },
  },
} as const;

const explanationSchema = {
  name: "skill_signal_explanations",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["explanations"],
    properties: {
      explanations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["concept_uri", "plain_language_label", "explanation"],
          properties: {
            concept_uri: { type: "string" },
            plain_language_label: { type: "string" },
            explanation: {
              type: "string",
              description:
                "One sentence explaining why the user evidence maps to the ESCO skill. Mention the user evidence and ESCO wording, but do not invent facts.",
            },
          },
        },
      },
    },
  },
} as const;

function confidenceFor(similarity: number): GroundedSkill["confidence"] {
  if (similarity >= 0.78) return "strong";
  if (similarity >= 0.65) return "medium";
  return "needs_review";
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((message) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "role" in message &&
        "content" in message
      ) {
        const role = message.role === "assistant" ? "assistant" : "user";
        const content =
          typeof message.content === "string" ? message.content.trim() : "";

        return content ? { role, content } : null;
      }

      return null;
    })
    .filter((message): message is ChatMessage => message !== null)
    .slice(-20);
}

function transcriptFrom(messages: ChatMessage[]) {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
}

function escoText(candidate: SkillCandidate) {
  return candidate.definition || candidate.description || candidate.preferred_label;
}

function fallbackExplanation(skill: GroundedSkill) {
  return `Your evidence says "${skill.evidence_quote}", which is close to the ESCO skill "${skill.preferred_label}".`;
}

function cleanLabel(value: string | null | undefined) {
  return (value || "").trim();
}

function isEssentialSkill(skill: OccupationRequiredSkill) {
  return skill.relation_types.some(
    (relationType) => relationType.trim().toLowerCase() === "essential",
  );
}

function relationSortValue(skill: OccupationRequiredSkill) {
  if (isEssentialSkill(skill)) return 0;
  if (
    skill.relation_types.some(
      (relationType) => relationType.trim().toLowerCase() === "optional",
    )
  ) {
    return 1;
  }

  return 2;
}

function compactOccupationSkills(
  relations: OccupationSkillRelation[],
  personSkillUris: Set<string>,
) {
  const skillsByUri = new Map<string, OccupationRequiredSkill>();

  for (const relation of relations) {
    const existing = skillsByUri.get(relation.skill_uri);
    const relationType = cleanLabel(relation.relation_type);
    const skillType = cleanLabel(relation.skill_type);

    if (existing) {
      if (relationType && !existing.relation_types.includes(relationType)) {
        existing.relation_types.push(relationType);
      }

      if (skillType && !existing.skill_types.includes(skillType)) {
        existing.skill_types.push(skillType);
      }

      continue;
    }

    skillsByUri.set(relation.skill_uri, {
      skill_uri: relation.skill_uri,
      skill_label: cleanLabel(relation.skill_label) || relation.skill_uri,
      relation_types: relationType ? [relationType] : [],
      skill_types: skillType ? [skillType] : [],
      person_has: personSkillUris.has(relation.skill_uri),
    });
  }

  return [...skillsByUri.values()].sort((a, b) => {
    const personHasSort = Number(b.person_has) - Number(a.person_has);
    if (personHasSort !== 0) return personHasSort;

    const relationSort = relationSortValue(a) - relationSortValue(b);
    if (relationSort !== 0) return relationSort;

    return a.skill_label.localeCompare(b.skill_label);
  });
}

async function extractEvidence(openai: OpenAI, messages: ChatMessage[]) {
  const model = process.env.SKILL_PROFILE_MODEL || "gpt-4o-mini";
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You extract portable skills for youth employment profiles. Use only the interview text. Split skill lists into distinct skills. Do not invent credentials, employers, places, or skills. Return JSON that matches the schema.",
      },
      {
        role: "user",
        content: `Extract all distinct skills from this interview transcript. Split combined lists into separate skill items where possible. Use the exact user evidence that supports each skill.\n\n${transcriptFrom(messages)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: extractionSchema,
    },
  });

  return parseJson<ExtractedProfile>(
    completion.choices[0]?.message.content,
    {
      person_summary:
        "The interview did not include enough detail to build a full profile.",
      education: "",
      languages: [],
      experience_evidence: [],
      extracted_skills: [],
    },
  );
}

async function explainSkills(openai: OpenAI, skills: GroundedSkill[]) {
  if (skills.length === 0) return new Map<string, ExplanationItem>();

  const model = process.env.SKILL_PROFILE_MODEL || "gpt-4o-mini";
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Explain ESCO skill mappings for a non-expert youth user. Use only the supplied evidence and ESCO text. Do not add new claims.",
      },
      {
        role: "user",
        content: JSON.stringify(
          skills.map((skill) => ({
            concept_uri: skill.concept_uri,
            user_evidence: skill.evidence_quote,
            esco_skill: skill.preferred_label,
            esco_text: skill.sources.esco_text,
            similarity: skill.similarity,
          })),
        ),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: explanationSchema,
    },
  });

  const payload = parseJson<ExplanationResponse>(
    completion.choices[0]?.message.content,
    { explanations: [] },
  );

  return new Map(
    payload.explanations.map((explanation) => [
      explanation.concept_uri,
      explanation,
    ]),
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
    locale?: unknown;
    context?: ProfileContext;
  } | null;

  const messages = normalizeMessages(body?.messages);
  const locale = typeof body?.locale === "string" ? body.locale : "en";
  const context = body?.context ?? {};

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Add interview messages before generating a profile." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY in web/.env.local." },
      { status: 500 },
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supabase = await createClient();
  const extracted = await extractEvidence(openai, messages);
  const extractedSkillItems =
    extracted.extracted_skills.length > 0
      ? extracted.extracted_skills
      : extracted.experience_evidence.map((item) => ({
          ...item,
          skill_label: item.plain_language_label,
        }));
  const evidenceItems = extractedSkillItems.slice(0, 20);

  const ragQueries = evidenceItems.map(
    (item) => item.skill_label || item.plain_language_label || item.competency,
  );
  const embeddingResponse =
    ragQueries.length > 0
      ? await openai.embeddings.create({
          model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
          input: ragQueries,
        })
      : null;

  const groundedSkills: GroundedSkill[] = [];
  const unmappedEvidence: ExtractedEvidence[] = [];
  const groundingTrace: GroundingTrace[] = [];
  const seenSkillUris = new Set<string>();

  for (const [index, item] of evidenceItems.entries()) {
    const embedding = embeddingResponse?.data[index]?.embedding;

    if (!embedding) {
      unmappedEvidence.push(item);
      continue;
    }

    const { data, error } = await supabase.rpc("match_esco_skills", {
      query_embedding: `[${embedding.join(",")}]`,
      match_count: 3,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const candidates = (data ?? []) as SkillCandidate[];
    const topSkillCandidates = candidates.map((candidate) => ({
      concept_uri: candidate.concept_uri,
      preferred_label: candidate.preferred_label,
      similarity: candidate.similarity,
    }));

    groundingTrace.push({
      evidence_id: item.id,
      extracted_skill: item.skill_label,
      evidence_quote: item.evidence_quote,
      database_query: ragQueries[index],
      top_skill_candidates: topSkillCandidates,
    });

    const candidate = candidates[0];

    if (!candidate || candidate.similarity < 0.45) {
      unmappedEvidence.push(item);
      continue;
    }

    if (seenSkillUris.has(candidate.concept_uri)) {
      continue;
    }

    seenSkillUris.add(candidate.concept_uri);
    groundedSkills.push({
      concept_uri: candidate.concept_uri,
      preferred_label: candidate.preferred_label,
      plain_language_label: item.plain_language_label,
      evidence_quote: item.evidence_quote,
      database_query: ragQueries[index],
      top_skill_candidates: topSkillCandidates,
      similarity: candidate.similarity,
      confidence: confidenceFor(candidate.similarity),
      explanation: "",
      sources: {
        esco_uri: candidate.concept_uri,
        esco_text: escoText(candidate),
        embedding_search: `Embedded this extracted skill and sent it to the ESCO skills vector database: ${ragQueries[index]}`,
        llm_evidence_extraction:
          "The LLM extracted this skill from the interview transcript; ESCO matching was done separately by embedding search.",
      },
    });
  }

  const explanations = await explainSkills(openai, groundedSkills);
  const skills = groundedSkills.map((skill) => {
    const explanation = explanations.get(skill.concept_uri);

    return {
      ...skill,
      plain_language_label:
        explanation?.plain_language_label || skill.plain_language_label,
      explanation: explanation?.explanation || fallbackExplanation(skill),
    };
  });

  const acceptedSkillUris = skills
    .slice(0, 8)
    .map((skill) => skill.concept_uri);
  const personSkillUris = new Set(acceptedSkillUris);
  const skillSimilarityByUri = new Map(
    skills.map((skill) => [skill.concept_uri, skill.similarity]),
  );

  const occupationPaths: OccupationPath[] = [];

  if (acceptedSkillUris.length > 0) {
    const { data, error } = await supabase.rpc("get_esco_occupations_for_skills", {
      skill_uris: acceptedSkillUris,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const occupationCandidates = ((data ?? []) as Array<{
      occupation_uri: string;
      preferred_label: string;
      relation_types: string[] | null;
      matched_skill_labels: string[] | null;
      relation_rank: number | null;
    }>);
    const occupationUris = [
      ...new Set(
        occupationCandidates.map((occupation) => occupation.occupation_uri),
      ),
    ];

    if (occupationUris.length > 0) {
      const relationRows: OccupationSkillRelation[] = [];
      const relationsByOccupation = new Map<string, OccupationSkillRelation[]>();

      for (let index = 0; index < occupationUris.length; index += 100) {
        const occupationUriChunk = occupationUris.slice(index, index + 100);
        const { data: relationData, error: relationError } = await supabase
          .from("esco_occupation_skill_relations")
          .select(
            "occupation_uri, relation_type, skill_type, skill_uri, skill_label",
          )
          .in("occupation_uri", occupationUriChunk);

        if (relationError) {
          return NextResponse.json(
            { error: relationError.message },
            { status: 500 },
          );
        }

        relationRows.push(
          ...((relationData ?? []) as OccupationSkillRelation[]),
        );
      }

      for (const relation of relationRows) {
        const relations = relationsByOccupation.get(relation.occupation_uri) ?? [];
        relations.push(relation);
        relationsByOccupation.set(relation.occupation_uri, relations);
      }

      occupationPaths.push(
        ...occupationCandidates
          .map((occupation) => {
            const requiredSkills = compactOccupationSkills(
              relationsByOccupation.get(occupation.occupation_uri) ?? [],
              personSkillUris,
            );
            const matchedRequiredSkills = requiredSkills.filter(
              (skill) => skill.person_has,
            );
            const essentialSkills = requiredSkills.filter(isEssentialSkill);
            const matchedEssentialSkills =
              matchedRequiredSkills.filter(isEssentialSkill);
            const requiredSkillCount = requiredSkills.length;
            const matchedSkillCount = matchedRequiredSkills.length;
            const skillCoverage =
              requiredSkillCount > 0
                ? matchedSkillCount / requiredSkillCount
                : 0;
            const matchedSimilarity = matchedRequiredSkills.reduce(
              (sum, skill) => sum + (skillSimilarityByUri.get(skill.skill_uri) ?? 0),
              0,
            );
            const relationRank = occupation.relation_rank ?? 2;
            const rankScore =
              matchedSkillCount * 100 +
              matchedEssentialSkills.length * 25 +
              skillCoverage * 10 +
              matchedSimilarity -
              relationRank;

            return {
              occupation_uri: occupation.occupation_uri,
              preferred_label: occupation.preferred_label,
              relation_types: occupation.relation_types ?? [],
              matched_skill_labels: matchedRequiredSkills.map(
                (skill) => skill.skill_label,
              ),
              required_skills: requiredSkills,
              matched_required_skills: matchedRequiredSkills,
              required_skill_count: requiredSkillCount,
              matched_skill_count: matchedSkillCount,
              essential_skill_count: essentialSkills.length,
              matched_essential_skill_count: matchedEssentialSkills.length,
              skill_coverage: skillCoverage,
              rank_score: rankScore,
              explanation: `Ranked here because the person has ${matchedSkillCount} of ${requiredSkillCount || "the listed"} ESCO skills for this job, including ${matchedEssentialSkills.length} essential skill${matchedEssentialSkills.length === 1 ? "" : "s"}.`,
            };
          })
          .sort((a, b) => {
            if (b.matched_skill_count !== a.matched_skill_count) {
              return b.matched_skill_count - a.matched_skill_count;
            }

            if (
              b.matched_essential_skill_count !==
              a.matched_essential_skill_count
            ) {
              return (
                b.matched_essential_skill_count -
                a.matched_essential_skill_count
              );
            }

            if (b.skill_coverage !== a.skill_coverage) {
              return b.skill_coverage - a.skill_coverage;
            }

            if (b.rank_score !== a.rank_score) {
              return b.rank_score - a.rank_score;
            }

            return a.preferred_label.localeCompare(b.preferred_label);
          })
          .slice(0, 8),
      );
    }
  }

  return NextResponse.json({
    person_summary: extracted.person_summary,
    education: extracted.education,
    languages: extracted.languages,
    extracted_skills: evidenceItems,
    experience_evidence: evidenceItems.map((item) => ({
      ...item,
      mapped: skills.some((skill) => skill.evidence_quote === item.evidence_quote),
    })),
    unmapped_evidence: unmappedEvidence,
    grounding_trace: groundingTrace,
    skills,
    occupation_paths: occupationPaths,
    export_metadata: {
      generated_at: new Date().toISOString(),
      locale,
      context,
      engine_version: "skill-engine-v1",
      grounding:
        "LLM extracts distinct skills and explanations; each extracted skill is sent to the ESCO vector search with match_count = 3, and ESCO skill IDs are selected from those grounded candidates.",
    },
  });
}
