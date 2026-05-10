"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X, ArrowRight, FolderOpen, FolderClosed, FileText, ChevronRight, RotateCcw, Network, BarChart3, AlertTriangle, Layers, FolderTree, Maximize2, Minimize2, Play, Pause } from "lucide-react";
import type { ArchNode, ArchGraph } from "@/types/ArchGraphTypes";
import { LAYER_COLORS, NODE_TYPE_ICONS } from "@/types/ArchGraphTypes";
import ArchGraph3D from "./ArchGraph3D";
import ArchMindmap2D from "./ArchMindmap2D";
import NodeDetailPanel from "./NodeDetailPanel";

const layerLabelMap: Record<string, string> = {
    ui: "UI", api: "API", service: "Service", domain: "Domain",
    data: "Data", infra: "Infra", config: "Config",
};

export default function ArchVisualization({ 
    data 
}: { 
    data: { architecture: ArchGraph, repository: ArchGraph } 
}) {
    const [activeTab, setActiveTab] = useState<"architecture" | "github">("architecture");
    const [githubGraph, setGithubGraph] = useState<ArchGraph | null>(null);
    const [isFetchingGithub, setIsFetchingGithub] = useState(false);

    const graph = activeTab === "github" ? (githubGraph || data.repository) : data.architecture;

    const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    
    // Track expanded nodes separately for each view to maintain state when switching
    const [archExpanded, setArchExpanded] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        if (data?.architecture?.nodes) {
            for (const node of data.architecture.nodes) {
                if (node.defaultExpanded) initial.add(node.id);
            }
        }
        return initial;
    });

    const [repoExpanded, setRepoExpanded] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        if (data?.repository?.nodes) {
            for (const node of data.repository.nodes) {
                if (node.defaultExpanded) initial.add(node.id);
            }
        }
        return initial;
    });

    const expandedNodes = activeTab === "architecture" ? archExpanded : repoExpanded;
    const setExpandedNodes = activeTab === "architecture" ? setArchExpanded : setRepoExpanded;

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [autoRotate, setAutoRotate] = useState(true);

    const toggleExpand = useCallback((nodeId: string) => {
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (!node) return;

        if (node.isExpandable) {
            setExpandedNodes((prev) => {
                const next = new Set(prev);
                if (next.has(nodeId)) {
                    const collapseRecursive = (id: string) => {
                        next.delete(id);
                        const n = graph.nodes.find((nd) => nd.id === id);
                        if (n) n.children.forEach(collapseRecursive);
                    };
                    collapseRecursive(nodeId);
                } else {
                    next.add(nodeId);
                }
                return next;
            });
        }
        setSelectedId(nodeId);
    }, [graph.nodes, setExpandedNodes]);

    const handleSelect = useCallback((nodeId: string) => {
        setSelectedId(nodeId);
    }, []);

    const containerRef = useRef<HTMLDivElement>(null);

    const toggleFullScreen = useCallback(async () => {
        if (!isFullScreen) {
            setIsFullScreen(true);
            try {
                const element = document.getElementById("arch-visualizer-container");
                if (element?.requestFullscreen) {
                    await element.requestFullscreen();
                }
            } catch (err) {
                console.warn("Fullscreen API failed, falling back to portal:", err);
            }
        } else {
            setIsFullScreen(false);
            if (document.fullscreenElement) {
                try {
                    await document.exitFullscreen();
                } catch (err) {
                    console.warn("Exit Fullscreen failed:", err);
                }
            }
        }
    }, [isFullScreen]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFullScreen(false);
            }
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsFullScreen(false);
        };
        window.addEventListener("keydown", handleEsc);
        
        // Prevent body scroll when in full screen
        if (isFullScreen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            window.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "";
        };
    }, [isFullScreen]);

    const handleHover = useCallback((id: string) => setHoveredId(id), []);
    const handleUnhover = useCallback(() => setHoveredId(null), []);
    const handleClosePanel = useCallback(() => setSelectedId(null), []);

    // ── GitHub Tree Fetcher ──────────────────────────────────────────────────
    const fetchGithubRepo = useCallback(async () => {
        if (githubGraph || isFetchingGithub) return;
        
        const repoPath = data.architecture.repository; // e.g. "owner/repo"
        if (!repoPath || !repoPath.includes("/")) return;

        setIsFetchingGithub(true);
        try {
            const [owner, repo] = repoPath.split("/");
            
            // 1. Get default branch
            const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
            const repoData = await repoRes.json();
            const defaultBranch = repoData.default_branch || "main";

            // 2. Get recursive tree
            const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
            const treeData = await treeRes.json();

            if (!treeData.tree) throw new Error("Could not fetch tree");

            // 3. Convert to ArchGraph
            const nodes: ArchNode[] = [];
            const pathsMap = new Map<string, string>(); // path -> id

            // Root Node
            const rootId = "root";
            nodes.push({
                id: rootId,
                label: repo,
                type: "cluster",
                description: `Root of ${repoPath}`,
                layer: "infra",
                importance: 1,
                complexity: 0,
                size: 0,
                tags: [],
                parentId: null,
                children: [],
                isExpandable: true,
                defaultExpanded: true,
                depth: 0,
                childCount: 0,
                visualHint: "folder-expanded"
            });
            pathsMap.set("", rootId);

            treeData.tree.forEach((item: any) => {
                const parts = item.path.split("/");
                const fileName = parts.pop();
                const parentPath = parts.join("/");
                const id = `node-${item.sha}`;
                
                const depth = parts.length + 1;
                const parentId = pathsMap.get(parentPath) || rootId;

                // Smarter layer mapping based on extension
                let layer: "ui" | "api" | "service" | "domain" | "data" | "infra" | "config" = "domain";
                if (item.type === "tree") {
                    layer = "infra";
                } else {
                    const ext = fileName.split(".").pop()?.toLowerCase();
                    if (["tsx", "jsx", "html", "css", "scss"].includes(ext)) layer = "ui";
                    else if (["ts", "js", "go", "py", "rs"].includes(ext)) layer = "api";
                    else if (["json", "yaml", "yml", "env", "config"].includes(ext)) layer = "config";
                    else if (["sql", "prisma", "graphql"].includes(ext)) layer = "data";
                    else if (["md", "txt", "license"].includes(ext)) layer = "domain";
                }

                const node: ArchNode = {
                    id,
                    label: fileName,
                    type: item.type === "tree" ? "module" : "component",
                    description: item.path,
                    layer,
                    importance: 0.5,
                    complexity: 0.2,
                    size: item.size || 0,
                    tags: [],
                    parentId,
                    children: [],
                    isExpandable: item.type === "tree",
                    defaultExpanded: depth < 1, // Only root expanded by default for large repos
                    depth,
                    childCount: 0,
                    visualHint: item.type === "tree" ? "folder-collapsed" : "leaf-node"
                };

                nodes.push(node);
                pathsMap.set(item.path, id);
                
                // Update parent
                const parent = nodes.find(n => n.id === parentId);
                if (parent) {
                    parent.children.push(id);
                    parent.childCount++;
                }
            });

            const newGraph: ArchGraph = {
                ...data.repository,
                repository: repoPath,
                summary: `Raw GitHub file structure for ${repoPath}`,
                nodes,
                edges: [], // Files don't have explicit edges in a simple tree view
                metadata: {
                    ...data.repository.metadata,
                    totalNodes: nodes.length,
                    analysisConfidence: 1.0,
                    warnings: treeData.truncated ? ["Tree is truncated by GitHub API"] : []
                }
            };

            setGithubGraph(newGraph);
        } catch (err) {
            console.error("Failed to fetch GitHub tree:", err);
        } finally {
            setIsFetchingGithub(false);
        }
    }, [data.architecture.repository, githubGraph, isFetchingGithub, data.repository]);

    useEffect(() => {
        if (activeTab === "github") {
            fetchGithubRepo();
        }
    }, [activeTab, fetchGithubRepo]);

    const visibleNodes = useMemo(() => {
        const visibleIds = new Set<string>();
        
        // 1. Root nodes (depth 0) are always candidates for visibility
        const roots = graph.nodes.filter(n => n.depth === 0);
        roots.forEach(n => visibleIds.add(n.id));

        // 2. Sort nodes by depth to ensure parents are processed before children
        const sortedNodes = [...graph.nodes].sort((a, b) => a.depth - b.depth);

        // 3. A node is visible if its parent is visible AND its parent is expanded
        for (const node of sortedNodes) {
            if (node.depth > 0 && node.parentId && visibleIds.has(node.parentId) && expandedNodes.has(node.parentId)) {
                visibleIds.add(node.id);
            }
        }

        return graph.nodes.filter(n => visibleIds.has(n.id));
    }, [graph.nodes, expandedNodes]);

    const currentMaxDepth = useMemo(() => {
        return Math.max(0, ...visibleNodes.map((n) => n.depth));
    }, [visibleNodes]);

    const visibleEdges = useMemo(() => {
        const visibleIds = new Set(visibleNodes.map((n) => n.id));
        return graph.edges.filter((edge) => {
            if (edge.visibleAtDepth > currentMaxDepth) return false;
            return visibleIds.has(edge.source) && visibleIds.has(edge.target);
        });
    }, [graph.edges, visibleNodes, currentMaxDepth]);

    const layers = Array.from(new Set(visibleNodes.map((n) => n.layer)));

    const content = (
        <div 
            id="arch-visualizer-container"
            className={cn(
                "bg-[#0a0a0a] overflow-hidden transition-all duration-500 ease-in-out flex flex-col",
                isFullScreen 
                    ? "fixed inset-0 z-[99999] rounded-none border-none w-screen h-screen" 
                    : "relative w-full rounded-2xl border border-white/10 shadow-2xl h-[560px]"
            )}
        >
            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0d0d0d]/40 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl border border-orange-500/20">
                            <Network className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black tracking-[0.2em] text-white uppercase">CHORUS</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-80">Topology Lab</span>
                        </div>
                    </div>

                    <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10 shadow-inner">
                        <button
                            onClick={() => { setActiveTab("architecture"); setViewMode("3d"); setSelectedId(null); }}
                            className={cn(
                                "px-6 py-2 rounded-full text-[10px] font-black transition-all flex items-center gap-2.5 uppercase tracking-wider",
                                activeTab === "architecture" 
                                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-500/20" 
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            )}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            Architecture
                        </button>
                        <button
                            onClick={() => { setActiveTab("github"); setViewMode("2d"); setSelectedId(null); }}
                            className={cn(
                                "px-6 py-2 rounded-full text-[10px] font-black transition-all flex items-center gap-2.5 uppercase tracking-wider",
                                activeTab === "github" 
                                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-500/20" 
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            )}
                        >
                            <FolderTree className="w-3.5 h-3.5" />
                            Repository
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-4 text-[9px] uppercase tracking-[0.2em] font-black text-slate-500">
                        <span className={cn(
                            "px-3 py-1 rounded-full border",
                            graph.metadata.analysisConfidence > 0.8 
                                ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20" 
                                : "text-amber-400 bg-amber-500/5 border-amber-500/20"
                        )}>
                            {(graph.metadata.analysisConfidence * 100).toFixed(0)}% AI
                        </span>
                    </div>

                    <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                        <button
                            onClick={() => setAutoRotate(!autoRotate)}
                            className={cn(
                                "p-2 rounded-full transition-all border",
                                autoRotate 
                                    ? "bg-orange-500 text-white border-orange-400" 
                                    : "text-slate-500 hover:text-white hover:bg-white/5 border-transparent"
                            )}
                            title={autoRotate ? "Stop Rotate" : "Auto Rotate"}
                        >
                            {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        
                        <button
                            onClick={toggleFullScreen}
                            className="p-2 rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                            title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
                        >
                            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Canvas + Panel ── */}
            <div className="relative flex-1 bg-[#050505]">
                {viewMode === "3d" ? (
                    <ArchGraph3D
                        graph={graph}
                        visibleNodes={visibleNodes}
                        visibleEdges={visibleEdges}
                        expandedNodes={expandedNodes}
                        selectedId={selectedId}
                        hoveredId={hoveredId}
                        onSelectNode={handleSelect}
                        onHoverNode={handleHover}
                        onUnhoverNode={handleUnhover}
                        autoRotate={autoRotate}
                    />
                ) : (
                    <div className="w-full h-full relative">
                        {isFetchingGithub && activeTab === "github" && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                                    <span className="text-xs font-black uppercase tracking-widest text-white">Fetching GitHub Structure...</span>
                                </div>
                            </div>
                        )}
                        <ArchMindmap2D
                            graph={graph}
                            selectedId={selectedId}
                            onSelectNode={handleSelect}
                            expandedNodes={expandedNodes}
                            onToggleExpand={toggleExpand}
                        />
                    </div>
                )}

                {/* Node detail panel */}
                <NodeDetailPanel
                    graph={graph}
                    nodeId={selectedId}
                    expandedNodes={expandedNodes}
                    onToggleExpand={toggleExpand}
                    onClose={handleClosePanel}
                />

                {/* Floating UI Elements */}
                <div className="pointer-events-none p-6 flex flex-col justify-between h-full absolute inset-0 z-10">
                    <div className="flex justify-between items-start">
                        {/* Compact Summary */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-[280px] bg-[#0d0d0d]/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 pointer-events-auto shadow-2xl"
                        >
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/80 mb-2 flex items-center gap-2">
                                <div className="w-2 h-0.5 bg-orange-500" />
                                Context
                            </h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium line-clamp-3 hover:line-clamp-none transition-all cursor-default">
                                {graph.summary}
                            </p>
                        </motion.div>

                        {/* Top Right Metrics Group */}
                        <div className="flex flex-col gap-3 items-end">
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#0d0d0d]/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center gap-6 pointer-events-auto shadow-2xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Complexity</span>
                                        <span className="text-sm font-black text-white tabular-nums tracking-tighter">
                                            {graph.complexityScore < 1 ? (graph.complexityScore * 10).toFixed(1) : graph.complexityScore}
                                        </span>
                                    </div>
                                    <BarChart3 className="w-3.5 h-3.5 text-orange-500 opacity-50" />
                                </div>
                                <div className="w-px h-6 bg-white/10" />
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Visibility</span>
                                        <span className="text-sm font-black text-white tabular-nums tracking-tighter">{currentMaxDepth}L</span>
                                    </div>
                                    <Layers className="w-3.5 h-3.5 text-purple-500 opacity-50" />
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    <div className="flex justify-between items-end">
                        {/* Compact Layer Legend */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#0d0d0d]/40 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 pointer-events-auto shadow-2xl"
                        >
                            <div className="flex items-center gap-5">
                                {layers.map((layer) => (
                                    <div key={layer} className="flex items-center gap-2">
                                        <div 
                                            className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]" 
                                            style={{ backgroundColor: LAYER_COLORS[layer], color: LAYER_COLORS[layer] }} 
                                        />
                                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                            {layerLabelMap[layer] ?? layer}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {graph.metadata.warnings && graph.metadata.warnings.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-[200px] bg-amber-500/5 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-4 pointer-events-auto shadow-2xl"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Warnings</span>
                                </div>
                                <div className="space-y-1">
                                    {graph.metadata.warnings.slice(0, 2).map((w, i) => (
                                        <p key={i} className="text-[10px] text-slate-500 leading-tight font-medium truncate">{w}</p>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return content;
}
