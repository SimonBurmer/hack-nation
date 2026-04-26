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
    description: string;
  }> = [
    {
      id: "discovery",
      title: "Skill discovery engine",
      description: "Share age, location, lived experience, tools, and skills.",
    },
    {
      id: "profile",
      title: "Your skill profile",
      description: "Review ESCO skill matches and accept or decline each one.",
    },
    {
      id: "opportunities",
      title: "Your opportunities",
      description: "See local routes and ESCO jobs from accepted skills.",
    },
  ];
  const activeIndex = steps.findIndex((step) => step.id === activeStep);

  return (
    <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
          User journey
        </p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-950">
          Three views from discovery to opportunity
        </h2>
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
                  <span className="mt-1 block text-sm leading-6 text-zinc-600">
                    {step.description}
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
