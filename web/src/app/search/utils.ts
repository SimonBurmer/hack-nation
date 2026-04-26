import type {
  CachedProfile,
  ChatMessage,
  IdentifiedSkill,
  LocalOpportunityMatch,
  OpportunityProtocolConfig,
  OccupationPath,
  RequiredSurveyField,
  SignalWeightKey,
  SkillProfile,
  SurveyData,
} from "./types";

export const requiredFieldLabels: Record<RequiredSurveyField, string> = {
  age: "Age",
  location: "Country",
  languages: "Languages",
  work_authorization: "Work authorization",
  educational_level: "Education",
  favorite_skill: "Favorite skill",
  years_experience_total: "Experience",
  skill_confidence: "Skill confidence",
};

export const requiredFieldKeys: RequiredSurveyField[] = [
  "age",
  "location",
  "languages",
  "work_authorization",
  "educational_level",
  "favorite_skill",
  "years_experience_total",
  "skill_confidence",
];

export function missingSurveyFields(data: SurveyData): RequiredSurveyField[] {
  return [
    !data.age ? "age" : "",
    !data.location ? "location" : "",
    (data.languages?.length ?? 0) === 0 ? "languages" : "",
    !data.work_authorization ? "work_authorization" : "",
    !data.educational_level ? "educational_level" : "",
    !data.favorite_skill ? "favorite_skill" : "",
    !data.years_experience_total ? "years_experience_total" : "",
    !data.skill_confidence ? "skill_confidence" : "",
  ].filter(Boolean) as RequiredSurveyField[];
}

export function promptForMissingFields(data: SurveyData) {
  const missing = missingSurveyFields(data);

  if (missing.length === 0) {
    return "I have the important intake data now. I am building your Skill Profile and matching it against ESCO.";
  }

  return `I still need your ${missing
    .slice(0, 3)
    .map((field) => requiredFieldLabels[field])
    .join(", ")}. Send ${missing.length === 1 ? "it" : "them"} when you are ready.`;
}

export function messagesForProfile(messages: ChatMessage[], data: SurveyData) {
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
        `Country: ${data.location || "unknown"}.`,
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

export function formatScoreValue(value: number | undefined, digits = 2) {
  return typeof value === "number" ? value.toFixed(digits) : "-";
}

export function formatCoverageValue(value: number | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

export function formatCoveragePercent(value: number | undefined) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "-";
}

export function listText(items: string[]) {
  return items.join(", ");
}

export function requiredFieldValue(
  data: SurveyData,
  field: RequiredSurveyField,
) {
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
  }
}

export function skillConfidenceLabel(confidence: IdentifiedSkill["confidence"]) {
  if (confidence === "strong") return "Strong ESCO fit";
  if (confidence === "medium") return "Good ESCO fit";
  return "Possible ESCO fit";
}

export function skillConfidenceFromSimilarity(
  similarity: number,
): IdentifiedSkill["confidence"] {
  if (similarity >= 0.78) return "strong";
  if (similarity >= 0.65) return "medium";
  return "needs_review";
}

export function skillConfidenceClass(confidence: IdentifiedSkill["confidence"]) {
  if (confidence === "strong") {
    return "border-emerald-300 bg-emerald-50 text-emerald-950";
  }

  if (confidence === "medium") {
    return "border-sky-300 bg-sky-50 text-sky-950";
  }

  return "border-amber-300 bg-amber-50 text-amber-950";
}

export function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function clampFivePointScale(value: number) {
  if (!Number.isFinite(value)) return 1;

  return Math.min(Math.max(Math.round(value), 1), 5);
}

export function readCachedProfile(cacheKey: string) {
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

export function writeCachedProfile(cacheKey: string, profile: SkillProfile) {
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

export function keywordMatchesProfile(keyword: string, profileText: string) {
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

export function sourceLabelFor(
  config: OpportunityProtocolConfig,
  sourceId: string,
) {
  const source = config.sources.find((item) => item.id === sourceId);

  return source ? `${source.provider} ${source.dataset}` : sourceId;
}

export function protocolValidationIssues(config: OpportunityProtocolConfig) {
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

export function buildLocalOpportunityMatches(
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
              job.matched_skill_labels
                .join(" ")
                .toLowerCase()
                .includes(keyword.toLowerCase()),
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

export function parseCsvHeaderLine(line: string) {
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
