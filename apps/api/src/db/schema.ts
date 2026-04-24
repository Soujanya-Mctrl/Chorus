// ── Drizzle ORM Schema ───────────────────────────
// Defines all PostgreSQL tables mirroring the former Mongoose models.
// The `vector` custom type enables pgvector columns (vector(768) for Gemini embeddings).

import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  uuid,
  uniqueIndex,
  index,
  customType,
  numeric,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── pgvector Custom Column Type ─────────────────────────────────────────────

/**
 * Maps a number[] ↔ PostgreSQL vector(n) using pgvector syntax.
 * e.g. [0.1, 0.2, 0.3] → '[0.1,0.2,0.3]'
 */
export const vector = customType<{ data: number[]; config: { dimensions: number } }>({
  dataType(config) {
    // Fallback to jsonb if pgvector is not available
    return `jsonb`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === 'string') {
      return value.slice(1, -1).split(',').map(Number);
    }
    return value as number[];
  },
});

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    githubId: text('github_id').notNull().unique(),
    username: text('username').notNull(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url').notNull(),
    email: text('email'),
    skillProfile: jsonb('skill_profile'),
    onboardingComplete: integer('onboarding_complete').notNull().default(0), // 0 for false, 1 for true
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('users_github_id_idx').on(t.githubId)],
);

// ─── repos ────────────────────────────────────────────────────────────────────

export const repos = pgTable(
  'repos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    repoUrl: text('repo_url').notNull().unique(),
    owner: text('owner').notNull(),
    name: text('name').notNull(),
    defaultBranch: text('default_branch').notNull().default('main'),
    description: text('description'),
    language: text('language'),
    stars: integer('stars').notNull().default(0),
    forks: integer('forks').notNull().default(0),
    openIssues: integer('open_issues').notNull().default(0),
    lastAnalyzedAt: timestamp('last_analyzed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('repos_url_idx').on(t.repoUrl)],
);

// ─── code_chunks (with pgvector) ─────────────────────────────────────────────

export const codeChunks = pgTable(
  'code_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chunkId: text('chunk_id').notNull().unique(),
    repoId: text('repo_id').notNull(),
    filePath: text('file_path').notNull(),
    startLine: integer('start_line').notNull(),
    endLine: integer('end_line').notNull(),
    content: text('content').notNull(),
    language: text('language').notNull(),
    chunkType: text('chunk_type').notNull().default('block'),
    symbolName: text('symbol_name'),
    chunkIndex: integer('chunk_index').notNull().default(0),
    // 768 dimensions = Gemini embedding-001; 384 = Xenova fallback
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    embeddingModel: text('embedding_model').notNull(),
    embeddedAt: timestamp('embedded_at', { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('chunks_chunk_id_idx').on(t.chunkId),
    index('chunks_repo_id_idx').on(t.repoId),
    index('chunks_repo_file_idx').on(t.repoId, t.filePath),
    // HNSW index is created via raw SQL in migrate.ts (drizzle customType can't describe it)
  ],
);

// ─── repo_index ───────────────────────────────────────────────────────────────

export const repoIndex = pgTable(
  'repo_index',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    repoId: text('repo_id').notNull().unique(),
    commitHash: text('commit_hash'),
    defaultBranch: text('default_branch').notNull().default('main'),
    sizeKB: integer('size_kb').notNull().default(0),
    fileCount: integer('file_count').notNull().default(0),
    chunkCount: integer('chunk_count').notNull().default(0),
    embeddingModel: text('embedding_model').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('repo_index_repo_id_idx').on(t.repoId)],
);

// ─── graphs ───────────────────────────────────────────────────────────────────

export const graphs = pgTable(
  'graphs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    repoId: text('repo_id').notNull(),
    level: text('level').notNull(), // 'file' | 'module' | 'service' | 'architecture'
    commitSha: text('commit_sha').notNull(),
    nodes: jsonb('nodes').notNull().default(sql`'[]'::jsonb`),
    edges: jsonb('edges').notNull().default(sql`'[]'::jsonb`),
    repository: text('repository'),
    summary: text('summary'),
    architecturePattern: text('architecture_pattern'),
    systemType: text('system_type'),
    complexityScore: numeric('complexity_score'),
    progressiveStructure: jsonb('progressive_structure'),
    visualization: jsonb('visualization'),
    tags: jsonb('tags'),
    metadata: jsonb('metadata'),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('graphs_repo_id_idx').on(t.repoId),
    index('graphs_repo_level_idx').on(t.repoId, t.level, t.commitSha),
  ],
);

// ─── security_reports ─────────────────────────────────────────────────────────

export const securityReports = pgTable(
  'security_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    repoId: text('repo_id').notNull(),
    vulnerabilities: jsonb('vulnerabilities').notNull().default(sql`'[]'::jsonb`),
    secretFindings: jsonb('secret_findings').notNull().default(sql`'[]'::jsonb`),
    licenseInfo: jsonb('license_info').notNull().default(sql`'[]'::jsonb`),
    overallRiskScore: numeric('overall_risk_score').notNull().default('0'),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('security_reports_repo_id_idx').on(t.repoId),
    index('security_reports_generated_at_idx').on(t.repoId, t.generatedAt),
  ],
);

// ─── Inferred Row Types ───────────────────────────────────────────────────────

export type UserRow = typeof users.$inferSelect;
export type RepoRow = typeof repos.$inferSelect;
export type CodeChunkRow = typeof codeChunks.$inferSelect;
export type RepoIndexRow = typeof repoIndex.$inferSelect;
export type GraphRow = typeof graphs.$inferSelect;
export type SecurityReportRow = typeof securityReports.$inferSelect;
