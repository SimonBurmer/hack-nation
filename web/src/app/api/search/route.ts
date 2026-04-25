import OpenAI from "openai";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type SkillMatch = {
  id: number;
  concept_uri: string;
  preferred_label: string;
  alt_labels: string[] | null;
  skill_type: string | null;
  reuse_level: string | null;
  description: string | null;
  definition: string | null;
  similarity: number;
};

function clampMatchCount(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 10;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    query?: unknown;
    matchCount?: unknown;
  } | null;

  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const matchCount = clampMatchCount(body?.matchCount);

  if (!query) {
    return NextResponse.json(
      { error: "Enter a query before searching." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY in web/.env.local." },
      { status: 500 },
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embeddingResponse = await openai.embeddings.create({
    model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    input: query,
  });

  const [{ embedding }] = embeddingResponse.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_esco_skills", {
    query_embedding: `[${embedding.join(",")}]`,
    match_count: matchCount,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    query,
    matchCount,
    results: (data ?? []) as SkillMatch[],
  });
}
