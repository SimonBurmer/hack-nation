"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  AMARA_DEMO_CACHE_KEY,
  amaraDemoMessages,
  amaraSurveyData,
  emptySurveyData,
  firstSurveyPrompt,
  initialOpportunityProtocols,
} from "./search/data";
import { AdminProtocolPanel } from "./search/admin-protocol-panel";
import { LoadingScreen } from "./search/loading-screen";
import { MiloChat } from "./search/milo-chat";
import { ProcessOverview } from "./search/process-overview";
import { ResultsView } from "./search/results-view";
import { SkillOpportunitiesView } from "./search/skill-opportunities-view";
import type {
  CalculationStage,
  ChatMessage,
  IntakeAnalysis,
  JourneyStep,
  SkillDecision,
  SkillProfile,
  SurveyData,
  ViewPhase,
  WorkspacePanel,
} from "./search/types";
import {
  messagesForProfile,
  missingSurveyFields,
  parseCsvHeaderLine,
  promptForMissingFields,
  readCachedProfile,
  writeCachedProfile,
} from "./search/utils";

type SearchClientProps = {
  workspacePanel?: WorkspacePanel;
};

export function SearchClient({
  workspacePanel = "profile",
}: SearchClientProps = {}) {
  const [profileMessages, setProfileMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: firstSurveyPrompt },
  ]);
  const [surveyData, setSurveyData] = useState<SurveyData>(emptySurveyData);
  const [profileInput, setProfileInput] = useState("");
  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [error, setError] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [calculationStage, setCalculationStage] =
    useState<CalculationStage>("idle");
  const [viewPhase, setViewPhase] = useState<ViewPhase>("chat");
  const [isAnalyzingIntake, setIsAnalyzingIntake] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [protocolStatus, setProtocolStatus] = useState("");
  const [skillDecisions, setSkillDecisions] = useState<
    Record<string, SkillDecision>
  >({});
  const [adminCsvFileName, setAdminCsvFileName] = useState("");
  const [adminCsvColumns, setAdminCsvColumns] = useState<string[]>([]);
  const [adminIscoColumn, setAdminIscoColumn] = useState("");
  const [selectedOpportunityConfigId, setSelectedOpportunityConfigId] =
    useState(initialOpportunityProtocols[0].id);

  const selectedOpportunityConfig =
    initialOpportunityProtocols.find(
      (config) => config.id === selectedOpportunityConfigId,
    ) ?? initialOpportunityProtocols[0];

  const profileJson = useMemo(() => {
    return profile ? JSON.stringify(profile, null, 2) : "";
  }, [profile]);
  const surveyMissing = missingSurveyFields(surveyData);

  async function addInterviewMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = profileInput.trim();
    if (!content || isAnalyzingIntake || isGeneratingProfile) return;

    const userMessage: ChatMessage = { role: "user", content };
    const draftMessages = [...profileMessages, userMessage];

    setProfileMessages(draftMessages);
    setProfileInput("");
    setProfile(null);
    setProfileStatus("Reading your message and updating the collected data.");
    setError("");
    setIsAnalyzingIntake(true);
    setCalculationStage("idle");
    setViewPhase("chat");

    try {
      const response = await fetch("/api/skill-profile/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentData: surveyData,
          latestMessage: content,
          messages: draftMessages,
        }),
      });
      const payload = (await response.json()) as IntakeAnalysis;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not analyze the message.");
      }

      const nextSurveyData: SurveyData = {
        age: payload.age,
        location: payload.location,
        languages: payload.languages,
        work_authorization: payload.work_authorization,
        availability: payload.availability,
        work_mode_preference: payload.work_mode_preference,
        educational_level: payload.educational_level,
        target_outcome: payload.target_outcome,
        target_roles: payload.target_roles,
        target_industries: payload.target_industries,
        time_horizon: payload.time_horizon,
        priority_tradeoff: payload.priority_tradeoff,
        favorite_skill: payload.favorite_skill,
        current_role_title: payload.current_role_title,
        current_industry: payload.current_industry,
        years_experience_total: payload.years_experience_total,
        years_experience_domain: payload.years_experience_domain,
        skill_confidence: payload.skill_confidence,
        seniority_level: payload.seniority_level,
        team_lead_experience: payload.team_lead_experience,
        key_responsibilities: payload.key_responsibilities,
        informal_experience: payload.informal_experience,
        demonstrated_competencies: payload.demonstrated_competencies,
        skills: payload.skills,
      };
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: payload.assistant_message,
      };
      const nextMessages = [...draftMessages, assistantMessage];

      setSurveyData(nextSurveyData);
      setProfileMessages(nextMessages);
      setProfileStatus("");

      if (payload.ready_to_generate) {
        setCalculationStage("collected");
        setViewPhase("loading");
        void generateProfile(
          nextMessages,
          nextSurveyData,
          payload.user_requested_result,
        );
      } else {
        setCalculationStage("idle");
        setViewPhase("chat");
      }
    } catch (intakeError) {
      const message =
        intakeError instanceof Error
          ? intakeError.message
          : "Could not analyze the message.";

      setProfileMessages([
        ...draftMessages,
        {
          role: "assistant",
          content:
            "I could not read that message reliably. Please send the missing details again, for example: age 27, Hamburg Germany, German C1, EU work permit, bachelor, 3 years experience, favorite skill data analysis.",
        },
      ]);
      setProfileStatus("");
      setError(message);
    } finally {
      setIsAnalyzingIntake(false);
    }
  }

  async function generateProfile(
    messages = profileMessages,
    data = surveyData,
    allowIncomplete = false,
    cacheKey?: string,
  ) {
    if (!allowIncomplete && missingSurveyFields(data).length > 0) {
      setProfileStatus(promptForMissingFields(data));
      return;
    }

    setError("");
    setViewPhase("loading");
    setCalculationStage("extracting");
    setProfileStatus("Milo is extracting skill signals from the conversation.");
    setIsGeneratingProfile(true);

    try {
      window.setTimeout(() => {
        setCalculationStage((stage) =>
          stage === "extracting" ? "grounding" : stage,
        );
        setProfileStatus(
          "Milo is grounding the signals against ESCO and building the Skill Profile.",
        );
      }, 600);

      const response = await fetch("/api/skill-profile/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForProfile(messages, data),
          locale: "en",
          context: {
            age: data.age,
            location: data.location,
            languages: data.languages,
            workAuthorization: data.work_authorization,
            education: data.educational_level,
            favoriteSkill: data.favorite_skill,
            yearsExperienceTotal: data.years_experience_total,
            skillConfidence: data.skill_confidence,
            informalExperience: data.informal_experience,
            demonstratedCompetencies: data.demonstrated_competencies,
            rawSkills: data.skills,
            targetRoles: data.target_roles,
            targetSectors: [
              ...new Set(
                selectedOpportunityConfig.opportunities.map(
                  (opportunity) => opportunity.sector,
                ),
              ),
            ],
            opportunityProtocol: {
              version: selectedOpportunityConfig.version,
              contextId: selectedOpportunityConfig.id,
              countryCode: selectedOpportunityConfig.countryCode,
              region: selectedOpportunityConfig.region,
              locale: selectedOpportunityConfig.locale,
              educationTaxonomy: selectedOpportunityConfig.educationTaxonomy,
              sourceIds: selectedOpportunityConfig.sources.map(
                (source) => source.id,
              ),
              weights: selectedOpportunityConfig.signalWeights,
            },
          },
        }),
      });
      const payload = (await response.json()) as SkillProfile;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Profile generation failed.");
      }

      if (cacheKey) {
        writeCachedProfile(cacheKey, payload);
      }

      setProfile(payload);
      setSkillDecisions({});
      setCalculationStage("done");
      setViewPhase("results");
      setProfileStatus(
        cacheKey
          ? "Skill profile generated and cached for next time."
          : "Skill profile generated.",
      );
    } catch (profileError) {
      setProfile(null);
      setCalculationStage("idle");
      setViewPhase("chat");
      setProfileStatus("");
      setError(
        profileError instanceof Error
          ? profileError.message
          : "Profile generation failed.",
      );
    } finally {
      setIsGeneratingProfile(false);
    }
  }

  function continueFromHere() {
    if (isAnalyzingIntake || isGeneratingProfile) return;

    const assistantMessage: ChatMessage = {
      role: "assistant",
      content:
        "Got it. I will continue from here and build the profile with what we have.",
    };
    const nextMessages = [...profileMessages, assistantMessage];

    setProfile(null);
    setError("");
    setProfileMessages(nextMessages);
    setProfileStatus("Continuing with the information collected so far.");
    setCalculationStage("collected");
    setViewPhase("loading");
    void generateProfile(nextMessages, surveyData, true);
  }

  function loadAmaraDemo() {
    const cachedProfile = readCachedProfile(AMARA_DEMO_CACHE_KEY);

    setProfile(null);
    setSkillDecisions({});
    setError("");
    setSelectedOpportunityConfigId("ghana-urban-informal");
    setIsAnalyzingIntake(false);
    setSurveyData(amaraSurveyData);
    setProfileMessages([
      ...amaraDemoMessages,
      {
        role: "assistant",
        content: cachedProfile
          ? "I have Amara's cached Skill Profile ready."
          : "I have Amara's core signal. I am building her Skill Profile now.",
      },
    ]);

    if (cachedProfile) {
      writeCachedProfile(AMARA_DEMO_CACHE_KEY, cachedProfile.profile);
      setProfile(cachedProfile.profile);
      setCalculationStage("done");
      setViewPhase("results");
      setProfileStatus("Loaded cached Amara Skill Profile. No API call used.");
      setIsGeneratingProfile(false);
      return;
    }

    setCalculationStage("collected");
    setViewPhase("loading");
    void generateProfile(
      amaraDemoMessages,
      amaraSurveyData,
      false,
      AMARA_DEMO_CACHE_KEY,
    );
  }

  async function copyProfileJson() {
    if (!profileJson) return;
    await navigator.clipboard.writeText(profileJson);
    setProfileStatus("SkillRoute JSON copied.");
  }

  function downloadProfileJson() {
    if (!profileJson) return;

    const blob = new Blob([profileJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "skillroute-profile.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function viewProfileJson() {
    if (!profileJson) return;

    const blob = new Blob([profileJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function previewAdminCsvColumns(file: File | undefined) {
    if (!file) return;

    const text = await file.text();
    const headerLine =
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean) ?? "";
    const columns = parseCsvHeaderLine(headerLine);
    const guessedIscoColumn =
      columns.find((column) => /isco.*(1|one|digit|major|group)/i.test(column)) ||
      columns.find((column) => /^isco(_|-|\s)?code$/i.test(column)) ||
      columns.find((column) => /isco/i.test(column)) ||
      columns[0] ||
      "";

    setAdminCsvFileName(file.name);
    setAdminCsvColumns(columns);
    setAdminIscoColumn(guessedIscoColumn);
    setProtocolStatus(
      columns.length > 0
        ? `Read ${columns.length} column names from ${file.name}. No row data was imported.`
        : `Could not find column names in ${file.name}.`,
    );
  }

  function resetSurvey() {
    setProfile(null);
    setProfileStatus("");
    setError("");
    setSkillDecisions({});
    setIsAnalyzingIntake(false);
    setIsGeneratingProfile(false);
    setCalculationStage("idle");
    setViewPhase("chat");
    setSurveyData(emptySurveyData);
    setProfileMessages([{ role: "assistant", content: firstSurveyPrompt }]);
    setProfileInput("");
  }

  function handleJourneyNavigate(step: JourneyStep) {
    if (step === "discovery") {
      setViewPhase("chat");
      return;
    }

    if (!profile) return;

    setViewPhase(step === "profile" ? "results" : "opportunities");
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-zinc-950">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="border-b border-zinc-300 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              {workspacePanel === "admin" ? "Admin Setup" : "SkillRoute"}
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
              {workspacePanel === "admin" ? (
                "Configure the opportunity protocol."
              ) : (
                <>
                  Turn skills into{" "}
                  <span className="font-serif italic">opportunities</span>.
                </>
              )}
            </h1>
            {workspacePanel === "admin" ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                Tune local labor-market sources, signal weights, and pathway
                rules that shape SkillRoute recommendations.
              </p>
            ) : null}
          </div>
        </section>

        {workspacePanel === "admin" ? (
          <AdminProtocolPanel
            adminCsvColumns={adminCsvColumns}
            adminCsvFileName={adminCsvFileName}
            adminIscoColumn={adminIscoColumn}
            protocolStatus={protocolStatus}
            onPreviewCsvColumns={(file) => void previewAdminCsvColumns(file)}
            onSelectIscoColumn={setAdminIscoColumn}
          />
        ) : (
          <>
            {viewPhase === "chat" ? (
              <ProcessOverview
                activeStep="discovery"
                hasProfile={Boolean(profile)}
                onNavigate={handleJourneyNavigate}
              />
            ) : null}
            {viewPhase === "results" && profile ? (
              <ProcessOverview
                activeStep="profile"
                hasProfile={Boolean(profile)}
                onNavigate={handleJourneyNavigate}
              />
            ) : null}
            {viewPhase === "opportunities" && profile ? (
              <ProcessOverview
                activeStep="opportunities"
                hasProfile={Boolean(profile)}
                onNavigate={handleJourneyNavigate}
              />
            ) : null}
            {viewPhase === "results" && profile ? (
              <ResultsView
                currentProfile={profile}
                skillDecisions={skillDecisions}
                surveyData={surveyData}
                onCopyProfileJson={() => void copyProfileJson()}
                onDecisionChange={(conceptUri, decision) =>
                  setSkillDecisions((current) => ({
                    ...current,
                    [conceptUri]: decision,
                  }))
                }
                onDownloadProfileJson={downloadProfileJson}
                onResetSurvey={resetSurvey}
                onViewOpportunities={() => setViewPhase("opportunities")}
                onViewProfileJson={viewProfileJson}
              />
            ) : null}
            {viewPhase === "opportunities" && profile ? (
              <SkillOpportunitiesView
                currentProfile={profile}
                selectedOpportunityConfig={selectedOpportunityConfig}
                skillDecisions={skillDecisions}
                surveyData={surveyData}
              />
            ) : null}
            {viewPhase === "loading" ? (
              <LoadingScreen
                calculationStage={calculationStage}
                profileStatus={profileStatus}
              />
            ) : null}
            {viewPhase === "chat" ? (
              <MiloChat
                isAnalyzingIntake={isAnalyzingIntake}
                isGeneratingProfile={isGeneratingProfile}
                profileInput={profileInput}
                profileMessages={profileMessages}
                profileStatus={profileStatus}
                surveyData={surveyData}
                surveyMissing={surveyMissing}
                onContinueFromHere={continueFromHere}
                onGenerateProfile={() => void generateProfile()}
                onInputChange={setProfileInput}
                onLoadDemo={loadAmaraDemo}
                onResetSurvey={resetSurvey}
                onSubmitMessage={addInterviewMessage}
              />
            ) : null}
          </>
        )}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
}
