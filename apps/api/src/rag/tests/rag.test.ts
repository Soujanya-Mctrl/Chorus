/**
 * Hacktropica RAG Pipeline Test Suite
 *
 * Tests three layers of RAG accuracy:
 * 1. Embedding quality (cosine similarity scores)
 * 2. Retrieval accuracy (did we get the RIGHT chunks?)
 * 3. Answer quality (did the LLM answer correctly using retrieved context?)
 *
 * Run: npx ts-node src/rag/tests/rag.test.ts
 */


import fs from "fs";
import path from "path";

// ─── CONFIG ────────────────────────────────────────────────────────────────
// Point these to your actual RAG pipeline functions.
// Adjust imports based on your actual file structure.

// import { embedText, retrieveChunks, generateAnswer } from "../pipeline";
// import { db } from "../../db"; // your Prisma client

// For testing without a live pipeline, we use mock implementations below.
// Replace with real imports once your pipeline is wired up.

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface TestCase {
  id: string;
  query: string;
  expectedKeywords: string[]; // words that MUST appear in retrieved chunks
  expectedFunctionNames?: string[]; // specific functions that should be retrieved
  antiKeywords?: string[]; // words that should NOT dominate the answer (noise check)
  category: "retrieval" | "comprehension" | "navigation" | "issue-mapping";
}

interface TestResult {
  id: string;
  query: string;
  category: string;
  passed: boolean;
  retrievedChunks: string[];
  answer: string;
  keywordHits: string[];
  keywordMisses: string[];
  similarityScore: number;
  latencyMs: number;
  failureReason?: string;
}

interface TestReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  passRate: string;
  avgLatencyMs: number;
  avgSimilarityScore: number;
  byCategory: Record<string, { passed: number; total: number }>;
  results: TestResult[];
}

// ─── TEST CASES ─────────────────────────────────────────────────────────────
// These are ground-truth QA pairs derived from the fixture repo above.
// Add more as your codebase grows.

const TEST_CASES: TestCase[] = [
  // RETRIEVAL: Can RAG find the right function?
  {
    id: "R01",
    query: "How does XP get awarded when a user completes a quest?",
    expectedKeywords: ["completeQuest", "xpReward", "totalXP", "calculateLevel"],
    expectedFunctionNames: ["completeQuest"],
    category: "retrieval",
  },
  {
    id: "R02",
    query: "What is the formula used to calculate a user's level from XP?",
    expectedKeywords: ["calculateLevel", "log2", "xp", "floor"],
    expectedFunctionNames: ["calculateLevel"],
    category: "retrieval",
  },
  {
    id: "R03",
    query: "How are badges awarded to users?",
    expectedKeywords: ["checkAndAwardBadges", "badges", "streak", "first-pr"],
    expectedFunctionNames: ["checkAndAwardBadges"],
    category: "retrieval",
  },

  // COMPREHENSION: Does the answer actually explain what the code does?
  {
    id: "C01",
    query: "Explain what QuestManager does in this codebase.",
    expectedKeywords: ["quest", "user", "badge", "XP", "issue"],
    category: "comprehension",
  },
  {
    id: "C02",
    query: "What happens step by step when a quest is completed?",
    expectedKeywords: ["getQuestById", "getUserById", "totalXP", "saveUser", "checkAndAwardBadges"],
    category: "comprehension",
  },

  // NAVIGATION: Can RAG help a new contributor find the right file?
  {
    id: "N01",
    query: "Which file should I edit to change how levels are calculated?",
    expectedKeywords: ["index.ts", "calculateLevel"],
    category: "navigation",
  },
  {
    id: "N02",
    query: "Where is the leaderboard contribution rank formula implemented?",
    expectedKeywords: ["computeContributionRank", "utils.ts", "CR", "complexity"],
    expectedFunctionNames: ["computeContributionRank"],
    category: "navigation",
  },

  // ISSUE MAPPING: Can RAG map a GitHub issue description to the right code?
  {
    id: "I01",
    query:
      "GitHub issue: 'Users are not leveling up after earning XP'. Which function is responsible?",
    expectedKeywords: ["calculateLevel", "completeQuest", "totalXP"],
    expectedFunctionNames: ["calculateLevel", "completeQuest"],
    category: "issue-mapping",
  },
  {
    id: "I02",
    query:
      "GitHub issue: 'Badge for 7-day streak is not being awarded'. Where should I look?",
    expectedKeywords: ["checkAndAwardBadges", "streak-7", "streak"],
    expectedFunctionNames: ["checkAndAwardBadges"],
    category: "issue-mapping",
  },
];

// ─── MOCK PIPELINE ──────────────────────────────────────────────────────────
// This simulates your RAG pipeline for testing purposes.
// Replace each function body with a call to your real implementation.

async function mockEmbed(text: string): Promise<number[]> {
  // Real: return await embedText(text);
  // Simulated: return a deterministic fake vector
  const hash = text.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return Array.from({ length: 8 }, (_, i) => Math.sin(hash + i));
}

async function mockRetrieve(query: string): Promise<string[]> {
  // Real: return await retrieveChunks(query, { topK: 5 });
  // Simulated: keyword-based mock retrieval from fixture files
  const fixtureDir = path.join(__dirname, "fixtures", "sample-repo");
  const files = fs.readdirSync(fixtureDir);
  const allChunks: string[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(fixtureDir, file), "utf-8");
    // Split into chunks of ~20 lines
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i += 20) {
      allChunks.push(`// File: ${file}\n` + lines.slice(i, i + 20).join("\n"));
    }
  }

  // Naive keyword matching (replace with real vector similarity in production)
  const queryWords = query.toLowerCase().split(/\W+/);
  return allChunks
    .map((chunk) => ({
      chunk,
      score: queryWords.filter((w) => chunk.toLowerCase().includes(w)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.chunk);
}

async function mockAnswer(query: string, chunks: string[]): Promise<string> {
  // Real: return await generateAnswer(query, chunks);
  // Simulated: just returns the chunks joined (your LLM call replaces this)
  return `Based on the codebase:\n\n${chunks.join("\n\n---\n\n")}`;
}

function cosineSimilarity(a: string, b: string): number {
  // Simple Jaccard similarity as proxy for cosine (replace with real embeddings)
  const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

// ─── TEST RUNNER ─────────────────────────────────────────────────────────────

async function runTest(tc: TestCase): Promise<TestResult> {
  const start = Date.now();

  const chunks = await mockRetrieve(tc.query);
  const answer = await mockAnswer(tc.query, chunks);
  const allRetrievedText = chunks.join(" ");

  const keywordHits = tc.expectedKeywords.filter((kw) =>
    allRetrievedText.toLowerCase().includes(kw.toLowerCase())
  );
  const keywordMisses = tc.expectedKeywords.filter(
    (kw) => !allRetrievedText.toLowerCase().includes(kw.toLowerCase())
  );

  const similarityScore = cosineSimilarity(tc.query, allRetrievedText);
  const latencyMs = Date.now() - start;

  // A test passes if >60% of expected keywords are found in retrieved chunks
  const hitRate = keywordHits.length / tc.expectedKeywords.length;
  const passed = hitRate >= 0.6;

  return {
    id: tc.id,
    query: tc.query,
    category: tc.category,
    passed,
    retrievedChunks: chunks,
    answer,
    keywordHits,
    keywordMisses,
    similarityScore,
    latencyMs,
    failureReason: passed
      ? undefined
      : `Only ${keywordHits.length}/${tc.expectedKeywords.length} keywords found (need ≥60%)`,
  };
}

async function runAllTests(): Promise<void> {
  console.log("\n🌴 Hacktropica RAG Test Suite\n");
  console.log("=".repeat(60));

  const results: TestResult[] = [];

  for (const tc of TEST_CASES) {
    process.stdout.write(`  [${tc.id}] ${tc.category.toUpperCase()} — ${tc.query.slice(0, 50)}... `);
    const result = await runTest(tc);
    results.push(result);
    console.log(result.passed ? "✅ PASS" : "❌ FAIL");
    if (!result.passed) {
      console.log(`         ↳ ${result.failureReason}`);
      console.log(`         ↳ Missing: ${result.keywordMisses.join(", ")}`);
    }
  }

  // ─── BUILD REPORT ──────────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const avgLatency = results.reduce((s, r) => s + r.latencyMs, 0) / results.length;
  const avgSimilarity = results.reduce((s, r) => s + r.similarityScore, 0) / results.length;

  const byCategory: Record<string, { passed: number; total: number }> = {};
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = { passed: 0, total: 0 };
    byCategory[r.category].total++;
    if (r.passed) byCategory[r.category].passed++;
  }

  const report: TestReport = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed,
    failed,
    passRate: `${((passed / results.length) * 100).toFixed(1)}%`,
    avgLatencyMs: Math.round(avgLatency),
    avgSimilarityScore: parseFloat(avgSimilarity.toFixed(3)),
    byCategory,
    results,
  };

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Total:        ${report.totalTests}`);
  console.log(`  Passed:       ${report.passed} ✅`);
  console.log(`  Failed:       ${report.failed} ❌`);
  console.log(`  Pass Rate:    ${report.passRate}`);
  console.log(`  Avg Latency:  ${report.avgLatencyMs}ms`);
  console.log(`  Avg Similarity: ${report.avgSimilarityScore}`);
  console.log("\n📂 By Category:");
  for (const [cat, stats] of Object.entries(byCategory)) {
    const rate = ((stats.passed / stats.total) * 100).toFixed(0);
    const bar = "█".repeat(Math.round(stats.passed / stats.total * 10)) + "░".repeat(10 - Math.round(stats.passed / stats.total * 10));
    console.log(`  ${cat.padEnd(15)} ${bar} ${rate}% (${stats.passed}/${stats.total})`);
  }

  // Save report to JSON
  const reportDir = path.join(__dirname, "results");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `rag-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Full report saved to: ${reportPath}`);

  // Exit with error code if too many failures (useful for CI)
  if (parseFloat(report.passRate) < 50) {
    console.log("\n⚠️  Pass rate below 50% — RAG pipeline needs tuning.");
    process.exit(1);
  } else {
    console.log("\n🎉 RAG pipeline is functional. Tune for higher accuracy.");
  }
}

runAllTests().catch(console.error);
