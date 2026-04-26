import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CsvRow = Record<string, string>;

type TrendPoint = {
  year: number;
  value: number;
};

const iscoCsvPath = path.resolve(
  process.cwd(),
  "data",
  "isco",
  "EMP_TEMP_SEX_AGE_OCU_NB_A-filtered-2026-04-26.csv",
);

const defaultAgeGroup = "Age (Youth, adults): 15+";
const isco08MajorPattern = /^Occupation \(ISCO-08\): ([0-9])\. (.+?)\s*$/;

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

  const file = await readFile(iscoCsvPath, "utf8");
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
  const locations = [...new Set(rows.map((row) => row["ref_area.label"]))].sort();
  const exact = locations.find((item) => normalize(item) === normalizedLocation);

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

function groupByYear(rows: CsvRow[]) {
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

function trendDirection(points: TrendPoint[]) {
  if (points.length < 2) return "not enough history";

  const averageYear =
    points.reduce((total, point) => total + point.year, 0) / points.length;
  const averageValue =
    points.reduce((total, point) => total + point.value, 0) / points.length;
  const denominator = points.reduce(
    (total, point) => total + (point.year - averageYear) ** 2,
    0,
  );

  if (denominator === 0 || averageValue === 0) return "not enough history";

  const slope =
    points.reduce(
      (total, point) =>
        total + (point.year - averageYear) * (point.value - averageValue),
      0,
    ) / denominator;
  const fittedPeriodChange =
    slope * (points[points.length - 1].year - points[0].year);
  const fittedPeriodChangePercent = (fittedPeriodChange / averageValue) * 100;

  if (Math.abs(fittedPeriodChangePercent) < 1) return "stable";
  return fittedPeriodChangePercent > 0 ? "increasing" : "decreasing";
}

function majorCodeForRow(row: CsvRow) {
  if (row.isco_08_major_code) return row.isco_08_major_code;

  const occupation = row.Occupation || row["classif2.label"] || "";
  const match = occupation.trim().match(isco08MajorPattern);

  return match?.[1] ?? "";
}

function majorLabelForRow(row: CsvRow) {
  if (row.isco_08_major_label) return row.isco_08_major_label;

  const occupation = row.Occupation || row["classif2.label"] || "";
  const match = occupation.trim().match(isco08MajorPattern);

  return match?.[2] ?? "";
}

function formatMajorGroup(row: CsvRow | undefined, majorCode: string) {
  if (!row) return `${majorCode}. ISCO-08 major group`;

  return (
    row.isco_08_major_group ||
    `${majorCode}. ${majorLabelForRow(row) || "ISCO-08 major group"}`
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    location?: unknown;
    sex?: unknown;
    majorCode?: unknown;
    ageGroup?: unknown;
  } | null;
  const location =
    typeof body?.location === "string" ? body.location.trim() : "";
  const sex = typeof body?.sex === "string" ? body.sex.trim() : "Total";
  const majorCode =
    typeof body?.majorCode === "string" ? body.majorCode.trim() : "";
  const ageGroup =
    typeof body?.ageGroup === "string" && body.ageGroup.trim()
      ? body.ageGroup.trim()
      : defaultAgeGroup;

  if (!location) {
    return NextResponse.json(
      { error: "Enter a location before checking the trend." },
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
        error: "No matching location found in the ISCO trend CSV.",
        suggestions: locationMatch.suggestions,
      },
      { status: 404 },
    );
  }

  const matchingRows = rows.filter(
    (row) =>
      row["ref_area.label"] === locationMatch.location &&
      row["sex.label"] === sex &&
      row["classif1.label"] === ageGroup &&
      majorCodeForRow(row) === majorCode,
  );
  const points = groupByYear(matchingRows);

  if (points.length === 0) {
    return NextResponse.json(
      {
        error:
          "No trend rows found for that location, sex, age group, and ISCO major code.",
      },
      { status: 404 },
    );
  }

  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const first = points[0];
  const latestChange = previous
    ? {
        absolute: latest.value - previous.value,
        percent:
          previous.value === 0
            ? null
            : ((latest.value - previous.value) / previous.value) * 100,
      }
    : null;
  const periodChange =
    first.year === latest.year || first.value === 0
      ? null
      : {
          absolute: latest.value - first.value,
          percent: ((latest.value - first.value) / first.value) * 100,
        };

  return NextResponse.json({
    location: locationMatch.location,
    sex,
    ageGroup,
    majorCode,
    majorGroup: formatMajorGroup(matchingRows[0], majorCode),
    unit: "thousands of employed people",
    source: {
      indicator: matchingRows[0]?.["indicator.label"] ?? "",
      source: matchingRows[0]?.["source.label"] ?? "",
      note: matchingRows[0]?.["note_source.label"] ?? "",
      file: path.basename(iscoCsvPath),
    },
    points,
    latest,
    previous: previous ?? null,
    latestChange,
    periodChange,
    direction: trendDirection(points),
  });
}
