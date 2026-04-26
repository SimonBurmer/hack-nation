export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

export type RequiredSurveyField =
  | "age"
  | "location"
  | "languages"
  | "work_authorization"
  | "educational_level"
  | "favorite_skill"
  | "years_experience_total"
  | "skill_confidence";

export type SurveyData = {
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

export type IntakeAnalysis = SurveyData & {
  missing_fields: RequiredSurveyField[];
  assistant_message: string;
  user_requested_result: boolean;
  ready_to_generate: boolean;
  error?: string;
};

export type CalculationStage =
  | "idle"
  | "collected"
  | "extracting"
  | "grounding"
  | "done";
export type ViewPhase = "chat" | "loading" | "results" | "opportunities";
export type JourneyStep = "discovery" | "profile" | "opportunities";

export type EvidenceItem = {
  id: string;
  category: string;
  skill_label?: string;
  evidence_quote: string;
  competency: string;
  plain_language_label: string;
  mapped?: boolean;
};

export type IdentifiedSkill = {
  concept_uri: string;
  preferred_label: string;
  user_skill: string;
  evidence_quote: string;
  database_query: string;
  similarity: number;
  confidence: "strong" | "medium" | "needs_review";
};

export type OccupationRequiredSkill = {
  skill_uri: string;
  skill_label: string;
  relation_types: string[];
  skill_types: string[];
  person_has: boolean;
};

export type OccupationPath = {
  occupation_uri: string;
  preferred_label: string;
  iscoGroup?: string | null;
  isco_group?: string | null;
  isco_08_major_code?: string | null;
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

export type SkillProfile = {
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

export type WorkspacePanel = "profile" | "admin";
export type SkillDecision = "accepted" | "declined";

export type SignalWeightKey =
  | "skillFit"
  | "localDemand"
  | "wageFloor"
  | "growth"
  | "automationResilience"
  | "trainingAccess";

export type ProtocolSource = {
  id: string;
  label: string;
  provider: string;
  dataset: string;
  year: string;
  updateCycle: string;
  status: "connected" | "needs_upload" | "demo";
};

export type EconometricSignal = {
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

export type LocalOpportunity = {
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

export type OpportunityProtocolConfig = {
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

export type LocalOpportunityMatch = LocalOpportunity & {
  score: number;
  matchedKeywords: string[];
  relatedOccupationLabels: string[];
  scoreParts: Record<SignalWeightKey, number>;
};

export type CachedProfile = {
  profile: SkillProfile;
  cached_at: string;
};
