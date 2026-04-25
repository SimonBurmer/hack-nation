import dotenv from 'dotenv';

dotenv.config();

const defaultEscoDataDir = 'ESCO dataset - v1.2.1 - classification - en - csv';

export const config = {
  csvPath:
    process.env.ESCO_CSV_PATH ||
    `${defaultEscoDataDir}/skills_en.csv`,
  databaseUrl: process.env.DATABASE_URL,
  embeddingBatchSize: Number(process.env.EMBEDDING_BATCH_SIZE || 100),
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  escoDataDir: process.env.ESCO_DATA_DIR || defaultEscoDataDir,
  importLimit: process.env.IMPORT_LIMIT ? Number(process.env.IMPORT_LIMIT) : null,
  openAiApiKey: process.env.OPENAI_API_KEY,
  occupationsCsvPath:
    process.env.ESCO_OCCUPATIONS_CSV_PATH ||
    `${process.env.ESCO_DATA_DIR || defaultEscoDataDir}/occupations_en.csv`,
  occupationSkillRelationsCsvPath:
    process.env.ESCO_OCCUPATION_SKILL_RELATIONS_CSV_PATH ||
    `${process.env.ESCO_DATA_DIR || defaultEscoDataDir}/occupationSkillRelations_en.csv`,
  skipExisting: process.env.SKIP_EXISTING !== 'false',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  upsertBatchSize: Number(process.env.UPSERT_BATCH_SIZE || 100)
};

export function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
