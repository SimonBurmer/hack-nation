import fs from 'node:fs';
import { parse } from 'csv-parse';
import postgres from 'postgres';
import { config, requireEnv } from './config.js';

requireEnv(['DATABASE_URL']);

const sql = postgres(config.databaseUrl, {
  max: 1,
  prepare: false,
  ssl: 'require'
});

const occupationColumns = [
  'concept_uri',
  'concept_type',
  'isco_group',
  'preferred_label',
  'alt_labels',
  'hidden_labels',
  'status',
  'modified_date',
  'regulated_profession_note',
  'scope_note',
  'definition',
  'in_scheme',
  'description',
  'code',
  'nace_code',
  'raw'
];

const relationColumns = [
  'occupation_uri',
  'occupation_label',
  'relation_type',
  'skill_type',
  'skill_uri',
  'skill_label',
  'raw'
];

function splitLabels(value) {
  if (!value) return [];

  return value
    .split(/\r?\n/)
    .map((label) => label.trim())
    .filter(Boolean);
}

function emptyToNull(value) {
  return value || null;
}

function rowToOccupation(row) {
  return {
    concept_uri: row.conceptUri,
    concept_type: emptyToNull(row.conceptType),
    isco_group: emptyToNull(row.iscoGroup),
    preferred_label: row.preferredLabel,
    alt_labels: splitLabels(row.altLabels),
    hidden_labels: splitLabels(row.hiddenLabels),
    status: emptyToNull(row.status),
    modified_date: emptyToNull(row.modifiedDate),
    regulated_profession_note: emptyToNull(row.regulatedProfessionNote),
    scope_note: emptyToNull(row.scopeNote),
    definition: emptyToNull(row.definition),
    in_scheme: emptyToNull(row.inScheme),
    description: emptyToNull(row.description),
    code: emptyToNull(row.code),
    nace_code: splitLabels(row.naceCode),
    raw: row
  };
}

function rowToRelation(row) {
  return {
    occupation_uri: row.occupationUri,
    occupation_label: emptyToNull(row.occupationLabel),
    relation_type: emptyToNull(row.relationType),
    skill_type: emptyToNull(row.skillType),
    skill_uri: row.skillUri,
    skill_label: emptyToNull(row.skillLabel),
    raw: row
  };
}

function dedupeBy(rows, getKey) {
  const deduped = new Map();

  for (const row of rows) {
    deduped.set(getKey(row), row);
  }

  return [...deduped.values()];
}

async function importCsv(path, rowMapper, batchSize, upsertBatch) {
  const parser = fs.createReadStream(path).pipe(
    parse({
      bom: true,
      columns: true,
      relax_quotes: true,
      skip_empty_lines: true
    })
  );

  const pending = [];
  let imported = 0;
  let read = 0;

  for await (const row of parser) {
    if (config.importLimit && read >= config.importLimit) break;

    read += 1;
    const mapped = rowMapper(row);
    pending.push(mapped);

    if (pending.length >= batchSize) {
      await upsertBatch(pending.splice(0, pending.length));
      imported += batchSize;
      console.log(`Imported ${imported} rows from ${path}`);
    }
  }

  if (pending.length > 0) {
    await upsertBatch(pending);
    imported += pending.length;
  }

  console.log(`Done. Read ${read} rows from ${path}, imported ${imported}.`);
}

async function upsertOccupations(rows) {
  const validRows = dedupeBy(
    rows.filter((row) => row.concept_uri && row.preferred_label),
    (row) => row.concept_uri
  );
  if (validRows.length === 0) return;

  await sql`
    insert into public.esco_occupations ${sql(validRows, occupationColumns)}
    on conflict (concept_uri) do update set
      concept_type = excluded.concept_type,
      isco_group = excluded.isco_group,
      preferred_label = excluded.preferred_label,
      alt_labels = excluded.alt_labels,
      hidden_labels = excluded.hidden_labels,
      status = excluded.status,
      modified_date = excluded.modified_date,
      regulated_profession_note = excluded.regulated_profession_note,
      scope_note = excluded.scope_note,
      definition = excluded.definition,
      in_scheme = excluded.in_scheme,
      description = excluded.description,
      code = excluded.code,
      nace_code = excluded.nace_code,
      raw = excluded.raw,
      updated_at = now()
  `;
}

async function upsertRelations(rows) {
  const validRows = dedupeBy(
    rows.filter((row) => row.occupation_uri && row.skill_uri),
    (row) => `${row.occupation_uri}\t${row.skill_uri}\t${row.relation_type || ''}`
  );
  if (validRows.length === 0) return;

  await sql`
    insert into public.esco_occupation_skill_relations ${sql(validRows, relationColumns)}
    on conflict (occupation_uri, skill_uri, relation_type) do update set
      occupation_label = excluded.occupation_label,
      skill_type = excluded.skill_type,
      skill_label = excluded.skill_label,
      raw = excluded.raw,
      updated_at = now()
  `;
}

try {
  await importCsv(
    config.occupationsCsvPath,
    rowToOccupation,
    config.upsertBatchSize,
    upsertOccupations
  );
  await importCsv(
    config.occupationSkillRelationsCsvPath,
    rowToRelation,
    config.upsertBatchSize,
    upsertRelations
  );
} finally {
  await sql.end();
}
