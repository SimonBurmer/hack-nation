"use client";

import { Hash, Plus, Table2 } from "lucide-react";

type AdminProtocolPanelProps = {
  adminCsvColumns: string[];
  adminCsvFileName: string;
  adminIscoColumn: string;
  protocolStatus: string;
  onPreviewCsvColumns: (file: File | undefined) => void;
  onSelectIscoColumn: (column: string) => void;
};

const iscoMajorGroups = [
  {
    code: "0",
    title: "Armed forces",
    example: "military and defense roles",
  },
  {
    code: "1",
    title: "Managers",
    example: "shop owner, operations lead",
  },
  {
    code: "2",
    title: "Professionals",
    example: "engineer, teacher, developer",
  },
  {
    code: "3",
    title: "Technicians",
    example: "ICT support, lab technician",
  },
  {
    code: "4",
    title: "Clerical support",
    example: "records, office, data entry",
  },
  {
    code: "5",
    title: "Service and sales",
    example: "retail, customer support",
  },
  {
    code: "6",
    title: "Skilled agriculture",
    example: "farm, forestry, fishery",
  },
  {
    code: "7",
    title: "Craft and trades",
    example: "repair, electrical, mechanics",
  },
  {
    code: "8",
    title: "Machine operators",
    example: "drivers, plant operators",
  },
  {
    code: "9",
    title: "Elementary roles",
    example: "helpers, cleaners, laborers",
  },
];

const diagramDataPoints = [
  {
    label: "Wage floors",
    detail: "minimum realistic earnings",
    position: "left-4 top-8",
    connector: "left-[24%] top-[25%] w-[18%] rotate-[18deg]",
  },
  {
    label: "Sector growth",
    detail: "where demand is expanding",
    position: "right-4 top-8",
    connector: "right-[24%] top-[25%] w-[18%] -rotate-[18deg]",
  },
  {
    label: "Education returns",
    detail: "credential value by path",
    position: "left-10 top-[42%]",
    connector: "left-[26%] top-[49%] w-[16%]",
  },
  {
    label: "Local jobs",
    detail: "real openings and pathways",
    position: "right-10 top-[42%]",
    connector: "right-[26%] top-[49%] w-[16%]",
  },
  {
    label: "Training supply",
    detail: "available seats and costs",
    position: "left-4 bottom-8",
    connector: "left-[24%] bottom-[25%] w-[18%] -rotate-[18deg]",
  },
  {
    label: "Automation risk",
    detail: "task exposure by occupation",
    position: "right-4 bottom-8",
    connector: "right-[24%] bottom-[25%] w-[18%] rotate-[18deg]",
  },
];

export function AdminProtocolPanel({
  adminCsvColumns,
  adminCsvFileName,
  adminIscoColumn,
  protocolStatus,
  onPreviewCsvColumns,
  onSelectIscoColumn,
}: AdminProtocolPanelProps) {
  return (
    <section className="grid gap-5">
      <section className="overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Admin setup
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
            Every dataset connects through ISCO.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Partners upload CSVs with an `isco_code` column. The dashboard
            groups each row by the first digit, so wage, growth, education,
            training, and risk data all speak one shared occupation language.
          </p>
        </div>

        <div className="relative min-h-[34rem] overflow-hidden bg-[#f8faf8] p-4 sm:p-6">
          <div className="absolute inset-x-8 top-1/2 hidden h-px bg-zinc-300 md:block" />
          <div className="absolute inset-y-8 left-1/2 hidden w-px bg-zinc-300 md:block" />
          {diagramDataPoints.map((point) => (
            <div key={point.label}>
              <div
                className={`absolute hidden h-px origin-center bg-cyan-700/50 md:block ${point.connector}`}
              />
              <article
                className={`relative z-10 mb-3 rounded-md border border-zinc-300 bg-white p-3 shadow-sm md:absolute md:mb-0 md:w-52 ${point.position}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                  Data point
                </p>
                <h3 className="mt-2 font-semibold text-zinc-950">
                  {point.label}
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {point.detail}
                </p>
              </article>
            </div>
          ))}

          <div className="relative z-20 mx-auto mt-4 grid max-w-sm place-items-center rounded-md border border-zinc-900 bg-zinc-950 px-5 py-8 text-center text-white shadow-lg md:absolute md:left-1/2 md:top-1/2 md:mt-0 md:-translate-x-1/2 md:-translate-y-1/2">
            <Hash className="size-8 text-cyan-200" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Primary key
            </p>
            <h3 className="mt-2 font-mono text-5xl font-semibold">ISCO</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Use the first digit of `isco_code` to aggregate all local
              opportunity evidence into one dashboard spine.
            </p>
            <p className="mt-4 rounded border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 font-mono text-sm text-cyan-50">
              7422 -&gt; 7
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
            ISCO first digit
          </p>
          <h3 className="mt-1 text-xl font-semibold text-zinc-950">
            What the major group means
          </h3>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-5">
          {iscoMajorGroups.map((group) => (
            <article
              key={group.code}
              className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="grid h-10 w-10 place-items-center rounded-md bg-zinc-950 font-mono text-xl font-semibold text-white">
                  {group.code}
                </p>
                <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-zinc-600">
                  ISCO-{group.code}
                </span>
              </div>
              <h4 className="mt-3 text-sm font-semibold text-zinc-950">
                {group.title}
              </h4>
              <p className="mt-1 text-xs leading-5 text-zinc-600">
                {group.example}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-zinc-300 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-zinc-200 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              CSV intake UI
            </p>
            <h3 className="mt-1 text-xl font-semibold text-zinc-950">
              Upload one CSV and select the ISCO column
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              The UI reads only the header row to show column names. The admin
              chooses which column contains the ISCO first-digit code; no row
              data is imported, stored, or aggregated.
            </p>
          </div>
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-cyan-800">
            <Plus className="size-4" />
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => onPreviewCsvColumns(event.target.files?.[0])}
            />
          </label>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Uploaded file
            </p>
            <h4 className="mt-2 break-all font-mono text-sm font-semibold text-zinc-950">
              {adminCsvFileName || "No CSV selected"}
            </h4>
            <div className="mt-3 rounded-md border border-dashed border-zinc-300 bg-white px-3 py-6 text-center">
              <Table2 className="mx-auto size-6 text-cyan-700" />
              <p className="mt-2 text-sm font-semibold text-zinc-950">
                Header preview only
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                SkillRoute reads column names from the first non-empty row.
              </p>
            </div>
            <label className="mt-3 grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                ISCO 1 code column
              </span>
              <select
                value={adminIscoColumn}
                onChange={(event) => onSelectIscoColumn(event.target.value)}
                disabled={adminCsvColumns.length === 0}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15 disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                {adminCsvColumns.length === 0 ? (
                  <option value="">Upload a CSV first</option>
                ) : (
                  adminCsvColumns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))
                )}
              </select>
            </label>
          </aside>

          <section className="rounded-md border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
                CSV columns
              </p>
              <h4 className="mt-1 font-semibold text-zinc-950">
                ISCO column is pinned first
              </h4>
            </div>
            {adminCsvColumns.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-zinc-500">
                Upload a CSV to preview its column names.
              </div>
            ) : (
              <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  adminIscoColumn,
                  ...adminCsvColumns.filter(
                    (column) => column !== adminIscoColumn,
                  ),
                ]
                  .filter(Boolean)
                  .map((column, index) => {
                    const isIscoColumn = column === adminIscoColumn;

                    return (
                      <div
                        key={`${column}-${index}`}
                        className={`rounded-md border px-3 py-2 ${
                          isIscoColumn
                            ? "border-cyan-400 bg-cyan-50 text-cyan-950"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="break-all font-mono text-sm font-semibold">
                            {column}
                          </span>
                          {isIscoColumn ? (
                            <span className="shrink-0 rounded bg-cyan-800 px-2 py-0.5 text-xs font-semibold text-white">
                              ISCO
                            </span>
                          ) : (
                            <span className="shrink-0 rounded bg-white px-2 py-0.5 text-xs font-semibold text-zinc-500">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        {isIscoColumn ? (
                          <p className="mt-2 text-xs leading-5">
                            This column will be displayed first and used as the
                            ISCO first-digit key later.
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        </div>

        {protocolStatus ? (
          <p className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
            {protocolStatus}
          </p>
        ) : null}
      </section>
    </section>
  );
}
