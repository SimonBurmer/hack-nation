"use client";

import {
  BriefcaseBusiness,
  Check,
  ExternalLink,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SkillDecision, SkillProfile, SurveyData } from "./types";
import {
  requiredFieldKeys,
  requiredFieldLabels,
  requiredFieldValue,
  skillConfidenceClass,
  skillConfidenceLabel,
} from "./utils";
import { identifiedSkillsForProfile } from "./profile-view-utils";

type ResultsViewProps = {
  currentProfile: SkillProfile;
  skillDecisions: Record<string, SkillDecision>;
  surveyData: SurveyData;
  onCopyProfileJson: () => void;
  onDecisionChange: (conceptUri: string, decision: SkillDecision) => void;
  onDownloadProfileJson: () => void;
  onResetSurvey: () => void;
  onViewOpportunities: () => void;
  onViewProfileJson: () => void;
};

export function ResultsView({
  currentProfile,
  skillDecisions,
  surveyData,
  onCopyProfileJson,
  onDecisionChange,
  onDownloadProfileJson,
  onResetSurvey,
  onViewOpportunities,
  onViewProfileJson,
}: ResultsViewProps) {
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
          experience into standardized ESCO skill links, lets the user accept or
          decline each match, and then uses the accepted profile to explain
          fitting job and opportunity paths. It is needed because lived
          experience is often real but hard to compare across training, hiring,
          and support systems.
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
                  The highest ranked jobs are those where the person already has
                  the largest share of the occupation&apos;s ESCO skills,
                  especially essential skills.
                </p>
              </div>
              <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <p>
                  <span className="font-semibold text-zinc-950">Engine:</span>{" "}
                  {currentProfile.export_metadata.engine_version}
                </p>
                <p className="mt-2">
                  <span className="font-semibold text-zinc-950">
                    Generated:
                  </span>{" "}
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
              Review each standardized skill match row by row. Accepted skills
              feed the opportunity view; declined skills stay visible for
              auditability.
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
                          onDecisionChange(skill.concept_uri, "accepted")
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
                          onDecisionChange(skill.concept_uri, "declined")
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
            Save the machine-readable profile or start over with a new person.
          </p>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
              type="button"
              className="h-9 rounded-md bg-zinc-950 px-3 text-white hover:bg-cyan-800"
              onClick={onCopyProfileJson}
            >
              Copy JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-md border-zinc-300 px-3"
              onClick={onDownloadProfileJson}
            >
              Download JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-md border-zinc-300 px-3"
              onClick={onViewProfileJson}
            >
              View JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-md border-zinc-300 px-3"
              onClick={onResetSurvey}
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
              Continue to the dedicated opportunity view to see local routes and
              ESCO job matches based on the accepted skills.
            </p>
          </div>
          <Button
            type="button"
            className="h-10 rounded-md bg-zinc-950 px-4 text-white hover:bg-cyan-800"
            onClick={onViewOpportunities}
          >
            <BriefcaseBusiness />
            View opportunities
          </Button>
        </div>
      </section>
    </section>
  );
}
