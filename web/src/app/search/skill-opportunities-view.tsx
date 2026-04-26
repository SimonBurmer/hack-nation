"use client";

import { OpportunityDashboard } from "./opportunity-dashboard";
import { identifiedSkillsForProfile } from "./profile-view-utils";
import type {
  OpportunityProtocolConfig,
  SkillDecision,
  SkillProfile,
  SurveyData,
} from "./types";
import {
  formatCoveragePercent,
  formatCoverageValue,
  formatScoreValue,
} from "./utils";

type SkillOpportunitiesViewProps = {
  currentProfile: SkillProfile;
  selectedOpportunityConfig: OpportunityProtocolConfig;
  skillDecisions: Record<string, SkillDecision>;
  surveyData: SurveyData;
};

export function SkillOpportunitiesView({
  currentProfile,
  selectedOpportunityConfig,
  skillDecisions,
  surveyData,
}: SkillOpportunitiesViewProps) {
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
              section shows the ESCO jobs whose required skills overlap with the
              accepted profile.
            </p>
          </div>
        </div>
      </div>

      <details className="rounded-md border border-zinc-300 bg-white shadow-sm">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-950">
          See the system work
        </summary>
        <section className="grid gap-3 border-t border-zinc-200 bg-zinc-50 p-3">
          <details className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-950">
              Step 1: opportunity matches
            </summary>
            {topJobs.length === 0 ? (
              <div className="border-t border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500">
                No occupation paths found from the current ESCO matches.
              </div>
            ) : (
              <ol className="divide-y divide-zinc-200 border-t border-zinc-200">
                {topJobs.map((path, index) => {
                  const matchedSkillCount =
                    path.matched_skill_count ??
                    path.matched_skill_labels.length;
                  const matchedEssentialSkillCount =
                    path.matched_essential_skill_count ?? 0;
                  const matchedSkillScore = matchedSkillCount * 100;
                  const matchedEssentialScore =
                    matchedEssentialSkillCount * 25;
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
                              Full skill list was not returned for this
                              occupation.
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
                            Essential skills: {matchedEssentialSkillCount} * 25
                            = {formatScoreValue(matchedEssentialScore, 0)}
                          </p>
                          <p>
                            Coverage: {formatCoverageValue(path.skill_coverage)}{" "}
                            * 10 = {formatScoreValue(coverageScore)}
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
          </details>

          <details className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-950">
              Step 2:
            </summary>
          </details>
        </section>
      </details>

      <OpportunityDashboard
        identifiedSkills={acceptedSkills}
        selectedOpportunityConfig={selectedOpportunityConfig}
        surveyData={surveyData}
        topJobs={topJobs}
      />
    </section>
  );
}
