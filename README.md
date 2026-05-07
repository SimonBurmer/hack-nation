# Analytical Dataplane for skill and opportunity discovery (SkillRoute)
<img width="2873" height="1655" alt="grafik" src="https://github.com/user-attachments/assets/fbe216a1-340b-42ae-bdb9-d97df006f4a2" />

SkillRoute is a hackathon prototype for converting informal, real-life
experience into structured skill profiles and practical opportunity matches.

Built for the **UNMAPPED** challenge, it helps surface skills that may not be
represented by certificates, formal employment history, or a traditional CV.

## What Is in This Repo

This repository contains the product prototype, supporting data pipeline, and
pitch materials:

- `web/`: main Next.js application for the SkillRoute experience
- `pitch/`: separate Next.js pitch deck
- `scripts/`: ESCO/ISCO import, cleanup, seed, and search utilities
- `supabase/`: Postgres schema, pgvector setup, tables, indexes, and RPCs
- `ESCO dataset - v1.2.1 - classification - en - csv/`: source ESCO/ISCO CSVs
- `05 - World Bank - Unmapped.docx - Google Docs.pdf`: challenge reference doc

## Main App

The main app lives in `web/` and includes:

- chat-based skill discovery with Milo
- skill profile generation from user intake conversations
- ESCO semantic skill search
- ISCO occupation mapping
- opportunity matching for jobs, training, and self-employment pathways
- youth-facing profile and opportunity views
- admin/program-facing protocol and aggregate views
- econometric and labor-market dashboards

Important app routes and modules:

- `web/src/app/page.tsx`: main entry point
- `web/src/app/search-client.tsx`: primary search/profile client flow
- `web/src/app/search/`: Milo chat, results, profile, opportunity, and dashboard UI
- `web/src/app/api/search/route.ts`: ESCO semantic search API
- `web/src/app/api/skill-profile/`: intake and generated profile APIs
- `web/src/app/api/occupations/route.ts`: occupation lookup API
- `web/src/app/api/econometric-data/route.ts`: dashboard data API
- `web/src/lib/supabase/`: Supabase client/server helpers

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- OpenAI models and embeddings
- Supabase Postgres with pgvector
- ESCO taxonomy data
- ISCO occupation classification data
- Tailwind CSS and shadcn-style UI components

## Data Pipeline

Root-level scripts load and query the ESCO/ISCO dataset:

- `scripts/setup-db.js`: applies `supabase/schema.sql`
- `scripts/import-skills.js`: imports ESCO skills and OpenAI embeddings
- `scripts/import-occupations.js`: imports occupations and skill relations
- `scripts/search-skills.js`: runs semantic skill search from the CLI
- `scripts/seed-demo-data.js`: inserts demo application data
- `scripts/filter_isco_rows.py`: filters ISCO labor-market rows
- `scripts/clean_isco_occupation_csv.py`: cleans ISCO occupation CSV data

The data flow is:

1. A user talks to Milo about their background, experience, education, country,
   language, work authorization, and confidence.
2. The backend extracts skills and evidence from the conversation.
3. Extracted skills are embedded and matched against ESCO skills in Supabase.
4. Related occupations are mapped through ISCO data.
5. The app generates a skill profile and suggests relevant local pathways.

## Getting Started

Install root dependencies:

```bash
npm install
```

Create the root environment file:

```bash
cp .env.example .env
```

Set the required values:

- `OPENAI_API_KEY`
- `DATABASE_URL`
- `ESCO_CSV_PATH`
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` if using Supabase writes from scripts

Create the Supabase schema:

```bash
npm run db:setup
```

Import ESCO skills and occupation data:

```bash
npm run import:skills
npm run import:occupations
```

Run a semantic search from the CLI:

```bash
npm run search -- "repair bicycle brakes and talk to customers"
```

## Web App

Install and run the Next.js app:

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Required web environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`

## Pitch Deck

The pitch deck is a separate Next.js app:

```bash
cd pitch
npm install
npm run dev
```

## Useful Commands

```bash
npm run db:setup
npm run import:skills
npm run import:occupations
npm run search -- "your skill query"
cd web && npm run dev
cd web && npm run build
cd web && npm run lint
cd pitch && npm run dev
```

Optional import settings:

- `IMPORT_LIMIT=1000` imports a smaller dataset sample
- `MATCH_COUNT=20` returns more semantic search results
- `EMBEDDING_BATCH_SIZE=50` lowers OpenAI embedding batch size
- `UPSERT_BATCH_SIZE=50` lowers Supabase write batch size

## Database

Main tables:

- `public.esco_skills`
- `public.esco_occupations`
- `public.esco_occupation_skill_relations`
- `public.user_sessions`
- `public.skill_profiles`
- `public.user_identified_skills`
- `public.user_opportunities`

Search RPCs:

```sql
public.match_esco_skills(query_embedding vector(1536), match_count int)
public.find_esco_skills_by_label(skill_label text)
public.suggest_esco_skills_by_label(skill_label text, match_count int)
public.get_esco_occupations_for_skills(skill_uris text[])
```

Analytics RPCs:

```sql
public.get_top_skills(limit_count int)
public.get_top_opportunities(limit_count int)
```

## Project Structure

```text
.
├── 05 - World Bank - Unmapped.docx - Google Docs.pdf
├── ESCO dataset - v1.2.1 - classification - en - csv/
├── MyData/
├── pitch/
│   └── app/
├── plans/
├── scripts/
├── supabase/
│   └── schema.sql
├── web/
│   └── src/
│       ├── app/
│       ├── components/
│       └── lib/
├── esco_skill_to_occupations.py
├── package.json
└── README.md
```
