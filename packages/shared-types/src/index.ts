// ── Repository Types ──────────────────────────────
export const REPO_RUNTIME = true;
// ── @chorus/shared-types ─────────────────────────
// The contract layer: every type that crosses a service boundary

export * from './repo';
export * from './graph';
export * from './rag';
export * from './branch';
export * from './security';
export * from './mcp';
export * from './user';
export * from './jobs';
export * from './events';

/**
 * Runtime marker to ensure JS emission
 */
export const VERSION = '0.1.0';
