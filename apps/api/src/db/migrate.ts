// ── Database Migration Script ────────────────────
// Run: npx tsx src/db/migrate.ts
// Creates all tables and the pgvector HNSW index if they don't exist.

import 'dotenv/config';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

async function migrate() {
  console.log('🏗️  Running Chorus DB migration...\n');

  try {
    // ── Enable pgvector extension ────────────────────────────────────────────
    // await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    // console.log('✅ pgvector extension enabled');

    // ── users ────────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        github_id     TEXT NOT NULL UNIQUE,
        username      TEXT NOT NULL,
        display_name  TEXT NOT NULL,
        avatar_url    TEXT NOT NULL,
        email         TEXT,
        skill_profile JSONB,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_github_id_idx ON users (github_id)`;
    console.log('✅ users table ready');

    // ── repos ────────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS repos (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        repo_url        TEXT NOT NULL UNIQUE,
        owner           TEXT NOT NULL,
        name            TEXT NOT NULL,
        default_branch  TEXT NOT NULL DEFAULT 'main',
        description     TEXT,
        language        TEXT,
        stars           INTEGER NOT NULL DEFAULT 0,
        forks           INTEGER NOT NULL DEFAULT 0,
        open_issues     INTEGER NOT NULL DEFAULT 0,
        last_analyzed_at TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS repos_url_idx ON repos (repo_url)`;
    console.log('✅ repos table ready');

    // ── code_chunks (pgvector) ───────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS code_chunks (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chunk_id        TEXT NOT NULL UNIQUE,
        repo_id         TEXT NOT NULL,
        file_path       TEXT NOT NULL,
        start_line      INTEGER NOT NULL,
        end_line        INTEGER NOT NULL,
        content         TEXT NOT NULL,
        language        TEXT NOT NULL,
        chunk_type      TEXT NOT NULL DEFAULT 'block',
        symbol_name     TEXT,
        chunk_index     INTEGER NOT NULL DEFAULT 0,
        embedding       jsonb NOT NULL,
        embedding_model TEXT NOT NULL,
        embedded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata        JSONB,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS chunks_chunk_id_idx ON code_chunks (chunk_id)`;
    await sql`CREATE INDEX IF NOT EXISTS chunks_repo_id_idx ON code_chunks (repo_id)`;
    await sql`CREATE INDEX IF NOT EXISTS chunks_repo_file_idx ON code_chunks (repo_id, file_path)`;

    // HNSW index for fast approximate nearest-neighbour search (cosine distance)
    // HNSW index for fast approximate nearest-neighbour search (cosine distance)
    /*
    await sql`
      CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw_idx
      ON code_chunks
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `;
    console.log('✅ code_chunks table ready (with HNSW vector index)');
    */

    // ── repo_index ───────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS repo_index (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        repo_id         TEXT NOT NULL UNIQUE,
        commit_hash     TEXT,
        default_branch  TEXT NOT NULL DEFAULT 'main',
        size_kb         INTEGER NOT NULL DEFAULT 0,
        file_count      INTEGER NOT NULL DEFAULT 0,
        chunk_count     INTEGER NOT NULL DEFAULT 0,
        embedding_model TEXT NOT NULL DEFAULT '',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS repo_index_repo_id_idx ON repo_index (repo_id)`;
    console.log('✅ repo_index table ready');

    // ── graphs ───────────────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS graphs (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        repo_id               TEXT NOT NULL,
        level                 TEXT NOT NULL,
        commit_sha            TEXT NOT NULL,
        nodes                 JSONB NOT NULL DEFAULT '[]',
        edges                 JSONB NOT NULL DEFAULT '[]',
        repository            TEXT,
        summary               TEXT,
        architecture_pattern  TEXT,
        system_type           TEXT,
        complexity_score      NUMERIC,
        progressive_structure JSONB,
        visualization         JSONB,
        tags                  JSONB,
        metadata              JSONB,
        generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS graphs_repo_id_idx ON graphs (repo_id)`;
    await sql`CREATE INDEX IF NOT EXISTS graphs_repo_level_idx ON graphs (repo_id, level, commit_sha)`;
    console.log('✅ graphs table ready');

    // ── security_reports ─────────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS security_reports (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        repo_id            TEXT NOT NULL,
        vulnerabilities    JSONB NOT NULL DEFAULT '[]',
        secret_findings    JSONB NOT NULL DEFAULT '[]',
        license_info       JSONB NOT NULL DEFAULT '[]',
        overall_risk_score NUMERIC NOT NULL DEFAULT 0,
        generated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS security_reports_repo_id_idx ON security_reports (repo_id)`;
    await sql`CREATE INDEX IF NOT EXISTS security_reports_generated_at_idx ON security_reports (repo_id, generated_at)`;
    console.log('✅ security_reports table ready');

    console.log('\n🎉 Migration complete! All tables and indexes are ready.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
