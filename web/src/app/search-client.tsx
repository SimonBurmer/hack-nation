"use client";

import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  Check,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileJson,
  Hash,
  Layers3,
  Plus,
  Sigma,
  Table2,
  X,
} from "lucide-react";
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
type ViewPhase = "chat" | "loading" | "results" | "opportunities";
type JourneyStep = "discovery" | "profile" | "opportunities";

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

type WorkspacePanel = "profile" | "admin";
type SkillDecision = "accepted" | "declined";

type SignalWeightKey =
  | "skillFit"
  | "localDemand"
  | "wageFloor"
  | "growth"
  | "automationResilience"
  | "trainingAccess";

type ProtocolSource = {
  id: string;
  label: string;
  provider: string;
  dataset: string;
  year: string;
  updateCycle: string;
  status: "connected" | "needs_upload" | "demo";
};

type EconometricSignal = {
  id: string;
  category: string;
  label: string;
  value: string;
  unit: string;
  sourceId: string;
  year: string;
  interpretation: string;
  userVisible: boolean;
};

type LocalOpportunity = {
  id: string;
  title: string;
  sector: string;
  opportunityType: string;
  iscoGroup: string;
  locationFit: string;
  requiredEducation: string;
  skillKeywords: string[];
  demandLevel: number;
  wageFloorSignal: number;
  wageFloor: string;
  growthOutlook: number;
  automationExposure: number;
  trainingAccess: number;
  trainingPathway: string;
  sourceIds: string[];
};

type OpportunityProtocolConfig = {
  id: string;
  version: string;
  contextName: string;
  countryCode: string;
  region: string;
  locale: string;
  language: string;
  currency: string;
  educationTaxonomy: string;
  opportunityTypes: string[];
  automationCalibration: string;
  signalWeights: Record<SignalWeightKey, number>;
  sources: ProtocolSource[];
  econometricSignals: EconometricSignal[];
  opportunities: LocalOpportunity[];
};

type LocalOpportunityMatch = LocalOpportunity & {
  score: number;
  matchedKeywords: string[];
  relatedOccupationLabels: string[];
  scoreParts: Record<SignalWeightKey, number>;
};

const signalWeightLabels: Record<SignalWeightKey, string> = {
  skillFit: "Skill fit",
  localDemand: "Local demand",
  wageFloor: "Wage signal",
  growth: "Growth",
  automationResilience: "AI resilience",
  trainingAccess: "Training access",
};

const initialOpportunityProtocols: OpportunityProtocolConfig[] = [
  {
    id: "ghana-urban-informal",
    version: "opportunity-protocol-v0.1",
    contextName: "Ghana · urban informal repair",
    countryCode: "GH",
    region: "Greater Accra",
    locale: "en-GH",
    language: "English",
    currency: "GHS",
    educationTaxonomy: "Ghana SHS / TVET / informal apprenticeship",
    opportunityTypes: [
      "formal employment",
      "self-employment",
      "apprenticeship",
      "short training",
    ],
    automationCalibration:
      "Lower digital infrastructure and high in-person service demand reduce near-term substitution for repair and customer-facing work.",
    signalWeights: {
      skillFit: 36,
      localDemand: 18,
      wageFloor: 12,
      growth: 12,
      automationResilience: 12,
      trainingAccess: 10,
    },
    sources: [
      {
        id: "ilostat",
        label: "Employment and youth labor indicators",
        provider: "ILO",
        dataset: "ILOSTAT",
        year: "latest admin upload",
        updateCycle: "annual",
        status: "needs_upload",
      },
      {
        id: "wdi",
        label: "Macro and education context",
        provider: "World Bank",
        dataset: "World Development Indicators",
        year: "latest admin upload",
        updateCycle: "annual",
        status: "needs_upload",
      },
      {
        id: "local-jobs",
        label: "Local vacancies and training places",
        provider: "Program partner",
        dataset: "CSV / API feed",
        year: "pilot sample",
        updateCycle: "monthly",
        status: "demo",
      },
      {
        id: "itu",
        label: "Connectivity constraint",
        provider: "ITU",
        dataset: "Digital Development indicators",
        year: "latest admin upload",
        updateCycle: "annual",
        status: "needs_upload",
      },
    ],
    econometricSignals: [
      {
        id: "youth_neet",
        category: "Youth employment",
        label: "Youth not in employment, education, or training",
        value: "admin upload",
        unit: "% of youth",
        sourceId: "ilostat",
        year: "latest",
        interpretation:
          "High values push the matching layer toward reachable entry routes and training-linked work.",
        userVisible: true,
      },
      {
        id: "services_employment",
        category: "Sector structure",
        label: "Employment in services",
        value: "admin upload",
        unit: "% of employment",
        sourceId: "ilostat",
        year: "latest",
        interpretation:
          "Service-sector weight helps rank repair, retail, customer support, and field-service routes.",
        userVisible: true,
      },
      {
        id: "mobile_broadband",
        category: "Digital constraint",
        label: "Mobile broadband access",
        value: "admin upload",
        unit: "subscriptions / 100 people",
        sourceId: "itu",
        year: "latest",
        interpretation:
          "Connectivity changes how realistic remote digital work is for the local context.",
        userVisible: true,
      },
    ],
    opportunities: [
      {
        id: "mobile-repair-technician",
        title: "Mobile phone repair technician",
        sector: "repair services",
        opportunityType: "self-employment or shop employment",
        iscoGroup: "7422",
        locationFit: "urban and peri-urban repair markets",
        requiredEducation: "SHS or informal apprenticeship",
        skillKeywords: [
          "phone repair",
          "diagnosing charging problems",
          "replacing screens",
          "customer communication",
          "keeping records",
        ],
        demandLevel: 4,
        wageFloorSignal: 3,
        wageFloor: "admin local wage floor",
        growthOutlook: 3,
        automationExposure: 1,
        trainingAccess: 4,
        trainingPathway: "repair apprenticeship, TVET short module, parts vendor network",
        sourceIds: ["local-jobs", "ilostat"],
      },
      {
        id: "device-support-assistant",
        title: "Device support and customer service assistant",
        sector: "retail and repair services",
        opportunityType: "formal employment",
        iscoGroup: "5249",
        locationFit: "phone shops, electronics retail, call-in support desks",
        requiredEducation: "SHS plus customer-facing experience",
        skillKeywords: [
          "customer communication",
          "phone repair",
          "records",
          "basic html",
          "javascript",
        ],
        demandLevel: 3,
        wageFloorSignal: 3,
        wageFloor: "admin local wage floor",
        growthOutlook: 3,
        automationExposure: 2,
        trainingAccess: 3,
        trainingPathway: "retail service onboarding and basic digital-support certificate",
        sourceIds: ["local-jobs", "ilostat", "itu"],
      },
      {
        id: "junior-web-maintenance",
        title: "Junior web maintenance assistant",
        sector: "digital services",
        opportunityType: "remote or local gig",
        iscoGroup: "3514",
        locationFit: "requires reliable mobile broadband and portfolio evidence",
        requiredEducation: "portfolio accepted; certificate helpful",
        skillKeywords: [
          "html",
          "javascript",
          "records",
          "customer communication",
        ],
        demandLevel: 2,
        wageFloorSignal: 3,
        wageFloor: "admin local gig-rate sample",
        growthOutlook: 4,
        automationExposure: 3,
        trainingAccess: 3,
        trainingPathway: "portfolio tasks, web basics course, supervised small-business sites",
        sourceIds: ["local-jobs", "itu"],
      },
    ],
  },
  {
    id: "india-rural-agri",
    version: "opportunity-protocol-v0.1",
    contextName: "India · rural agricultural services",
    countryCode: "IN",
    region: "rural district pilot",
    locale: "en-IN",
    language: "English / local-language UI pack",
    currency: "INR",
    educationTaxonomy: "Class 10 / Class 12 / ITI / local training certificate",
    opportunityTypes: [
      "seasonal work",
      "self-employment",
      "field service",
      "training pathway",
    ],
    automationCalibration:
      "Mechanization risk differs by farm size, irrigation access, and local equipment availability.",
    signalWeights: {
      skillFit: 34,
      localDemand: 20,
      wageFloor: 10,
      growth: 14,
      automationResilience: 10,
      trainingAccess: 12,
    },
    sources: [
      {
        id: "ilostat",
        label: "Employment and sector status",
        provider: "ILO",
        dataset: "ILOSTAT",
        year: "latest admin upload",
        updateCycle: "annual",
        status: "needs_upload",
      },
      {
        id: "wdi",
        label: "Rural development indicators",
        provider: "World Bank",
        dataset: "World Development Indicators",
        year: "latest admin upload",
        updateCycle: "annual",
        status: "needs_upload",
      },
      {
        id: "district-feed",
        label: "District job, training, and cooperative feed",
        provider: "State / NGO partner",
        dataset: "CSV / API feed",
        year: "pilot sample",
        updateCycle: "monthly",
        status: "demo",
      },
      {
        id: "itu",
        label: "Connectivity constraint",
        provider: "ITU",
        dataset: "Digital Development indicators",
        year: "latest admin upload",
        updateCycle: "annual",
        status: "needs_upload",
      },
    ],
    econometricSignals: [
      {
        id: "agri_employment",
        category: "Sector structure",
        label: "Employment in agriculture",
        value: "admin upload",
        unit: "% of employment",
        sourceId: "ilostat",
        year: "latest",
        interpretation:
          "Agricultural employment share changes how heavily the engine ranks farm-service and equipment pathways.",
        userVisible: true,
      },
      {
        id: "youth_lfp",
        category: "Youth labor market",
        label: "Youth labor force participation",
        value: "admin upload",
        unit: "% of youth",
        sourceId: "ilostat",
        year: "latest",
        interpretation:
          "Participation levels help distinguish job scarcity from skill-recognition gaps.",
        userVisible: true,
      },
      {
        id: "mobile_broadband",
        category: "Digital constraint",
        label: "Mobile broadband access",
        value: "admin upload",
        unit: "subscriptions / 100 people",
        sourceId: "itu",
        year: "latest",
        interpretation:
          "Connectivity determines whether remote data-collection and platform work are realistic.",
        userVisible: true,
      },
    ],
    opportunities: [
      {
        id: "solar-pump-service",
        title: "Solar pump service assistant",
        sector: "agri equipment",
        opportunityType: "field service",
        iscoGroup: "7412",
        locationFit: "villages with irrigation and solar equipment programs",
        requiredEducation: "Class 10 or ITI-equivalent electrical basics",
        skillKeywords: [
          "repair",
          "diagnosing problems",
          "customer communication",
          "records",
          "tools",
        ],
        demandLevel: 4,
        wageFloorSignal: 3,
        wageFloor: "admin local wage floor",
        growthOutlook: 4,
        automationExposure: 1,
        trainingAccess: 3,
        trainingPathway: "equipment vendor certificate or NGO field-service course",
        sourceIds: ["district-feed", "wdi"],
      },
      {
        id: "agri-input-sales",
        title: "Agri-input sales and service assistant",
        sector: "agricultural retail",
        opportunityType: "formal or cooperative employment",
        iscoGroup: "5223",
        locationFit: "market towns and cooperative networks",
        requiredEducation: "Class 12 preferred; local language fluency required",
        skillKeywords: [
          "customer communication",
          "keeping records",
          "sales",
          "languages",
        ],
        demandLevel: 3,
        wageFloorSignal: 3,
        wageFloor: "admin local wage floor",
        growthOutlook: 3,
        automationExposure: 2,
        trainingAccess: 4,
        trainingPathway: "cooperative onboarding plus inventory and payments training",
        sourceIds: ["district-feed", "ilostat"],
      },
      {
        id: "farm-data-collector",
        title: "Farm data collection enumerator",
        sector: "development and agri data",
        opportunityType: "seasonal contract",
        iscoGroup: "4227",
        locationFit: "requires mobile access and travel to nearby villages",
        requiredEducation: "Class 12, smartphone literacy, local language",
        skillKeywords: [
          "records",
          "customer communication",
          "basic coding",
          "data",
          "languages",
        ],
        demandLevel: 2,
        wageFloorSignal: 2,
        wageFloor: "admin survey-rate sample",
        growthOutlook: 3,
        automationExposure: 3,
        trainingAccess: 3,
        trainingPathway: "enumerator training, digital form practice, supervisor shadowing",
        sourceIds: ["district-feed", "itu"],
      },
    ],
  },
];

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

const AMARA_DEMO_CACHE_KEY = "skillroute:amara-demo-skill-profile:v1";

type CachedProfile = {
  profile: SkillProfile;
  cached_at: string;
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
    return "I have the important intake data now. I am building your Skill Profile and matching it against ESCO.";
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
  return "Possible ESCO fit";
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

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampFivePointScale(value: number) {
  if (!Number.isFinite(value)) return 1;

  return Math.min(Math.max(Math.round(value), 1), 5);
}

function readCachedProfile(cacheKey: string) {
  try {
    const cachedValue = window.localStorage.getItem(cacheKey);
    if (!cachedValue) return null;

    const cachedProfile = JSON.parse(cachedValue) as CachedProfile;
    if (!cachedProfile.profile?.export_metadata) return null;

    return cachedProfile;
  } catch {
    return null;
  }
}

function writeCachedProfile(cacheKey: string, profile: SkillProfile) {
  try {
    const cachedProfile: CachedProfile = {
      profile,
      cached_at: new Date().toISOString(),
    };

    window.localStorage.setItem(cacheKey, JSON.stringify(cachedProfile));
  } catch {
    // Cache failures should never block the user from seeing the profile.
  }
}

function keywordMatchesProfile(keyword: string, profileText: string) {
  const normalizedKeyword = keyword.toLowerCase().trim();

  if (!normalizedKeyword) return false;
  if (profileText.includes(normalizedKeyword)) return true;

  const importantWords = normalizedKeyword
    .split(/\s+/)
    .filter((word) => word.length > 3);

  return (
    importantWords.length > 0 &&
    importantWords.every((word) => profileText.includes(word))
  );
}

function sourceLabelFor(config: OpportunityProtocolConfig, sourceId: string) {
  const source = config.sources.find((item) => item.id === sourceId);

  return source ? `${source.provider} ${source.dataset}` : sourceId;
}

function protocolValidationIssues(config: OpportunityProtocolConfig) {
  const issues: string[] = [];

  if (!config.countryCode.trim()) issues.push("Country code is missing.");
  if (!config.region.trim()) issues.push("Region is missing.");
  if (!config.educationTaxonomy.trim()) {
    issues.push("Education taxonomy is missing.");
  }
  if (config.sources.length === 0) issues.push("At least one data source is needed.");
  if (config.econometricSignals.filter((signal) => signal.userVisible).length < 2) {
    issues.push("At least two user-visible econometric signals are needed.");
  }
  if (config.opportunities.length === 0) {
    issues.push("At least one local opportunity record is needed.");
  }

  return issues;
}

function buildLocalOpportunityMatches(
  config: OpportunityProtocolConfig,
  survey: SurveyData,
  identifiedSkills: IdentifiedSkill[],
  topJobs: OccupationPath[],
): LocalOpportunityMatch[] {
  const skillText = [
    ...survey.skills,
    ...survey.demonstrated_competencies,
    survey.favorite_skill,
    survey.current_industry,
    survey.target_industries.join(" "),
    ...identifiedSkills.flatMap((skill) => [
      skill.preferred_label,
      skill.user_skill,
      skill.database_query,
    ]),
    ...topJobs.flatMap((job) => [
      job.preferred_label,
      job.matched_skill_labels.join(" "),
    ]),
  ]
    .join(" ")
    .toLowerCase();
  const totalWeight = Object.values(config.signalWeights).reduce(
    (sum, weight) => sum + weight,
    0,
  );

  return config.opportunities
    .map((opportunity) => {
      const matchedKeywords = opportunity.skillKeywords.filter((keyword) =>
        keywordMatchesProfile(keyword, skillText),
      );
      const skillFit =
        opportunity.skillKeywords.length > 0
          ? matchedKeywords.length / opportunity.skillKeywords.length
          : 0;
      const scoreParts: Record<SignalWeightKey, number> = {
        skillFit,
        localDemand: opportunity.demandLevel / 5,
        wageFloor: opportunity.wageFloorSignal / 5,
        growth: opportunity.growthOutlook / 5,
        automationResilience: (5 - opportunity.automationExposure) / 4,
        trainingAccess: opportunity.trainingAccess / 5,
      };
      const score =
        Object.entries(scoreParts).reduce((sum, [key, value]) => {
          return sum + value * config.signalWeights[key as SignalWeightKey];
        }, 0) / totalWeight;
      const relatedOccupationLabels = topJobs
        .filter((job) => {
          const label = job.preferred_label.toLowerCase();
          const sector = opportunity.sector.toLowerCase();

          return (
            label.includes(sector) ||
            sector.includes(label) ||
            opportunity.skillKeywords.some((keyword) =>
              job.matched_skill_labels.join(" ").toLowerCase().includes(
                keyword.toLowerCase(),
              ),
            )
          );
        })
        .slice(0, 2)
        .map((job) => job.preferred_label);

      return {
        ...opportunity,
        score,
        matchedKeywords,
        relatedOccupationLabels,
        scoreParts,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function parseCsvHeaderLine(line: string) {
  const columns: string[] = [];
  let current = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      isQuoted = !isQuoted;
      continue;
    }

    if (char === "," && !isQuoted) {
      columns.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  columns.push(current.trim());

  return columns.filter(Boolean);
}

type SearchClientProps = {
  workspacePanel?: WorkspacePanel;
};

export function SearchClient({
  workspacePanel = "profile",
}: SearchClientProps = {}) {
  const [opportunityProtocols, setOpportunityProtocols] = useState(
    initialOpportunityProtocols,
  );
  const [selectedOpportunityConfigId, setSelectedOpportunityConfigId] =
    useState(initialOpportunityProtocols[0].id);
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
  const [protocolStatus, setProtocolStatus] = useState("");
  const [skillDecisions, setSkillDecisions] = useState<
    Record<string, SkillDecision>
  >({});
  const [showProtocolDefinitionJson, setShowProtocolDefinitionJson] =
    useState(false);
  const [adminCsvFileName, setAdminCsvFileName] = useState("");
  const [adminCsvColumns, setAdminCsvColumns] = useState<string[]>([]);
  const [adminIscoColumn, setAdminIscoColumn] = useState("");

  const selectedOpportunityConfig =
    opportunityProtocols.find(
      (config) => config.id === selectedOpportunityConfigId,
    ) ?? opportunityProtocols[0];

  const profileJson = useMemo(() => {
    return profile ? JSON.stringify(profile, null, 2) : "";
  }, [profile]);
  const opportunityProtocolJson = useMemo(() => {
    return JSON.stringify(selectedOpportunityConfig, null, 2);
  }, [selectedOpportunityConfig]);
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
    cacheKey?: string,
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
          "Milo is grounding the signals against ESCO and building the Skill Profile.",
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
            targetSectors: [
              ...new Set(
                selectedOpportunityConfig.opportunities.map(
                  (opportunity) => opportunity.sector,
                ),
              ),
            ],
            opportunityProtocol: {
              version: selectedOpportunityConfig.version,
              contextId: selectedOpportunityConfig.id,
              countryCode: selectedOpportunityConfig.countryCode,
              region: selectedOpportunityConfig.region,
              locale: selectedOpportunityConfig.locale,
              educationTaxonomy: selectedOpportunityConfig.educationTaxonomy,
              sourceIds: selectedOpportunityConfig.sources.map(
                (source) => source.id,
              ),
              weights: selectedOpportunityConfig.signalWeights,
            },
          },
        }),
      });
      const payload = (await response.json()) as SkillProfile;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Profile generation failed.");
      }

      if (cacheKey) {
        writeCachedProfile(cacheKey, payload);
      }

      setProfile(payload);
      setSkillDecisions({});
      setCalculationStage("done");
      setViewPhase("results");
      setProfileStatus(
        cacheKey
          ? "Skill profile generated and cached for next time."
          : "Skill profile generated.",
      );
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
    const cachedProfile = readCachedProfile(AMARA_DEMO_CACHE_KEY);

    setProfile(null);
    setSkillDecisions({});
    setError("");
    setSelectedOpportunityConfigId("ghana-urban-informal");
    setIsAnalyzingIntake(false);
    setSurveyData(amaraSurveyData);
    setProfileMessages([
      ...amaraDemoMessages,
      {
        role: "assistant",
        content: cachedProfile
          ? "I have Amara's cached Skill Profile ready."
          : "I have Amara's core signal. I am building her Skill Profile now.",
      },
    ]);

    if (cachedProfile) {
      setProfile(cachedProfile.profile);
      setCalculationStage("done");
      setViewPhase("results");
      setProfileStatus("Loaded cached Amara Skill Profile. No API call used.");
      setIsGeneratingProfile(false);
      return;
    }

    setCalculationStage("collected");
    setViewPhase("loading");
    void generateProfile(
      amaraDemoMessages,
      amaraSurveyData,
      false,
      AMARA_DEMO_CACHE_KEY,
    );
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

  async function previewAdminCsvColumns(file: File | undefined) {
    if (!file) return;

    const text = await file.text();
    const headerLine =
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean) ?? "";
    const columns = parseCsvHeaderLine(headerLine);
    const guessedIscoColumn =
      columns.find((column) => /isco.*(1|one|digit|major|group)/i.test(column)) ||
      columns.find((column) => /^isco(_|-|\s)?code$/i.test(column)) ||
      columns.find((column) => /isco/i.test(column)) ||
      columns[0] ||
      "";

    setAdminCsvFileName(file.name);
    setAdminCsvColumns(columns);
    setAdminIscoColumn(guessedIscoColumn);
    setProtocolStatus(
      columns.length > 0
        ? `Read ${columns.length} column names from ${file.name}. No row data was imported.`
        : `Could not find column names in ${file.name}.`,
    );
  }

  async function copyOpportunityProtocolJson() {
    await navigator.clipboard.writeText(opportunityProtocolJson);
    setProtocolStatus("Opportunity protocol JSON copied.");
  }

  function updateSelectedOpportunityConfig(
    updater: (config: OpportunityProtocolConfig) => OpportunityProtocolConfig,
  ) {
    setOpportunityProtocols((configs) =>
      configs.map((config) =>
        config.id === selectedOpportunityConfig.id ? updater(config) : config,
      ),
    );
    setProtocolStatus("Protocol draft updated.");
  }

  function updateProtocolField<K extends keyof OpportunityProtocolConfig>(
    field: K,
    value: OpportunityProtocolConfig[K],
  ) {
    updateSelectedOpportunityConfig((config) => ({
      ...config,
      [field]: value,
    }));
  }

  function updateSignalWeight(field: SignalWeightKey, value: number) {
    updateSelectedOpportunityConfig((config) => ({
      ...config,
      signalWeights: {
        ...config.signalWeights,
        [field]: Math.min(Math.max(Math.round(value), 0), 100),
      },
    }));
  }

  function updateProtocolSource(
    index: number,
    field: keyof ProtocolSource,
    value: string,
  ) {
    updateSelectedOpportunityConfig((config) => ({
      ...config,
      sources: config.sources.map((source, sourceIndex) =>
        sourceIndex === index
          ? {
              ...source,
              [field]:
                field === "status"
                  ? (value as ProtocolSource["status"])
                  : value,
            }
          : source,
      ),
    }));
  }

  function updateEconometricSignal(
    index: number,
    field: keyof EconometricSignal,
    value: string | boolean,
  ) {
    updateSelectedOpportunityConfig((config) => ({
      ...config,
      econometricSignals: config.econometricSignals.map((signal, signalIndex) =>
        signalIndex === index
          ? {
              ...signal,
              [field]: value,
            }
          : signal,
      ),
    }));
  }

  function updateLocalOpportunity(
    index: number,
    field: keyof LocalOpportunity,
    value: string | number | string[],
  ) {
    updateSelectedOpportunityConfig((config) => ({
      ...config,
      opportunities: config.opportunities.map((opportunity, opportunityIndex) =>
        opportunityIndex === index
          ? {
              ...opportunity,
              [field]: value,
            }
          : opportunity,
      ),
    }));
  }

  function resetSurvey() {
    setProfile(null);
    setProfileStatus("");
    setError("");
    setSkillDecisions({});
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
        id: "discovery",
        title: "Skill discovery engine",
        description: "Share age, location, lived experience, tools, and skills.",
      },
      {
        id: "profile",
        title: "Your skill profile",
        description: "Review ESCO skill matches and accept or decline each one.",
      },
      {
        id: "opportunities",
        title: "Your opportunities",
        description: "See local routes and ESCO jobs from accepted skills.",
      },
    ];
    const activeIndex = steps.findIndex((step) => step.id === activeStep);

    function handleJourneyStepClick(step: JourneyStep) {
      if (step === "discovery") {
        setViewPhase("chat");
        return;
      }

      if (!profile) return;

      setViewPhase(step === "profile" ? "results" : "opportunities");
    }

    return (
      <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            User journey
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950">
            Three views from discovery to opportunity
          </h2>
        </div>
        <ol className="grid gap-0 md:grid-cols-3">
          {steps.map((step, index) => {
            const isActive = index === activeIndex;
            const canNavigate = step.id === "discovery" || Boolean(profile);

            return (
              <li
                key={step.id}
                className={`border-b border-zinc-200 px-4 py-4 md:border-b-0 md:border-r md:last:border-r-0 ${
                  isActive ? "bg-cyan-50" : "bg-white"
                }`}
              >
                <button
                  type="button"
                  className={`flex w-full items-start gap-3 text-left ${
                    canNavigate
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-60"
                  }`}
                  onClick={() => handleJourneyStepClick(step.id)}
                  disabled={!canNavigate}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-semibold ${
                      isActive
                        ? "border-cyan-700 bg-cyan-700 text-white"
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
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }

  function renderAdminProtocolPanel() {
    const iscoMajorGroups = [
      {
        code: "0",
        title: "Armed forces",
        example: "military and defense roles",
        tone: "bg-zinc-950 text-white",
      },
      {
        code: "1",
        title: "Managers",
        example: "shop owner, operations lead",
        tone: "bg-cyan-900 text-white",
      },
      {
        code: "2",
        title: "Professionals",
        example: "engineer, teacher, developer",
        tone: "bg-indigo-900 text-white",
      },
      {
        code: "3",
        title: "Technicians",
        example: "ICT support, lab technician",
        tone: "bg-sky-800 text-white",
      },
      {
        code: "4",
        title: "Clerical support",
        example: "records, office, data entry",
        tone: "bg-teal-800 text-white",
      },
      {
        code: "5",
        title: "Service and sales",
        example: "retail, customer support",
        tone: "bg-emerald-800 text-white",
      },
      {
        code: "6",
        title: "Skilled agriculture",
        example: "farm, forestry, fishery",
        tone: "bg-lime-800 text-white",
      },
      {
        code: "7",
        title: "Craft and trades",
        example: "repair, electrical, mechanics",
        tone: "bg-amber-700 text-white",
      },
      {
        code: "8",
        title: "Machine operators",
        example: "drivers, plant operators",
        tone: "bg-orange-800 text-white",
      },
      {
        code: "9",
        title: "Elementary roles",
        example: "helpers, cleaners, laborers",
        tone: "bg-rose-800 text-white",
      },
    ];
    const diagramDataPoints = [
      {
        label: "Wage floors",
        detail: "minimum realistic earnings",
        position: "left-4 top-8",
        connector: "left-[24%] top-[25%] w-[18%] rotate-[18deg]",
      },
      {
        label: "Sector growth",
        detail: "where demand is expanding",
        position: "right-4 top-8",
        connector: "right-[24%] top-[25%] w-[18%] -rotate-[18deg]",
      },
      {
        label: "Education returns",
        detail: "credential value by path",
        position: "left-10 top-[42%]",
        connector: "left-[26%] top-[49%] w-[16%]",
      },
      {
        label: "Local jobs",
        detail: "real openings and pathways",
        position: "right-10 top-[42%]",
        connector: "right-[26%] top-[49%] w-[16%]",
      },
      {
        label: "Training supply",
        detail: "available seats and costs",
        position: "left-4 bottom-8",
        connector: "left-[24%] bottom-[25%] w-[18%] -rotate-[18deg]",
      },
      {
        label: "Automation risk",
        detail: "task exposure by occupation",
        position: "right-4 bottom-8",
        connector: "right-[24%] bottom-[25%] w-[18%] rotate-[18deg]",
      },
    ];
    const uploadBlueprints = [
      {
        name: "wage_floors.csv",
        required: "isco_code, region, wage_floor_value, currency, source_year",
        mapsTo: "income floor by ISCO first digit",
      },
      {
        name: "sector_growth.csv",
        required: "isco_code, sector_code, employment_share, growth_rate",
        mapsTo: "demand signal by ISCO first digit",
      },
      {
        name: "education_returns.csv",
        required: "isco_code, education_level, wage_premium, employment_rate",
        mapsTo: "credential payoff by ISCO first digit",
      },
      {
        name: "local_opportunities.csv",
        required: "opportunity_id, title, isco_code, region, entry_barriers",
        mapsTo: "reachable paths by ISCO first digit",
      },
      {
        name: "training_supply.csv",
        required: "training_id, provider, isco_code, duration, cost, credential",
        mapsTo: "next steps by ISCO first digit",
      },
      {
        name: "automation_exposure.csv",
        required: "isco_code, exposure_score, calibration_context, source_year",
        mapsTo: "resilience signal by ISCO first digit",
      },
    ];
    const iscoTableBlueprints = uploadBlueprints.map((blueprint) => ({
      table: blueprint.name.replace(".csv", ""),
      owner: "CSV upload",
      requiredColumns: blueprint.required,
      primaryKeyStory: "first ISCO digit joins this table to the dashboard",
      aggregate: blueprint.mapsTo,
      dashboardUse: blueprint.mapsTo,
    }));
    const aggregatePreviewRows = [
      {
        code: "3",
        label: "Technicians",
        wage: "mid",
        growth: "+",
        educationReturn: "TVET strong",
        opportunities: 42,
      },
    ];

    if (String(workspacePanel) === "admin") {
      return (
        <section className="grid gap-5">
          <section className="overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Admin setup
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
                Every dataset connects through ISCO.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                Partners upload CSVs with an `isco_code` column. The dashboard
                groups each row by the first digit, so wage, growth, education,
                training, and risk data all speak one shared occupation language.
              </p>
            </div>

            <div className="relative min-h-[34rem] overflow-hidden bg-[#f8faf8] p-4 sm:p-6">
              <div className="absolute inset-x-8 top-1/2 hidden h-px bg-zinc-300 md:block" />
              <div className="absolute inset-y-8 left-1/2 hidden w-px bg-zinc-300 md:block" />
              {diagramDataPoints.map((point) => (
                <div key={point.label}>
                  <div
                    className={`absolute hidden h-px origin-center bg-cyan-700/50 md:block ${point.connector}`}
                  />
                  <article
                    className={`relative z-10 mb-3 rounded-md border border-zinc-300 bg-white p-3 shadow-sm md:absolute md:mb-0 md:w-52 ${point.position}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                      Data point
                    </p>
                    <h3 className="mt-2 font-semibold text-zinc-950">
                      {point.label}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      {point.detail}
                    </p>
                  </article>
                </div>
              ))}

              <div className="relative z-20 mx-auto mt-4 grid max-w-sm place-items-center rounded-md border border-zinc-900 bg-zinc-950 px-5 py-8 text-center text-white shadow-lg md:absolute md:left-1/2 md:top-1/2 md:mt-0 md:-translate-x-1/2 md:-translate-y-1/2">
                <Hash className="size-8 text-cyan-200" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Primary key
                </p>
                <h3 className="mt-2 font-mono text-5xl font-semibold">
                  ISCO
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Use the first digit of `isco_code` to aggregate all local
                  opportunity evidence into one dashboard spine.
                </p>
                <p className="mt-4 rounded border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 font-mono text-sm text-cyan-50">
                  7422 -&gt; 7
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                ISCO first digit
              </p>
              <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                What the major group means
              </h3>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-5">
              {iscoMajorGroups.map((group) => (
                <article
                  key={group.code}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="grid h-10 w-10 place-items-center rounded-md bg-zinc-950 font-mono text-xl font-semibold text-white">
                      {group.code}
                    </p>
                    <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-zinc-600">
                      ISCO-{group.code}
                    </span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-zinc-950">
                    {group.title}
                  </h4>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    {group.example}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <div className="grid gap-4 border-b border-zinc-200 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  CSV intake UI
                </p>
                <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                  Upload one CSV and select the ISCO column
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  The UI reads only the header row to show column names. The
                  admin chooses which column contains the ISCO first-digit code;
                  no row data is imported, stored, or aggregated.
                </p>
              </div>
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-cyan-800">
                <Plus className="size-4" />
                Upload CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) =>
                    void previewAdminCsvColumns(event.target.files?.[0])
                  }
                />
              </label>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
              <aside className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Uploaded file
                </p>
                <h4 className="mt-2 break-all font-mono text-sm font-semibold text-zinc-950">
                  {adminCsvFileName || "No CSV selected"}
                </h4>
                <div className="mt-3 rounded-md border border-dashed border-zinc-300 bg-white px-3 py-6 text-center">
                  <Table2 className="mx-auto size-6 text-cyan-700" />
                  <p className="mt-2 text-sm font-semibold text-zinc-950">
                    Header preview only
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    SkillRoute reads column names from the first non-empty row.
                  </p>
                </div>
                <label className="mt-3 grid gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    ISCO 1 code column
                  </span>
                  <select
                    value={adminIscoColumn}
                    onChange={(event) => setAdminIscoColumn(event.target.value)}
                    disabled={adminCsvColumns.length === 0}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15 disabled:bg-zinc-100 disabled:text-zinc-400"
                  >
                    {adminCsvColumns.length === 0 ? (
                      <option value="">Upload a CSV first</option>
                    ) : (
                      adminCsvColumns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </aside>

              <section className="rounded-md border border-zinc-200 bg-white">
                <div className="border-b border-zinc-200 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                    CSV columns
                  </p>
                  <h4 className="mt-1 font-semibold text-zinc-950">
                    ISCO column is pinned first
                  </h4>
                </div>
                {adminCsvColumns.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-zinc-500">
                    Upload a CSV to preview its column names.
                  </div>
                ) : (
                  <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      adminIscoColumn,
                      ...adminCsvColumns.filter(
                        (column) => column !== adminIscoColumn,
                      ),
                    ]
                      .filter(Boolean)
                      .map((column, index) => {
                        const isIscoColumn = column === adminIscoColumn;

                        return (
                          <div
                            key={`${column}-${index}`}
                            className={`rounded-md border px-3 py-2 ${
                              isIscoColumn
                                ? "border-cyan-400 bg-cyan-50 text-cyan-950"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="break-all font-mono text-sm font-semibold">
                                {column}
                              </span>
                              {isIscoColumn ? (
                                <span className="shrink-0 rounded bg-cyan-800 px-2 py-0.5 text-xs font-semibold text-white">
                                  ISCO
                                </span>
                              ) : (
                                <span className="shrink-0 rounded bg-white px-2 py-0.5 text-xs font-semibold text-zinc-500">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                            {isIscoColumn ? (
                              <p className="mt-2 text-xs leading-5">
                                This column will be displayed first and used as
                                the ISCO first-digit key later.
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                )}
              </section>
            </div>

            {protocolStatus ? (
              <p className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
                {protocolStatus}
              </p>
            ) : null}
          </section>
        </section>
      );
    }

    const showLegacyAdminMock = Boolean(null);

    if (showLegacyAdminMock && String(workspacePanel) === "admin") {
      return (
        <section className="grid gap-5">
          <section className="overflow-hidden rounded-md border border-zinc-300 bg-zinc-950 text-white shadow-sm">
            <div className="grid gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Admin workspace
                </p>
                <h2 className="mt-3 max-w-4xl text-4xl font-semibold tracking-normal">
                  ISCO-first aggregation layer for Module 03.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
                  Every uploaded labor-market table declares an ISCO code. The
                  dashboard extracts the first digit and uses it as the primary
                  key for wage floors, growth, education returns, opportunity
                  supply, training supply, and automation exposure.
                </p>
              </div>
              <div className="rounded-md border border-cyan-300/30 bg-cyan-300/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">
                  Primary key
                </p>
                <p className="mt-3 font-mono text-4xl font-semibold text-white">
                  isco_code[0]
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-50">
                  Example: 7422 becomes major group 7, then joins every local
                  evidence table for craft and trades pathways.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="rounded-md border border-zinc-300 bg-white shadow-sm">
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  ISCO major groups
                </p>
                <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                  The first digit is the aggregation spine
                </h3>
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-5">
                {iscoMajorGroups.map((group) => (
                  <article
                    key={group.code}
                    className={`rounded-md p-3 shadow-sm ${group.tone}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-3xl font-semibold">
                        {group.code}
                      </p>
                      <Hash className="mt-1 size-4 opacity-70" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold">
                      {group.title}
                    </h4>
                    <p className="mt-1 text-xs leading-5 opacity-85">
                      {group.example}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="rounded-md border border-zinc-300 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Table builder
              </p>
              <h3 className="mt-2 text-lg font-semibold text-zinc-950">
                Add a source table
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                The UI shows the intended action only. No upload, parsing, or
                aggregation logic is implemented yet.
              </p>
              <Button
                type="button"
                className="mt-4 h-10 w-full rounded-md bg-zinc-950 text-white hover:bg-cyan-800"
                onClick={() =>
                  setProtocolStatus(
                    "Table builder is a UI placeholder; aggregation logic is not implemented.",
                  )
                }
              >
                <Plus />
                Add table
              </Button>
              {protocolStatus ? (
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  {protocolStatus}
                </p>
              ) : null}
            </aside>
          </section>

          <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Source tables
              </p>
              <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                Each table rolls up by ISCO first digit
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[76rem] border-collapse text-left text-sm">
                <thead className="bg-zinc-950 text-xs uppercase tracking-[0.12em] text-zinc-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Table</th>
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold">Required columns</th>
                    <th className="px-4 py-3 font-semibold">ISCO key story</th>
                    <th className="px-4 py-3 font-semibold">Aggregate output</th>
                    <th className="px-4 py-3 font-semibold">Dashboard use</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {iscoTableBlueprints.map((blueprint) => (
                    <tr key={blueprint.table} className="align-top">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Table2 className="size-4 text-cyan-700" />
                          <span className="font-mono text-xs font-semibold text-zinc-950">
                            {blueprint.table}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-zinc-700">
                        {blueprint.owner}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs leading-5 text-zinc-700">
                        {blueprint.requiredColumns}
                      </td>
                      <td className="px-4 py-4 leading-6 text-zinc-700">
                        {blueprint.primaryKeyStory}
                      </td>
                      <td className="px-4 py-4 leading-6 text-zinc-700">
                        {blueprint.aggregate}
                      </td>
                      <td className="px-4 py-4 leading-6 text-zinc-700">
                        {blueprint.dashboardUse}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="rounded-md border border-zinc-300 bg-white shadow-sm">
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Aggregation preview
                </p>
                <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                  Policymaker table by ISCO major group
                </h3>
              </div>
              <div className="grid gap-3 p-4">
                {aggregatePreviewRows.map((row) => (
                  <article
                    key={row.code}
                    className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-[4rem_minmax(0,1fr)_repeat(4,7rem)] md:items-center"
                  >
                    <p className="grid h-12 w-12 place-items-center rounded-md bg-zinc-950 font-mono text-2xl font-semibold text-white">
                      {row.code}
                    </p>
                    <div>
                      <h4 className="font-semibold text-zinc-950">
                        {row.label}
                      </h4>
                      <p className="mt-1 text-xs text-zinc-500">
                        group key: isco_major_group={row.code}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        Wage
                      </p>
                      <p className="mt-1 font-semibold text-zinc-950">
                        {row.wage}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        Growth
                      </p>
                      <p className="mt-1 font-semibold text-emerald-700">
                        {row.growth}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        Education
                      </p>
                      <p className="mt-1 text-sm font-semibold text-zinc-950">
                        {row.educationReturn}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        Paths
                      </p>
                      <p className="mt-1 font-semibold text-cyan-800">
                        {row.opportunities}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="grid gap-4">
              <div className="rounded-md border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800">
                  Youth matching story
                </p>
                <div className="mt-4 grid gap-3 text-sm text-cyan-950">
                  {[
                    ["1", "Skill profile produces ESCO skills and occupations."],
                    ["2", "Occupation codes map into ISCO major groups."],
                    ["3", "Local tables aggregate by the first ISCO digit."],
                    ["4", "Dashboard ranks reachable paths, not fantasy jobs."],
                  ].map(([step, label]) => (
                    <div key={step} className="flex items-start gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-800 text-xs font-semibold text-white">
                        {step}
                      </span>
                      <p className="leading-6">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-zinc-300 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Data model
                </p>
                <div className="mt-3 grid gap-2">
                  {[
                    ["raw table", "isco_code"],
                    ["transform", "left(isco_code, 1)"],
                    ["primary key", "isco_major_group"],
                    ["aggregate", "wage + growth + education + supply"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3 rounded border border-zinc-200 bg-zinc-50 px-3 py-2"
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        {label}
                      </span>
                      <span className="font-mono text-xs font-semibold text-zinc-950">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>

          <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <div className="grid gap-4 px-4 py-4 md:grid-cols-4">
              {[
                [Layers3, "6", "source tables"],
                [Hash, "10", "ISCO groups"],
                [Sigma, "1", "primary key"],
                [BarChart3, "2", "interfaces"],
              ].map(([Icon, value, label]) => {
                const MetricIcon = Icon as typeof Layers3;

                return (
                  <div
                    key={label as string}
                    className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                  >
                    <MetricIcon className="size-5 text-cyan-700" />
                    <p className="mt-3 text-2xl font-semibold text-zinc-950">
                      {value as string}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      {label as string}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </section>
      );
    }

    const dashboardDataRows = [
      {
        row: "Geography context",
        fields:
          "country_code, admin_region, urban_rural, local_currency, locale, language_pack",
        source: "Government admin data / program configuration",
        youthUse:
          "Shows which labor market the recommendations are grounded in.",
        policyUse:
          "Lets a program officer compare regions without changing code.",
      },
      {
        row: "Education taxonomy",
        fields:
          "local_education_level, credential_name, credential_level_order, equivalent_isced_level",
        source: "Ministry of Education / TVET authority",
        youthUse:
          "Translates the user's education into locally meaningful requirements.",
        policyUse:
          "Shows which opportunities are reachable by education level.",
      },
      {
        row: "Wage floors",
        fields:
          "occupation_or_sector_code, region, wage_floor_value, currency, period, source_year",
        source: "ILOSTAT, labor ministry, wage survey, GLD",
        youthUse:
          "Prevents recommendations that look good but pay below a realistic floor.",
        policyUse:
          "Highlights sectors where opportunity quality is weak.",
      },
      {
        row: "Sector employment",
        fields:
          "sector_code, sector_name, employment_count_or_share, age_band, gender_optional, source_year",
        source: "ILOSTAT, WDI, national labor force survey",
        youthUse:
          "Shows whether a sector is large enough locally to be reachable.",
        policyUse:
          "Shows where youth employment is concentrated.",
      },
      {
        row: "Sector growth",
        fields:
          "sector_code, region, employment_growth_rate, growth_period, confidence_flag",
        source: "Data360 Growth & Jobs, labor force survey, WBES",
        youthUse:
          "Ranks pathways with evidence of expanding demand above shrinking paths.",
        policyUse:
          "Surfaces sectors where training capacity may need to grow.",
      },
      {
        row: "Returns to education",
        fields:
          "education_level, sector_or_occupation_code, wage_premium_or_employment_rate, source_year",
        source: "WDI, GLD, household surveys, STEP",
        youthUse:
          "Explains whether an extra credential is likely to improve opportunity.",
        policyUse:
          "Shows whether education pathways are paying off locally.",
      },
      {
        row: "Local opportunity catalog",
        fields:
          "opportunity_id, title, occupation_code, sector_code, opportunity_type, region, required_education, entry_barriers",
        source: "Employer feed, NGO programs, training providers, public job board",
        youthUse:
          "Connects skills to reachable jobs, self-employment, gig, and training paths.",
        policyUse:
          "Shows which pathways are available and where coverage is missing.",
      },
      {
        row: "Skill requirements",
        fields:
          "opportunity_id, skill_uri_or_label, taxonomy, required_level, essential_or_optional",
        source: "ESCO / ISCO / O*NET mapping plus local employer validation",
        youthUse:
          "Compares the generated skill profile against each reachable pathway.",
        policyUse:
          "Aggregates skill gaps by sector and region.",
      },
      {
        row: "Automation exposure",
        fields:
          "occupation_code, task_code_optional, exposure_score, calibration_context, source_year",
        source: "Frey-Osborne, ILO task indices, STEP, local calibration",
        youthUse:
          "Marks paths that may be less resilient and suggests adjacent skills.",
        policyUse:
          "Shows where reskilling pressure is rising.",
      },
      {
        row: "Digital access constraint",
        fields:
          "region, broadband_access_value, smartphone_or_mobile_money_optional, source_year",
        source: "ITU, Findex, national digital access surveys",
        youthUse:
          "Keeps remote or digital work recommendations honest.",
        policyUse:
          "Separates skill gaps from infrastructure gaps.",
      },
      {
        row: "Training pathways",
        fields:
          "training_id, provider, region, skills_taught, duration, cost, credential, eligibility",
        source: "TVET providers, NGOs, government programs",
        youthUse:
          "Turns a skill gap into a reachable next step.",
        policyUse:
          "Shows where training supply does not match labor demand.",
      },
      {
        row: "Data provenance",
        fields:
          "source_id, provider, dataset_name, update_cycle, license, last_updated, quality_flag",
        source: "Every connected dataset",
        youthUse:
          "Makes recommendations explainable and trustworthy.",
        policyUse:
          "Lets program staff audit stale, missing, or low-quality data.",
      },
    ];
    const protocolDefinitionJson = JSON.stringify(
      {
        protocol: "opportunity_matching_econometric_dashboard",
        version: "0.1",
        purpose:
          "Connect an ESCO-grounded skill profile to realistic local opportunities using labor-market evidence.",
        required_row_groups: dashboardDataRows.map((dataRow) => ({
          name: dataRow.row,
          required_fields: dataRow.fields.split(", "),
          example_source: dataRow.source,
          youth_view_use: dataRow.youthUse,
          policy_view_use: dataRow.policyUse,
        })),
        minimum_user_visible_signals: [
          "wage_floors",
          "sector_employment_growth",
          "returns_to_education",
        ],
        matching_inputs: [
          "skill_profile.esco_skill_uris",
          "skill_profile.evidence_quotes",
          "skill_profile.location",
          "skill_profile.education_level",
          "local_opportunity_catalog",
          "local_econometric_signals",
        ],
        dual_interface_outputs: {
          youth_user: [
            "reachable opportunity matches",
            "plain-language match explanation",
            "wage and growth signals",
            "skill gaps and training next steps",
          ],
          policymaker_or_program_officer: [
            "aggregate skill gaps",
            "sector opportunity coverage",
            "education-to-opportunity returns",
            "data quality and coverage flags",
          ],
        },
      },
      null,
      2,
    );

    if (workspacePanel === "admin") {
      return (
        <section className="grid gap-5">
          <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <div className="grid gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Admin setup
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
                  Opportunity Matching Data Contract
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                  This page defines the rows a government, NGO, training
                  provider, or employer must provide before the econometric
                  dashboard can produce honest local recommendations. No manual
                  matching happens here; these rows are inputs to the protocol.
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Module 03 contract
                </p>
                <p className="mt-2 text-lg font-semibold text-zinc-950">
                  {dashboardDataRows.length} required row groups
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Minimum dashboard signals: wage floors, sector employment
                  growth, returns to education, and reachable opportunity
                  records.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Required rows
              </p>
              <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                Data needed for the dashboard to work
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
                <thead className="bg-zinc-950 text-xs uppercase tracking-[0.12em] text-zinc-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Row group</th>
                    <th className="px-4 py-3 font-semibold">Required fields</th>
                    <th className="px-4 py-3 font-semibold">Example source</th>
                    <th className="px-4 py-3 font-semibold">Youth view use</th>
                    <th className="px-4 py-3 font-semibold">Policy view use</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {dashboardDataRows.map((dataRow) => (
                    <tr key={dataRow.row} className="align-top">
                      <td className="px-4 py-4 font-semibold text-zinc-950">
                        {dataRow.row}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs leading-5 text-zinc-700">
                        {dataRow.fields}
                      </td>
                      <td className="px-4 py-4 text-zinc-700">
                        {dataRow.source}
                      </td>
                      <td className="px-4 py-4 leading-6 text-zinc-700">
                        {dataRow.youthUse}
                      </td>
                      <td className="px-4 py-4 leading-6 text-zinc-700">
                        {dataRow.policyUse}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Protocol definition
                </p>
                <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                  Machine-readable data contract
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Open the JSON definition to see the exact row groups, fields,
                  inputs, and outputs expected by Module 03.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-md border-zinc-300"
                onClick={() =>
                  setShowProtocolDefinitionJson((isVisible) => !isVisible)
                }
              >
                <FileJson />
                {showProtocolDefinitionJson ? "Hide JSON" : "Show JSON"}
              </Button>
            </div>
            {showProtocolDefinitionJson ? (
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words border-t border-zinc-200 bg-zinc-950 p-4 text-xs leading-5 text-zinc-50">
                {protocolDefinitionJson}
              </pre>
            ) : null}
          </section>
        </section>
      );
    }

    const validationIssues = protocolValidationIssues(selectedOpportunityConfig);
    const sourceOptions = selectedOpportunityConfig.sources.map((source) => ({
      id: source.id,
      label: `${source.provider} · ${source.dataset}`,
    }));

    return (
      <section className="grid gap-5">
        <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="grid gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Admin setup
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
                Opportunity Data Protocol
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                Stakeholders configure the local labor-market layer here:
                sources, education mapping, opportunity types, econometric
                signals, and scoring weights. The youth flow consumes this
                protocol after the ESCO skill profile is generated.
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Protocol health
              </p>
              <p
                className={`mt-2 text-lg font-semibold ${
                  validationIssues.length === 0
                    ? "text-emerald-800"
                    : "text-amber-800"
                }`}
              >
                {validationIssues.length === 0 ? "Ready" : "Needs review"}
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                {validationIssues.length === 0
                  ? "The minimum challenge contract is present."
                  : validationIssues[0]}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Context switch
            </p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-950">
              Configure once, reuse across countries
            </h3>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="grid gap-2">
              {opportunityProtocols.map((config) => (
                <Button
                  key={config.id}
                  type="button"
                  variant={
                    config.id === selectedOpportunityConfig.id
                      ? "default"
                      : "outline"
                  }
                  className={`h-auto justify-start rounded-md px-3 py-3 text-left ${
                    config.id === selectedOpportunityConfig.id
                      ? "bg-zinc-950 text-white"
                      : "border-zinc-300"
                  }`}
                  onClick={() => {
                    setSelectedOpportunityConfigId(config.id);
                    setProtocolStatus(`${config.contextName} selected.`);
                  }}
                >
                  <Database />
                  <span>
                    <span className="block font-semibold">
                      {config.contextName}
                    </span>
                    <span className="block text-xs opacity-80">
                      {config.countryCode} · {config.locale}
                    </span>
                  </span>
                </Button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Context name
                </span>
                <input
                  value={selectedOpportunityConfig.contextName}
                  onChange={(event) =>
                    updateProtocolField("contextName", event.target.value)
                  }
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Country code
                </span>
                <input
                  value={selectedOpportunityConfig.countryCode}
                  onChange={(event) =>
                    updateProtocolField("countryCode", event.target.value)
                  }
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Region
                </span>
                <input
                  value={selectedOpportunityConfig.region}
                  onChange={(event) =>
                    updateProtocolField("region", event.target.value)
                  }
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Locale
                </span>
                <input
                  value={selectedOpportunityConfig.locale}
                  onChange={(event) =>
                    updateProtocolField("locale", event.target.value)
                  }
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  UI language
                </span>
                <input
                  value={selectedOpportunityConfig.language}
                  onChange={(event) =>
                    updateProtocolField("language", event.target.value)
                  }
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Currency
                </span>
                <input
                  value={selectedOpportunityConfig.currency}
                  onChange={(event) =>
                    updateProtocolField("currency", event.target.value)
                  }
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                />
              </label>
              <label className="grid gap-1.5 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Education taxonomy
                </span>
                <input
                  value={selectedOpportunityConfig.educationTaxonomy}
                  onChange={(event) =>
                    updateProtocolField(
                      "educationTaxonomy",
                      event.target.value,
                    )
                  }
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Opportunity types
                </span>
                <input
                  value={selectedOpportunityConfig.opportunityTypes.join(", ")}
                  onChange={(event) =>
                    updateProtocolField(
                      "opportunityTypes",
                      splitCsv(event.target.value),
                    )
                  }
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                />
              </label>
              <label className="grid gap-1.5 md:col-span-2 xl:col-span-3">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Automation calibration
                </span>
                <textarea
                  value={selectedOpportunityConfig.automationCalibration}
                  onChange={(event) =>
                    updateProtocolField(
                      "automationCalibration",
                      event.target.value,
                    )
                  }
                  className="min-h-20 resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Data sources
            </p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-950">
              Inputs a partner can upload or connect
            </h3>
          </div>
          <div className="divide-y divide-zinc-200">
            {selectedOpportunityConfig.sources.map((source, index) => (
              <div
                key={source.id}
                className="grid gap-3 px-4 py-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_8rem_8rem]"
              >
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-zinc-500">
                    Label
                  </span>
                  <input
                    value={source.label}
                    onChange={(event) =>
                      updateProtocolSource(index, "label", event.target.value)
                    }
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-zinc-500">
                    Provider
                  </span>
                  <input
                    value={source.provider}
                    onChange={(event) =>
                      updateProtocolSource(index, "provider", event.target.value)
                    }
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-zinc-500">
                    Dataset
                  </span>
                  <input
                    value={source.dataset}
                    onChange={(event) =>
                      updateProtocolSource(index, "dataset", event.target.value)
                    }
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-zinc-500">
                    Year
                  </span>
                  <input
                    value={source.year}
                    onChange={(event) =>
                      updateProtocolSource(index, "year", event.target.value)
                    }
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-zinc-500">
                    Status
                  </span>
                  <select
                    value={source.status}
                    onChange={(event) =>
                      updateProtocolSource(index, "status", event.target.value)
                    }
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                  >
                    <option value="connected">connected</option>
                    <option value="needs_upload">needs upload</option>
                    <option value="demo">demo</option>
                  </select>
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Econometric signals
            </p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-950">
              The numbers the youth user will see
            </h3>
          </div>
          <div className="divide-y divide-zinc-200">
            {selectedOpportunityConfig.econometricSignals.map(
              (signal, index) => (
                <div
                  key={signal.id}
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_9rem_8rem_12rem_9rem]"
                >
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-zinc-500">
                      Signal label
                    </span>
                    <input
                      value={signal.label}
                      onChange={(event) =>
                        updateEconometricSignal(
                          index,
                          "label",
                          event.target.value,
                        )
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-zinc-500">
                      Value
                    </span>
                    <input
                      value={signal.value}
                      onChange={(event) =>
                        updateEconometricSignal(
                          index,
                          "value",
                          event.target.value,
                        )
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-zinc-500">
                      Unit
                    </span>
                    <input
                      value={signal.unit}
                      onChange={(event) =>
                        updateEconometricSignal(
                          index,
                          "unit",
                          event.target.value,
                        )
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-zinc-500">
                      Source
                    </span>
                    <select
                      value={signal.sourceId}
                      onChange={(event) =>
                        updateEconometricSignal(
                          index,
                          "sourceId",
                          event.target.value,
                        )
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                    >
                      {sourceOptions.map((source) => (
                        <option key={source.id} value={source.id}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-end gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={signal.userVisible}
                      onChange={(event) =>
                        updateEconometricSignal(
                          index,
                          "userVisible",
                          event.target.checked,
                        )
                      }
                    />
                    User visible
                  </label>
                  <label className="grid gap-1.5 lg:col-span-5">
                    <span className="text-xs font-medium text-zinc-500">
                      User interpretation
                    </span>
                    <input
                      value={signal.interpretation}
                      onChange={(event) =>
                        updateEconometricSignal(
                          index,
                          "interpretation",
                          event.target.value,
                        )
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                    />
                  </label>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Scoring weights
            </p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-950">
              Policy knobs for local ranking
            </h3>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(signalWeightLabels) as SignalWeightKey[]).map(
              (field) => (
                <label
                  key={field}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-zinc-950">
                      {signalWeightLabels[field]}
                    </span>
                    <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-zinc-700">
                      {selectedOpportunityConfig.signalWeights[field]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={selectedOpportunityConfig.signalWeights[field]}
                    onChange={(event) =>
                      updateSignalWeight(field, Number(event.target.value))
                    }
                    className="mt-3 w-full accent-cyan-700"
                  />
                </label>
              ),
            )}
          </div>
        </section>

        <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Local opportunities
            </p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-950">
              Job and pathway records
            </h3>
          </div>
          <div className="divide-y divide-zinc-200">
            {selectedOpportunityConfig.opportunities.map(
              (opportunity, index) => (
                <article key={opportunity.id} className="grid gap-4 px-4 py-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_14rem]">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium text-zinc-500">
                        Local title
                      </span>
                      <input
                        value={opportunity.title}
                        onChange={(event) =>
                          updateLocalOpportunity(
                            index,
                            "title",
                            event.target.value,
                          )
                        }
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium text-zinc-500">
                        Sector
                      </span>
                      <input
                        value={opportunity.sector}
                        onChange={(event) =>
                          updateLocalOpportunity(
                            index,
                            "sector",
                            event.target.value,
                          )
                        }
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium text-zinc-500">
                        Type
                      </span>
                      <input
                        value={opportunity.opportunityType}
                        onChange={(event) =>
                          updateLocalOpportunity(
                            index,
                            "opportunityType",
                            event.target.value,
                          )
                        }
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium text-zinc-500">
                        Skill keywords
                      </span>
                      <input
                        value={opportunity.skillKeywords.join(", ")}
                        onChange={(event) =>
                          updateLocalOpportunity(
                            index,
                            "skillKeywords",
                            splitCsv(event.target.value),
                          )
                        }
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium text-zinc-500">
                        Required education
                      </span>
                      <input
                        value={opportunity.requiredEducation}
                        onChange={(event) =>
                          updateLocalOpportunity(
                            index,
                            "requiredEducation",
                            event.target.value,
                          )
                        }
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium text-zinc-500">
                        Wage signal
                      </span>
                      <input
                        value={opportunity.wageFloor}
                        onChange={(event) =>
                          updateLocalOpportunity(
                            index,
                            "wageFloor",
                            event.target.value,
                          )
                        }
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {(
                      [
                        ["demandLevel", "Demand"],
                        ["wageFloorSignal", "Wage"],
                        ["growthOutlook", "Growth"],
                        ["automationExposure", "AI exposure"],
                        ["trainingAccess", "Training"],
                      ] as Array<[keyof LocalOpportunity, string]>
                    ).map(([field, label]) => (
                      <label
                        key={field}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-600">
                            {label}
                          </span>
                          <span className="text-xs font-semibold text-zinc-950">
                            {opportunity[field] as number}/5
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          value={opportunity[field] as number}
                          onChange={(event) =>
                            updateLocalOpportunity(
                              index,
                              field,
                              clampFivePointScale(Number(event.target.value)),
                            )
                          }
                          className="mt-2 w-full accent-cyan-700"
                        />
                      </label>
                    ))}
                  </div>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-zinc-500">
                      Entry pathway
                    </span>
                    <input
                      value={opportunity.trainingPathway}
                      onChange={(event) =>
                        updateLocalOpportunity(
                          index,
                          "trainingPathway",
                          event.target.value,
                        )
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
                    />
                  </label>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Protocol export
              </p>
              <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                Machine-readable contract
              </h3>
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border border-zinc-200 bg-zinc-950 p-3 text-xs leading-5 text-zinc-50">
                {opportunityProtocolJson}
              </pre>
            </div>
            <div className="grid gap-2">
              <Button
                type="button"
                className="h-9 rounded-md bg-zinc-950 text-white hover:bg-cyan-800"
                onClick={() => void copyOpportunityProtocolJson()}
              >
                <FileJson />
                Copy protocol JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-md border-zinc-300"
                onClick={() => {
                  setProtocolStatus("Protocol validated for this demo context.");
                }}
              >
                <ClipboardCheck />
                Validate protocol
              </Button>
              <Link
                href="/"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50"
              >
                <BriefcaseBusiness />
                Use in youth flow
              </Link>
              {protocolStatus ? (
                <p className="text-sm leading-6 text-zinc-600">
                  {protocolStatus}
                </p>
              ) : null}
            </div>
          </div>
        </section>
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
                ? "Generating Skill Profile"
                : surveyMissing.length > 0
                  ? "Waiting for required info"
                  : "Generate Skill Profile"}
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
                  ? "Ready to generate a Skill Profile."
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
            Building the Skill Profile
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

  function renderOpportunityDashboard(
    identifiedSkills: IdentifiedSkill[],
    topJobs: OccupationPath[],
  ) {
    const localMatches = buildLocalOpportunityMatches(
      selectedOpportunityConfig,
      surveyData,
      identifiedSkills,
      topJobs,
    ).slice(0, 4);
    const visibleSignals = selectedOpportunityConfig.econometricSignals.filter(
      (signal) => signal.userVisible,
    );

    return (
      <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
        <div className="grid gap-5 border-b border-zinc-200 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Local opportunity dashboard
            </p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-950">
              What makes sense in {selectedOpportunityConfig.region}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              These recommendations combine the ESCO skill profile with the
              active local protocol: labor signals, opportunity records,
              education mapping, automation calibration, and stakeholder-set
              weights.
            </p>
          </div>
          <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
              Protocol in use
            </p>
            <p className="mt-2 font-semibold text-cyan-950">
              {selectedOpportunityConfig.contextName}
            </p>
            <p className="mt-1 text-sm leading-6 text-cyan-950">
              {selectedOpportunityConfig.countryCode} ·{" "}
              {selectedOpportunityConfig.locale} ·{" "}
              {selectedOpportunityConfig.currency}
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              {visibleSignals.map((signal) => (
                <article
                  key={signal.id}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {signal.category}
                  </p>
                  <h4 className="mt-2 text-sm font-semibold text-zinc-950">
                    {signal.label}
                  </h4>
                  <p className="mt-2 text-2xl font-semibold text-cyan-800">
                    {signal.value}
                  </p>
                  <p className="text-xs text-zinc-500">{signal.unit}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    {signal.interpretation}
                  </p>
                  <p className="mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-500">
                    Source: {sourceLabelFor(selectedOpportunityConfig, signal.sourceId)}
                  </p>
                </article>
              ))}
            </div>

            <ol className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
              {localMatches.map((match, index) => (
                <li
                  key={match.id}
                  className="grid gap-4 px-4 py-4 lg:grid-cols-[3rem_minmax(0,1fr)_18rem]"
                >
                  <p className="text-2xl font-semibold text-cyan-800">
                    {index + 1}
                  </p>
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold text-zinc-950">
                      {match.title}
                    </h4>
                    <p className="mt-1 text-sm text-zinc-600">
                      {match.sector} · {match.opportunityType} · ISCO{" "}
                      {match.iscoGroup}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-zinc-700">
                      This route is ranked because the profile matches{" "}
                      {match.matchedKeywords.length || "some"} required local
                      skill signal
                      {match.matchedKeywords.length === 1 ? "" : "s"}, with
                      local demand {match.demandLevel}/5 and automation exposure{" "}
                      {match.automationExposure}/5.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {match.matchedKeywords.length > 0 ? (
                        match.matchedKeywords.map((keyword) => (
                          <span
                            key={`${match.id}-${keyword}`}
                            className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-950"
                          >
                            {keyword}
                          </span>
                        ))
                      ) : (
                        <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950">
                          Review skill fit
                        </span>
                      )}
                    </div>
                    <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                      <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          Entry pathway
                        </p>
                        <p className="mt-1 leading-6 text-zinc-700">
                          {match.trainingPathway}
                        </p>
                      </div>
                      <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          Local constraint
                        </p>
                        <p className="mt-1 leading-6 text-zinc-700">
                          {match.locationFit}
                        </p>
                      </div>
                    </div>
                    {match.relatedOccupationLabels.length > 0 ? (
                      <p className="mt-3 text-xs leading-5 text-zinc-500">
                        Related ESCO job match:{" "}
                        {match.relatedOccupationLabels.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Local fit
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-cyan-800">
                      {Math.round(match.score * 100)}%
                    </p>
                    <div className="mt-3 space-y-2 text-xs">
                      {(Object.keys(signalWeightLabels) as SignalWeightKey[]).map(
                        (field) => (
                          <div key={`${match.id}-${field}`}>
                            <div className="flex justify-between gap-2">
                              <span>{signalWeightLabels[field]}</span>
                              <span className="font-semibold">
                                {Math.round(match.scoreParts[field] * 100)}%
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                              <div
                                className="h-full rounded-full bg-cyan-700"
                                style={{
                                  width: `${Math.round(
                                    match.scoreParts[field] * 100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="grid gap-3">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Education mapping
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                {selectedOpportunityConfig.educationTaxonomy}
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Automation calibration
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                {selectedOpportunityConfig.automationCalibration}
              </p>
            </div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Data trace
              </p>
              <div className="mt-2 grid gap-2">
                {selectedOpportunityConfig.sources.map((source) => (
                  <div
                    key={source.id}
                    className="rounded border border-zinc-200 bg-white px-2 py-2 text-xs"
                  >
                    <p className="font-semibold text-zinc-950">
                      {source.provider}
                    </p>
                    <p className="mt-1 text-zinc-600">
                      {source.dataset} · {source.year}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    );
  }

  function identifiedSkillsForProfile(currentProfile: SkillProfile) {
    return (
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
      })
    );
  }

  function renderResultsView(currentProfile: SkillProfile) {
    const extractedSkills =
      currentProfile.extracted_skills ?? currentProfile.experience_evidence;
    const identifiedSkills = identifiedSkillsForProfile(currentProfile);
    const acceptedSkills = identifiedSkills.filter(
      (skill) => skillDecisions[skill.concept_uri] !== "declined",
    );
    const declinedSkillCount = identifiedSkills.length - acceptedSkills.length;

    return (
      <section className="grid gap-5">
        <div className="rounded-md border border-cyan-200 bg-cyan-50 px-4 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800">
            Skill Profile
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
            ESCO-grounded skills for {surveyData.location || "this profile"}
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-cyan-950">
            ESCO is the European Skills, Competences, Qualifications and
            Occupations taxonomy. This page turns a person&apos;s informal
            experience into standardized ESCO skill links, lets the user accept
            or decline each match, and then uses the accepted profile to explain
            fitting job and opportunity paths. It is needed because lived
            experience is often real but hard to compare across training,
            hiring, and support systems.
          </p>
        </div>

        <details className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-950">
            See the system work
          </summary>
          <section className="grid gap-3 border-t border-zinc-200 bg-zinc-50 p-3">
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
        </details>

        <section className="overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="grid gap-4 border-b border-zinc-200 bg-zinc-950 px-4 py-4 text-white lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Final skill profile
              </p>
              <h3 className="mt-1 text-2xl font-semibold tracking-normal">
                Best fitting identified ESCO skills
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
                Review each standardized skill match row by row. Accepted
                skills feed the opportunity view; declined skills stay visible
                for auditability.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded border border-emerald-300/40 bg-emerald-300/10 px-3 py-2">
                <p className="text-2xl font-semibold text-white">
                  {acceptedSkills.length}
                </p>
                <p className="text-xs font-medium text-emerald-100">Accepted</p>
              </div>
              <div className="rounded border border-rose-300/40 bg-rose-300/10 px-3 py-2">
                <p className="text-2xl font-semibold text-white">
                  {declinedSkillCount}
                </p>
                <p className="text-xs font-medium text-rose-100">Declined</p>
              </div>
            </div>
          </div>
          {identifiedSkills.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              No ESCO skills were found for this profile.
            </div>
          ) : (
            <ol className="divide-y divide-zinc-200">
              {identifiedSkills.map((skill, index) => {
                const decision =
                  skillDecisions[skill.concept_uri] ?? "accepted";
                const isAccepted = decision === "accepted";

                return (
                  <li
                    key={skill.concept_uri}
                    className={`grid gap-4 px-4 py-4 lg:grid-cols-[3rem_minmax(0,1fr)_17rem] ${
                      isAccepted ? "bg-white" : "bg-rose-50/60"
                    }`}
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-full border border-cyan-200 bg-cyan-50 text-sm font-semibold text-cyan-900">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={skill.concept_uri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-lg font-semibold text-zinc-950 underline-offset-4 hover:text-cyan-800 hover:underline"
                        >
                          {skill.preferred_label}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <span
                          className={`rounded border px-2 py-1 text-xs font-semibold ${skillConfidenceClass(
                            skill.confidence,
                          )}`}
                        >
                          {skillConfidenceLabel(skill.confidence)}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            isAccepted
                              ? "bg-emerald-100 text-emerald-950"
                              : "bg-rose-100 text-rose-950"
                          }`}
                        >
                          {isAccepted ? "Accepted" : "Declined"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-700">
                        User signal: {skill.user_skill}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        Evidence: {skill.evidence_quote}
                      </p>
                      <p className="mt-2 break-all text-xs text-zinc-500">
                        {skill.concept_uri}
                      </p>
                    </div>
                    <div className="grid content-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Match score
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-cyan-800">
                          {skill.similarity.toFixed(3)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          className={`h-9 rounded-md px-3 ${
                            isAccepted
                              ? "bg-emerald-800 text-white hover:bg-emerald-900"
                              : "bg-white text-emerald-900 hover:bg-emerald-50"
                          }`}
                          variant={isAccepted ? "default" : "outline"}
                          onClick={() =>
                            setSkillDecisions((current) => ({
                              ...current,
                              [skill.concept_uri]: "accepted",
                            }))
                          }
                        >
                          <Check />
                          Accept
                        </Button>
                        <Button
                          type="button"
                          className={`h-9 rounded-md px-3 ${
                            isAccepted
                              ? "bg-white text-rose-900 hover:bg-rose-50"
                              : "bg-rose-800 text-white hover:bg-rose-900"
                          }`}
                          variant={isAccepted ? "outline" : "default"}
                          onClick={() =>
                            setSkillDecisions((current) => ({
                              ...current,
                              [skill.concept_uri]: "declined",
                            }))
                          }
                        >
                          <X />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="grid gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <p className="text-sm leading-6 text-zinc-600">
              Save the machine-readable profile or start over with a new
              person.
            </p>
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

        <section className="rounded-md border border-cyan-200 bg-cyan-50 shadow-sm">
          <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800">
                Next view
              </p>
              <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                Your skill opportunities
              </h3>
              <p className="mt-1 text-sm leading-6 text-cyan-950">
                Continue to the dedicated opportunity view to see local routes
                and ESCO job matches based on the accepted skills.
              </p>
            </div>
            <Button
              type="button"
              className="h-10 rounded-md bg-zinc-950 px-4 text-white hover:bg-cyan-800"
              onClick={() => setViewPhase("opportunities")}
            >
              <BriefcaseBusiness />
              View opportunities
            </Button>
          </div>
        </section>

      </section>
    );
  }

  function renderSkillOpportunitiesView(currentProfile: SkillProfile) {
    const identifiedSkills = identifiedSkillsForProfile(currentProfile);
    const acceptedSkills = identifiedSkills.filter(
      (skill) => skillDecisions[skill.concept_uri] !== "declined",
    );
    const topJobs = currentProfile.occupation_paths;

    return (
      <section className="grid gap-5">
        <div className="rounded-md border border-cyan-200 bg-cyan-50 shadow-sm">
          <div className="px-4 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800">
                How this view works
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
                Turning the accepted skill profile into opportunity routes
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-cyan-950">
                This view takes only the ESCO skills the user accepted, compares
                them with the active local opportunity protocol, and shows why
                each route may fit. The first section blends local labor-market
                signals, training pathways, and stakeholder weights; the second
                section shows the ESCO jobs whose required skills overlap with
                the accepted profile.
              </p>
            </div>
          </div>
        </div>

        {renderOpportunityDashboard(acceptedSkills, topJobs)}

        <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Opportunity matches
            </p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-950">
              Best fitting ESCO jobs
            </h3>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Jobs are ranked by overlap between the accepted skill profile and
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
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-zinc-950">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="border-b border-zinc-300 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              {workspacePanel === "admin" ? "Admin Setup" : "Profile Builder"}
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              {workspacePanel === "admin"
                ? "Configure the opportunity protocol."
                : "Skills intelligence for unmapped youth opportunity."}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
              {workspacePanel === "admin"
                ? "Tune local labor-market sources, signal weights, and pathway rules that shape SkillRoute recommendations."
                : "SkillRoute turns lived experience into ESCO-grounded skill profiles and transparent job routes that a young person, navigator, or training provider can understand."}
            </p>
          </div>
        </section>

        {workspacePanel === "admin" ? (
          renderAdminProtocolPanel()
        ) : (
          <>
            {viewPhase === "chat" ? renderProcessOverview("discovery") : null}
            {viewPhase === "results" && profile
              ? renderProcessOverview("profile")
              : null}
            {viewPhase === "opportunities" && profile
              ? renderProcessOverview("opportunities")
              : null}
            {viewPhase === "results" && profile ? renderResultsView(profile) : null}
            {viewPhase === "opportunities" && profile
              ? renderSkillOpportunitiesView(profile)
              : null}
            {viewPhase === "loading" ? renderLoadingScreen() : null}
            {viewPhase === "chat" ? renderMiloChat() : null}
          </>
        )}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
}
