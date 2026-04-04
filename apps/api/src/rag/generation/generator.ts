/**
 * generator.ts
 * apps/api/src/rag/generation/generator.ts
 *
 * Takes a user's question + retrieved code chunks and generates
 * a grounded answer using Gemini 1.5 Flash.
 *
 * Uses the contextAssembler to build structured prompts with citations.
 * Falls back to a simple extractive summary if no API key is set.
 */

import type { RetrievedChunk } from "../retrieval/retriever";
import { assembleContext } from "../reranking/contextAssembler";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateResult {
  answer: string;
  citations: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    snippet: string;
    relevanceScore: number;
  }>;
  confidence: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-2.0-flash";

// ─── Entry Point ─────────────────────────────────────────────────────────────

export async function generate(
  question: string,
  chunks: RetrievedChunk[]
): Promise<GenerateResult> {
  if (chunks.length === 0) {
    return {
      answer:
        "I couldn't find any relevant code in this repository to answer your question. Try rephrasing or asking about a specific file or function.",
      citations: [],
      confidence: 0,
    };
  }

  // Assemble context with citations
  const repoId = chunks[0].filePath.split("/").slice(0, 2).join("/") || "unknown";
  const assembled = assembleContext(question, chunks, repoId);

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // No API key — return extractive summary as fallback
    return generateExtractiveAnswer(question, chunks);
  }

  return await generateWithGemini(assembled.systemPrompt, assembled.userPrompt, assembled.citationMap, apiKey);
}

// ─── Gemini Generation ────────────────────────────────────────────────────────

async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string,
  citationMap: Record<string, { filePath: string; startLine: number; endLine: number; symbolName?: string | null }>,
  apiKey: string
): Promise<GenerateResult> {
  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2, // Low temperature for factual grounded answers
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Generator] Gemini API error ${response.status}: ${errorText}`);
    throw new Error(`Gemini generation failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const answerText =
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Sorry, I could not generate an answer.";

  // Extract citations referenced in the answer
  const citations = extractCitationsFromAnswer(answerText, citationMap);

  // Rough confidence based on how many citations were used
  const confidence = Math.min(0.95, 0.3 + citations.length * 0.1);

  return {
    answer: answerText,
    citations,
    confidence,
  };
}

// ─── Extractive Fallback ──────────────────────────────────────────────────────

function generateExtractiveAnswer(
  question: string,
  chunks: RetrievedChunk[]
): GenerateResult {
  const topChunks = chunks.slice(0, 3);
  const snippets = topChunks
    .map(
      (c, i) =>
        `[${i + 1}] \`${c.filePath}\` (lines ${c.startLine}–${c.endLine}):\n\`\`\`${c.language}\n${c.content.slice(0, 300)}\n\`\`\``
    )
    .join("\n\n");

  const answer = `Here are the most relevant code sections I found for "${question}":\n\n${snippets}\n\n*Note: Set GEMINI_API_KEY for AI-generated explanations.*`;

  const citations = topChunks.map((c) => ({
    filePath: c.filePath,
    startLine: c.startLine,
    endLine: c.endLine,
    snippet: c.content.slice(0, 200),
    relevanceScore: c.score,
  }));

  return { answer, citations, confidence: 0.5 };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCitationsFromAnswer(
  answer: string,
  citationMap: Record<string, { filePath: string; startLine: number; endLine: number; symbolName?: string | null }>
): GenerateResult["citations"] {
  const citations: GenerateResult["citations"] = [];
  const seen = new Set<string>();

  // Find all [N] references in the answer
  const matches = answer.matchAll(/\[(\d+)]/g);
  for (const match of matches) {
    const key = `[${match[1]}]`;
    const citation = citationMap[key];
    if (citation && !seen.has(key)) {
      seen.add(key);
      citations.push({
        filePath: citation.filePath,
        startLine: citation.startLine,
        endLine: citation.endLine,
        snippet: citation.symbolName ?? "",
        relevanceScore: 0.8,
      });
    }
  }

  return citations;
}
