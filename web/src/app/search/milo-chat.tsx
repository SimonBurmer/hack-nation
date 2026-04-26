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
  onContinueFromHere: () => void;
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
  onContinueFromHere,
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
    <section className="overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-[#f0e4d8] px-4 py-4">
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-3xl font-semibold tracking-normal text-zinc-950">
              Milo
            </h2>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Conversational Skill Discovery Engine
            </p>
          </div>
          <span className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-950">
            Agent online
          </span>
        </div>
      </div>

      <div className="grid items-start gap-4 bg-[#f7efe6] p-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
        <div className="max-h-[32rem] space-y-3 overflow-y-auto bg-[#f7efe6] px-4 py-4">
          {profileMessages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[88%] rounded-md bg-[#a44e3b] px-3 py-2 text-sm leading-6 text-[#fffaf4] shadow-sm"
                  : "max-w-[88%] rounded-md border border-zinc-200 bg-[#fffaf4] px-3 py-2 text-sm leading-6 text-zinc-800 shadow-sm"
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
            placeholder="Tell Milo: sex, country, education, languages, work permission, experience, tools, and skills..."
            className="min-h-28 resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15"
            disabled={isAnalyzingIntake || isGeneratingProfile}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              className="h-11 rounded-md bg-[#a44e3b] px-5 text-[#fffaf4] hover:bg-[#7f392e]"
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
            className="h-11 rounded-md bg-zinc-950 px-5 text-white hover:bg-[#7f392e]"
            disabled={isAnalyzingIntake || isGeneratingProfile}
            onClick={onContinueFromHere}
          >
            Continue from here
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-md border-zinc-300 px-5"
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

      <aside className="min-w-0">
        <div className="rounded-md border border-zinc-300 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Intake signal
          </p>
          <div className="mt-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2.5">
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
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-cyan-700 transition-all"
                style={{
                  width: `${Math.round(
                    (completedRequiredCount / requiredFieldKeys.length) * 100,
                  )}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-xs leading-5 text-zinc-600">
              {surveyMissing.length === 0
                ? "Ready to generate a Skill Profile."
                : `Still needed: ${surveyMissing
                    .slice(0, 3)
                    .map((field) => requiredFieldLabels[field])
                    .join(", ")}${surveyMissing.length > 3 ? "..." : ""}.`}
            </p>
          </div>

          <div className="mt-2 grid gap-1">
            {intakeSignalFields.map(({ field, label, value }) => (
              <div
                key={field}
                className={`rounded border px-2.5 py-1 ${
                  value
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="shrink-0 text-xs font-semibold text-zinc-600">
                    {label}
                  </span>
                  {value && field !== "skill_confidence" ? (
                    <span className="min-w-0 flex-1 truncate text-right text-[11px] leading-4 text-zinc-700">
                      {value}
                    </span>
                  ) : null}
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                      value
                        ? "bg-emerald-800 text-white"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {value ? "Captured" : "Needed"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 text-center text-xs">
            <div className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5">
              <p className="text-base font-semibold leading-5 text-zinc-950">
                {surveyData.skills.length}
              </p>
              <p className="text-[11px] font-medium text-zinc-500">Skills</p>
            </div>
            <div className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5">
              <p className="text-base font-semibold leading-5 text-zinc-950">
                {surveyData.demonstrated_competencies.length}
              </p>
              <p className="text-[11px] font-medium text-zinc-500">Evidence</p>
            </div>
          </div>
        </div>
      </aside>
      </div>
    </section>
  );
}
