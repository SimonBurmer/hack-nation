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

type OccupationResponse = {
  error?: string;
  skillMatches?: SkillLabelMatch[];
  suggestions?: SkillSuggestion[];
  occupations?: OccupationMatch[];
};

const initialQuery = "coordinate a team and communicate with customers";

export function SearchClient() {
  const [query, setQuery] = useState(initialQuery);
  const [matchCount, setMatchCount] = useState(10);
  const [results, setResults] = useState<SkillMatch[]>([]);
  const [occupationSkillName, setOccupationSkillName] = useState("");
  const [skillMatches, setSkillMatches] = useState<SkillLabelMatch[]>([]);
  const [occupationSuggestions, setOccupationSuggestions] = useState<
    SkillSuggestion[]
  >([]);
  const [occupations, setOccupations] = useState<OccupationMatch[]>([]);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isFindingOccupations, setIsFindingOccupations] = useState(false);

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

  async function findOccupations(skillName = occupationSkillName) {
    const trimmedSkillName = skillName.trim();
    setError("");
    setOccupationSkillName(trimmedSkillName);
    setIsFindingOccupations(true);

    try {
      const response = await fetch("/api/occupations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillName: trimmedSkillName,
          maxSuggestions: 8,
        }),
      });
      const payload = (await response.json()) as OccupationResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Occupation lookup failed.");
      }

      setSkillMatches(payload.skillMatches ?? []);
      setOccupationSuggestions(payload.suggestions ?? []);
      setOccupations(payload.occupations ?? []);
    } catch (occupationError) {
      setSkillMatches([]);
      setOccupationSuggestions([]);
      setOccupations([]);
      setError(
        occupationError instanceof Error
          ? occupationError.message
          : "Occupation lookup failed.",
      );
    } finally {
      setIsFindingOccupations(false);
    }
  }

  function handleOccupationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void findOccupations();
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

        <form
          onSubmit={handleOccupationSubmit}
          className="grid gap-3 rounded-md border border-stone-300 bg-white p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
        >
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-stone-700">
              Exact skill to occupations
            </span>
            <input
              value={occupationSkillName}
              onChange={(event) => setOccupationSkillName(event.target.value)}
              placeholder="use climbing equipment"
              className="h-11 rounded-md border border-stone-300 bg-white px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            />
          </label>

          <Button
            type="submit"
            className="h-11 rounded-md bg-teal-800 px-5 text-white hover:bg-stone-950"
            disabled={isFindingOccupations}
          >
            {isFindingOccupations ? "Finding" : "Find occupations"}
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
                  className="grid gap-3 px-4 py-4 md:grid-cols-[5rem_minmax(14rem,1fr)_12rem]"
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
                    <p>{result.skill_type || result.reuse_level || "Skill"}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2 h-9 rounded-md border-stone-300 px-3 text-xs"
                      disabled={isFindingOccupations}
                      onClick={() => void findOccupations(result.preferred_label)}
                    >
                      Occupations
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="overflow-hidden rounded-md border border-stone-300 bg-white shadow-sm">
          <div className="border-b border-stone-300 bg-stone-100 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-stone-600">
              Occupations
            </h2>
          </div>

          {occupationSuggestions.length > 0 ? (
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm font-medium text-stone-700">
                No exact skill was found. Similar skills:
              </p>
              <div className="flex flex-wrap gap-2">
                {occupationSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.concept_uri}
                    type="button"
                    className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm font-medium text-amber-950 transition hover:border-teal-700"
                    onClick={() => void findOccupations(suggestion.preferred_label)}
                  >
                    {suggestion.preferred_label}
                    {suggestion.matched_label !== suggestion.preferred_label ? (
                      <span className="block text-xs font-normal text-amber-800">
                        Label: {suggestion.matched_label}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {skillMatches.length > 0 ? (
            <div className="border-b border-stone-200 px-4 py-3">
              <p className="text-sm font-medium text-stone-700">
                Matched skill entries
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {skillMatches.map((skill) => (
                  <span
                    key={skill.concept_uri}
                    className="rounded border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-950"
                  >
                    {skill.preferred_label} via {skill.matched_field}:{" "}
                    {skill.matched_label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {occupations.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-stone-500">
              No occupation lookup results yet.
            </div>
          ) : (
            <ol className="divide-y divide-stone-200">
              {occupations.map((occupation, index) => (
                <li key={occupation.occupation_uri} className="px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-[3rem_minmax(0,1fr)_14rem]">
                    <p className="text-lg font-semibold text-teal-800">
                      {index + 1}
                    </p>
                    <div className="min-w-0 space-y-2">
                      <div>
                        <h3 className="text-base font-semibold text-stone-950">
                          {occupation.preferred_label}
                        </h3>
                        <p className="break-all text-xs text-stone-500">
                          {occupation.occupation_uri}
                        </p>
                      </div>

                      {occupation.definition || occupation.description ? (
                        <p className="text-sm leading-6 text-stone-700">
                          {occupation.definition || occupation.description}
                        </p>
                      ) : null}

                      {occupation.alt_labels?.length ? (
                        <p className="text-xs text-stone-500">
                          Alternative names:{" "}
                          {occupation.alt_labels.slice(0, 8).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1 text-sm text-stone-600">
                      <p>
                        <span className="font-medium text-stone-800">
                          Fit:
                        </span>{" "}
                        {occupation.relation_types?.join(", ") || "-"}
                      </p>
                      <p>
                        <span className="font-medium text-stone-800">
                          Code:
                        </span>{" "}
                        {occupation.code || "-"}
                      </p>
                      <p>
                        <span className="font-medium text-stone-800">
                          ISCO:
                        </span>{" "}
                        {occupation.isco_group || "-"}
                      </p>
                      <p>
                        <span className="font-medium text-stone-800">
                          NACE:
                        </span>{" "}
                        {occupation.nace_code?.join(", ") || "-"}
                      </p>
                    </div>
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
