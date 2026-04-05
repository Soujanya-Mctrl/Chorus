import type { RetrievedChunk } from "../retrieval/retriever";
import type { IssueData } from "../../modules/repo/issueDifficulty";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-2.5-flash";

export async function generateContributionGuide(
    issue: IssueData,
    chunks: RetrievedChunk[],
    apiKey: string
): Promise<string> {
    const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`;

    // Flatten chunks into a readable code context
    const codeContext = chunks
        .map(
            (c, i) =>
                `--- File: ${c.filePath} (Lines ${c.startLine}-${c.endLine}) ---\n\`\`\`${c.language}\n${c.content}\n\`\`\``
        )
        .join("\n\n");

    const systemPrompt = `You are a Senior Open Source Maintainer guiding a new contributor to solve a specific GitHub issue.
You will be provided with:
1. The GitHub Issue details.
2. The most relevant codebase files (retrieved via semantic search).

Your task is to generate a step-by-step contribution guide to resolve the issue.

RULES:
- Use clear, actionable Markdown.
- Provide a summary of the root cause if visible in the codebase context.
- Outline exact files to edit and what changes are likely required.
- Do NOT hallucinate code. Rely strictly on the provided context. If the context does not contain the exact file needed, suggest where they might look.
- Be encouraging and professional.
- Format with clear headings (e.g. ### Root Cause Analysis, ### Step-by-Step Fix, ### Verification).`;

    const userPrompt = `
ISSUE #${issue.number}: ${issue.title}
DESCRIPTION: ${issue.body}
LABELS: ${issue.labels.join(", ")}

CODE CONTEXT:
${codeContext || "No highly relevant code files found. Please suggest general file paths."}

Generate the contribution guide now.
`;

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
                temperature: 0.2,
                maxOutputTokens: 2048,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ContributionAgent] Gemini API error ${response.status}: ${errorText}`);
        throw new Error(`Gemini generation failed: ${response.status}`);
    }

    const data = (await response.json()) as {
        candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
        }>;
    };

    return (
        data.candidates?.[0]?.content?.parts?.[0]?.text ??
        "Sorry, I could not generate a contribution guide."
    );
}
