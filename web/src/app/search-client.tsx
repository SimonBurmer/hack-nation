"use client";

import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

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

type SearchResponse = {
  error?: string;
  results?: SkillMatch[];
};

const initialQuery = "coordinate a team and communicate with customers";

export function SearchClient() {
  const [query, setQuery] = useState(initialQuery);
  const [matchCount, setMatchCount] = useState(10);
  const [results, setResults] = useState<SkillMatch[]>([]);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const highestSimilarity = useMemo(() => {
    return results.length > 0 ? results[0].similarity : null;
  }, [results]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSearching(true);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, matchCount }),
      });
      const payload = (await response.json()) as SearchResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Search failed.");
      }

      setResults(payload.results ?? []);
    } catch (searchError) {
      setResults([]);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Search failed.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-stone-950">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-4 border-b border-stone-300 pb-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              ESCO semantic search
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
              Match natural language to embedded skill rows.
            </h1>
          </div>
          <div className="rounded-md border border-stone-300 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
              Best score
            </p>
            <p className="mt-1 text-2xl font-semibold text-teal-800">
              {highestSimilarity === null
                ? "--"
                : `${Math.round(highestSimilarity * 100)}%`}
            </p>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="grid gap-3 rounded-md border border-stone-300 bg-white p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_9rem_auto] lg:items-end"
        >
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-stone-700">Query</span>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-24 resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-base leading-6 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-stone-700">Top rows</span>
            <input
              value={matchCount}
              onChange={(event) => setMatchCount(Number(event.target.value))}
              min={1}
              max={50}
              type="number"
              className="h-11 rounded-md border border-stone-300 bg-white px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            />
          </label>

          <Button
            type="submit"
            className="h-11 rounded-md bg-stone-950 px-5 text-white hover:bg-teal-800"
            disabled={isSearching}
          >
            {isSearching ? "Searching" : "Search"}
          </Button>
        </form>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-md border border-stone-300 bg-white shadow-sm">
          <div className="grid grid-cols-[5rem_minmax(14rem,1fr)_8rem] border-b border-stone-300 bg-stone-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-600 max-md:hidden">
            <span>Score</span>
            <span>Skill</span>
            <span>Type</span>
          </div>

          {results.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-stone-500">
              No results yet.
            </div>
          ) : (
            <ol className="divide-y divide-stone-200">
              {results.map((result) => (
                <li
                  key={result.id}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[5rem_minmax(14rem,1fr)_8rem]"
                >
                  <div className="text-lg font-semibold text-teal-800">
                    {Math.round(result.similarity * 100)}%
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div>
                      <h2 className="text-base font-semibold text-stone-950">
                        {result.preferred_label}
                      </h2>
                      <p className="break-all text-xs text-stone-500">
                        {result.concept_uri}
                      </p>
                    </div>

                    {result.definition || result.description ? (
                      <p className="text-sm leading-6 text-stone-700">
                        {result.definition || result.description}
                      </p>
                    ) : null}

                    {result.alt_labels?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.alt_labels.slice(0, 6).map((label) => (
                          <span
                            key={label}
                            className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-950"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-sm text-stone-600">
                    {result.skill_type || result.reuse_level || "Skill"}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
