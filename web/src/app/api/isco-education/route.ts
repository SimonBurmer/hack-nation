import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CsvRow = Record<string, string>;

type EducationYearPoint = {
  year: number;
  value: number;
};

type EducationLevelTrend = {
  level: string;
  points: EducationYearPoint[];
  latest: EducationYearPoint | null;
  latestChange: {
    absolute: number;
    percent: number | null;
  } | null;
  periodChange: {
    absolute: number;
    percent: number;
  } | null;
};

const eduCsvPath = path.resolve(
  process.cwd(),
  "data",
  "isco",
  "EMP_TEMP_SEX_OCU_EDU_NB_A-filtered-2026-04-26.csv",
);

const isco08MajorPattern = /^Occupation \(ISCO-08\): ([0-9])\. (.+?)\s*$/;

const aggregateEducationLevels = [
  "Education (Aggregate levels): Less than basic",
  "Education (Aggregate levels): Basic",
  "Education (Aggregate levels): Intermediate",
  "Education (Aggregate levels): Advanced",
];

const educationLevelLabels: Record<string, string> = {
  "Education (Aggregate levels): Less than basic": "Less than basic",
  "Education (Aggregate levels): Basic": "Basic",
  "Education (Aggregate levels): Intermediate": "Intermediate",
  "Education (Aggregate levels): Advanced": "Advanced",
};

let cachedRows: CsvRow[] | null = null;

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\ufeff") continue;

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function rowsToObjects(rows: string[][]): CsvRow[] {
  const [header, ...records] = rows;

  if (!header) return [];

  return records.map((record) => {
    return header.reduce<CsvRow>((row, column, index) => {
      row[column] = record[index] ?? "";
      return row;
    }, {});
  });
}

async function loadRows() {
  if (cachedRows) return cachedRows;

  const file = await readFile(eduCsvPath, "utf8");
  cachedRows = rowsToObjects(parseCsv(file));

  return cachedRows;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function findLocation(rows: CsvRow[], location: string) {
  const normalizedLocation = normalize(location);
  const locations = [
    ...new Set(rows.map((row) => row["location"])),
  ].sort();
  const exact = locations.find(
    (item) => normalize(item) === normalizedLocation,
  );

  if (exact) return { location: exact, suggestions: [] };

  const suggestions = locations
    .filter((item) => normalize(item).includes(normalizedLocation))
    .slice(0, 8);

  return { location: "", suggestions };
}

function parseNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function majorCodeForRow(row: CsvRow) {
  const occupation = row.ISCOCode || "";
  const match = occupation.trim().match(isco08MajorPattern);

  return match?.[1] ?? "";
}

function majorLabelForRow(row: CsvRow) {
  const occupation = row.ISCOCode || "";
  const match = occupation.trim().match(isco08MajorPattern);

  return match?.[2] ?? "";
}

function formatMajorGroup(row: CsvRow | undefined, majorCode: string) {
  if (!row) return `${majorCode}. ISCO-08 major group`;

  return `${majorCode}. ${majorLabelForRow(row) || "ISCO-08 major group"}`;
}

function buildLevelTrend(rows: CsvRow[]): EducationLevelTrend["points"] {
  const valuesByYear = new Map<number, number>();

  for (const row of rows) {
    const year = Number(row.time);
    const value = parseNumber(row.obs_value);

    if (!Number.isInteger(year) || value === null) continue;

    valuesByYear.set(year, (valuesByYear.get(year) ?? 0) + value);
  }

  return [...valuesByYear.entries()]
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => a.year - b.year);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    location?: unknown;
    sex?: unknown;
    majorCode?: unknown;
  } | null;
  const location =
    typeof body?.location === "string" ? body.location.trim() : "";
  const sex = typeof body?.sex === "string" ? body.sex.trim() : "Total";
  const majorCode =
    typeof body?.majorCode === "string" ? body.majorCode.trim() : "";

  if (!location) {
    return NextResponse.json(
      { error: "Enter a location before checking education trends." },
      { status: 400 },
    );
  }

  if (!/^[0-9]$/.test(majorCode)) {
    return NextResponse.json(
      { error: "Enter an ISCO-08 major code from 0 to 9." },
      { status: 400 },
    );
  }

  if (!["Total", "Male", "Female"].includes(sex)) {
    return NextResponse.json(
      { error: "Sex must be Total, Male, or Female." },
      { status: 400 },
    );
  }

  const rows = await loadRows();
  const locationMatch = findLocation(rows, location);

  if (!locationMatch.location) {
    return NextResponse.json(
      {
        error: "No matching location found in the education CSV.",
        suggestions: locationMatch.suggestions,
      },
      { status: 404 },
    );
  }

  const matchingRows = rows.filter(
    (row) =>
      row["location"] === locationMatch.location &&
      row["sex.label"] === sex &&
      majorCodeForRow(row) === majorCode &&
      aggregateEducationLevels.includes(row.EducationLevel),
  );

  if (matchingRows.length === 0) {
    return NextResponse.json(
      {
        error:
          "No education rows found for that location, sex, and ISCO major code.",
      },
      { status: 404 },
    );
  }

  const levels: EducationLevelTrend[] = aggregateEducationLevels.map(
    (level) => {
      const levelRows = matchingRows.filter(
        (row) => row.EducationLevel === level,
      );
      const points = buildLevelTrend(levelRows);
      const latest = points.length > 0 ? points[points.length - 1] : null;
      const previous = points.length > 1 ? points[points.length - 2] : null;
      const first = points.length > 0 ? points[0] : null;

      const latestChange =
        latest && previous
          ? {
              absolute: latest.value - previous.value,
              percent:
                previous.value === 0
                  ? null
                  : ((latest.value - previous.value) / previous.value) * 100,
            }
          : null;

      const periodChange =
        first && latest && first.year !== latest.year && first.value !== 0
          ? {
              absolute: latest.value - first.value,
              percent: ((latest.value - first.value) / first.value) * 100,
            }
          : null;

      return {
        level: educationLevelLabels[level] || level,
        points,
        latest,
        latestChange,
        periodChange,
      };
    },
  );

  // Compute latest-year distribution percentages
  const latestYears = levels
    .map((l) => l.latest?.year)
    .filter((y): y is number => typeof y === "number");
  const latestYear = latestYears.length > 0 ? Math.max(...latestYears) : null;
  const latestTotal = levels.reduce((sum, l) => {
    const point = l.points.find((p) => p.year === latestYear);
    return sum + (point?.value ?? 0);
  }, 0);
  const distribution = levels.map((l) => {
    const point = l.points.find((p) => p.year === latestYear);
    return {
      level: l.level,
      value: point?.value ?? 0,
      percent: latestTotal > 0 ? ((point?.value ?? 0) / latestTotal) * 100 : 0,
    };
  });

  return NextResponse.json({
    location: locationMatch.location,
    sex,
    majorCode,
    majorGroup: formatMajorGroup(matchingRows[0], majorCode),
    unit: "thousands of employed people",
    levels,
    distribution,
    latestYear,
    source: {
      indicator: matchingRows[0]?.["indicator.label"] ?? "",
      source: matchingRows[0]?.["source.label"] ?? "",
      note: matchingRows[0]?.["note_source.label"] ?? "",
      file: path.basename(eduCsvPath),
    },
  });
}
