"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

type SurveyData = {
  age: number | null;
  city: string;
  skills: string[];
  skillsText: string;
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
  city: "",
  skills: [],
  skillsText: "",
};

const firstSurveyPrompt =
  "Hi. I can build your portable skills profile. For this prototype I need three things: your age, your city, and the skills you want mapped. You can answer in one message, like: I am 22, I live in Accra, and my skills are phone repair, customer service, and basic coding.";

const amaraDemoMessages: ChatMessage[] = [
  {
    role: "assistant",
    content: firstSurveyPrompt,
  },
  {
    role: "user",
    content:
      "I am 22 and live outside Accra. My skills are phone repair, diagnosing charging problems, replacing screens, customer communication, keeping records of parts and payments, and basic HTML and JavaScript coding.",
  },
];

const amaraSurveyData: SurveyData = {
  age: 22,
  city: "Accra",
  skills: [
    "phone repair",
    "diagnosing charging problems",
    "replacing screens",
    "customer communication",
    "keeping records of parts and payments",
    "basic HTML and JavaScript coding",
  ],
  skillsText:
    "phone repair, diagnosing charging problems, replacing screens, customer communication, keeping records of parts and payments, and basic HTML and JavaScript coding",
};

const intakeSeparators = /[,;\n]+/;
const validAgeRange = { min: 10, max: 80 };

function cleanFreeText(value: string) {
  return value
    .trim()
    .replace(/^[\s:=-]+/, "")
    .replace(/[\s.,;:=-]+$/, "")
    .replace(/\s+/g, " ");
}

function formatCity(value: string) {
  const cleaned = cleanFreeText(value)
    .replace(/\s+(?:and\s+)?(?:my\s+)?skills\b.*$/i, "")
    .replace(/\s+(?:and\s+)?(?:i\s+am|i'm|im|age|aged)\b.*$/i, "");

  if (!cleaned) return "";

  if (cleaned === cleaned.toLowerCase() || cleaned === cleaned.toUpperCase()) {
    return cleaned.replace(/\b[A-Za-z]/g, (letter) => letter.toUpperCase());
  }

  return cleaned;
}

function splitMessageParts(value: string) {
  return value.split(intakeSeparators).map(cleanFreeText).filter(Boolean);
}

function parseAge(value: string) {
  const age = Number(value);

  if (
    Number.isFinite(age) &&
    age >= validAgeRange.min &&
    age <= validAgeRange.max
  ) {
    return age;
  }

  return null;
}

function ageFromMatch(match: RegExpMatchArray | null) {
  return match ? parseAge(match[1]) : null;
}

function ageFromPart(part: string) {
  return ageFromMatch(
    part.match(
      /^(?:age|aged)?\s*[:=-]?\s*(\d{1,2})(?:\s*(?:years old|year old|yo|y\/o))?$/i,
    ),
  );
}

function extractAge(message: string, parts: string[]) {
  const explicitAge =
    ageFromMatch(
      message.match(
        /\b(?:i am|i'm|im|age is|aged|age|am)\s*[:=-]?\s*(\d{1,2})\b/i,
      ),
    ) ||
    ageFromMatch(
      message.match(/\b(\d{1,2})\s*(?:years old|year old|yo|y\/o)\b/i),
    );

  if (explicitAge) return explicitAge;

  for (const part of parts) {
    const partAge = ageFromPart(part);
    if (partAge) return partAge;
  }

  return null;
}

function cityFromPart(part: string) {
  const labelledCity = part.match(
    /^(?:city|location)\s*(?:is|:|=|-)?\s+([A-Za-z][A-Za-z\s-]{1,40})$/i,
  );

  if (labelledCity) {
    return formatCity(labelledCity[1]);
  }

  if (
    /^[A-Za-z][A-Za-z\s-]{1,40}$/.test(part) &&
    !/^(?:age|aged|skills?)\b/i.test(part)
  ) {
    return formatCity(part);
  }

  return "";
}

function extractExplicitCity(message: string) {
  const cityMatch = message.match(
    /\b(?:live\s+(?:in|near|outside)|living\s+(?:in|near|outside)|based\s+in|from|outside|near|city|location)\s*(?:is|:|=|-)?\s+([A-Za-z][A-Za-z\s-]{1,40}?)(?=\s*(?:[,.;\n]|\band\s+(?:i\s+am|i'm|im|age|aged|my\s+skills|skills)\b|\b(?:age|aged|my\s+skills|skills)\b|$))/i,
  );

  return cityMatch ? formatCity(cityMatch[1]) : "";
}

function inferCityFromParts(
  parts: string[],
  age: number | null,
  missingBefore: string[],
) {
  for (const part of parts) {
    const labelledCity = part.match(
      /^(?:city|location)\s*(?:is|:|=|-)?\s+([A-Za-z][A-Za-z\s-]{1,40})$/i,
    );

    if (labelledCity) return formatCity(labelledCity[1]);
  }

  if (missingBefore[0] === "city" && parts.length === 1) {
    return cityFromPart(parts[0]);
  }

  if (!age || parts.length < 3) return "";

  const ageIndex = parts.findIndex((part) => ageFromPart(part) === age);
  const cityCandidates = parts
    .map((part, index) => ({ index, value: cityFromPart(part) }))
    .filter((part) => part.value);

  return (
    cityCandidates.find((part) => part.index < ageIndex)?.value ||
    cityCandidates.find((part) => part.index > ageIndex)?.value ||
    cityCandidates[0]?.value ||
    ""
  );
}

function stripSkillPrefix(value: string) {
  return cleanFreeText(value)
    .replace(
      /^(?:my\s+)?skills(?:\s+(?:are|include|includes|is))?\s*[:=-]?\s*/i,
      "",
    )
    .replace(/^(?:i\s+can|i\s+know\s+how\s+to|i\s+know|good\s+at)\s+/i, "")
    .trim();
}

function splitSkills(value: string) {
  return value
    .replace(/\b(?:and|plus|also)\b/gi, ",")
    .split(intakeSeparators)
    .map(stripSkillPrefix)
    .filter(
      (skill) =>
        skill.length > 1 &&
        !/^(?:age|aged|city|location)\b/i.test(skill) &&
        ageFromPart(skill) === null,
    );
}

function mergeSkills(current: string[], incoming: string[]) {
  const seen = new Set(current.map((skill) => skill.toLowerCase()));
  const merged = [...current];

  for (const skill of incoming) {
    const key = skill.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(skill);
    }
  }

  return merged;
}

function extractExplicitSkills(message: string) {
  const skillsMatch =
    message.match(
      /\b(?:my\s+)?skills(?:\s+(?:are|include|includes|is))?\s*[:=-]?\s+(.+)$/i,
    ) ||
    message.match(/\b(?:i can|i know how to|i know|good at)\s+(.+)$/i);

  return skillsMatch ? splitSkills(skillsMatch[1]) : [];
}

function inferSkillsFromParts(
  parts: string[],
  age: number | null,
  city: string,
) {
  const cityKey = city.toLowerCase();

  return parts
    .filter((part) => age === null || ageFromPart(part) !== age)
    .map((part) => {
      const cityPart = cityFromPart(part).toLowerCase();

      if (cityKey && cityPart === cityKey) return "";
      if (/^(?:city|location)\b/i.test(part)) return "";

      return stripSkillPrefix(part);
    })
    .filter(
      (skill) =>
        skill.length > 1 &&
        skill.toLowerCase() !== cityKey &&
        !/^(?:age|aged|city|location)\b/i.test(skill) &&
        ageFromPart(skill) === null,
    );
}

function extractSurveyData(message: string, current: SurveyData): SurveyData {
  const missingBefore = missingSurveyFields(current);
  const trimmedMessage = message.trim();
  const parts = splitMessageParts(message);
  const incomingAge = extractAge(message, parts);

  const next: SurveyData = {
    age: current.age,
    city: current.city,
    skills: [...current.skills],
    skillsText: current.skillsText,
  };

  if (!next.age && incomingAge) {
    next.age = incomingAge;
  }

  const incomingCity =
    extractExplicitCity(message) ||
    inferCityFromParts(parts, next.age, missingBefore);

  if (!next.city && incomingCity) {
    next.city = incomingCity;
  } else if (
    !next.city &&
    missingBefore[0] === "city" &&
    /^[A-Za-z][A-Za-z\s-]{1,40}$/.test(trimmedMessage)
  ) {
    next.city = formatCity(trimmedMessage);
  }

  const explicitSkills = extractExplicitSkills(message);
  const inferredSkills =
    explicitSkills.length > 0
      ? explicitSkills
      : inferSkillsFromParts(parts, next.age, next.city);

  if (inferredSkills.length > 0) {
    next.skills = mergeSkills(next.skills, inferredSkills);
    next.skillsText = next.skills.join(", ");
  } else if (
    next.skills.length === 0 &&
    missingBefore[0] === "skills" &&
    trimmedMessage.length > 1
  ) {
    next.skillsText = trimmedMessage;
    next.skills = splitSkills(next.skillsText);
  }

  return next;
}

function missingSurveyFields(data: SurveyData) {
  return [
    !data.age ? "age" : "",
    !data.city ? "city" : "",
    data.skills.length === 0 ? "skills" : "",
  ].filter(Boolean);
}

function promptForMissingFields(data: SurveyData) {
  const missing = missingSurveyFields(data);

  if (missing.length === 0) {
    return "Thanks. I have your age, city, and skills. I am generating the analysis now.";
  }

  return `Thanks. I still need your ${missing.join(
    ", ",
  )}. Please send ${missing.length === 1 ? "it" : "them"} in the chat.`;
}

function messagesForProfile(messages: ChatMessage[], data: SurveyData) {
  const skillsText = data.skills.join(", ");

  return [
    ...messages,
    {
      role: "assistant" as const,
      content:
        "Structured profile intake captured for grounding: age, city, and skills.",
    },
    {
      role: "user" as const,
      content: `I am ${data.age} years old and live in ${data.city}. My skills are ${skillsText}.`,
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
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);

  const profileJson = useMemo(() => {
    return profile ? JSON.stringify(profile, null, 2) : "";
  }, [profile]);
  const surveyMissing = missingSurveyFields(surveyData);

  function addInterviewMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = profileInput.trim();
    if (!content) return;

    const userMessage: ChatMessage = { role: "user", content };
    const nextSurveyData = extractSurveyData(content, surveyData);
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: promptForMissingFields(nextSurveyData),
    };
    const nextMessages = [...profileMessages, userMessage, assistantMessage];

    setSurveyData(nextSurveyData);
    setProfileMessages(nextMessages);
    setProfileInput("");
    setProfile(null);
    setProfileStatus("");

    if (missingSurveyFields(nextSurveyData).length === 0) {
      setCalculationStage("collected");
      setViewPhase("loading");
      void generateProfile(nextMessages, nextSurveyData);
    } else {
      setCalculationStage("idle");
      setViewPhase("chat");
    }
  }

  async function generateProfile(
    messages = profileMessages,
    data = surveyData,
  ) {
    if (missingSurveyFields(data).length > 0) {
      setProfileStatus(promptForMissingFields(data));
      return;
    }

    setError("");
    setViewPhase("loading");
    setCalculationStage("extracting");
    setProfileStatus("All needed data is collected. Calculating the profile now.");
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
            city: data.city,
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
    setCalculationStage("collected");
    setViewPhase("loading");
    setSurveyData(amaraSurveyData);
    setProfileMessages([
      ...amaraDemoMessages,
      {
        role: "assistant",
        content:
          "Thanks. I have your age, city, and skills. I am generating the analysis now.",
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
    setCalculationStage("idle");
    setViewPhase("chat");
    setSurveyData(emptySurveyData);
    setProfileMessages([{ role: "assistant", content: firstSurveyPrompt }]);
    setProfileInput("");
  }

  function renderChatSurvey() {
    return (
      <section className="mx-auto grid w-full max-w-3xl gap-5">
        <div className="rounded-md border border-stone-300 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-950">
              Chat survey
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              First I collect age, city, and skills. Once those are present,
              the analysis appears automatically.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded border px-2 py-1 text-xs font-medium ${
                  surveyData.age
                    ? "border-teal-300 bg-teal-50 text-teal-950"
                    : "border-stone-300 bg-stone-100 text-stone-600"
                }`}
              >
                Age {surveyData.age ? `: ${surveyData.age}` : "needed"}
              </span>
              <span
                className={`rounded border px-2 py-1 text-xs font-medium ${
                  surveyData.city
                    ? "border-teal-300 bg-teal-50 text-teal-950"
                    : "border-stone-300 bg-stone-100 text-stone-600"
                }`}
              >
                City {surveyData.city ? `: ${surveyData.city}` : "needed"}
              </span>
              <span
                className={`rounded border px-2 py-1 text-xs font-medium ${
                  surveyData.skills.length > 0
                    ? "border-teal-300 bg-teal-50 text-teal-950"
                    : "border-stone-300 bg-stone-100 text-stone-600"
                }`}
              >
                Skills{" "}
                {surveyData.skills.length > 0
                  ? `: ${surveyData.skills.slice(0, 3).join(", ")}${
                      surveyData.skills.length > 3 ? "..." : ""
                    }`
                  : "needed"}
              </span>
            </div>
            <div
              className={`mt-3 rounded-md border px-3 py-2 text-sm ${
                surveyMissing.length === 0
                  ? "border-teal-300 bg-teal-50 text-teal-950"
                  : "border-amber-300 bg-amber-50 text-amber-950"
              }`}
            >
              {surveyMissing.length === 0
                ? "All needed data is collected: age, city, and skills."
                : `Still needed: ${surveyMissing.join(", ")}.`}
            </div>
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
              placeholder="Example: I am 22, I live in Accra, and my skills are phone repair, customer service, and coding..."
              className="min-h-24 resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            />
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="h-11 rounded-md bg-stone-950 px-5 text-white hover:bg-teal-800"
              >
                Send
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
        </div>
      </section>
    );
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
              Age, city, skills captured
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
              <p className="mt-2 text-sm leading-6 text-stone-800">
                Step 1: required data collected
                <br />
                Step 2: skills extracted by the LLM
                <br />
                Step 3: ESCO top 3 matches retrieved
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
                Age
              </p>
              <p className="text-sm font-medium text-stone-950">
                {surveyData.age || "-"}
              </p>
            </div>
            <div className="grid gap-2 px-4 py-4 md:grid-cols-[12rem_minmax(0,1fr)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                City
              </p>
              <p className="text-sm font-medium text-stone-950">
                {surveyData.city || "-"}
              </p>
            </div>
            <div className="grid gap-2 px-4 py-4 md:grid-cols-[12rem_minmax(0,1fr)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                Skills answer
              </p>
              <p className="text-sm leading-6 text-stone-800">
                {surveyData.skillsText || "-"}
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
                First I collect age, city, and skills. Once those are present,
                the analysis appears automatically.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded border px-2 py-1 text-xs font-medium ${
                    surveyData.age
                      ? "border-teal-300 bg-teal-50 text-teal-950"
                      : "border-stone-300 bg-stone-100 text-stone-600"
                  }`}
                >
                  Age {surveyData.age ? `: ${surveyData.age}` : "needed"}
                </span>
                <span
                  className={`rounded border px-2 py-1 text-xs font-medium ${
                    surveyData.city
                      ? "border-teal-300 bg-teal-50 text-teal-950"
                      : "border-stone-300 bg-stone-100 text-stone-600"
                  }`}
                >
                  City {surveyData.city ? `: ${surveyData.city}` : "needed"}
                </span>
                <span
                  className={`rounded border px-2 py-1 text-xs font-medium ${
                    surveyData.skills.length > 0
                      ? "border-teal-300 bg-teal-50 text-teal-950"
                      : "border-stone-300 bg-stone-100 text-stone-600"
                  }`}
                >
                  Skills{" "}
                  {surveyData.skills.length > 0
                    ? `: ${surveyData.skills.slice(0, 3).join(", ")}${
                        surveyData.skills.length > 3 ? "..." : ""
                      }`
                    : "needed"}
                </span>
              </div>
              <div
                className={`mt-3 rounded-md border px-3 py-2 text-sm ${
                  surveyMissing.length === 0
                    ? "border-teal-300 bg-teal-50 text-teal-950"
                    : "border-amber-300 bg-amber-50 text-amber-950"
                }`}
              >
                {surveyMissing.length === 0
                  ? "All needed data is collected: age, city, and skills."
                  : `Still needed: ${surveyMissing.join(", ")}.`}
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
                placeholder="Example: I am 22, I live in Accra, and my skills are phone repair, customer service, and coding..."
                className="min-h-24 resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="h-11 rounded-md bg-stone-950 px-5 text-white hover:bg-teal-800"
                >
                  Add
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
                disabled={isGeneratingProfile || surveyMissing.length > 0}
                onClick={() => void generateProfile()}
              >
                {isGeneratingProfile
                  ? "Generating analysis"
                  : surveyMissing.length > 0
                    ? "Waiting for required info"
                    : "Generate analysis"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md border-stone-300 px-5"
                onClick={() => {
                  setProfile(null);
                  setProfileStatus("");
                  setCalculationStage("idle");
                  setViewPhase("chat");
                  setSurveyData(emptySurveyData);
                  setProfileMessages([
                    { role: "assistant", content: firstSurveyPrompt },
                  ]);
                }}
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
