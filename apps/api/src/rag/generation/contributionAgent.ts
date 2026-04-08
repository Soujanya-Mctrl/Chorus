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

    // Build a numbered file index so the model can reference files by number
    const fileIndex = chunks
        .map(
            (c, i) =>
                `[File ${i + 1}] ${c.filePath}  (Lines ${c.startLine}–${c.endLine})${c.symbolName ? `  [Symbol: ${c.symbolName}]` : ""}\n\`\`\`${c.language}\n${c.content}\n\`\`\``
        )
        .join("\n\n");

    // Deduplicated file summary for quick reference
    const uniqueFiles = [...new Set(chunks.map((c) => c.filePath))];
    const fileSummary = uniqueFiles
        .map((fp) => {
            const related = chunks.filter((c) => c.filePath === fp);
            const lines = related.map((c) => `L${c.startLine}–${c.endLine}`).join(", ");
            return `• \`${fp}\` → ${lines}`;
        })
        .join("\n");

    const systemPrompt = `You are a Senior Open Source Contributor Coach. Your job is to give a new contributor a precise, actionable, step-by-step guide to solve a GitHub issue.

You are given:
1. The GitHub issue (title, description, labels).
2. The most relevant code files retrieved from the codebase via semantic search, with exact file paths and line numbers.

## OUTPUT FORMAT — you MUST follow this structure exactly:

### 🔍 Quick Summary
One or two sentences: what the issue is about and the likely root cause based on the code context.

### 📁 Files to Change
For EVERY file that needs modification, output a block like this:

**\`<file_path>\`** (Lines <start>–<end>)
> What to do: <1-2 sentence description of the change needed in this file>

List ALL files, even if there are several. Group related changes together.

### 🛠 Step-by-Step Fix
Numbered steps. Each step MUST:
- Start with the exact file path in backticks: \`path/to/file.ts\`
- State the line range or function/symbol to find
- Describe the specific change to make (add, modify, remove)
- If code is needed, show a short snippet (< 15 lines)

Example step format:
1. Open \`src/utils/parser.ts\` (around line 42–58, function \`parseInput\`)
   - The current logic does X. Change it to Y.
   - \`\`\`ts
     // suggested change
     \`\`\`

### ✅ How to Test
- Specific commands to run or manual steps to verify the fix
- Which test files to check if they exist

## RULES:
- ALWAYS reference specific file paths and line numbers from the provided context.
- NEVER fabricate file paths or code that isn't in the provided context.
- If the context doesn't contain the exact file needed, say "This file was not in the retrieved context — look for it in <suggested_directory>".
- Be concise. No motivational fluff. Go straight to actionable steps.
- Don't provide vague, long answers which do not have anything to do with that issue.
- Use Markdown formatting throughout.`;

    const userPrompt = `## ISSUE #${issue.number}: ${issue.title}

**Labels:** ${issue.labels.join(", ") || "none"}

**Description:**
${issue.body || "No description provided."}

---

## RELEVANT FILES (retrieved from codebase)

${fileSummary}

---

## CODE CONTEXT

${fileIndex || "No relevant code files were retrieved. Provide general guidance based on the issue description and suggest likely file locations."}

---

Generate the contribution guide now. Remember: every step must point to a specific file path and line range.`;

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
                temperature: 0.15,
                maxOutputTokens: 3000,
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
