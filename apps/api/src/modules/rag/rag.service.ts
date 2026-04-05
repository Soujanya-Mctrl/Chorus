// ── RAG Service ─────────────────────────────────
import type { QueryRequest, QueryResponse } from '@chorus/shared-types';
import { retrieve } from '../../rag/retrieval/retriever';
import { generate } from '../../rag/generation/generator';
import { getCachedLLMResponse, setCachedLLMResponse } from '../../cache/llmResponses';

export class RagService {
  async query(request: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();

    // Check LLM cache
    const cached = await getCachedLLMResponse(request);
    if (cached) return cached;

    // Retrieve relevant chunks via vector search
    const retrieval = await retrieve(request.question, {
      repoId: request.repoId,
      topK: request.maxCitations ?? 5,
      fileFilter: request.filters?.filePaths,
    });

    // Generate grounded answer
    const response = await generate(request.question, retrieval.chunks);

    const result: QueryResponse = {
      answer: response.answer,
      citations: response.citations,
      confidence: response.confidence,
      processingTimeMs: Date.now() - startTime,
    };

    // Cache the response
    await setCachedLLMResponse(request, result);
    return result;
  }
}
