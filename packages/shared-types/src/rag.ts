// ── RAG & Inference Types ─────────────────────────
export const RAG_RUNTIME = true;

export interface CodeChunk {
  id: string;
  repoId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  language: string;
  chunkType: 'function' | 'class' | 'method' | 'module' | 'block';
  symbolName?: string;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  imports: string[];
  exports: string[];
  dependencies: string[];
  complexity: number;
  tokenCount: number;
}

export interface Citation {
  filePath: string;
  startLine: number;
  endLine: number;
  snippet: string;
  relevanceScore: number;
}

export interface QueryRequest {
  repoId: string;
  question: string;
  maxCitations?: number;
  filters?: {
    filePaths?: string[];
    languages?: string[];
  };
}

export interface QueryResponse {
  answer: string;
  citations: Citation[];
  confidence: number;
  processingTimeMs: number;
}
