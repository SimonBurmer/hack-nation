"use client";

import type {
  IdentifiedSkill,
  LocalOpportunityMatch,
  OccupationPath,
  OpportunityProtocolConfig,
  SurveyData,
} from "./types";
import { buildLocalOpportunityMatches } from "./utils";

type OpportunityDashboardProps = {
  identifiedSkills: IdentifiedSkill[];
  localMatches?: LocalOpportunityMatch[];
  selectedOpportunityConfig: OpportunityProtocolConfig;
  surveyData: SurveyData;
  topJobs: OccupationPath[];
};

export function OpportunityDashboard({
  identifiedSkills,
  localMatches: providedLocalMatches,
  selectedOpportunityConfig,
  surveyData,
  topJobs,
}: OpportunityDashboardProps) {
  const localMatches =
    providedLocalMatches ??
    buildLocalOpportunityMatches(
      selectedOpportunityConfig,
      surveyData,
      identifiedSkills,
      topJobs,
    ).slice(0, 4);

  return (
    <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Recommended opportunities
        </p>
        <h3 className="mt-1 text-xl font-semibold text-zinc-950">
          Final recommendations for {selectedOpportunityConfig.region}
        </h3>
      </div>

      <ol className="divide-y divide-zinc-200">
        {localMatches.map((match, index) => (
          <li
            key={match.id}
            className="grid gap-4 px-4 py-4 lg:grid-cols-[3rem_minmax(0,1fr)_12rem]"
          >
            <p className="text-2xl font-semibold text-cyan-800">{index + 1}</p>
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
                {match.matchedKeywords.length || "some"} required local skill
                signal
                {match.matchedKeywords.length === 1 ? "" : "s"}, with local
                demand {match.demandLevel}/5 and automation exposure{" "}
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
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
