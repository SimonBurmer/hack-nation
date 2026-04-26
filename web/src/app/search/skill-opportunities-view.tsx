"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

import { OpportunityDashboard } from "./opportunity-dashboard";
import { identifiedSkillsForProfile } from "./profile-view-utils";
import type {
  OpportunityFinalConsiderations,
  OpportunityProtocolConfig,
  SkillDecision,
  SkillProfile,
  SurveyData,
} from "./types";
import {
  buildLocalOpportunityMatches,
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

type IscoTrendPoint = {
  year: number;
  value: number;
};

type IscoTrendResponse = {
  error?: string;
  suggestions?: string[];
  location?: string;
  sex?: string;
  ageGroup?: string;
  majorGroup?: string;
  unit?: string;
  points?: IscoTrendPoint[];
  latest?: IscoTrendPoint;
  latestChange?: {
    absolute: number;
    percent: number | null;
  } | null;
  periodChange?: {
    absolute: number;
    percent: number;
  } | null;
  direction?: string;
};

type IscoTrendLookup = {
  majorCode: string;
  path: SkillProfile["occupation_paths"][number];
  status: "loading" | "ready" | "error";
  trend?: IscoTrendResponse;
  error?: string;
  suggestions?: string[];
};

type FinalConsiderationsStatus = "idle" | "loading" | "ready" | "error";

function externalHref(value: string) {
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : null;
}

function iscoMajorCodeForPath(path: SkillProfile["occupation_paths"][number]) {
  if (path.isco_08_major_code) return path.isco_08_major_code;

  const iscoGroup = path.iscoGroup ?? path.isco_group;
  const match = iscoGroup?.trim().match(/^\D*(\d)/);

  return match?.[1] ?? null;
}

function formatTrendValue(value: number | undefined) {
  return typeof value === "number"
    ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : "-";
}

function formatTrendPercent(value: number | null | undefined) {
  if (typeof value !== "number") return "-";

  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatTrendDelta(value: number | undefined) {
  if (typeof value !== "number") return "-";

  return `${value > 0 ? "+" : ""}${value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })}`;
}

function formatRealismLevel(level: string) {
  return level.replace(/_/g, " ");
}

export function SkillOpportunitiesView({
  currentProfile,
  selectedOpportunityConfig,
  skillDecisions,
  surveyData,
}: SkillOpportunitiesViewProps) {
  const identifiedSkills = useMemo(
    () => identifiedSkillsForProfile(currentProfile),
    [currentProfile],
  );
  const acceptedSkills = useMemo(
    () =>
      identifiedSkills.filter(
        (skill) => skillDecisions[skill.concept_uri] !== "declined",
      ),
    [identifiedSkills, skillDecisions],
  );
  const topJobs = currentProfile.occupation_paths;
  const trendSex = "Male";
  const trendLocation = surveyData.location.trim();
  const localMatches = useMemo(
    () =>
      buildLocalOpportunityMatches(
        selectedOpportunityConfig,
        surveyData,
        acceptedSkills,
        topJobs,
      ).slice(0, 4),
    [acceptedSkills, selectedOpportunityConfig, surveyData, topJobs],
  );
  const topTrendJobs = useMemo(
    () =>
      topJobs
        .slice(0, 3)
        .map((path) => ({
          path,
          majorCode: iscoMajorCodeForPath(path),
        }))
        .filter(
          (item): item is {
            path: SkillProfile["occupation_paths"][number];
            majorCode: string;
          } => Boolean(item.majorCode),
        ),
    [topJobs],
  );
  const [trendLookups, setTrendLookups] = useState<IscoTrendLookup[]>([]);
  const [finalConsiderationsStatus, setFinalConsiderationsStatus] =
    useState<FinalConsiderationsStatus>("idle");
  const [finalConsiderations, setFinalConsiderations] =
    useState<OpportunityFinalConsiderations | null>(null);
  const [finalConsiderationsError, setFinalConsiderationsError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    if (!trendLocation || topTrendJobs.length === 0) {
      queueMicrotask(() => {
        if (isCurrent) setTrendLookups([]);
      });
      return () => {
        isCurrent = false;
      };
    }

    queueMicrotask(() => {
      if (!isCurrent) return;
      setTrendLookups(
        topTrendJobs.map(({ path, majorCode }) => ({
          path,
          majorCode,
          status: "loading",
        })),
      );
    });

    void Promise.all(
      topTrendJobs.map(async ({ path, majorCode }) => {
        try {
          const response = await fetch("/api/isco-trend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: trendLocation,
              sex: trendSex,
              majorCode,
            }),
          });
          const payload = (await response.json()) as IscoTrendResponse;

          if (!response.ok || payload.error) {
            return {
              path,
              majorCode,
              status: "error" as const,
              error: payload.error || "Trend lookup failed.",
              suggestions: payload.suggestions,
            };
          }

          return {
            path,
            majorCode,
            status: "ready" as const,
            trend: payload,
          };
        } catch (error) {
          return {
            path,
            majorCode,
            status: "error" as const,
            error:
              error instanceof Error ? error.message : "Trend lookup failed.",
          };
        }
      }),
    ).then((lookups) => {
      if (isCurrent) setTrendLookups(lookups);
    });

    return () => {
      isCurrent = false;
    };
  }, [topTrendJobs, trendLocation]);

  useEffect(() => {
    let isCurrent = true;
    const resetFinalConsiderations = () => {
      queueMicrotask(() => {
        if (!isCurrent) return;
        setFinalConsiderationsStatus("idle");
        setFinalConsiderations(null);
        setFinalConsiderationsError("");
      });
    };

    if (localMatches.length === 0) {
      resetFinalConsiderations();
      return () => {
        isCurrent = false;
      };
    }

    const trendLookupExpected = Boolean(trendLocation && topTrendJobs.length > 0);
    const trendStillLoading =
      (trendLookupExpected && trendLookups.length !== topTrendJobs.length) ||
      trendLookups.some((lookup) => lookup.status === "loading");

    if (trendStillLoading) {
      resetFinalConsiderations();
      return () => {
        isCurrent = false;
      };
    }

    queueMicrotask(() => {
      if (!isCurrent) return;
      setFinalConsiderationsStatus("loading");
      setFinalConsiderations(null);
      setFinalConsiderationsError("");
    });

    void fetch("/api/opportunity-final-considerations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surveyData,
        currentProfile,
        selectedOpportunityConfig,
        localOpportunities: localMatches,
        trendLookups,
      }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as
          | OpportunityFinalConsiderations
          | { error?: string };

        if (!response.ok || "error" in payload) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Final considerations failed.",
          );
        }

        return payload as OpportunityFinalConsiderations;
      })
      .then((payload) => {
        if (!isCurrent) return;
        setFinalConsiderations(payload);
        setFinalConsiderationsStatus("ready");
      })
      .catch((error) => {
        if (!isCurrent) return;
        setFinalConsiderationsError(
          error instanceof Error
            ? error.message
            : "Final considerations failed.",
        );
        setFinalConsiderationsStatus("error");
      });

    return () => {
      isCurrent = false;
    };
  }, [
    currentProfile,
    localMatches,
    selectedOpportunityConfig,
    surveyData,
    topTrendJobs.length,
    trendLocation,
    trendLookups,
  ]);

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
                  const occupationHref = externalHref(path.occupation_uri);
                  const iscoMajorCode = iscoMajorCodeForPath(path);
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
                          {occupationHref ? (
                            <a
                              href={occupationHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:text-cyan-800 hover:decoration-cyan-600"
                            >
                              {path.preferred_label}
                              <ExternalLink
                                aria-hidden="true"
                                className="h-4 w-4 shrink-0"
                              />
                            </a>
                          ) : (
                            path.preferred_label
                          )}
                        </h4>
                        <p className="mt-1 break-all text-xs text-zinc-500">
                          {occupationHref ? (
                            <a
                              href={occupationHref}
                              target="_blank"
                              rel="noreferrer"
                              className="underline decoration-zinc-300 underline-offset-2 transition hover:text-cyan-800 hover:decoration-cyan-600"
                            >
                              {path.occupation_uri}
                            </a>
                          ) : (
                            path.occupation_uri
                          )}
                        </p>
                        {iscoMajorCode ? (
                          <p className="mt-2 inline-flex rounded border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-900">
                            ISCO-08 major code {iscoMajorCode}
                          </p>
                        ) : null}
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
              Step 2: ISCO employment trend analysis
            </summary>
            {!trendLocation ? (
              <div className="border-t border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500">
                No location is available for the trend lookup.
              </div>
            ) : topTrendJobs.length === 0 ? (
              <div className="border-t border-zinc-200 px-4 py-10 text-center text-sm text-zinc-500">
                No ISCO-08 major codes are available for the top opportunity
                matches.
              </div>
            ) : (
              <div className="grid gap-3 border-t border-zinc-200 px-4 py-4">
                <div className="rounded border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-950">
                  Location: {trendLocation} · Sex: {trendSex} · Top{" "}
                  {topTrendJobs.length} Step 1 matches
                </div>
                <div className="grid gap-3">
                  {trendLookups.map((lookup, index) => {
                    const trend = lookup.trend;

                    return (
                      <article
                        key={`${lookup.path.occupation_uri}-${lookup.majorCode}`}
                        className="rounded-md border border-zinc-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                              Match {index + 1} · ISCO-08 major code{" "}
                              {lookup.majorCode}
                            </p>
                            <h4 className="mt-1 font-semibold text-zinc-950">
                              {lookup.path.preferred_label}
                            </h4>
                            {trend?.majorGroup ? (
                              <p className="mt-1 text-sm text-zinc-600">
                                {trend.majorGroup}
                              </p>
                            ) : null}
                          </div>
                          <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold capitalize text-zinc-700">
                            {lookup.status === "ready"
                              ? trend?.direction || "trend ready"
                              : lookup.status}
                          </span>
                        </div>

                        {lookup.status === "loading" ? (
                          <p className="mt-3 text-sm text-zinc-500">
                            Checking employment trend data.
                          </p>
                        ) : lookup.status === "error" ? (
                          <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                            <p>{lookup.error}</p>
                            {lookup.suggestions?.length ? (
                              <p className="mt-1">
                                Possible locations:{" "}
                                {lookup.suggestions.join(", ")}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                Latest
                              </p>
                              <p className="mt-1 text-xl font-semibold text-cyan-800">
                                {formatTrendValue(trend?.latest?.value)}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {trend?.latest?.year ?? "-"} ·{" "}
                                {trend?.unit ?? "employment"}
                              </p>
                            </div>
                            <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                Latest change
                              </p>
                              <p className="mt-1 text-xl font-semibold text-cyan-800">
                                {formatTrendPercent(
                                  trend?.latestChange?.percent,
                                )}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {formatTrendDelta(
                                  trend?.latestChange?.absolute,
                                )}{" "}
                                vs. previous year
                              </p>
                            </div>
                            <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                Full-period change
                              </p>
                              <p className="mt-1 text-xl font-semibold text-cyan-800">
                                {formatTrendPercent(
                                  trend?.periodChange?.percent,
                                )}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {trend?.points?.[0]?.year ?? "-"}-
                                {trend?.latest?.year ?? "-"}
                              </p>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </details>

          <details className="rounded-md border border-zinc-300 bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-950">
              Step 3: final considerations
            </summary>
            <div className="grid gap-3 border-t border-zinc-200 px-4 py-4">
              <div className="rounded border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm leading-6 text-cyan-950">
                The Conversational Skill Discovery Engine sends the accepted
                user profile, Step 1 local matches, and Step 2 ISCO trend data
                to an LLM for a realism check. The reviewer is prompted to
                consider LMIC constraints such as connectivity, transport,
                informal hiring, training access, startup costs, credentials,
                and thin local data.
              </div>

              {finalConsiderationsStatus === "loading" ? (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-500">
                  Asking the LLM to review opportunity realism.
                </div>
              ) : finalConsiderationsStatus === "error" ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                  {finalConsiderationsError}
                </div>
              ) : finalConsiderations ? (
                <div className="grid gap-3">
                  <article className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Overall realism check
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-700">
                      {finalConsiderations.overallAssessment}
                    </p>
                  </article>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <article className="rounded-md border border-zinc-200 bg-white px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        LMIC cautions
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-700">
                        {finalConsiderations.lmicsCautions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                    <article className="rounded-md border border-zinc-200 bg-white px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Data gaps to verify
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-700">
                        {finalConsiderations.dataGaps.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  </div>

                  <div className="grid gap-3">
                    {finalConsiderations.reviews.map((review) => (
                      <article
                        key={review.opportunityId}
                        className="rounded-md border border-zinc-200 bg-white px-3 py-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                              Opportunity realism
                            </p>
                            <h4 className="mt-1 font-semibold text-zinc-950">
                              {review.title}
                            </h4>
                          </div>
                          <span className="rounded border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-semibold capitalize text-cyan-900">
                            {formatRealismLevel(review.realismLevel)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-zinc-700">
                          {review.summary}
                        </p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-900">
                              Supporting signals
                            </p>
                            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-emerald-950">
                              {review.supportingSignals.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-900">
                              Risks and location challenges
                            </p>
                            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-950">
                              {[...review.risks, ...review.locationChallenges].map(
                                (item) => (
                                  <li key={item}>{item}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            Next checks
                          </p>
                          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-700">
                            {review.nextChecks.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-500">
                  Final considerations will run after the opportunity matches
                  and trend analysis are ready.
                </div>
              )}
            </div>
          </details>
        </section>
      </details>

      <OpportunityDashboard
        identifiedSkills={acceptedSkills}
        localMatches={localMatches}
        selectedOpportunityConfig={selectedOpportunityConfig}
        surveyData={surveyData}
        topJobs={topJobs}
      />
    </section>
  );
}
