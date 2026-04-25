# ESCO Semantic Search

Upload ESCO `skills_en.csv` to Supabase, embed each skill's `preferredLabel` plus `altLabels`, and query the database with semantic search.

## Overview

The import flow stores ESCO skills in Supabase with a `pgvector` embedding. The embedding text is:

```text
preferredLabel
altLabel 1
altLabel 2
...
```

Queries are embedded with the same model and matched against the stored skill vectors.

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Fill in:

- `OPENAI_API_KEY`
- `DATABASE_URL`

Use the Supabase pooler connection string if the direct database host does not resolve on your network.

Create the Supabase schema:

```bash
npm run db:setup
```

If you do not want to use `DATABASE_URL`, paste `supabase/schema.sql` into the Supabase SQL editor and run it there.

Import the ESCO skills CSV:

```bash
npm run import:skills
```

Test semantic search:

```bash
npm run search -- "manage a team of musicians"
```

Run the Next.js search UI:

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Fill `web/.env.local` with `OPENAI_API_KEY`. The Supabase URL and publishable key are already shown in `web/.env.example`.

## Project Structure

```text
.
├── ESCO dataset - v1.2.1 - classification - en - csv/
│   └── skills_en.csv
├── scripts/
│   ├── config.js
│   ├── import-skills.js
│   ├── search-skills.js
│   └── setup-db.js
├── supabase/
│   └── schema.sql
├── web/
│   └── Next.js search UI
├── .env.example
├── package.json
└── README.md
```

## Useful Options

- `IMPORT_LIMIT=1000 npm run import:skills` imports a smaller test sample.
- `MATCH_COUNT=20 npm run search -- "your query"` returns more matches.
- `EMBEDDING_BATCH_SIZE=50` lowers OpenAI request batch size if needed.
- `UPSERT_BATCH_SIZE=50` lowers Supabase write batch size if needed.

## Database

The main table is `public.esco_skills`.

The search RPC is:

```sql
public.match_esco_skills(query_embedding vector(1536), match_count int)
```
