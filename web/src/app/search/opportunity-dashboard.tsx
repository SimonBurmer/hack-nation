"use client";

import { signalWeightLabels } from "./data";
import type {
  IdentifiedSkill,
  OccupationPath,
  OpportunityProtocolConfig,
  SignalWeightKey,
  SurveyData,
} from "./types";
import {
  buildLocalOpportunityMatches,
  sourceLabelFor,
} from "./utils";

type OpportunityDashboardProps = {
  identifiedSkills: IdentifiedSkill[];
  selectedOpportunityConfig: OpportunityProtocolConfig;
  surveyData: SurveyData;
  topJobs: OccupationPath[];
};

export function OpportunityDashboard({
  identifiedSkills,
  selectedOpportunityConfig,
  surveyData,
  topJobs,
}: OpportunityDashboardProps) {
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
            These recommendations combine the ESCO skill profile with the active
            local protocol: labor signals, opportunity records, education
            mapping, automation calibration, and stakeholder-set weights.
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
                  Source:{" "}
                  {sourceLabelFor(selectedOpportunityConfig, signal.sourceId)}
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
