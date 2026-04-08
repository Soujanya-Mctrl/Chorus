import { retrieve, RetrievedChunk } from '../../rag/retrieval/retriever';
import { fetchIssueData } from './issueDifficulty';
import { generateContributionGuide } from '../../rag/generation/contributionAgent';
import { redis } from '../../cache/client';

export interface ContributionGuideResult {
    guide: string;
    relevantFiles: Array<{
        filePath: string;
        startLine: number;
        endLine: number;
        symbolName?: string | null;
    }>;
}

export async function createContributionGuide(
    owner: string,
    repo: string,
    repoId: string,
    issueNumber: number,
    githubToken?: string,
): Promise<ContributionGuideResult> {
    const cacheKey = `chorus:guide:${repoId}:${issueNumber}`;

    // 1. Check Cache — skip if the cached result is an error message
    const ERROR_MARKERS = ['Gemini Quota Exhausted', 'Generation Error', 'GEMINI_API_KEY'];
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            const guideText: string = typeof parsed === 'string' ? parsed : (parsed?.guide ?? '');
            // Don't serve cached error responses — always retry with the current API key
            const isErrorResponse = ERROR_MARKERS.some((marker) => guideText.includes(marker));
            if (!isErrorResponse) {
                if (typeof parsed === 'string') {
                    return { guide: parsed, relevantFiles: [] };
                }
                return parsed as ContributionGuideResult;
            }
            console.warn('[ContributionGuide] Cached result is an error — bypassing cache to retry.');
            await redis.del(cacheKey); // Clear the stale error from cache
        }
    } catch (err) {
        console.warn('[ContributionGuide] Redis cache read failed:', err);
    }

    // 2. Fetch Issue Meta
    const issueData = await fetchIssueData(owner, repo, issueNumber, githubToken);

    // 3. Retrieve Context via RAG — fetch more chunks for richer file-level guidance
    const query = `${issueData.title}\n\n${issueData.body.slice(0, 800)}`;
    let retrievedChunks: RetrievedChunk[] = [];
    try {
        const retrieval = await retrieve(query, {
            repoId,
            topK: 10,
            minScore: 0.2,
        });
        retrievedChunks = retrieval.chunks;
    } catch (err) {
        console.warn('[ContributionGuide] RAG retrieval failed. Using empty context:', err);
    }

    // Extract relevant files from RAG results (up to 8 for the frontend panel)
    const relevantFiles = retrievedChunks.slice(0, 8).map((c) => ({
        filePath: c.filePath,
        startLine: c.startLine,
        endLine: c.endLine,
        symbolName: c.symbolName ?? null,
    }));

    // 4. Generate Guide via Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
    }

    let guideMarkdown = "";

    try {
        guideMarkdown = await generateContributionGuide(issueData, retrievedChunks, apiKey);
    } catch (err: any) {
        console.warn('[ContributionGuide] Gemini API failed:', err.message);
        if (err.message.includes('429')) {
             return {
                guide: "### Gemini Quota Exhausted\n\nUnfortunately, the Gemini API free tier quota has been exhausted. We cannot automatically generate a contribution guide for this issue right now.\n\n*Please try again later or provide your own API key in your environment variables.*",
                relevantFiles,
            };
        }
        return {
            guide: `### Generation Error\n\nFailed to generate guide via Gemini API: ${err.message}.`,
            relevantFiles,
        };
    }

    const result: ContributionGuideResult = { guide: guideMarkdown, relevantFiles };

    // 5. Cache Result (Expire in 7 Days)
    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 60 * 60 * 24 * 7);
    } catch (err) {
        console.warn('[ContributionGuide] Redis cache write failed:', err);
    }

    return result;
}
