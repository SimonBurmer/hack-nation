import type { IdentifiedSkill, SkillProfile } from "./types";
import { skillConfidenceFromSimilarity } from "./utils";

export function identifiedSkillsForProfile(
  currentProfile: SkillProfile,
): IdentifiedSkill[] {
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
