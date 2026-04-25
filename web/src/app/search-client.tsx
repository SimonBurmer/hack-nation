"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

type RequiredSurveyField =
  | "age"
  | "location"
  | "languages"
  | "work_authorization"
  | "educational_level"
  | "favorite_skill"
  | "years_experience_total"
  | "skill_confidence"
  | "informal_experience"
  | "demonstrated_competencies";

type SurveyData = {
  age: number | null;
  location: string;
  languages: string[];
  work_authorization: string;
  availability: string;
  work_mode_preference: string;
  educational_level: string;
  target_outcome: string;
  target_roles: string[];
  target_industries: string[];
  time_horizon: string;
  priority_tradeoff: string;
  favorite_skill: string;
  current_role_title: string;
  current_industry: string;
  years_experience_total: string;
  years_experience_domain: string;
  skill_confidence: string;
  seniority_level: string;
  team_lead_experience: string;
  key_responsibilities: string[];
  informal_experience: string;
  demonstrated_competencies: string[];
  skills: string[];
};

type IntakeAnalysis = SurveyData & {
  missing_fields: RequiredSurveyField[];
  assistant_message: string;
  user_requested_result: boolean;
  ready_to_generate: boolean;
  error?: string;
};

type CalculationStage = "idle" | "collected" | "extracting" | "grounding" | "done";
type ViewPhase = "chat" | "loading" | "results";

type EvidenceItem = {
  id: string;
  category: string;
  skill_label?: string;
  evidence_quote: string;
  competency: string;
  plain_language_label: string;
  mapped?: boolean;
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
  required_skills?: OccupationRequiredSkill[];
  matched_required_skills?: OccupationRequiredSkill[];
  required_skill_count?: number;
  matched_skill_count?: number;
  essential_skill_count?: number;
  matched_essential_skill_count?: number;
  skill_coverage?: number;
  matched_similarity?: number;
  relation_rank?: number;
  rank_score?: number;
  explanation: string;
};

type SkillProfile = {
  person_summary: string;
  education: string;
  languages: string[];
  extracted_skills?: EvidenceItem[];
  experience_evidence: EvidenceItem[];
  unmapped_evidence: EvidenceItem[];
  grounding_trace: Array<{
    evidence_id: string;
    extracted_skill?: string;
    evidence_quote: string;
    database_query: string;
    top_skill_candidates: Array<{
      concept_uri: string;
      preferred_label: string;
      similarity: number;
    }>;
  }>;
  occupation_paths: OccupationPath[];
  export_metadata: {
    generated_at: string;
    locale: string;
    context: Record<string, unknown>;
    engine_version: string;
    grounding: string;
  };
  error?: string;
};

const emptySurveyData: SurveyData = {
  age: null,
  location: "",
  languages: [],
  work_authorization: "",
  availability: "",
  work_mode_preference: "",
  educational_level: "",
  target_outcome: "",
  target_roles: [],
  target_industries: [],
  time_horizon: "",
  priority_tradeoff: "",
  favorite_skill: "",
  current_role_title: "",
  current_industry: "",
  years_experience_total: "",
  years_experience_domain: "",
  skill_confidence: "",
  seniority_level: "",
  team_lead_experience: "",
  key_responsibilities: [],
  informal_experience: "",
  demonstrated_competencies: [],
  skills: [],
};

const firstSurveyPrompt =
  "Hi. What kind of work would you enjoy, and what have you done before? Share anything useful; I will ask only for what is missing.";

const amaraDemoMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: firstSurveyPrompt,
  },
  {
    role: "user",
    content:
      "I am 22 and live outside Accra in Ghana. I speak English fluently and Twi conversationally. I can work locally and remotely. I finished senior high school. I have 2 years of hands-on repair experience. My most fun skill is phone repair. I feel confident with phone repair 4 out of 5. I helped family and neighbors fix phones informally, and I can show that I diagnosed charging problems, replaced screens, talked to customers, kept records of parts and payments, and wrote basic HTML and JavaScript.",
  },
];

const amaraSurveyData: SurveyData = {
  age: 22,
  location: "Accra, Ghana",
  languages: ["English fluent", "Twi conversational"],
  work_authorization: "Can work locally and remotely",
  availability: "",
  work_mode_preference: "local or remote",
  educational_level: "senior high school",
  target_outcome: "",
  target_roles: [],
  target_industries: [],
  time_horizon: "",
  priority_tradeoff: "",
  favorite_skill: "phone repair",
  current_role_title: "",
  current_industry: "repair services",
  years_experience_total: "2 years",
  years_experience_domain: "2 years in phone repair",
  skill_confidence: "phone repair 4/5",
  seniority_level: "",
  team_lead_experience: "",
  key_responsibilities: [
    "diagnosing charging problems",
    "replacing screens",
    "customer communication",
    "keeping records of parts and payments",
  ],
  informal_experience: "helped family and neighbors fix phones informally",
  demonstrated_competencies: [
    "diagnosing charging problems",
    "replacing screens",
    "customer communication",
    "keeping records of parts and payments",
    "basic HTML and JavaScript coding",
  ],
  skills: [
    "phone repair",
    "diagnosing charging problems",
    "replacing screens",
    "customer communication",
    "keeping records of parts and payments",
    "basic HTML and JavaScript coding",
  ],
};

const requiredFieldLabels: Record<RequiredSurveyField, string> = {
  age: "Age",
  location: "Location",
  languages: "Languages",
  work_authorization: "Work authorization",
  educational_level: "Education",
  favorite_skill: "Favorite skill",
  years_experience_total: "Experience",
  skill_confidence: "Skill confidence",
  informal_experience: "Informal experience",
  demonstrated_competencies: "Demonstrated competencies",
};

const requiredFieldKeys: RequiredSurveyField[] = [
  "age",
  "location",
  "languages",
  "work_authorization",
  "educational_level",
  "favorite_skill",
  "years_experience_total",
  "skill_confidence",
  "informal_experience",
  "demonstrated_competencies",
];

function missingSurveyFields(data: SurveyData): RequiredSurveyField[] {
  return [
    !data.age ? "age" : "",
    !data.location ? "location" : "",
    (data.languages?.length ?? 0) === 0 ? "languages" : "",
    !data.work_authorization ? "work_authorization" : "",
    !data.educational_level ? "educational_level" : "",
    !data.favorite_skill ? "favorite_skill" : "",
    !data.years_experience_total ? "years_experience_total" : "",
    !data.skill_confidence ? "skill_confidence" : "",
    !data.informal_experience ? "informal_experience" : "",
    (data.demonstrated_competencies?.length ?? 0) === 0
      ? "demonstrated_competencies"
      : "",
  ].filter(Boolean) as RequiredSurveyField[];
}

function promptForMissingFields(data: SurveyData) {
  const missing = missingSurveyFields(data);

  if (missing.length === 0) {
    return "Thanks. I have the important intake data. I am generating the analysis now.";
  }

  return `Thanks. I still need: ${missing
    .slice(0, 3)
    .map((field) => requiredFieldLabels[field])
    .join(", ")}.`;
}

function messagesForProfile(messages: ChatMessage[], data: SurveyData) {
  const skillsText = (data.skills ?? []).join(", ");
  const competenciesText = (data.demonstrated_competencies ?? []).join(", ");

  return [
    ...messages,
    {
      role: "assistant" as const,
      content:
        "Structured skill discovery intake captured for grounding.",
    },
    {
      role: "user" as const,
      content: [
        `Age: ${data.age ?? "unknown"}.`,
        `Location: ${data.location || "unknown"}.`,
        `Languages: ${(data.languages ?? []).join(", ") || "unknown"}.`,
        `Work authorization: ${data.work_authorization || "unknown"}.`,
        `Availability: ${data.availability || "unknown"}.`,
        `Work mode preference: ${data.work_mode_preference || "unknown"}.`,
        `Educational level: ${data.educational_level || "unknown"}.`,
        `Target outcome: ${data.target_outcome || "unknown"}.`,
        `Target roles: ${(data.target_roles ?? []).join(", ") || "unknown"}.`,
        `Target industries: ${
          (data.target_industries ?? []).join(", ") || "unknown"
        }.`,
        `Time horizon: ${data.time_horizon || "unknown"}.`,
        `Priority tradeoff: ${data.priority_tradeoff || "unknown"}.`,
        `Favorite skill: ${data.favorite_skill || "unknown"}.`,
        `Current role: ${data.current_role_title || "unknown"}.`,
        `Current industry: ${data.current_industry || "unknown"}.`,
        `Total years experience: ${data.years_experience_total || "unknown"}.`,
        `Domain years experience: ${data.years_experience_domain || "unknown"}.`,
        `Skill confidence: ${data.skill_confidence || "unknown"}.`,
        `Seniority: ${data.seniority_level || "unknown"}.`,
        `Team lead experience: ${data.team_lead_experience || "unknown"}.`,
        `Key responsibilities: ${
          (data.key_responsibilities ?? []).join(", ") || "unknown"
        }.`,
        `Informal experience: ${data.informal_experience || "unknown"}.`,
        `Demonstrated competencies: ${competenciesText || "unknown"}.`,
        `Raw user-mentioned skills: ${skillsText || "unknown"}.`,
      ].join("\n"),
    },
  ];
}

function formatScoreValue(value: number | undefined, digits = 2) {
  return typeof value === "number" ? value.toFixed(digits) : "-";
}

function formatCoverageValue(value: number | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function formatCoveragePercent(value: number | undefined) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "-";
}

function listText(items: string[]) {
  return items.join(", ");
}

function requiredFieldValue(data: SurveyData, field: RequiredSurveyField) {
  switch (field) {
    case "age":
      return data.age ? String(data.age) : "";
    case "location":
      return data.location;
    case "languages":
      return listText(data.languages ?? []);
    case "work_authorization":
      return data.work_authorization;
    case "educational_level":
      return data.educational_level;
    case "favorite_skill":
      return data.favorite_skill;
    case "years_experience_total":
      return data.years_experience_total;
    case "skill_confidence":
      return data.skill_confidence;
    case "informal_experience":
      return data.informal_experience;
    case "demonstrated_competencies":
      return listText(data.demonstrated_competencies ?? []);
  }
}

export function SearchClient() {
  const [profileMessages, setProfileMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: firstSurveyPrompt },
  ]);
  const [surveyData, setSurveyData] = useState<SurveyData>(emptySurveyData);
  const [profileInput, setProfileInput] = useState("");
  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [error, setError] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [calculationStage, setCalculationStage] =
    useState<CalculationStage>("idle");
  const [viewPhase, setViewPhase] = useState<ViewPhase>("chat");
  const [isAnalyzingIntake, setIsAnalyzingIntake] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);

  const profileJson = useMemo(() => {
    return profile ? JSON.stringify(profile, null, 2) : "";
  }, [profile]);
  const surveyMissing = missingSurveyFields(surveyData);

  async function addInterviewMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = profileInput.trim();
    if (!content || isAnalyzingIntake || isGeneratingProfile) return;

    const userMessage: ChatMessage = { role: "user", content };
    const draftMessages = [...profileMessages, userMessage];

    setProfileMessages(draftMessages);
    setProfileInput("");
    setProfile(null);
    setProfileStatus("Reading your message and updating the collected data.");
    setError("");
    setIsAnalyzingIntake(true);
    setCalculationStage("idle");
    setViewPhase("chat");

    try {
      const response = await fetch("/api/skill-profile/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentData: surveyData,
          latestMessage: content,
          messages: draftMessages,
        }),
      });
      const payload = (await response.json()) as IntakeAnalysis;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not analyze the message.");
      }

      const nextSurveyData: SurveyData = {
        age: payload.age,
        location: payload.location,
        languages: payload.languages,
        work_authorization: payload.work_authorization,
        availability: payload.availability,
        work_mode_preference: payload.work_mode_preference,
        educational_level: payload.educational_level,
        target_outcome: payload.target_outcome,
        target_roles: payload.target_roles,
        target_industries: payload.target_industries,
        time_horizon: payload.time_horizon,
        priority_tradeoff: payload.priority_tradeoff,
        favorite_skill: payload.favorite_skill,
        current_role_title: payload.current_role_title,
        current_industry: payload.current_industry,
        years_experience_total: payload.years_experience_total,
        years_experience_domain: payload.years_experience_domain,
        skill_confidence: payload.skill_confidence,
        seniority_level: payload.seniority_level,
        team_lead_experience: payload.team_lead_experience,
        key_responsibilities: payload.key_responsibilities,
        informal_experience: payload.informal_experience,
        demonstrated_competencies: payload.demonstrated_competencies,
        skills: payload.skills,
      };
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: payload.assistant_message,
      };
      const nextMessages = [...draftMessages, assistantMessage];

      setSurveyData(nextSurveyData);
      setProfileMessages(nextMessages);
      setProfileStatus("");

      if (payload.ready_to_generate) {
        setCalculationStage("collected");
        setViewPhase("loading");
        void generateProfile(
          nextMessages,
          nextSurveyData,
          payload.user_requested_result,
        );
      } else {
        setCalculationStage("idle");
        setViewPhase("chat");
      }
    } catch (intakeError) {
      const message =
        intakeError instanceof Error
          ? intakeError.message
          : "Could not analyze the message.";

      setProfileMessages([
        ...draftMessages,
        {
          role: "assistant",
          content:
            "I could not read that message reliably. Please send the missing details again, for example: age 27, Hamburg Germany, German C1, EU work permit, bachelor, 3 years experience, favorite skill data analysis.",
        },
      ]);
      setProfileStatus("");
      setError(message);
    } finally {
      setIsAnalyzingIntake(false);
    }
  }

  async function generateProfile(
    messages = profileMessages,
    data = surveyData,
    allowIncomplete = false,
  ) {
    if (!allowIncomplete && missingSurveyFields(data).length > 0) {
      setProfileStatus(promptForMissingFields(data));
      return;
    }

    setError("");
    setViewPhase("loading");
    setCalculationStage("extracting");
    setProfileStatus("Important intake data is collected. Calculating the profile now.");
    setIsGeneratingProfile(true);

    try {
      window.setTimeout(() => {
        setCalculationStage((stage) =>
          stage === "extracting" ? "grounding" : stage,
        );
        setProfileStatus(
          "Calculating: the LLM is extracting skills, then RAG is querying ESCO for the top 3 matches per skill.",
        );
      }, 600);

      const response = await fetch("/api/skill-profile/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForProfile(messages, data),
          locale: "en",
          context: {
            age: data.age,
            location: data.location,
            languages: data.languages,
            workAuthorization: data.work_authorization,
            education: data.educational_level,
            favoriteSkill: data.favorite_skill,
            yearsExperienceTotal: data.years_experience_total,
            skillConfidence: data.skill_confidence,
            informalExperience: data.informal_experience,
            demonstratedCompetencies: data.demonstrated_competencies,
            rawSkills: data.skills,
            targetRoles: data.target_roles,
            targetSectors: ["repair services", "digital work", "customer service"],
          },
        }),
      });
      const payload = (await response.json()) as SkillProfile;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Profile generation failed.");
      }

      setProfile(payload);
      setCalculationStage("done");
      setViewPhase("results");
      setProfileStatus("Profile generated. Review low-confidence skills before sharing.");
    } catch (profileError) {
      setProfile(null);
      setCalculationStage("idle");
      setViewPhase("chat");
      setProfileStatus("");
      setError(
        profileError instanceof Error
          ? profileError.message
          : "Profile generation failed.",
      );
    } finally {
      setIsGeneratingProfile(false);
    }
  }

  function loadAmaraDemo() {
    setProfile(null);
    setError("");
    setIsAnalyzingIntake(false);
    setCalculationStage("collected");
    setViewPhase("loading");
    setSurveyData(amaraSurveyData);
    setProfileMessages([
      ...amaraDemoMessages,
      {
        role: "assistant",
        content:
          "Thanks. I have the important intake data. I am generating the analysis now.",
      },
    ]);
    void generateProfile(amaraDemoMessages, amaraSurveyData);
  }

  async function copyProfileJson() {
    if (!profileJson) return;
    await navigator.clipboard.writeText(profileJson);
    setProfileStatus("Portable profile JSON copied.");
  }

  function downloadProfileJson() {
    if (!profileJson) return;

    const blob = new Blob([profileJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "skills-profile.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function viewProfileJson() {
    if (!profileJson) return;

    const blob = new Blob([profileJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function resetSurvey() {
    setProfile(null);
    setProfileStatus("");
    setError("");
    setIsAnalyzingIntake(false);
    setIsGeneratingProfile(false);
    setCalculationStage("idle");
    setViewPhase("chat");
    setSurveyData(emptySurveyData);
    setProfileMessages([{ role: "assistant", content: firstSurveyPrompt }]);
    setProfileInput("");
  }

  function renderLoadingScreen() {
    return (
      <section className="mx-auto grid min-h-[34rem] w-full max-w-4xl place-items-center rounded-md border border-stone-300 bg-white px-5 py-10 shadow-sm">
        <div className="w-full max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            Data collected
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-stone-950">
            Building the portable skills profile
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600">
            The engine is asking the LLM to extract all skills, querying ESCO
            for the top 3 matches per extracted skill, and preparing
            explanations that a non-expert user can understand.
          </p>

          <div className="relative mx-auto mt-8 h-40 w-40">
            <div className="absolute inset-0 rounded-full border-8 border-stone-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-8 border-transparent border-t-teal-700 border-r-amber-400" />
            <div className="absolute inset-8 rounded-full border border-stone-200 bg-[#f7f8f5]" />
            <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-teal-900">
              ESCO
            </div>
          </div>

          <div className="mt-8 grid gap-2 text-sm sm:grid-cols-3">
            <span className="rounded border border-teal-300 bg-teal-50 px-3 py-2 font-medium text-teal-950">
              Important intake captured
            </span>
            <span
              className={`rounded border px-3 py-2 font-medium ${
                ["extracting", "grounding", "done"].includes(calculationStage)
                  ? "border-teal-300 bg-teal-50 text-teal-950"
                  : "border-stone-300 bg-stone-100 text-stone-600"
              }`}
            >
              LLM extracts skills
            </span>
            <span
              className={`rounded border px-3 py-2 font-medium ${
                ["grounding", "done"].includes(calculationStage)
                  ? "border-teal-300 bg-teal-50 text-teal-950"
                  : "border-stone-300 bg-stone-100 text-stone-600"
              }`}
            >
              RAG finds ESCO top 3
            </span>
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full w-3/4 animate-pulse rounded-full bg-teal-700" />
          </div>

          {profileStatus ? (
            <p className="mt-4 text-sm font-medium text-stone-700">
              {profileStatus}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  function renderResultsView(currentProfile: SkillProfile) {
    const extractedSkills =
      currentProfile.extracted_skills ?? currentProfile.experience_evidence;

    return (
      <section className="grid gap-5">
        <div className="rounded-md border border-stone-300 bg-white shadow-sm">
          <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                Analysis results
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal text-stone-950">
                Transparent ESCO grounding audit
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                This screen shows the full pipeline: required data collected,
                skills extracted by the LLM, each RAG query sent to the ESCO
                skills database, the top 3 ESCO matches with cosine similarity,
                and the jobs selected from grounded skills.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded border border-stone-200 bg-stone-50 px-3 py-3">
                <p className="text-2xl font-semibold text-stone-950">
                  {extractedSkills.length}
                </p>
                <p className="mt-1 text-xs font-medium text-stone-500">
                  LLM skills
                </p>
              </div>
              <div className="rounded border border-stone-200 bg-stone-50 px-3 py-3">
                <p className="text-2xl font-semibold text-stone-950">
                  {currentProfile.grounding_trace.length}
                </p>
                <p className="mt-1 text-xs font-medium text-stone-500">
                  RAG queries
                </p>
              </div>
              <div className="rounded border border-stone-200 bg-stone-50 px-3 py-3">
                <p className="text-2xl font-semibold text-stone-950">
                  {currentProfile.occupation_paths.length}
                </p>
                <p className="mt-1 text-xs font-medium text-stone-500">
                  Jobs
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-0 border-t border-stone-200 md:grid-cols-3">
            <div className="border-b border-stone-200 px-4 py-3 md:border-b-0 md:border-r">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                Pipeline status
              </p>
              <dl className="mt-2 space-y-1 text-sm leading-6 text-stone-800">
                {requiredFieldKeys.slice(0, 5).map((field) => (
                  <div key={field}>
                    <dt className="inline font-medium">
                      {requiredFieldLabels[field]}:{" "}
                    </dt>
                    <dd className="inline">
                      {requiredFieldValue(surveyData, field) || "-"}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                Then the LLM extracts skills, RAG retrieves ESCO top 3 matches,
                and jobs are ranked.
              </p>
            </div>
            <div className="border-b border-stone-200 px-4 py-3 md:border-b-0 md:border-r">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                ESCO matching
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-800">
                The RAG trace lists every ESCO top 3 result.
                <br />
                Jobs are calculated from accepted ESCO skill IDs.
                <br />
                Low-quality matches are left out before job ranking.
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                Profile export
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md border-stone-300 px-3 text-xs"
                  onClick={() => void copyProfileJson()}
                >
                  Copy JSON
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md border-stone-300 px-3 text-xs"
                  onClick={viewProfileJson}
                >
                  View JSON
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md border-stone-300 px-3 text-xs"
                  onClick={downloadProfileJson}
                >
                  Download
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md border-stone-300 px-3 text-xs"
                  onClick={() => window.print()}
                >
                  Print
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md border-stone-300 px-3 text-xs"
                  onClick={resetSurvey}
                >
                  New chat
                </Button>
              </div>
              {profileStatus ? (
                <p className="mt-2 text-xs font-medium text-stone-600">
                  {profileStatus}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <section className="rounded-md border border-stone-300 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-950">
              Step 1: collected data
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              These are the required fields gathered in the chat before any LLM
              or ESCO matching runs.
            </p>
          </div>
          <div className="divide-y divide-stone-200">
            <div className="grid gap-2 px-4 py-4 md:grid-cols-[12rem_minmax(0,1fr)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                Important fields
              </p>
              <dl className="mt-2 space-y-1 text-sm leading-6 text-stone-800">
                {requiredFieldKeys.map((field) => (
                  <div key={field}>
                    <dt className="inline font-medium">
                      {requiredFieldLabels[field]}:{" "}
                    </dt>
                    <dd className="inline">
                      {requiredFieldValue(surveyData, field) || "-"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="grid gap-2 px-4 py-4 md:grid-cols-[12rem_minmax(0,1fr)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                Raw skills
              </p>
              <p className="text-sm leading-6 text-stone-800">
                {surveyData.skills.join(", ") || "-"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-stone-300 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-950">
              Step 2: skills extracted by the LLM
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              The LLM reads the chat transcript and turns the person&apos;s
              words into distinct skill phrases. These phrases become the RAG
              queries in the next step.
            </p>
          </div>
          {extractedSkills.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-stone-500">
              No extracted skills returned.
            </div>
          ) : (
            <ol className="divide-y divide-stone-200">
              {extractedSkills.map((skill, index) => (
                <li
                  key={`${skill.id}-${index}`}
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[3rem_minmax(0,1fr)_18rem]"
                >
                  <p className="text-2xl font-semibold text-teal-800">
                    {index + 1}
                  </p>
                  <div>
                    <h3 className="text-base font-semibold text-stone-950">
                      {skill.skill_label || skill.plain_language_label}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-stone-700">
                      {skill.evidence_quote}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm text-stone-600">
                    <p>
                      <span className="font-medium text-stone-950">
                        Category:
                      </span>{" "}
                      {skill.category || "-"}
                    </p>
                    <p>
                      <span className="font-medium text-stone-950">
                        Competency:
                      </span>{" "}
                      {skill.competency || "-"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-md border border-stone-300 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-950">
              Step 3: RAG calls to the ESCO skills database
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Every row below is one LLM-extracted skill embedded and sent to
              the ESCO vector search with{" "}
              <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">
                match_count = 3
              </code>
              . The scores shown are cosine similarity.
            </p>
          </div>

          {currentProfile.grounding_trace.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-stone-500">
              No grounding trace was returned.
            </div>
          ) : (
            <div className="divide-y divide-stone-200">
              {currentProfile.grounding_trace.map((trace, index) => (
                <article
                  key={`${trace.evidence_id}-${index}`}
                  className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_28rem]"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      LLM extracted skill {index + 1}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-stone-950">
                      {trace.extracted_skill || "Extracted skill"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-stone-800">
                      <span className="font-medium text-stone-950">
                        User evidence:
                      </span>{" "}
                      {trace.evidence_quote}
                    </p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      RAG query sent to ESCO skills database
                    </p>
                    <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded border border-stone-200 bg-stone-50 p-3 text-xs leading-5 text-stone-800">
                      {trace.database_query}
                    </pre>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Top 3 ESCO matches
                    </p>
                    {trace.top_skill_candidates.length === 0 ? (
                      <p className="mt-2 text-sm text-stone-500">
                        No ESCO candidates returned.
                      </p>
                    ) : (
                      <ol className="mt-2 divide-y divide-stone-200 rounded border border-stone-200">
                        {trace.top_skill_candidates.map((candidate, rank) => (
                          <li
                            key={candidate.concept_uri}
                            className="grid gap-1 px-3 py-2 text-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-medium text-stone-900">
                                {rank + 1}. {candidate.preferred_label}
                              </span>
                              <span className="shrink-0 rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-900">
                                {candidate.similarity.toFixed(3)}
                              </span>
                            </div>
                            <p className="break-all text-xs text-stone-500">
                              {candidate.concept_uri}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-md border border-stone-300 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-950">
              Best fitting jobs based on these skills
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Jobs are ranked by how many ESCO skills for that occupation the
              person already has. Each job shows the full ESCO skill list and
              marks skills the person has.
            </p>
            <p className="mt-2 rounded border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-700">
              rankScore = matchedSkills * 100 + matchedEssentialSkills * 25 +
              skillCoverage * 10 + matchedSimilarity - relationRank
            </p>
          </div>

          {currentProfile.occupation_paths.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-stone-500">
              No occupation paths found from the current ESCO matches.
            </div>
          ) : (
            <ol className="divide-y divide-stone-200">
              {currentProfile.occupation_paths.map((path, index) => {
                const matchedSkillCount =
                  path.matched_skill_count ?? path.matched_skill_labels.length;
                const matchedEssentialSkillCount =
                  path.matched_essential_skill_count ?? 0;
                const matchedSkillScore = matchedSkillCount * 100;
                const matchedEssentialScore = matchedEssentialSkillCount * 25;
                const coverageScore =
                  typeof path.skill_coverage === "number"
                    ? path.skill_coverage * 10
                    : undefined;

                return (
                  <li
                    key={path.occupation_uri}
                    className="grid gap-4 px-4 py-4 lg:grid-cols-[3rem_minmax(0,1fr)]"
                  >
                    <p className="text-2xl font-semibold text-teal-800">
                      {index + 1}
                    </p>
                    <div className="min-w-0">
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
                        <div>
                          <h3 className="text-base font-semibold text-stone-950">
                            {path.preferred_label}
                          </h3>
                          <p className="mt-1 break-all text-xs text-stone-500">
                            {path.occupation_uri}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-stone-700">
                            {path.explanation}
                          </p>
                        </div>
                        <div className="rounded border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-700">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                            Skill fit
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-teal-800">
                            {matchedSkillCount}/{path.required_skill_count ?? "-"}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            skills matched
                          </p>
                          <div className="mt-3 space-y-1 text-xs leading-5">
                            <p>
                              Matched skills: {matchedSkillCount} * 100 ={" "}
                              {formatScoreValue(matchedSkillScore, 0)}
                            </p>
                            <p>
                              Matched essential: {matchedEssentialSkillCount} *
                              25 = {formatScoreValue(matchedEssentialScore, 0)}
                            </p>
                            <p>
                              Coverage: {formatCoverageValue(path.skill_coverage)} *
                              10 = {formatScoreValue(coverageScore)}
                            </p>
                            <p>
                              Matched similarity:{" "}
                              {formatScoreValue(path.matched_similarity)}
                            </p>
                            <p>
                              Relation rank penalty: -
                              {formatScoreValue(path.relation_rank, 0)}
                            </p>
                          </div>
                          <p className="mt-3 border-t border-stone-200 pt-2 text-sm font-semibold text-stone-950">
                            Final rank score:{" "}
                            {formatScoreValue(path.rank_score)}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            Coverage shown as{" "}
                            {formatCoveragePercent(path.skill_coverage)}.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                          All skills listed for this job
                        </p>
                        {path.required_skills?.length ? (
                          <div className="mt-2 grid max-h-72 gap-2 overflow-auto rounded border border-stone-200 bg-white p-2 sm:grid-cols-2">
                            {path.required_skills.map((skill) => (
                              <div
                                key={skill.skill_uri}
                                className={`rounded border px-3 py-2 text-sm ${
                                  skill.person_has
                                    ? "border-teal-300 bg-teal-50 text-teal-950"
                                    : "border-stone-200 bg-stone-50 text-stone-700"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-medium">
                                    {skill.skill_label}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                                      skill.person_has
                                        ? "bg-teal-800 text-white"
                                        : "bg-stone-200 text-stone-700"
                                    }`}
                                  >
                                    {skill.person_has ? "Has" : "Gap"}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs opacity-80">
                                  {skill.relation_types.join(", ") ||
                                    "relation not specified"}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-stone-500">
                            Full skill list was not returned for this occupation.
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="rounded-md border border-stone-300 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-950">
              Human-readable portable profile
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              This is the shareable summary. The JSON buttons above expose the
              full machine-readable version with ESCO IDs and metadata.
            </p>
          </div>
          <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                Summary
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-800">
                {currentProfile.person_summary}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                Evidence from experience
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {currentProfile.experience_evidence.map((item) => (
                  <span
                    key={item.id}
                    className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950"
                  >
                    {item.plain_language_label}
                  </span>
                ))}
                {currentProfile.unmapped_evidence.map((item) => (
                  <span
                    key={item.id}
                    className="rounded border border-stone-300 bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700"
                  >
                    Needs mapping: {item.plain_language_label}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded border border-stone-200 bg-stone-50 p-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Education
                </p>
                <p className="mt-1 text-sm text-stone-800">
                  {currentProfile.education || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Languages
                </p>
                <p className="mt-1 text-sm text-stone-800">
                  {currentProfile.languages.join(", ") || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Engine
                </p>
                <p className="mt-1 text-sm text-stone-800">
                  {currentProfile.export_metadata.engine_version}
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-stone-950">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-4 border-b border-stone-300 pb-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              UNMAPPED Skill Engine
            </p>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
              Turn lived experience into a portable, explainable skills profile.
            </h1>
          </div>
          <nav className="rounded-md border border-stone-300 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
              Menu
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded border border-teal-300 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-950"
              >
                Build profile
              </Link>
              <Link
                href="/tools"
                className="rounded border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-teal-700 hover:text-teal-800"
              >
                ESCO tools
              </Link>
            </div>
          </nav>
        </section>

        {viewPhase === "results" && profile ? renderResultsView(profile) : null}

        {viewPhase !== "results" ? (
        <section
          className={
            viewPhase === "loading"
              ? "mx-auto grid w-full max-w-4xl gap-5"
              : "mx-auto grid w-full max-w-3xl gap-5"
          }
        >
          {viewPhase === "chat" ? (
          <div className="rounded-md border border-stone-300 bg-white shadow-sm">
            <div className="border-b border-stone-200 px-4 py-3">
              <h2 className="text-base font-semibold text-stone-950">
                Chat survey
              </h2>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                I collect the important fields for the skill discovery engine.
                You can answer naturally; press Enter to send or Shift+Enter for
                a new line.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {requiredFieldKeys.map((field) => {
                  const value = requiredFieldValue(surveyData, field);

                  return (
                    <span
                      key={field}
                      className={`rounded border px-2 py-1 text-xs font-medium ${
                        value
                          ? "border-teal-300 bg-teal-50 text-teal-950"
                          : "border-stone-300 bg-stone-100 text-stone-600"
                      }`}
                    >
                      {requiredFieldLabels[field]}
                      {value ? `: ${value.slice(0, 34)}${value.length > 34 ? "..." : ""}` : " needed"}
                    </span>
                  );
                })}
              </div>
              <div
                className={`mt-3 rounded-md border px-3 py-2 text-sm ${
                  surveyMissing.length === 0
                    ? "border-teal-300 bg-teal-50 text-teal-950"
                    : "border-amber-300 bg-amber-50 text-amber-950"
                }`}
              >
                {surveyMissing.length === 0
                  ? "All important data is collected."
                  : `Still needed: ${surveyMissing
                      .slice(0, 5)
                      .map((field) => requiredFieldLabels[field])
                      .join(", ")}${
                      surveyMissing.length > 5 ? "..." : ""
                    }. You can also say: show me the result now.`}
              </div>
              {calculationStage !== "idle" ? (
                <div className="mt-3 rounded-md border border-stone-200 bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Calculation status
                  </p>
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                    <span
                      className={`rounded border px-2 py-1 ${
                        ["collected", "extracting", "grounding", "done"].includes(
                          calculationStage,
                        )
                          ? "border-teal-300 bg-teal-50 text-teal-950"
                          : "border-stone-300 bg-stone-100 text-stone-600"
                      }`}
                    >
                      Data collected
                    </span>
                    <span
                      className={`rounded border px-2 py-1 ${
                        ["extracting", "grounding", "done"].includes(
                          calculationStage,
                        )
                          ? "border-teal-300 bg-teal-50 text-teal-950"
                          : "border-stone-300 bg-stone-100 text-stone-600"
                      }`}
                    >
                      LLM extracts skills
                    </span>
                    <span
                      className={`rounded border px-2 py-1 ${
                        ["grounding", "done"].includes(calculationStage)
                          ? "border-teal-300 bg-teal-50 text-teal-950"
                          : "border-stone-300 bg-stone-100 text-stone-600"
                      }`}
                    >
                      RAG finds ESCO top 3
                    </span>
                  </div>
                  {isGeneratingProfile ? (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-teal-700" />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="max-h-[32rem] space-y-3 overflow-y-auto px-4 py-4">
              {profileMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[88%] rounded-md bg-teal-800 px-3 py-2 text-sm leading-6 text-white"
                      : "max-w-[88%] rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-800"
                  }
                >
                  {message.content}
                </div>
              ))}
            </div>

            <form
              onSubmit={addInterviewMessage}
              className="grid gap-3 border-t border-stone-200 p-3 lg:grid-cols-[minmax(0,1fr)_auto]"
            >
              <textarea
                value={profileInput}
                onChange={(event) => setProfileInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Example: I am 27, in Hamburg Germany, German C1, EU work permit, bachelor, 3 years experience, favorite skill data analysis..."
                className="min-h-24 resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                disabled={isAnalyzingIntake || isGeneratingProfile}
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="h-11 rounded-md bg-stone-950 px-5 text-white hover:bg-teal-800"
                  disabled={isAnalyzingIntake || isGeneratingProfile}
                >
                  {isAnalyzingIntake ? "Reading" : "Add"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-md border-stone-300 px-5"
                  onClick={loadAmaraDemo}
                >
                  Amara demo
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 px-3 py-3">
              <Button
                type="button"
                className="h-11 rounded-md bg-teal-800 px-5 text-white hover:bg-stone-950"
                disabled={
                  isAnalyzingIntake ||
                  isGeneratingProfile ||
                  surveyMissing.length > 0
                }
                onClick={() => void generateProfile()}
              >
                {isAnalyzingIntake
                  ? "Reading message"
                  : isGeneratingProfile
                  ? "Generating analysis"
                  : surveyMissing.length > 0
                    ? "Waiting for important info"
                    : "Generate analysis"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md border-stone-300 px-5"
                onClick={resetSurvey}
              >
                Reset
              </Button>
              {profileStatus ? (
                <p className="text-sm text-stone-600">{profileStatus}</p>
              ) : null}
            </div>
          </div>
          ) : null}

          {viewPhase === "loading" ? renderLoadingScreen() : null}
        </section>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
            {error}
          </div>
        ) : null}

      </main>
    </div>
  );
}
