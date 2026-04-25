import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type SkillLabelMatch = {
  id: number;
  concept_uri: string;
  preferred_label: string;
  alt_labels: string[] | null;
  hidden_labels: string[] | null;
  skill_type: string | null;
  reuse_level: string | null;
  description: string | null;
  definition: string | null;
  matched_field: string;
  matched_label: string;
};

type OccupationMatch = {
  occupation_uri: string;
  preferred_label: string;
  code: string | null;
  isco_group: string | null;
  nace_code: string[] | null;
  alt_labels: string[] | null;
  regulated_profession_note: string | null;
  definition: string | null;
  description: string | null;
  relation_types: string[] | null;
  matched_skill_labels: string[] | null;
  relation_skill_types: string[] | null;
  relation_rank: number;
};

type SkillSuggestion = {
  concept_uri: string;
  preferred_label: string;
  matched_label: string;
  score: number;
};

function clampSuggestionCount(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 8;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 25);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    skillName?: unknown;
    maxSuggestions?: unknown;
  } | null;

  const skillName =
    typeof body?.skillName === "string" ? body.skillName.trim() : "";
  const maxSuggestions = clampSuggestionCount(body?.maxSuggestions);

  if (!skillName) {
    return NextResponse.json(
      { error: "Enter an exact skill name before searching occupations." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: skills, error: skillsError } = await supabase.rpc(
    "find_esco_skills_by_label",
    { skill_label: skillName },
  );

  if (skillsError) {
    return NextResponse.json({ error: skillsError.message }, { status: 500 });
  }

  const skillMatches = (skills ?? []) as SkillLabelMatch[];

  if (skillMatches.length === 0) {
    const { data: suggestions, error: suggestionsError } = await supabase.rpc(
      "suggest_esco_skills_by_label",
      { skill_label: skillName, match_count: maxSuggestions },
    );

    if (suggestionsError) {
      return NextResponse.json(
        { error: suggestionsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      skillName,
      skillMatches,
      suggestions: (suggestions ?? []) as SkillSuggestion[],
      occupations: [] as OccupationMatch[],
    });
  }

  const { data: occupations, error: occupationsError } = await supabase.rpc(
    "get_esco_occupations_for_skills",
    { skill_uris: skillMatches.map((skill) => skill.concept_uri) },
  );

  if (occupationsError) {
    return NextResponse.json(
      { error: occupationsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    skillName,
    skillMatches,
    suggestions: [] as SkillSuggestion[],
    occupations: (occupations ?? []) as OccupationMatch[],
  });
}
