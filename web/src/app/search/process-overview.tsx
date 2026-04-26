"use client";

import type { JourneyStep } from "./types";

type ProcessOverviewProps = {
  activeStep: JourneyStep;
  hasProfile: boolean;
  onNavigate: (step: JourneyStep) => void;
};

export function ProcessOverview({
  activeStep,
  hasProfile,
  onNavigate,
}: ProcessOverviewProps) {
  const steps: Array<{
    id: JourneyStep;
    title: string;
  }> = [
    {
      id: "discovery",
      title: "Skill discovery engine",
    },
    {
      id: "profile",
      title: "Your skill profile",
    },
    {
      id: "opportunities",
      title: "Your opportunities",
    },
  ];
  const activeIndex = steps.findIndex((step) => step.id === activeStep);

  return (
    <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
          User journey
        </p>
      </div>
      <ol className="grid gap-0 md:grid-cols-3">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const canNavigate = step.id === "discovery" || hasProfile;

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
                  canNavigate ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                }`}
                onClick={() => onNavigate(step.id)}
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
                <span>
                  <span className="block font-semibold text-zinc-950">
                    {step.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
