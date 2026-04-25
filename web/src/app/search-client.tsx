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
type JourneyStep = "discover" | "ground" | "review";

type EvidenceItem = {
  id: string;
  category: string;
  skill_label?: string;
  evidence_quote: string;
  competency: string;
  plain_language_label: string;
  mapped?: boolean;
};

type IdentifiedSkill = {
  concept_uri: string;
  preferred_label: string;
  user_skill: string;
  evidence_quote: string;
  database_query: string;
  similarity: number;
  confidence: "strong" | "medium" | "needs_review";
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
  identified_skills?: IdentifiedSkill[];
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
  "Hi, I am Milo. I can build your SkillRoute profile. Tell me your age, location, languages, education, work authorization, experience, and the skills you want mapped. Share anything useful; I will ask only for what is missing.";

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
    return "I have the important intake data now. I am building your RouteMap and matching it against ESCO.";
  }

  return `I still need your ${missing
    .slice(0, 3)
    .map((field) => requiredFieldLabels[field])
    .join(", ")}. Send ${missing.length === 1 ? "it" : "them"} when you are ready.`;
}

function messagesForProfile(messages: ChatMessage[], data: SurveyData) {
  const skillsText = (data.skills ?? []).join(", ");
  const competenciesText = (data.demonstrated_competencies ?? []).join(", ");

  return [
    ...messages,
    {
      role: "assistant" as const,
      content:
        "Structured SkillRoute intake captured for grounding: profile details, evidence, and skills.",
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

function skillConfidenceLabel(confidence: IdentifiedSkill["confidence"]) {
  if (confidence === "strong") return "Strong ESCO fit";
  if (confidence === "medium") return "Good ESCO fit";
  return "Review fit";
}

function skillConfidenceFromSimilarity(
  similarity: number,
): IdentifiedSkill["confidence"] {
  if (similarity >= 0.78) return "strong";
  if (similarity >= 0.65) return "medium";
  return "needs_review";
}

function skillConfidenceClass(confidence: IdentifiedSkill["confidence"]) {
  if (confidence === "strong") {
    return "border-emerald-300 bg-emerald-50 text-emerald-950";
  }

  if (confidence === "medium") {
    return "border-sky-300 bg-sky-50 text-sky-950";
  }

  return "border-amber-300 bg-amber-50 text-amber-950";
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
    setProfileStatus("Milo is extracting skill signals from the conversation.");
    setIsGeneratingProfile(true);

    try {
      window.setTimeout(() => {
        setCalculationStage((stage) =>
          stage === "extracting" ? "grounding" : stage,
        );
        setProfileStatus(
          "Milo is grounding the signals against ESCO and building RouteMap.",
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
      setProfileStatus("RouteMap generated.");
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
        content: "I have Amara's core signal. I am building her RouteMap now.",
      },
    ]);
    void generateProfile(amaraDemoMessages, amaraSurveyData);
  }

  async function copyProfileJson() {
    if (!profileJson) return;
    await navigator.clipboard.writeText(profileJson);
    setProfileStatus("SkillRoute JSON copied.");
  }

  function downloadProfileJson() {
    if (!profileJson) return;

    const blob = new Blob([profileJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "skillroute-profile.json";
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

  function renderProcessOverview(activeStep: JourneyStep) {
    const steps: Array<{
      id: JourneyStep;
      title: string;
      description: string;
    }> = [
      {
        id: "discover",
        title: "Talk with Milo",
        description: "Share age, location, lived experience, tools, and skills.",
      },
      {
        id: "ground",
        title: "Ground in ESCO",
        description: "SkillRoute maps the evidence to portable skill IDs.",
      },
      {
        id: "review",
        title: "Review RouteMap",
        description: "See the final skill profile and best fitting jobs.",
      },
    ];
    const activeIndex = steps.findIndex((step) => step.id === activeStep);

    return (
      <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            User journey
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">
            From unmapped experience to a portable RouteMap
          </h2>
        </div>
        <ol className="grid gap-0 md:grid-cols-3">
          {steps.map((step, index) => {
            const isActive = index === activeIndex;
            const isDone = index < activeIndex;

            return (
              <li
                key={step.id}
                className={`border-b border-zinc-200 px-4 py-4 md:border-b-0 md:border-r md:last:border-r-0 ${
                  isActive
                    ? "bg-cyan-50"
                    : isDone
                      ? "bg-emerald-50"
                      : "bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-semibold ${
                      isActive
                        ? "border-cyan-700 bg-cyan-700 text-white"
                        : isDone
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-zinc-300 bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-950">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }

  function renderMiloChat() {
    const completedRequiredCount = requiredFieldKeys.length - surveyMissing.length;
    const intakeSignalFields = requiredFieldKeys.map((field) => ({
      field,
      label: requiredFieldLabels[field],
      value: requiredFieldValue(surveyData, field),
    }));

    return (
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="border-b border-zinc-200 bg-zinc-950 px-4 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Skill Discovery Engine
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">
                  Milo
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-300">
                  An AI skills navigator that turns informal experience into
                  portable ESCO signals.
                </p>
              </div>
              <span className="rounded border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                Agent online
              </span>
            </div>
          </div>

          <div className="max-h-[32rem] space-y-3 overflow-y-auto bg-[#f9faf7] px-4 py-4">
            {profileMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[88%] rounded-md bg-cyan-800 px-3 py-2 text-sm leading-6 text-white"
                    : "max-w-[88%] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-800 shadow-sm"
                }
              >
                {message.role === "assistant" ? (
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                    Milo
                  </p>
                ) : null}
                {message.content}
              </div>
            ))}
          </div>

          <form
            onSubmit={addInterviewMessage}
            className="grid gap-3 border-t border-zinc-200 bg-white p-3 lg:grid-cols-[minmax(0,1fr)_auto]"
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
              placeholder="Tell Milo: age, location, education, languages, informal work, tools, and skills..."
              className="min-h-28 resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
              disabled={isAnalyzingIntake || isGeneratingProfile}
            />
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="h-11 rounded-md bg-zinc-950 px-5 text-white hover:bg-cyan-800"
                disabled={isAnalyzingIntake || isGeneratingProfile}
              >
                {isAnalyzingIntake ? "Reading" : "Send to Milo"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md border-zinc-300 px-5"
                onClick={loadAmaraDemo}
              >
                Load Amara
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-3 py-3">
            <Button
              type="button"
              className="h-11 rounded-md bg-cyan-800 px-5 text-white hover:bg-zinc-950"
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
                ? "Generating RouteMap"
                : surveyMissing.length > 0
                  ? "Waiting for required info"
                  : "Generate RouteMap"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md border-zinc-300 px-5"
              onClick={resetSurvey}
            >
              Reset
            </Button>
            {profileStatus ? (
              <p className="text-sm text-zinc-600">{profileStatus}</p>
            ) : null}
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-md border border-zinc-300 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Intake signal
            </p>
            <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-zinc-950">
                  Required intake
                </span>
                <span
                  className={`rounded px-2 py-1 text-xs font-semibold ${
                    surveyMissing.length === 0
                      ? "bg-emerald-100 text-emerald-950"
                      : "bg-amber-100 text-amber-950"
                  }`}
                >
                  {completedRequiredCount}/{requiredFieldKeys.length}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-cyan-700 transition-all"
                  style={{
                    width: `${Math.round(
                      (completedRequiredCount / requiredFieldKeys.length) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                {surveyMissing.length === 0
                  ? "Ready to generate a RouteMap."
                  : `Still needed: ${surveyMissing
                      .slice(0, 3)
                      .map((field) => requiredFieldLabels[field])
                      .join(", ")}${surveyMissing.length > 3 ? "..." : ""}.`}
              </p>
            </div>

            <div className="mt-3 grid gap-2 text-sm">
              {intakeSignalFields.map(({ field, label, value }) => (
                <div
                  key={field}
                  className={`rounded border px-3 py-2 ${
                    value
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-zinc-600">{label}</span>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                        value
                          ? "bg-emerald-800 text-white"
                          : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {value ? "Captured" : "Needed"}
                    </span>
                  </div>
                  {value ? (
                    <p className="mt-1 truncate text-xs text-zinc-700">
                      {value}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded border border-zinc-200 bg-zinc-50 px-2 py-2">
                <p className="text-lg font-semibold text-zinc-950">
                  {surveyData.skills.length}
                </p>
                <p className="font-medium text-zinc-500">Skills</p>
              </div>
              <div className="rounded border border-zinc-200 bg-zinc-50 px-2 py-2">
                <p className="text-lg font-semibold text-zinc-950">
                  {surveyData.demonstrated_competencies.length}
                </p>
                <p className="font-medium text-zinc-500">Evidence</p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    );
  }

  function renderLoadingScreen() {
    return (
      <section className="mx-auto grid min-h-[34rem] w-full max-w-4xl place-items-center rounded-md border border-zinc-300 bg-white px-5 py-10 shadow-sm">
        <div className="w-full max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Milo is working
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-950">
            Building the RouteMap
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">
            SkillRoute is extracting skill signals, matching them to ESCO, and
            ranking occupations by how much of each job skill profile is already
            present.
          </p>

          <div className="mx-auto mt-8 grid max-w-xl gap-2 text-left text-sm sm:grid-cols-3">
            <span className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 font-medium text-emerald-950">
              Intake captured
            </span>
            <span
              className={`rounded border px-3 py-2 font-medium ${
                ["extracting", "grounding", "done"].includes(calculationStage)
                  ? "border-sky-300 bg-sky-50 text-sky-950"
                  : "border-zinc-300 bg-zinc-100 text-zinc-600"
              }`}
            >
              LLM extracts skills
            </span>
            <span
              className={`rounded border px-3 py-2 font-medium ${
                ["grounding", "done"].includes(calculationStage)
                  ? "border-violet-300 bg-violet-50 text-violet-950"
                  : "border-zinc-300 bg-zinc-100 text-zinc-600"
              }`}
            >
              ESCO grounding
            </span>
          </div>

          <div className="mx-auto mt-8 h-2 max-w-xl overflow-hidden rounded-full bg-zinc-200">
            <div className="h-full w-3/4 animate-pulse rounded-full bg-cyan-700" />
          </div>

          {profileStatus ? (
            <p className="mt-4 text-sm font-medium text-zinc-700">
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
    const identifiedSkills =
      currentProfile.identified_skills ??
      currentProfile.grounding_trace.flatMap((trace) => {
        const bestCandidate = trace.top_skill_candidates[0];
        if (!bestCandidate) return [];

        return [
          {
            concept_uri: bestCandidate.concept_uri,
            preferred_label: bestCandidate.preferred_label,
            user_skill: trace.extracted_skill || "Extracted skill",
            evidence_quote: trace.evidence_quote,
            database_query: trace.database_query,
            similarity: bestCandidate.similarity,
            confidence: skillConfidenceFromSimilarity(bestCandidate.similarity),
          },
        ];
      });
    const topJobs = currentProfile.occupation_paths;
    const topJob = topJobs[0];

    return (
      <section className="grid gap-5">
        <div className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="grid gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                RouteMap
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
                Opportunity map for {surveyData.location || "this profile"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                Milo converted the conversation into a portable skill profile,
                grounded it in ESCO, and ranked occupations by skill overlap.
                The system steps come first as collapsed panels, followed by
                the final skills and jobs.
              </p>
            </div>

            <div className="grid gap-2">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Best fit
                </p>
                <p className="mt-2 text-lg font-semibold text-zinc-950">
                  {topJob?.preferred_label ?? "No job match yet"}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {topJob
                    ? `${topJob.matched_skill_count ?? 0} matched skills`
                    : "Try adding more skill detail."}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded border border-zinc-200 bg-white px-3 py-3">
                  <p className="text-2xl font-semibold text-zinc-950">
                    {identifiedSkills.length}
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    ESCO skills
                  </p>
                </div>
                <div className="rounded border border-zinc-200 bg-white px-3 py-3">
                  <p className="text-2xl font-semibold text-zinc-950">
                    {topJobs.length}
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    Jobs
                  </p>
                </div>
                <div className="rounded border border-zinc-200 bg-white px-3 py-3">
                  <p className="text-2xl font-semibold text-zinc-950">
                    {extractedSkills.length}
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    Signals
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                  What is ESCO?
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-950">
                  ESCO is the European Skills, Competences, Qualifications and
                  Occupations taxonomy. SkillRoute uses it as a shared language
                  so lived experience can become portable skill IDs and job
                  matches.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-3">
          <details className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-950">
              Step 1: how Milo collected the intake signal
            </summary>
            <div className="grid gap-3 border-t border-zinc-200 px-4 py-4 md:grid-cols-2 xl:grid-cols-3">
              {requiredFieldKeys.map((field) => (
                <div key={field}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {requiredFieldLabels[field]}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-800">
                    {requiredFieldValue(surveyData, field) || "-"}
                  </p>
                </div>
              ))}
              <div className="md:col-span-2 xl:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Raw skills
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-800">
                  {surveyData.skills.join(", ") || "-"}
                </p>
              </div>
            </div>
          </details>

          <details className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-950">
              Step 2: skills Milo extracted from the conversation
            </summary>
            {extractedSkills.length === 0 ? (
              <p className="border-t border-zinc-200 px-4 py-4 text-sm text-zinc-500">
                No extracted skills returned.
              </p>
            ) : (
              <ol className="divide-y divide-zinc-200 border-t border-zinc-200">
                {extractedSkills.map((skill, index) => (
                  <li
                    key={`${skill.id}-${index}`}
                    className="grid gap-3 px-4 py-3 md:grid-cols-[3rem_minmax(0,1fr)_18rem]"
                  >
                    <p className="text-xl font-semibold text-cyan-800">
                      {index + 1}
                    </p>
                    <div>
                      <p className="font-semibold text-zinc-950">
                        {skill.skill_label || skill.plain_language_label}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-zinc-700">
                        {skill.evidence_quote}
                      </p>
                    </div>
                    <p className="text-sm text-zinc-600">
                      {skill.category} - {skill.competency || "competency"}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </details>

          <details className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-950">
              Step 3: ESCO grounding trace
            </summary>
            {currentProfile.grounding_trace.length === 0 ? (
              <p className="border-t border-zinc-200 px-4 py-4 text-sm text-zinc-500">
                No grounding trace was returned.
              </p>
            ) : (
              <div className="divide-y divide-zinc-200 border-t border-zinc-200">
                {currentProfile.grounding_trace.map((trace, index) => (
                  <article
                    key={`${trace.evidence_id}-${index}`}
                    className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_28rem]"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Query {index + 1}
                      </p>
                      <h4 className="mt-2 font-semibold text-zinc-950">
                        {trace.extracted_skill || "Extracted skill"}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-zinc-700">
                        Evidence: {trace.evidence_quote}
                      </p>
                      <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-800">
                        {trace.database_query}
                      </pre>
                    </div>
                    <ol className="divide-y divide-zinc-200 rounded border border-zinc-200">
                      {trace.top_skill_candidates.map((candidate, rank) => (
                        <li
                          key={candidate.concept_uri}
                          className="grid gap-1 px-3 py-2 text-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-medium text-zinc-900">
                              {rank + 1}. {candidate.preferred_label}
                            </span>
                            <span className="shrink-0 rounded bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-900">
                              {candidate.similarity.toFixed(3)}
                            </span>
                          </div>
                          <p className="break-all text-xs text-zinc-500">
                            {candidate.concept_uri}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            )}
          </details>

          <details className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-950">
              Step 4: ranking formula and metadata
            </summary>
            <div className="grid gap-4 border-t border-zinc-200 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div>
                <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700">
                  rankScore = matchedSkills * 100 + matchedEssentialSkills * 25
                  + skillCoverage * 10 + matchedSimilarity - relationRank
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  The highest ranked jobs are those where the person already
                  has the largest share of the occupation&apos;s ESCO skills,
                  especially essential skills.
                </p>
              </div>
              <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <p>
                  <span className="font-semibold text-zinc-950">Engine:</span>{" "}
                  {currentProfile.export_metadata.engine_version}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-zinc-950">Generated:</span>{" "}
                  {currentProfile.export_metadata.generated_at}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-zinc-950">Locale:</span>{" "}
                  {currentProfile.export_metadata.locale}
                </p>
              </div>
            </div>
          </details>
        </section>

        <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Final skill profile
            </p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-950">
              Best fitting identified ESCO skills
            </h3>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              These are the standardized skill IDs SkillRoute selected from the
              ESCO search. They are portable across sectors and explain where
              each match came from.
            </p>
          </div>
          {identifiedSkills.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              No ESCO skills were accepted for this profile.
            </div>
          ) : (
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {identifiedSkills.map((skill) => (
                <article
                  key={skill.concept_uri}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-zinc-950">
                      {skill.preferred_label}
                    </h4>
                    <span
                      className={`shrink-0 rounded border px-2 py-1 text-xs font-semibold ${skillConfidenceClass(
                        skill.confidence,
                      )}`}
                    >
                      {skillConfidenceLabel(skill.confidence)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    User signal: {skill.user_skill}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Evidence: {skill.evidence_quote}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-200 pt-3 text-xs">
                    <span className="break-all text-zinc-500">
                      {skill.concept_uri}
                    </span>
                    <span className="shrink-0 font-semibold text-cyan-800">
                      {skill.similarity.toFixed(3)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Opportunity matches
            </p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-950">
              Best fitting ESCO jobs
            </h3>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Jobs are ranked by overlap between the final skill profile and
              each occupation&apos;s ESCO skill requirements.
            </p>
          </div>
          {topJobs.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              No occupation paths found from the current ESCO matches.
            </div>
          ) : (
            <ol className="divide-y divide-zinc-200">
              {topJobs.map((path, index) => {
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
                    className="grid gap-4 px-4 py-4 lg:grid-cols-[3rem_minmax(0,1fr)_18rem]"
                  >
                    <p className="text-2xl font-semibold text-cyan-800">
                      {index + 1}
                    </p>
                    <div className="min-w-0">
                      <h4 className="text-lg font-semibold text-zinc-950">
                        {path.preferred_label}
                      </h4>
                      <p className="mt-1 break-all text-xs text-zinc-500">
                        {path.occupation_uri}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-zinc-700">
                        {path.explanation}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {path.matched_skill_labels.map((label) => (
                          <span
                            key={`${path.occupation_uri}-${label}`}
                            className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-950"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      <details className="mt-4 rounded-md border border-zinc-200 bg-zinc-50">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-zinc-950">
                          Show full occupation skill list
                        </summary>
                        {path.required_skills?.length ? (
                          <div className="grid max-h-72 gap-2 overflow-auto border-t border-zinc-200 p-2 sm:grid-cols-2">
                            {path.required_skills.map((skill) => (
                              <div
                                key={skill.skill_uri}
                                className={`rounded border px-3 py-2 text-sm ${
                                  skill.person_has
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                                    : "border-zinc-200 bg-white text-zinc-700"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-medium">
                                    {skill.skill_label}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                                      skill.person_has
                                        ? "bg-emerald-800 text-white"
                                        : "bg-zinc-200 text-zinc-700"
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
                          <p className="border-t border-zinc-200 p-3 text-sm text-zinc-500">
                            Full skill list was not returned for this occupation.
                          </p>
                        )}
                      </details>
                    </div>
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Fit score
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-cyan-800">
                        {matchedSkillCount}/{path.required_skill_count ?? "-"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        skills matched
                      </p>
                      <div className="mt-3 space-y-1 text-xs leading-5">
                        <p>
                          Matched skills: {matchedSkillCount} * 100 ={" "}
                          {formatScoreValue(matchedSkillScore, 0)}
                        </p>
                        <p>
                          Essential skills: {matchedEssentialSkillCount} * 25 ={" "}
                          {formatScoreValue(matchedEssentialScore, 0)}
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
                          Relation penalty: -
                          {formatScoreValue(path.relation_rank, 0)}
                        </p>
                      </div>
                      <p className="mt-3 border-t border-zinc-200 pt-2 text-sm font-semibold text-zinc-950">
                        Final rank score: {formatScoreValue(path.rank_score)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Coverage: {formatCoveragePercent(path.skill_coverage)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Export and actions
              </p>
              <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                Save or restart this RouteMap
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                The machine-readable JSON keeps the ESCO skill IDs, job IDs,
                score components, and metadata for reuse by another system.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button
                type="button"
                className="h-9 rounded-md bg-zinc-950 px-3 text-white hover:bg-cyan-800"
                onClick={() => void copyProfileJson()}
              >
                Copy JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-md border-zinc-300 px-3"
                onClick={downloadProfileJson}
              >
                Download JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-md border-zinc-300 px-3"
                onClick={viewProfileJson}
              >
                View JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-md border-zinc-300 px-3"
                onClick={resetSurvey}
              >
                New profile
              </Button>
            </div>
          </div>
        </section>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-zinc-950">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-4 border-b border-zinc-300 pb-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              SkillRoute
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              Skills intelligence for unmapped youth opportunity.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
              SkillRoute turns lived experience into ESCO-grounded skill
              profiles and transparent job routes that a young person,
              navigator, or training provider can understand.
            </p>
          </div>
          <nav className="rounded-md border border-zinc-300 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              Workspace
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-950"
              >
                SkillRoute
              </Link>
              <Link
                href="/tools"
                className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-cyan-700 hover:text-cyan-800"
              >
                ESCO tools
              </Link>
            </div>
          </nav>
        </section>

        {viewPhase === "chat" ? renderProcessOverview("discover") : null}
        {viewPhase === "results" && profile ? renderProcessOverview("review") : null}
        {viewPhase === "results" && profile ? renderResultsView(profile) : null}
        {viewPhase === "loading" ? renderLoadingScreen() : null}
        {viewPhase === "chat" ? renderMiloChat() : null}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
}
