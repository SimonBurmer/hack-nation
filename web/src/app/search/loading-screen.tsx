"use client";

import type { CalculationStage } from "./types";

type LoadingScreenProps = {
  calculationStage: CalculationStage;
  profileStatus: string;
};

export function LoadingScreen({
  calculationStage,
  profileStatus,
}: LoadingScreenProps) {
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
