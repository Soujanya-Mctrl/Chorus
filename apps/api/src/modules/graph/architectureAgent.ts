import { Octokit } from "@octokit/rest";
import { logger } from "../../observability/logger";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-2.5-flash";
const IGNORED_DIRS = new Set(["node_modules", "vendor", "dist", "build", ".next", "coverage", ".git"]);

type FallbackNode = {
    id: string;
    label: string;
    type: "cluster" | "module" | "config" | "component" | "service" | "function";
    description: string;
    layer: "ui" | "api" | "service" | "domain" | "data" | "infra" | "config";
    importance: number;
    complexity: number;
    size: number;
    tags: string[];
    parentId: string | null;
    children: string[];
    isExpandable: boolean;
    defaultExpanded: boolean;
    depth: number;
    childCount: number;
    visualHint: "folder-collapsed" | "file-collapsed" | "leaf-node";
};

type FallbackEdge = {
    source: string;
    target: string;
    relationship: "depends_on" | "calls" | "configures";
    strength: number;
    direction: "forward";
    visibleAtDepth: number;
};

function toId(prefix: string, value: string): string {
    return `${prefix}_${value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

function inferLayer(segment: string): FallbackNode["layer"] {
    const lower = segment.toLowerCase();
    if (["web", "ui", "app", "components", "pages"].some((part) => lower.includes(part))) return "ui";
    if (["api", "server", "routes", "controllers", "webhooks"].some((part) => lower.includes(part))) return "api";
    if (["db", "data", "schema", "models", "cache"].some((part) => lower.includes(part))) return "data";
    if (["infra", "docker", "deploy", "scripts"].some((part) => lower.includes(part))) return "infra";
    if (["config", "env", "settings"].some((part) => lower.includes(part))) return "config";
    if (["service", "worker", "jobs", "queue", "rag", "graph"].some((part) => lower.includes(part))) return "service";
    return "domain";
}

function inferNodeType(segment: string, depth: number): FallbackNode["type"] {
    const lower = segment.toLowerCase();
    if (depth === 0) return "cluster";
    if (["config", "env", "json", "yaml", "yml"].some((part) => lower.includes(part))) return "config";
    if (["component", "page", "layout"].some((part) => lower.includes(part))) return "component";
    if (["service", "worker", "job", "queue", "graph", "rag"].some((part) => lower.includes(part))) return "service";
    if (depth >= 2) return "function";
    return "module";
}

function buildFallbackArchitectureGraph(owner: string, repoName: string, filteredPaths: string[]) {
    const topGroups = new Map<string, string[]>();

    for (const path of filteredPaths) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length === 0) continue;
        const top = parts[0];
        const group = topGroups.get(top) ?? [];
        group.push(path);
        topGroups.set(top, group);
    }

    const sortedGroups = Array.from(topGroups.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 6);

    const nodes: FallbackNode[] = [];
    const edges: FallbackEdge[] = [];
    const rootNodes: string[] = [];

    for (const [groupName, groupPaths] of sortedGroups) {
        const clusterId = toId("cluster", groupName);
        rootNodes.push(clusterId);

        const clusterChildren: string[] = [];
        const secondLevelGroups = new Map<string, string[]>();

        for (const path of groupPaths.slice(0, 20)) {
            const parts = path.split("/").filter(Boolean);
            const second = parts[1] ?? parts[0];
            const list = secondLevelGroups.get(second) ?? [];
            list.push(path);
            secondLevelGroups.set(second, list);
        }

        nodes.push({
            id: clusterId,
            label: groupName,
            type: "cluster",
            description: `${groupName} is a top-level area in ${owner}/${repoName} containing ${groupPaths.length} relevant files.`,
            layer: inferLayer(groupName),
            importance: 0.9,
            complexity: Math.min(1, 0.3 + groupPaths.length / 40),
            size: Math.min(10, Math.max(4, Math.round(groupPaths.length / 5))),
            tags: [groupName, "top-level"],
            parentId: null,
            children: clusterChildren,
            isExpandable: true,
            defaultExpanded: false,
            depth: 0,
            childCount: 0,
            visualHint: "folder-collapsed",
        });

        const moduleEntries = Array.from(secondLevelGroups.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 4);

        for (const [moduleName, modulePaths] of moduleEntries) {
            const moduleId = toId("mod", `${groupName}_${moduleName}`);
            clusterChildren.push(moduleId);

            const fileChildren: string[] = [];
            nodes.push({
                id: moduleId,
                label: moduleName,
                type: inferNodeType(moduleName, 1),
                description: `${moduleName} groups ${modulePaths.length} files under ${groupName}.`,
                layer: inferLayer(moduleName),
                importance: 0.7,
                complexity: Math.min(1, 0.25 + modulePaths.length / 20),
                size: Math.min(8, Math.max(3, Math.round(modulePaths.length / 3))),
                tags: [groupName, moduleName],
                parentId: clusterId,
                children: fileChildren,
                isExpandable: true,
                defaultExpanded: false,
                depth: 1,
                childCount: 0,
                visualHint: "folder-collapsed",
            });

            edges.push({
                source: clusterId,
                target: moduleId,
                relationship: "depends_on",
                strength: 0.7,
                direction: "forward",
                visibleAtDepth: 1,
            });

            for (const filePath of modulePaths.slice(0, 2)) {
                const fileName = filePath.split("/").pop() || filePath;
                const fileId = toId("file", filePath);
                fileChildren.push(fileId);

                nodes.push({
                    id: fileId,
                    label: fileName,
                    type: inferNodeType(fileName, 2),
                    description: `${fileName} is one of the representative files inside ${moduleName}.`,
                    layer: inferLayer(fileName),
                    importance: 0.5,
                    complexity: 0.3,
                    size: 3,
                    tags: [fileName],
                    parentId: moduleId,
                    children: [],
                    isExpandable: false,
                    defaultExpanded: false,
                    depth: 2,
                    childCount: 0,
                    visualHint: "leaf-node",
                });

                edges.push({
                    source: moduleId,
                    target: fileId,
                    relationship: "calls",
                    strength: 0.5,
                    direction: "forward",
                    visibleAtDepth: 2,
                });
            }
        }
    }

    for (let i = 0; i < rootNodes.length - 1; i++) {
        edges.push({
            source: rootNodes[i],
            target: rootNodes[i + 1],
            relationship: "depends_on",
            strength: 0.45,
            direction: "forward",
            visibleAtDepth: 0,
        });
    }

    for (const node of nodes) {
        node.childCount = node.children.length;
        node.isExpandable = node.children.length > 0;
        node.visualHint = node.children.length > 0 ? "folder-collapsed" : "leaf-node";
    }

    return {
        repository: `${owner}/${repoName}`,
        summary: `Fallback architecture map generated from repository structure for ${owner}/${repoName}.`,
        architecturePattern: "workspace-monorepo",
        systemType: "software-repository",
        complexityScore: Math.min(10, Math.max(3, Math.round(filteredPaths.length / 25))),
        progressiveStructure: {
            maxDepth: 2,
            rootNodes,
            defaultViewDepth: 0,
            expansionStrategy: "click-to-expand",
            recommendedStartNodes: rootNodes.slice(0, 2),
        },
        nodes,
        edges,
        visualization: {
            initialView: "clusters-only",
            cameraFocus: rootNodes[0] ?? "",
            layoutStyle: "hierarchical-tree",
            expansionAnimation: "zoom-and-unfold",
            collapseAnimation: "fold-and-zoom-out",
            expansionDuration: 350,
            layoutEngine: "force-directed-hierarchical",
        },
        tags: ["fallback", "structure-based", owner, repoName],
        metadata: {
            totalNodes: nodes.length,
            visibleNodesAtStart: rootNodes.length,
            maxDepthAvailable: 2,
            analysisConfidence: 0.62,
            warnings: [
                "Generated from repository structure because AI architecture synthesis was unavailable.",
            ],
        },
    };
}

export async function generateArchitectureGraph(
    owner: string,
    repoName: string,
    githubToken?: string
): Promise<any> {
    try {
        const octokit = new Octokit({
            auth: githubToken || process.env.GITHUB_TOKEN,
        });

        // 1. Fetch Repository Metadata for default branch
        const { data: repoData } = await octokit.repos.get({ owner, repo: repoName });
        const defaultBranch = repoData.default_branch;

        // 2. Fetch Recursive Git Tree
        const { data: treeData } = await octokit.git.getTree({
            owner,
            repo: repoName,
            tree_sha: defaultBranch,
            recursive: "1",
        });

        const allPaths = (treeData.tree || [])
            .filter((item) => item.type === "blob" || item.type === "tree")
            .map((item) => item.path || "");

        // 3. Filter paths to prevent massive token usage
        // Let's keep files up to a certain depth and ignore common massive directories
        const filteredPaths = allPaths.filter(p => {
            const parts = p.split('/');
            if (parts.some(part => IGNORED_DIRS.has(part))) return false;
            // Limit files very deep down to prevent tokens explosion
            // Keep all root files, keep up to depth 3
            if (parts.length > 4) return false;
            return true;
        });

        // Take max 1000 items to fit in context window comfortably
        const finalPaths = filteredPaths.slice(0, 1000).join('\n');

        // 4. Construct Gemini prompt
        const systemPrompt = `You are a Senior Software Architect analyzing raw repository directory structures.
Your objective is to generate an interactive JSON Architecture Graph data structure for the target repository.

You will be given:
1. Repository name: ${owner}/${repoName}
2. File tree snapshot (Truncated/Filtered if large).

Output EXACTLY a JSON object matching the following TypeScript interface 'ArchGraph'. Do not include markdown code block formatting like \`\`\`json, return just the raw JSON. 

interface ArchNode {
    id: string; // Make it unique and url-friendly e.g. "mod_auth", "cluster_ui"
    label: string; // Human readable name
    type: "cluster" | "module" | "entry" | "service" | "controller" | "component" | "model" | "api" | "database" | "config" | "infra" | "function";
    description: string; // 1-2 sentence description
    layer: "ui" | "api" | "service" | "domain" | "data" | "infra" | "config";
    importance: number; // 0.1 to 1.0
    complexity: number; // 0.1 to 1.0
    size: number;
    tags: string[];

    // Progressive disclosure fields
    parentId: string | null; // Id of parent ArchNode (depth 1 inside depth 0, depth 2 inside depth 1)
    children: string[];      // Ids of children ArchNodes
    isExpandable: boolean;   // true if it has children
    defaultExpanded: boolean; // normally false
    depth: number;           // 0 for high-level concepts, 1 for modules, 2 for files/functions
    childCount: number;
    visualHint: "folder-collapsed" | "folder-expanded" | "file-collapsed" | "file-expanded" | "leaf-node";
}

interface ArchEdge {
    source: string; // id of source Node
    target: string; // id of target Node
    relationship: "imports" | "calls" | "depends_on" | "exposes_api" | "reads_from" | "writes_to" | "handles_request" | "extends" | "implements" | "configures" | "triggers" | "subscribes_to" | "publishes_to" | "authenticates_via" | "caches";
    strength: number; // 0.1 to 1.0
    direction: "forward" | "bidirectional";
    visibleAtDepth: number; // normally same as highest depth node
}

interface ArchVisualization {
    initialView: string; // e.g. "clusters-only"
    cameraFocus: string; // an id of a depth 0 node
    layoutStyle: string; // e.g. "hierarchical-tree"
    expansionAnimation: string; // e.g. "zoom-and-unfold"
    collapseAnimation: string; // e.g. "fold-and-zoom-out"
    expansionDuration: number; // e.g. 400
    layoutEngine: string; // e.g. "force-directed-hierarchical"
}

interface ArchMetadata {
    totalNodes: number;
    visibleNodesAtStart: number;
    maxDepthAvailable: number;
    analysisConfidence: number; // 0.1 to 1.0
    warnings?: string[];
}

interface ArchGraph {
    repository: string;
    summary: string;
    architecturePattern: string; // e.g. "layered", "microservices", "monolith"
    systemType: string;
    complexityScore: number;
    progressiveStructure: {
        maxDepth: number;
        rootNodes: string[]; // ids of depth 0 nodes
        defaultViewDepth: number;
        expansionStrategy: string;
        recommendedStartNodes: string[];
    };
    nodes: ArchNode[];
    edges: ArchEdge[];
    visualization: ArchVisualization;
    tags: string[];
    metadata: ArchMetadata;
}

Guidelines for Generation:
1. Try to generate at least 3-6 depth 0 "clusters" based on primary app domains (e.g., Core, Routing, Database, Client UI).
2. For each cluster, make 2-5 depth 1 "modules".
3. For each module, pick some interesting depth 2 "files".
4. Make sure edges connect logical dependencies (e.g., UI depends on Service, Service depends on Database). Ensure you connect nodes of similar depths for visible AtDepth rules or depth 0 interconnectivity.
5. All IDs must be unique across the entire nodes array.
6. The graph should realistically match the provided file tree structure.
`;

        const userPrompt = `Generate the architecture graph for the repository ${owner}/${repoName}.
Here is its file tree:
${finalPaths}
`;

        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            logger.warn("Missing GEMINI_API_KEY, using fallback architecture graph");
            return buildFallbackArchitectureGraph(owner, repoName, filteredPaths);
        }

        const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiApiKey,
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
                    temperature: 0.1,
                    responseMimeType: "application/json",
                },
            }),
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errBody}`);
        }

        const data = (await response.json()) as any;
        const outputJsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!outputJsonStr) {
            throw new Error("Unable to parse Gemini output");
        }

        let parsedData;
        try {
            parsedData = JSON.parse(outputJsonStr);
        } catch (e) {
            console.error("Gemini invalid JSON payload", outputJsonStr);
            logger.warn("Gemini returned invalid JSON, using fallback architecture graph");
            return buildFallbackArchitectureGraph(owner, repoName, filteredPaths);
        }

        return parsedData;
    } catch (error) {
        logger.error({ error }, "Error generating architecture graph, using fallback");
        try {
            const octokit = new Octokit({
                auth: githubToken || process.env.GITHUB_TOKEN,
            });
            const { data: repoData } = await octokit.repos.get({ owner, repo: repoName });
            const { data: treeData } = await octokit.git.getTree({
                owner,
                repo: repoName,
                tree_sha: repoData.default_branch,
                recursive: "1",
            });
            const allPaths = (treeData.tree || [])
                .filter((item) => item.type === "blob" || item.type === "tree")
                .map((item) => item.path || "");
            const filteredPaths = allPaths.filter((p) => {
                const parts = p.split('/');
                return !parts.some((part) => IGNORED_DIRS.has(part)) && parts.length <= 4;
            });
            return buildFallbackArchitectureGraph(owner, repoName, filteredPaths);
        } catch (fallbackError) {
            logger.error({ fallbackError }, "Fallback architecture generation failed");
            throw fallbackError;
        }
    }
}
