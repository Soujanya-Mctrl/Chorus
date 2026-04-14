/**
 * Hacktropica RAG Accuracy Evaluator
 *
 * Runs a deeper, metric-focused eval on top of the basic test suite.
 * Measures:
 *   - Precision@K: of top-K chunks retrieved, how many are relevant?
 *   - Recall@K: of all relevant chunks, how many did we retrieve?
 *   - MRR (Mean Reciprocal Rank): how highly ranked is the first correct chunk?
 *   - Hallucination score: did the LLM introduce facts not in retrieved context?
 *
 * Run: npx ts-node src/rag/tests/eval.ts
 */


import fs from "fs";
import path from "path";

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface EvalCase {
  query: string;
  groundTruthChunkIds: string[]; // IDs of chunks that are genuinely relevant
  groundTruthAnswer: string; // the "ideal" answer you write manually
}

interface ChunkWithId {
  id: string;
  content: string;
  sourceFile: string;
  startLine: number;
}

interface EvalResult {
  query: string;
  precisionAtK: number;
  recallAtK: number;
  mrr: number;
  hallucinationScore: number; // 0 = no hallucination, 1 = complete hallucination
  f1: number;
}

// ─── CHUNK THE FIXTURE REPO ─────────────────────────────────────────────────
// In production, replace this with your pgvector chunk retrieval.

function chunkFixtureRepo(fixtureDir: string): ChunkWithId[] {
  const chunks: ChunkWithId[] = [];
  const files = fs.readdirSync(fixtureDir).filter((f) => f.endsWith(".ts"));

  for (const file of files) {
    const content = fs.readFileSync(path.join(fixtureDir, file), "utf-8");
    const lines = content.split("\n");
    const chunkSize = 15;

    for (let i = 0; i < lines.length; i += chunkSize) {
      chunks.push({
        id: `${file}:${i}-${i + chunkSize}`,
        content: lines.slice(i, i + chunkSize).join("\n"),
        sourceFile: file,
        startLine: i,
      });
    }
  }

  return chunks;
}

// ─── GROUND TRUTH ───────────────────────────────────────────────────────────
// These map queries to which chunk IDs are the "correct" retrieval targets.
// The chunk IDs come from the fixture chunking above (file:startLine-endLine).
// You must manually verify these after running chunkFixtureRepo() once.

const EVAL_CASES: EvalCase[] = [
  {
    query: "How is a user's level calculated from XP?",
    groundTruthChunkIds: ["index.ts:30-45"], // contains calculateLevel
    groundTruthAnswer:
      "The level is calculated using a logarithmic formula: floor(log2(xp / 100)) + 1. Users below 100 XP are level 1.",
  },
  {
    query: "What badges can a user earn?",
    groundTruthChunkIds: ["utils.ts:45-60"], // contains checkAndAwardBadges
    groundTruthAnswer:
      "Users can earn: first-pr (first contribution), streak-7 (7-day streak), streak-30 (30-day streak), polyglot, and top-100 badges.",
  },
  {
    query: "What is the leaderboard ranking formula?",
    groundTruthChunkIds: ["utils.ts:60-75"], // contains computeContributionRank
    groundTruthAnswer:
      "CR = Complexity × RepoQuality × ReviewQuality × Recency + DiversityBonus",
  },
];

// ─── METRICS ────────────────────────────────────────────────────────────────

function precisionAtK(retrieved: string[], relevant: string[], k: number): number {
  const topK = retrieved.slice(0, k);
  const hits = topK.filter((id) => relevant.some((r) => id.includes(r.split(":")[0]))).length;
  return hits / k;
}

function recallAtK(retrieved: string[], relevant: string[], k: number): number {
  const topK = retrieved.slice(0, k);
  const hits = relevant.filter((r) =>
    topK.some((id) => id.includes(r.split(":")[0]))
  ).length;
  return hits / relevant.length;
}

function meanReciprocalRank(retrieved: string[], relevant: string[]): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (relevant.some((r) => retrieved[i].includes(r.split(":")[0]))) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

function hallucinationScore(answer: string, retrievedContext: string): number {
  // Simple heuristic: count sentences in answer not grounded in context
  const sentences = answer.split(/[.!?]+/).filter(Boolean);
  let ungroundedCount = 0;

  for (const sentence of sentences) {
    const words = sentence
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4); // ignore short words
    const grounded = words.some((w) => retrievedContext.toLowerCase().includes(w));
    if (!grounded) ungroundedCount++;
  }

  return sentences.length > 0 ? ungroundedCount / sentences.length : 0;
}

function f1(precision: number, recall: number): number {
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

// ─── MOCK RETRIEVE ───────────────────────────────────────────────────────────
// Replace with your actual pgvector retrieval function

function mockRetrieve(query: string, chunks: ChunkWithId[], topK: number): ChunkWithId[] {
  const queryWords = query.toLowerCase().split(/\W+/);
  return chunks
    .map((chunk) => ({
      chunk,
      score: queryWords.filter((w) => chunk.content.toLowerCase().includes(w)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => r.chunk);
}

// ─── EVAL RUNNER ─────────────────────────────────────────────────────────────

async function runEval(): Promise<void> {
  const fixtureDir = path.join(__dirname, "fixtures", "sample-repo");

  if (!fs.existsSync(fixtureDir)) {
    console.error(`❌ Fixture directory not found: ${fixtureDir}`);
    console.error("   Create it with sample .ts files first.");
    process.exit(1);
  }

  const allChunks = chunkFixtureRepo(fixtureDir);
  console.log(`\n🔬 Hacktropica RAG Eval — ${allChunks.length} total chunks indexed\n`);
  console.log("=".repeat(70));

  const K = 3;
  const evalResults: EvalResult[] = [];

  for (const ec of EVAL_CASES) {
    const retrieved = mockRetrieve(ec.query, allChunks, K);
    const retrievedIds = retrieved.map((c) => c.id);
    const retrievedContext = retrieved.map((c) => c.content).join("\n\n");

    // Simulate an LLM answer (replace with real call)
    const simulatedAnswer = `Based on the code, here is the answer: ${retrievedContext.slice(0, 200)}`;

    const p = precisionAtK(retrievedIds, ec.groundTruthChunkIds, K);
    const r = recallAtK(retrievedIds, ec.groundTruthChunkIds, K);
    const mrr = meanReciprocalRank(retrievedIds, ec.groundTruthChunkIds);
    const hs = hallucinationScore(simulatedAnswer, retrievedContext);
    const f = f1(p, r);

    evalResults.push({
      query: ec.query,
      precisionAtK: p,
      recallAtK: r,
      mrr,
      hallucinationScore: hs,
      f1: f,
    });

    const icon = f >= 0.5 ? "✅" : "⚠️ ";
    console.log(`\n${icon} Query: "${ec.query.slice(0, 55)}..."`);
    console.log(`   Precision@${K}: ${(p * 100).toFixed(0)}%`);
    console.log(`   Recall@${K}:    ${(r * 100).toFixed(0)}%`);
    console.log(`   F1 Score:    ${f.toFixed(2)}`);
    console.log(`   MRR:         ${mrr.toFixed(2)}`);
    console.log(`   Hallucination risk: ${(hs * 100).toFixed(0)}%`);
  }

  // ─── AGGREGATE METRICS ────────────────────────────────────────────────────
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  console.log("\n" + "=".repeat(70));
  console.log("📈 AGGREGATE METRICS");
  console.log("=".repeat(70));
  console.log(`  Mean Precision@${K}:      ${(avg(evalResults.map((r) => r.precisionAtK)) * 100).toFixed(1)}%`);
  console.log(`  Mean Recall@${K}:         ${(avg(evalResults.map((r) => r.recallAtK)) * 100).toFixed(1)}%`);
  console.log(`  Mean F1:              ${avg(evalResults.map((r) => r.f1)).toFixed(2)}`);
  console.log(`  Mean MRR:             ${avg(evalResults.map((r) => r.mrr)).toFixed(2)}`);
  console.log(`  Mean Hallucination:   ${(avg(evalResults.map((r) => r.hallucinationScore)) * 100).toFixed(1)}%`);

  console.log("\n📋 INTERPRETATION GUIDE:");
  console.log("  Precision@K > 60% → Good retrieval accuracy");
  console.log("  Recall@K    > 70% → Good coverage of relevant code");
  console.log("  MRR         > 0.5 → Correct chunk is usually in top 2");
  console.log("  Hallucination < 20% → LLM is staying grounded in context");
  console.log("  F1          > 0.6 → Overall RAG system is reliable\n");

  // Save
  const reportDir = path.join(__dirname, "results");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `eval-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ evalResults }, null, 2));
  console.log(`💾 Eval saved to: ${outPath}`);
}

runEval().catch(console.error);
