import OpenAI from "openai";
import { NextResponse } from "next/server";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

type RequiredField =
  | "age"
  | "location"
  | "languages"
  | "work_authorization"
  | "educational_level"
  | "favorite_skill"
  | "years_experience_total"
  | "skill_confidence";

type SurveyData = {
  age: number | null;
  location: string;
  languages: string[];
  work_authorization: string;
  availability: string;
  work_mode_preference: string;
  educational_level: string;
  target_outcome: string;
  target_roles: string[];
  target_industries: string[];
  time_horizon: string;
  priority_tradeoff: string;
  favorite_skill: string;
  current_role_title: string;
  current_industry: string;
  years_experience_total: string;
  years_experience_domain: string;
  skill_confidence: string;
  seniority_level: string;
  team_lead_experience: string;
  key_responsibilities: string[];
  informal_experience: string;
  demonstrated_competencies: string[];
  skills: string[];
};

type IntakeResponse = SurveyData & {
  missing_fields: RequiredField[];
  assistant_message: string;
  user_requested_result: boolean;
  ready_to_generate: boolean;
};

const requiredFieldLabels: Record<RequiredField, string> = {
  age: "age",
  location: "country of residence",
  languages: "languages and levels",
  work_authorization: "work authorization",
  educational_level: "educational level",
  favorite_skill: "favorite or most fun skill",
  years_experience_total: "total years of experience",
  skill_confidence: "confidence in the main skills",
};

const emptySurveyData: SurveyData = {
  age: null,
  location: "",
  languages: [],
  work_authorization: "",
  availability: "",
  work_mode_preference: "",
  educational_level: "",
  target_outcome: "",
  target_roles: [],
  target_industries: [],
  time_horizon: "",
  priority_tradeoff: "",
  favorite_skill: "",
  current_role_title: "",
  current_industry: "",
  years_experience_total: "",
  years_experience_domain: "",
  skill_confidence: "",
  seniority_level: "",
  team_lead_experience: "",
  key_responsibilities: [],
  informal_experience: "",
  demonstrated_competencies: [],
  skills: [],
};

const intakeSchema = {
  name: "skill_discovery_intake",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "age",
      "location",
      "languages",
      "work_authorization",
      "availability",
      "work_mode_preference",
      "educational_level",
      "target_outcome",
      "target_roles",
      "target_industries",
      "time_horizon",
      "priority_tradeoff",
      "favorite_skill",
      "current_role_title",
      "current_industry",
      "years_experience_total",
      "years_experience_domain",
      "skill_confidence",
      "seniority_level",
      "team_lead_experience",
      "key_responsibilities",
      "informal_experience",
      "demonstrated_competencies",
      "skills",
      "missing_fields",
      "assistant_message",
      "user_requested_result",
      "ready_to_generate",
    ],
    properties: {
      age: { type: ["integer", "null"] },
      location: {
        type: "string",
        description:
          "Country where the user currently lives. Prefer country over city or region.",
      },
      languages: {
        type: "array",
        items: { type: "string" },
        description:
          "Languages with level where available, such as German B2 or English fluent.",
      },
      work_authorization: {
        type: "string",
        description:
          "Work permission, visa status, EU/Non-EU situation, or whether sponsorship is needed.",
      },
      availability: { type: "string" },
      work_mode_preference: { type: "string" },
      educational_level: { type: "string" },
      target_outcome: { type: "string" },
      target_roles: { type: "array", items: { type: "string" } },
      target_industries: { type: "array", items: { type: "string" } },
      time_horizon: { type: "string" },
      priority_tradeoff: { type: "string" },
      favorite_skill: {
        type: "string",
        description:
          "The skill the user loves most, enjoys most, or finds most fun.",
      },
      current_role_title: { type: "string" },
      current_industry: { type: "string" },
      years_experience_total: { type: "string" },
      years_experience_domain: { type: "string" },
      skill_confidence: {
        type: "string",
        description:
          "How confident the user feels in their important skills, including per-skill confidence if provided.",
      },
      seniority_level: { type: "string" },
      team_lead_experience: { type: "string" },
      key_responsibilities: { type: "array", items: { type: "string" } },
      informal_experience: {
        type: "string",
        description:
          "Unpaid, hobby, family business, community, school, or self-taught experience.",
      },
      demonstrated_competencies: {
        type: "array",
        items: { type: "string" },
        description:
          "Things the user has actually done or can demonstrate, phrased as evidence-like competencies.",
      },
      skills: {
        type: "array",
        items: { type: "string" },
        description:
          "Raw user-mentioned skills only. Do not include normalized ESCO IDs, skill types, confidence scores, or categories.",
      },
      missing_fields: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "age",
            "location",
            "languages",
            "work_authorization",
            "educational_level",
            "favorite_skill",
            "years_experience_total",
            "skill_confidence",
          ],
        },
      },
      assistant_message: {
        type: "string",
        description:
          "Short conversational response, max 45 words. Reply to what the user just shared in a human way, then ask only the next most useful missing question. If the user requested the result, acknowledge and say the analysis will use the available data.",
      },
      user_requested_result: {
        type: "boolean",
        description:
          "True if the user explicitly asks to generate/show the result now, finish, continue anyway, or use the current data.",
      },
      ready_to_generate: {
        type: "boolean",
        description:
          "True when all important fields are present or user_requested_result is true.",
      },
    },
  },
} as const;

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((message) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "role" in message &&
        "content" in message
      ) {
        const role = message.role === "assistant" ? "assistant" : "user";
        const content =
          typeof message.content === "string" ? message.content.trim() : "";

        return content ? { role, content } : null;
      }

      return null;
    })
    .filter((message): message is ChatMessage => message !== null)
    .slice(-24);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value.reduce<string[]>((items, item) => {
    const cleaned = normalizeString(item).replace(/^[\s:=-]+|[\s.,;:=-]+$/g, "");
    const key = cleaned.toLowerCase();

    if (!cleaned || seen.has(key)) return items;

    seen.add(key);
    items.push(cleaned);
    return items;
  }, []);
}

const knownLanguages = [
  "english",
  "german",
  "french",
  "spanish",
  "italian",
  "portuguese",
  "arabic",
  "turkish",
  "polish",
  "russian",
  "ukrainian",
  "dutch",
  "swedish",
  "danish",
  "norwegian",
  "finnish",
  "greek",
  "hindi",
  "urdu",
  "chinese",
  "mandarin",
  "cantonese",
  "japanese",
  "korean",
  "twi",
  "swahili",
  "yoruba",
  "hausa",
  "amharic",
];

function looksLikeHumanLanguage(value: string) {
  const item = value.toLowerCase();

  return (
    /\b(a1|a2|b1|b2|c1|c2|native|fluent|basic|beginner|intermediate|advanced|conversational|mother tongue)\b/.test(
      item,
    ) || knownLanguages.some((language) => item.includes(language))
  );
}

function normalizeLanguageArray(value: unknown) {
  return normalizeStringArray(value).filter(looksLikeHumanLanguage);
}

function normalizeSurveyData(value: unknown): SurveyData {
  if (typeof value !== "object" || value === null) {
    return emptySurveyData;
  }

  const data = value as Partial<SurveyData>;
  const age =
    typeof data.age === "number" &&
    Number.isInteger(data.age) &&
    data.age >= 10 &&
    data.age <= 80
      ? data.age
      : null;

  return {
    age,
    location: normalizeString(data.location),
    languages: normalizeLanguageArray(data.languages),
    work_authorization: normalizeString(data.work_authorization),
    availability: normalizeString(data.availability),
    work_mode_preference: normalizeString(data.work_mode_preference),
    educational_level: normalizeString(data.educational_level),
    target_outcome: normalizeString(data.target_outcome),
    target_roles: normalizeStringArray(data.target_roles),
    target_industries: normalizeStringArray(data.target_industries),
    time_horizon: normalizeString(data.time_horizon),
    priority_tradeoff: normalizeString(data.priority_tradeoff),
    favorite_skill: normalizeString(data.favorite_skill),
    current_role_title: normalizeString(data.current_role_title),
    current_industry: normalizeString(data.current_industry),
    years_experience_total: normalizeString(data.years_experience_total),
    years_experience_domain: normalizeString(data.years_experience_domain),
    skill_confidence: normalizeString(data.skill_confidence),
    seniority_level: normalizeString(data.seniority_level),
    team_lead_experience: normalizeString(data.team_lead_experience),
    key_responsibilities: normalizeStringArray(data.key_responsibilities),
    informal_experience: normalizeString(data.informal_experience),
    demonstrated_competencies: normalizeStringArray(
      data.demonstrated_competencies,
    ),
    skills: normalizeStringArray(data.skills),
  };
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function missingSurveyFields(data: SurveyData): RequiredField[] {
  return [
    !data.age ? "age" : "",
    !data.location ? "location" : "",
    data.languages.length === 0 ? "languages" : "",
    !data.work_authorization ? "work_authorization" : "",
    !data.educational_level ? "educational_level" : "",
    !data.favorite_skill ? "favorite_skill" : "",
    !data.years_experience_total ? "years_experience_total" : "",
    !data.skill_confidence ? "skill_confidence" : "",
  ].filter(Boolean) as RequiredField[];
}

function mergeArrays(current: string[], incoming: string[]) {
  return normalizeStringArray([...current, ...incoming]);
}

function didUserRequestResult(value: string) {
  const message = value.toLowerCase();

  return (
    /\b(go on|move on|proceed|carry on|continue|enough questions|no more questions|stop asking|stop it|stop it now|stop question|stop questions|stop the question|stop the questions|skip question|skip questions|skip the question|skip the questions|just do it|use what you have|use current data|use the current data)\b/.test(
      message,
    ) ||
    /\b(i\s+)?(do not|don't|dont|cannot|can't|cant|will not|won't|wont)\s+(want to\s+)?(answer|reply|respond)\b.{0,40}\b(anymore|any more|more|further|again|now)\b/.test(
      message,
    ) ||
    /\b(i\s+)?(am done|i'm done|im done|done answering|finished answering)\b/.test(
      message,
    ) ||
    /\b(show|generate|create|build|start|finish|continue|use)\b.{0,40}\b(result|analysis|profile|now|anyway|current data)\b/.test(
      message,
    ) ||
    /\b(result|analysis|profile)\b.{0,40}\b(use what you have|with current data|anyway)\b/.test(
      message,
    ) ||
    /\b(result|analysis|profile)\b.{0,20}\b(now|please)\b/.test(message) ||
    /\b(end chat|stop chat|done|that is enough|that's enough|no need for more|skip the rest)\b/.test(
      message,
    ) ||
    /\b(ergebnis|analyse|profil)\b.{0,30}\b(jetzt|anzeigen|generieren|erstellen|machen|starten)\b/.test(
      message,
    ) ||
    /\b(jetzt|bitte)\b.{0,30}\b(ergebnis|analyse|profil)\b/.test(message) ||
    /\b(keine fragen mehr|genug fragen|nicht mehr fragen|hoer auf zu fragen|weiter machen|mach weiter|mach einfach weiter|nimm was du hast|nimm die aktuellen daten)\b/.test(
      message,
    ) ||
    /\b(fertig|abschlie[ßs]en|mach weiter|trotzdem weiter|nimm die aktuellen daten)\b/.test(
      message,
    )
  );
}

function isControlOnlyResultRequest(value: string) {
  const message = value.toLowerCase().replace(/[.!?]+$/g, "").trim();

  return (
    didUserRequestResult(message) &&
    /^(please\s+)?(go on|move on|proceed|carry on|continue|enough questions|no more questions|stop asking|stop it|stop it now|stop question|stop questions|stop the question|stop the questions|skip question|skip questions|skip the question|skip the questions|just do it|use what you have|use current data|use the current data|show me the result|show the result|generate the result|create the profile|build the profile|finish|done|end chat|stop chat|i do not want to answer anymore|i don't want to answer anymore|i dont want to answer anymore|i do not want to answer any more|i don't want to answer any more|i dont want to answer any more|i cannot answer more|i can't answer more|i cant answer more|i am done|i'm done|im done|done answering|finished answering)(\s+please)?$/.test(
      message,
    )
  );
}

function buildResultRequestResponse(data: SurveyData): IntakeResponse {
  return {
    ...data,
    missing_fields: missingSurveyFields(data),
    assistant_message:
      "Got it. I will stop the questions and generate the result with the data we have.",
    user_requested_result: true,
    ready_to_generate: true,
  };
}

function questionForMissingField(field: RequiredField) {
  const questions: Record<RequiredField, string> = {
    age: "To place the profile properly, how old are you?",
    location: "So I can match the right opportunities, which country do you live in?",
    languages: "What languages do you feel comfortable using, and roughly at what level?",
    work_authorization: "For the work side, are you allowed to work where you live, or would you need permission or sponsorship?",
    educational_level: "What is the highest level of education you have finished so far?",
    favorite_skill: "Out of the things you can do, which skill do you actually enjoy using most?",
    years_experience_total: "Roughly how long have you been building these skills?",
    skill_confidence: "If 1 is beginner and 5 is very confident, where would you put your main skill?",
  };

  return questions[field];
}

function templateIndex(seed: string, length: number) {
  const total = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return total % length;
}

function missingFieldMessage(fields: RequiredField[], seed: string) {
  const field = fields[0];
  const question = questionForMissingField(field);
  const templates = [
    `Got it, that helps. ${question}`,
    `Nice, I can work with that. ${question}`,
    `Thanks, that gives me a clearer picture. ${question}`,
    `Good, we are getting there. ${question}`,
    `That is useful context. ${question}`,
    `Perfect, short answers are fine here. ${question}`,
  ];

  return templates[templateIndex(`${seed}:${field}`, templates.length)];
}

function compactAssistantMessage(value: unknown) {
  const message = normalizeString(value);
  if (!message) return "";

  const words = message.split(/\s+/);
  const shortened = words.length > 52 ? `${words.slice(0, 52).join(" ")}...` : message;

  return shortened.length > 320 ? `${shortened.slice(0, 317).trim()}...` : shortened;
}

function shouldUseGeneratedAssistantMessage(
  message: string,
  readyToGenerate: boolean,
) {
  if (!message) return false;
  if (readyToGenerate) return true;

  return message.includes("?") && message.length <= 320;
}

function sanitizeIntakeResponse(
  value: IntakeResponse,
  fallbackData: SurveyData,
  latestMessage: string,
): IntakeResponse {
  const data: SurveyData = {
    age:
      typeof value.age === "number" &&
      Number.isInteger(value.age) &&
      value.age >= 10 &&
      value.age <= 80
        ? value.age
        : fallbackData.age,
    location: normalizeString(value.location) || fallbackData.location,
    languages: mergeArrays(
      fallbackData.languages,
      normalizeLanguageArray(value.languages),
    ),
    work_authorization:
      normalizeString(value.work_authorization) ||
      fallbackData.work_authorization,
    availability: normalizeString(value.availability) || fallbackData.availability,
    work_mode_preference:
      normalizeString(value.work_mode_preference) ||
      fallbackData.work_mode_preference,
    educational_level:
      normalizeString(value.educational_level) || fallbackData.educational_level,
    target_outcome:
      normalizeString(value.target_outcome) || fallbackData.target_outcome,
    target_roles: mergeArrays(fallbackData.target_roles, value.target_roles),
    target_industries: mergeArrays(
      fallbackData.target_industries,
      value.target_industries,
    ),
    time_horizon: normalizeString(value.time_horizon) || fallbackData.time_horizon,
    priority_tradeoff:
      normalizeString(value.priority_tradeoff) ||
      fallbackData.priority_tradeoff,
    favorite_skill:
      normalizeString(value.favorite_skill) || fallbackData.favorite_skill,
    current_role_title:
      normalizeString(value.current_role_title) ||
      fallbackData.current_role_title,
    current_industry:
      normalizeString(value.current_industry) || fallbackData.current_industry,
    years_experience_total:
      normalizeString(value.years_experience_total) ||
      fallbackData.years_experience_total,
    years_experience_domain:
      normalizeString(value.years_experience_domain) ||
      fallbackData.years_experience_domain,
    skill_confidence:
      normalizeString(value.skill_confidence) || fallbackData.skill_confidence,
    seniority_level:
      normalizeString(value.seniority_level) || fallbackData.seniority_level,
    team_lead_experience:
      normalizeString(value.team_lead_experience) ||
      fallbackData.team_lead_experience,
    key_responsibilities: mergeArrays(
      fallbackData.key_responsibilities,
      value.key_responsibilities,
    ),
    informal_experience:
      normalizeString(value.informal_experience) ||
      fallbackData.informal_experience,
    demonstrated_competencies: mergeArrays(
      fallbackData.demonstrated_competencies,
      value.demonstrated_competencies,
    ),
    skills: mergeArrays(fallbackData.skills, value.skills),
  };
  const missingFields = missingSurveyFields(data);
  const userRequestedResult = didUserRequestResult(latestMessage);
  const readyToGenerate = userRequestedResult || missingFields.length === 0;
  const generatedAssistantMessage = compactAssistantMessage(
    value.assistant_message,
  );
  const fallbackAssistantMessage = readyToGenerate
    ? userRequestedResult
      ? "Got it. I will stop the questions and generate the result with the data we have."
      : "Great, I have enough to start. I am building your skill analysis now."
    : missingFieldMessage(missingFields, latestMessage);
  const assistantMessage = shouldUseGeneratedAssistantMessage(
    generatedAssistantMessage,
    readyToGenerate,
  )
    ? generatedAssistantMessage
    : fallbackAssistantMessage;

  return {
    ...data,
    missing_fields: missingFields,
    assistant_message: assistantMessage,
    user_requested_result: userRequestedResult,
    ready_to_generate: readyToGenerate,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    currentData?: unknown;
    latestMessage?: unknown;
    messages?: unknown;
  } | null;
  const currentData = normalizeSurveyData(body?.currentData);
  const latestMessage =
    typeof body?.latestMessage === "string" ? body.latestMessage.trim() : "";
  const messages = normalizeMessages(body?.messages);

  if (!latestMessage) {
    return NextResponse.json(
      { error: "Add a message before sending." },
      { status: 400 },
    );
  }

  if (isControlOnlyResultRequest(latestMessage)) {
    return NextResponse.json(buildResultRequestResponse(currentData));
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY in web/.env.local." },
      { status: 500 },
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.SKILL_PROFILE_MODEL || "gpt-4o-mini";
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are the intake brain for a skill discovery engine and you speak like Milo, a calm conversational guide. Your job is to classify every user input into the predefined dataset. Keep all existing collected data unless the newest user message clearly corrects it. Important required fields are: age; country where the user lives; languages with level; work authorization; educational level; favorite or most fun skill; total years of experience; confidence in relevant skills. Optional fields should be captured when present: informal experience, demonstrated competencies, availability, work mode preference, target outcome, target roles, target industries, time horizon, priority tradeoff, current role title, current industry, domain years, seniority, team lead experience, key responsibilities, raw user-mentioned skills. Store the user's country of residence in the location field. Do not ask for a city; if the user provides a city or region, infer the country only when it is obvious, otherwise ask which country they live in. Do not copy a city/place into skills. A skill must not be copied into location. If one important field is missing and the user sends a single phrase, classify the phrase as country only when it is clearly a country. If the user says they want the result now, wants to go on, asks to stop the questions, says something like stop it now, says they do not want to answer anymore, or says to use current data, set user_requested_result and ready_to_generate true even if important fields are missing. For assistant_message, sound like a real chat: briefly respond to what the user said, name or reflect one concrete detail when possible, then ask one natural follow-up for the next missing field. Keep it to one or two short sentences, do not list missing fields, and do not write a long explanation.",
      },
      {
        role: "user",
        content: JSON.stringify({
          current_collected_data: currentData,
          recent_chat_messages: messages,
          newest_user_message: latestMessage,
          important_required_fields: Object.entries(requiredFieldLabels).map(
            ([key, label]) => ({ key, label }),
          ),
          examples: [
            {
              input:
                "I am 27, in Hamburg Germany, German C1 and English B2, EU citizen, bachelor, 3 years, most fun skill is data analysis, confident in Python 4/5, helped friends build websites and built dashboards.",
              output_notes:
                "age 27; location Germany; languages German C1 and English B2; work_authorization EU citizen; educational_level bachelor; years_experience_total 3 years; favorite_skill data analysis; skill_confidence Python 4/5; informal_experience helped friends build websites; demonstrated_competencies built dashboards; skills include data analysis, Python, websites, dashboards.",
            },
            {
              current: {
                age: 27,
                location: "",
                languages: ["English B2"],
                skills: ["computer science"],
              },
              input: "Ghana",
              output_notes:
                "Because country is missing and the answer is a country, classify Ghana as location, not as a skill.",
            },
            {
              input: "Show me the result now",
              output_notes:
                "Set user_requested_result true and ready_to_generate true.",
            },
          ],
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: intakeSchema,
    },
  });
  const fallback: IntakeResponse = {
    ...currentData,
    missing_fields: missingSurveyFields(currentData),
    assistant_message: "Thanks, that helps. I need one more detail before continuing.",
    user_requested_result: false,
    ready_to_generate: missingSurveyFields(currentData).length === 0,
  };
  const parsed = parseJson<IntakeResponse>(
    completion.choices[0]?.message.content,
    fallback,
  );

  return NextResponse.json(
    sanitizeIntakeResponse(parsed, currentData, latestMessage),
  );
}
