"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { ChatMessage, RequiredSurveyField, SurveyData } from "./types";
import {
  requiredFieldKeys,
  requiredFieldLabels,
  requiredFieldValue,
} from "./utils";

type MiloChatProps = {
  isAnalyzingIntake: boolean;
  isGeneratingProfile: boolean;
  profileInput: string;
  profileMessages: ChatMessage[];
  profileStatus: string;
  surveyData: SurveyData;
  surveyMissing: RequiredSurveyField[];
  onGenerateProfile: () => void;
  onInputChange: (value: string) => void;
  onLoadDemo: () => void;
  onResetSurvey: () => void;
  onSubmitMessage: (event: FormEvent<HTMLFormElement>) => void;
};

export function MiloChat({
  isAnalyzingIntake,
  isGeneratingProfile,
  profileInput,
  profileMessages,
  profileStatus,
  surveyData,
  surveyMissing,
  onGenerateProfile,
  onInputChange,
  onLoadDemo,
  onResetSurvey,
  onSubmitMessage,
}: MiloChatProps) {
  const completedRequiredCount =
    requiredFieldKeys.length - surveyMissing.length;
  const intakeSignalFields = requiredFieldKeys.map((field) => ({
    field,
    label: requiredFieldLabels[field],
    value: requiredFieldValue(surveyData, field),
  }));

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-950 px-4 py-4 text-white">
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-3xl font-semibold tracking-normal">Milo</h2>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Skill Discovery Engine
              </p>
            </div>
            <span className="rounded border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              Agent online
            </span>
          </div>
        </div>

        <div className="max-h-[32rem] space-y-3 overflow-y-auto bg-[#f9faf7] px-4 py-4">
          {profileMessages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[88%] rounded-md bg-cyan-800 px-3 py-2 text-sm leading-6 text-white"
                  : "max-w-[88%] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-800 shadow-sm"
              }
            >
              {message.role === "assistant" ? (
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                  Milo
                </p>
              ) : null}
              {message.content}
            </div>
          ))}
        </div>

        <form
          onSubmit={onSubmitMessage}
          className="grid gap-3 border-t border-zinc-200 bg-white p-3 lg:grid-cols-[minmax(0,1fr)_auto]"
        >
          <textarea
            value={profileInput}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Tell Milo: age, location, education, languages, informal work, tools, and skills..."
            className="min-h-28 resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
            disabled={isAnalyzingIntake || isGeneratingProfile}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              className="h-11 rounded-md bg-zinc-950 px-5 text-white hover:bg-cyan-800"
              disabled={isAnalyzingIntake || isGeneratingProfile}
            >
              {isAnalyzingIntake ? "Reading" : "Send to Milo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md border-zinc-300 px-5"
              onClick={onLoadDemo}
            >
              Load Amara
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-3 py-3">
          <Button
            type="button"
            className="h-11 rounded-md bg-cyan-800 px-5 text-white hover:bg-zinc-950"
            disabled={
              isAnalyzingIntake ||
              isGeneratingProfile ||
              surveyMissing.length > 0
            }
            onClick={onGenerateProfile}
          >
            {isAnalyzingIntake
              ? "Reading message"
              : isGeneratingProfile
                ? "Generating Skill Profile"
                : surveyMissing.length > 0
                  ? "Waiting for required info"
                  : "Generate Skill Profile"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-md border-zinc-300 px-5"
            onClick={onResetSurvey}
          >
            Reset
          </Button>
          {profileStatus ? (
            <p className="text-sm text-zinc-600">{profileStatus}</p>
          ) : null}
        </div>
      </div>

      <aside className="grid gap-4">
        <div className="rounded-md border border-zinc-300 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Intake signal
          </p>
          <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-zinc-950">
                Required intake
              </span>
              <span
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  surveyMissing.length === 0
                    ? "bg-emerald-100 text-emerald-950"
                    : "bg-amber-100 text-amber-950"
                }`}
              >
                {completedRequiredCount}/{requiredFieldKeys.length}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-cyan-700 transition-all"
                style={{
                  width: `${Math.round(
                    (completedRequiredCount / requiredFieldKeys.length) * 100,
                  )}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-600">
              {surveyMissing.length === 0
                ? "Ready to generate a Skill Profile."
                : `Still needed: ${surveyMissing
                    .slice(0, 3)
                    .map((field) => requiredFieldLabels[field])
                    .join(", ")}${surveyMissing.length > 3 ? "..." : ""}.`}
            </p>
          </div>

          <div className="mt-3 grid gap-2 text-sm">
            {intakeSignalFields.map(({ field, label, value }) => (
              <div
                key={field}
                className={`rounded border px-3 py-2 ${
                  value
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-600">{label}</span>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                      value
                        ? "bg-emerald-800 text-white"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {value ? "Captured" : "Needed"}
                  </span>
                </div>
                {value ? (
                  <p className="mt-1 truncate text-xs text-zinc-700">
                    {value}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded border border-zinc-200 bg-zinc-50 px-2 py-2">
              <p className="text-lg font-semibold text-zinc-950">
                {surveyData.skills.length}
              </p>
              <p className="font-medium text-zinc-500">Skills</p>
            </div>
            <div className="rounded border border-zinc-200 bg-zinc-50 px-2 py-2">
              <p className="text-lg font-semibold text-zinc-950">
                {surveyData.demonstrated_competencies.length}
              </p>
              <p className="font-medium text-zinc-500">Evidence</p>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
