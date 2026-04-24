"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ArchVisualization from "@/components/visualization/ArchVisualization";
// Removed sampleGraph import
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Search,
    Zap,
    Clock,
    Users,
    Star,
    Shield,
    Code,
    Brain,
    Activity,
    BookOpen,
    ArrowRight,
    CheckCircle,
    ExternalLink,
    X,
} from "lucide-react";
import {
    getAnalyzeRoute,
    getIssuesRoute,
    getRepoSlug,
    getRepoUrlFromSlug,
    PROJECTS_STORAGE_KEY,
    readSavedAnalysis,
    saveAnalysisSnapshot,
} from "@/lib/repo-paths";

const diffColorMap: Record<string, string> = {
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    gray: "bg-slate-500/10 text-slate-400 border-slate-500/20"
};

// Helper to map score to color
function getScoreColor(score: number): string {
    if (score === 1) return 'green';
    if (score === 2) return 'blue';
    if (score === 3) return 'yellow';
    if (score === 4) return 'orange';
    if (score === 5) return 'red';
    return 'gray';
}

function formatNumber(num: number): string {
    if (!num) return "0";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
}

function buildPurposeText(analysisData: any): string {
    const repo = analysisData?.repo;
    const difficulty = analysisData?.difficulty;

    if (repo?.description) {
        return repo.description;
    }

    const languages = difficulty?.dominantLanguages?.slice(0, 3) ?? [];
    const languageText =
        languages.length > 0 ? ` It appears to be built primarily with ${languages.join(", ")}.` : "";

    return `${repo?.owner}/${repo?.name} is an open-source repository on GitHub.${languageText}`;
}

function buildLoreText(analysisData: any): string {
    const repo = analysisData?.repo;
    const communityHealth = analysisData?.communityHealth;
    const difficulty = analysisData?.difficulty;

    const parts: string[] = [];

    if (repo?.owner && repo?.name) {
        parts.push(`${repo.owner}/${repo.name} currently has ${formatNumber(repo.stars)} stars, ${formatNumber(repo.forks)} forks, and ${formatNumber(repo.openIssues)} open issues.`);
    }

    if (communityHealth?.label && typeof communityHealth?.score === "number") {
        parts.push(`Its community health is rated ${communityHealth.label} (${communityHealth.score}/100), based on issue responsiveness, recent activity, and pull request health.`);
    }

    if (difficulty?.rampLabel) {
        const knownLanguages = difficulty?.userKnownLanguages?.length ?? 0;
        parts.push(`For you, the current contribution ramp is ${difficulty.rampLabel} with an estimated familiarity of ${difficulty.familiarityPercent ?? 0}%.${knownLanguages > 0 ? ` You already overlap with ${knownLanguages} of the repo's dominant languages.` : ""}`);
    }

    if (parts.length === 0) {
        return "No grounded repository summary is available yet. Re-run analysis after the repository metadata finishes loading.";
    }

    return parts.join(" ");
}

export default function AnalyzePage() {
    const router = useRouter();
    const params = useParams<{ repo?: string[] }>();
    const routeParts = Array.isArray(params?.repo) ? params.repo : [];
    const routeRepoSlug = routeParts.length >= 2 ? `${routeParts[0]}/${routeParts[1]}` : null;
    const routeRepoUrl = routeRepoSlug ? getRepoUrlFromSlug(routeRepoSlug) : "https://github.com/vercel/next.js";

    const [url, setUrl] = useState("https://github.com/vercel/next.js");
    const [analyzed, setAnalyzed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [archData, setArchData] = useState<any>(null);
    const [loadingArch, setLoadingArch] = useState(false);

    // Restore repo-specific state from the route.
    useEffect(() => {
        setUrl(routeRepoUrl);

        if (!routeRepoSlug) {
            setAnalyzed(false);
            setAnalysisData(null);
            setArchData(null);
            return;
        }

        const saved = readSavedAnalysis(routeRepoSlug);
        if (saved) {
            setUrl(saved.url || routeRepoUrl);
            setAnalysisData(saved.analysisData ?? null);
            setAnalyzed(Boolean(saved.analyzed && saved.analysisData));
            setArchData(saved.archData ?? null);
        } else {
            setAnalyzed(false);
            setAnalysisData(null);
            setArchData(null);
        }
    }, [routeRepoSlug, routeRepoUrl]);

    // Persist state per repository so opening one repo never overwrites another.
    useEffect(() => {
        if (!routeRepoSlug || !analysisData || !analyzed) return;
        try {
            saveAnalysisSnapshot(routeRepoSlug, { url, analysisData, analyzed, archData });
        } catch {
            // ignore storage errors
        }
    }, [routeRepoSlug, url, analysisData, analyzed, archData]);

    const handleAnalyze = async () => {
        if (!url) return;
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/repo/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, githubUsername: "vanshdeo" }),
            });
            const data = await res.json();
            const repoSlug = getRepoSlug(data.repo?.owner, data.repo?.name);
            const canonicalUrl = data.repo?.repoUrl ?? url;

            setAnalysisData(data);
            setAnalyzed(true);
            setUrl(canonicalUrl);

            if (repoSlug) {
                saveAnalysisSnapshot(repoSlug, {
                    url: canonicalUrl,
                    analysisData: data,
                    analyzed: true,
                    archData: null,
                });
            }
            
            // Save to global projects list
            try {
                const existingList = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]");
                const filteredList = existingList.filter((p: any) => p.repo?.owner !== data.repo?.owner || p.repo?.name !== data.repo?.name);
                localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([data, ...filteredList]));
            } catch(e) {
                console.error("Failed to save to global projects list", e);
            }
            
            if (repoSlug) {
                router.push(getAnalyzeRoute(repoSlug));
            }

            // Fire off the architecture pipeline asynchronously
            fetchArchitectureGraph(data.repo.owner, data.repo.name, repoSlug, data, canonicalUrl);
            
        } catch (error) {
            console.error("Failed to analyze repo:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchArchitectureGraph = async (
        owner: string,
        repoName: string,
        repoSlug?: string | null,
        nextAnalysisData?: any,
        nextUrl?: string,
    ) => {
        setLoadingArch(true);
        setArchData(null);
        try {
            const encodeId = encodeURIComponent(`${owner}/${repoName}`);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/repo/${encodeId}/graph?level=architecture`);
            if (res.ok) {
                const arch = await res.json();
                setArchData(arch);
                if (repoSlug && nextAnalysisData) {
                    saveAnalysisSnapshot(repoSlug, {
                        url: nextUrl ?? getRepoUrlFromSlug(repoSlug),
                        analysisData: nextAnalysisData,
                        analyzed: true,
                        archData: arch,
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch architecture:", error);
        } finally {
            setLoadingArch(false);
        }
    };

    const handleClear = () => {
        setUrl("https://github.com/vercel/next.js");
        setAnalyzed(false);
        setAnalysisData(null);
        setArchData(null);
        router.push("/analyze");
    };

    return (
        <div className="relative">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <Badge className="mb-3 bg-orange-500/10 text-orange-400 border-orange-500/20">
                        AI Repo Analysis
                    </Badge>
                    <h1 className="text-4xl font-bold text-white mb-2">Analyze a Repository</h1>
                    <p className="text-slate-400">
                        Paste any GitHub URL and our AI will break down purpose, stack, difficulty, and contribution opportunities.
                    </p>
                </motion.div>

                {/* URL Input */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-10"
                >
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => { setUrl(e.target.value); setAnalyzed(false); setAnalysisData(null); setArchData(null); }}
                                placeholder="https://github.com/owner/repo"
                                className="w-full bg-[#121212] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40"
                            />
                        </div>
                        <Button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="bg-orange-600 hover:bg-orange-500 text-white border-0 px-6"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Analyzing…
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Brain className="w-4 h-4" /> Analyze
                                </span>
                            )}
                        </Button>
                        {analyzed && (
                            <Button
                                onClick={handleClear}
                                variant="outline"
                                className="border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors px-3"
                                title="Clear results"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    {/* Cached state indicator */}
                    {analyzed && analysisData && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 mt-2"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-xs text-slate-500">
                                Showing cached results for <span className="text-slate-400 font-mono">{analysisData.repo?.owner}/{analysisData.repo?.name}</span> — <button onClick={handleAnalyze} className="text-orange-400 hover:text-orange-300 underline underline-offset-2">Re-analyze</button>
                            </span>
                        </motion.div>
                    )}
                </motion.div>

                {/* Results */}
                <AnimatePresence>
                    {analyzed && analysisData && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* Repo header card */}
                            <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.01] duration-300 transition-all">
                                <div className="flex items-start justify-between flex-wrap gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-slate-500">{analysisData.repo.owner} /</span>
                                            <span className="text-2xl font-bold text-white">{analysisData.repo.name}</span>
                                            <a href={analysisData.repo.repoUrl} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-4 h-4 text-slate-500 hover:text-blue-400 transition-colors" />
                                            </a>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge className={`border ${diffColorMap[getScoreColor(analysisData.difficulty?.rampScore ?? 0)]}`}>
                                                <Shield className="w-3 h-3 mr-1" />
                                                {analysisData.difficulty?.rampLabel ?? "Unknown Difficulty"}
                                            </Badge>
                                            <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                                                <Zap className="w-3 h-3 mr-1" />
                                                80-350 XP per quest
                                            </Badge>
                                            <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                                                <Clock className="w-3 h-3 mr-1" />
                                                2-6 hours per quest
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        {[
                                            { icon: Star, label: "Stars", val: formatNumber(analysisData.repo.stars) },
                                            { icon: Activity, label: "Forks", val: formatNumber(analysisData.repo.forks) },
                                            { icon: BookOpen, label: "Issues", val: formatNumber(analysisData.repo.openIssues) },
                                            { icon: Users, label: "Contributors", val: "N/A" },
                                        ].map(({ icon: Icon, label, val }) => (
                                            <div key={label} className="flex flex-col items-center">
                                                <Icon className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                                                <span className="text-white font-bold text-sm">{val}</span>
                                                <span className="text-slate-600 text-xs">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Purpose */}
                                <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.02] duration-300 transition-all">
                                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-orange-400" /> Purpose
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        {buildPurposeText(analysisData)}
                                    </p>
                                </Card>

                                {/* Lore */}
                                <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.02] duration-300 transition-all">
                                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-orange-400" /> Project Lore
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        {buildLoreText(analysisData)}
                                    </p>
                                </Card>

                                {/* Tech Stack */}
                                <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.02] duration-300 transition-all">
                                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                        <Code className="w-4 h-4 text-orange-400" /> Tech Stack
                                    </h3>
                                    <div className="space-y-3">
                                        {(analysisData.difficulty?.dominantLanguages?.length > 0 ? analysisData.difficulty.dominantLanguages : ["TypeScript", "JavaScript", "HTML"]).map((name: string, i: number) => {
                                            const defaultColors = ["blue", "yellow", "purple", "green"];
                                            const color = defaultColors[i % defaultColors.length];
                                            const rank = i === 0 ? 80 : i === 1 ? 15 : 5;
                                            return (
                                                <div key={name} className="flex items-center gap-3">
                                                    <span className={`text-xs font-medium w-24 ${diffColorMap[color]?.split(" ")[1] ?? "text-white"}`}>{name}</span>
                                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${rank}%` }}
                                                            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                                                            className={`h-full rounded-full ${color === "blue" ? "bg-blue-500" :
                                                                color === "yellow" ? "bg-yellow-500" :
                                                                    color === "purple" ? "bg-purple-500" : "bg-green-500"
                                                                }`}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-slate-500 w-8 text-right">{rank}%</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </Card>

                                {/* Community Health */}
                                <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.02] duration-300 transition-all">
                                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-orange-400" /> Community Health
                                    </h3>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="relative w-14 h-14">
                                            <svg className="w-14 h-14 -rotate-90">
                                                <circle cx="28" cy="28" r="22" fill="none" stroke="#1E293B" strokeWidth="4" />
                                                <circle
                                                    cx="28"
                                                    cy="28"
                                                    r="22"
                                                    fill="none"
                                                    // Map color based on score or default to green
                                                    stroke={analysisData.communityHealth?.labelColor === 'green' ? '#22C55E' : 
                                                            analysisData.communityHealth?.labelColor === 'yellow' ? '#EAB308' :
                                                            analysisData.communityHealth?.labelColor === 'orange' ? '#F97316' : '#EF4444'}
                                                    strokeWidth="4"
                                                    strokeDasharray={`${((analysisData.communityHealth?.score ?? 0) / 100) * 138.2} 138.2`}
                                                />
                                            </svg>
                                            <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${
                                                analysisData.communityHealth?.labelColor === 'green' ? "text-green-400" : 
                                                analysisData.communityHealth?.labelColor === 'yellow' ? 'text-yellow-400' :
                                                analysisData.communityHealth?.labelColor === 'orange' ? 'text-orange-400' : 'text-red-400'
                                            }`}>
                                                {analysisData.communityHealth?.score ?? "??!"}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold">{analysisData.communityHealth?.label ?? "Calculating..."}</p>
                                            <p className="text-xs text-slate-500">Relative to active repositories</p>
                                        </div>
                                    </div>
                                    
                                    {analysisData.communityHealth?.breakdown && (
                                        <div className="space-y-2 mt-4 pt-2 border-t border-white/5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-400">Responsiveness (40pts)</span>
                                                <span className="text-xs font-medium text-white">{analysisData.communityHealth.breakdown.responsivenessScore}/40</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-400">Activity (40pts)</span>
                                                <span className="text-xs font-medium text-white">{analysisData.communityHealth.breakdown.activityScore}/40</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-400">PR Health (20pts)</span>
                                                <span className="text-xs font-medium text-white">{analysisData.communityHealth.breakdown.prHealthScore}/20</span>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </div>

                            {/* Difficulty score */}
                            <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.01] duration-300 transition-all">
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-yellow-400" /> Contribution Difficulty Score
                                </h3>
                                <div className="flex items-center gap-4 mb-2">
                                    <Progress value={Math.min(100, Math.max(0, 100 - (analysisData.difficulty?.familiarityPercent ?? 50)))} className="flex-1 h-3" />
                                    <span className="text-2xl font-bold text-yellow-400">{Math.min(100, Math.max(0, 100 - (analysisData.difficulty?.familiarityPercent ?? 0)))}%</span>
                                    <Badge className={`border ${diffColorMap[getScoreColor(analysisData.difficulty?.rampScore ?? 0)]}`}>
                                        {analysisData.difficulty?.rampLabel ?? "Unknown"}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Score considers your known languages vs the repository's structure. Your familiarity with this codebase is estimated at <strong>{analysisData.difficulty?.familiarityPercent ?? 0}%</strong>.
                                </p>
                            </Card>

                            {/* ── Architecture Graph Visualization ── */}
                            <div className="mt-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                                        <Zap className="w-3 h-3 mr-1" />
                                        Architecture Map
                                    </Badge>
                                    <p className="text-slate-500 text-sm ml-2">Job ID: {analysisData.jobId} (Processing in Background)</p>
                                </div>
                                {loadingArch ? (
                                    <Card className="bg-[#121212] border-white/5 h-[600px] flex flex-col items-center justify-center animate-pulse">
                                        <div className="w-12 h-12 border-4 border-white/10 border-t-orange-500 rounded-full animate-spin mb-6" />
                                        <h3 className="text-xl font-bold text-white mb-2">Processing Architecture...</h3>
                                        <p className="text-slate-500 max-w-md text-center text-sm">
                                            Semantic AI agents are exploring the repository tree and constructing a progressive disclosure graph. This may take up to 20 seconds.
                                        </p>
                                    </Card>
                                ) : archData ? (
                                    <ArchVisualization graph={archData} />
                                ) : (
                                    <Card className="bg-[#121212] border-white/5 h-[300px] flex items-center justify-center">
                                        <p className="text-slate-500 flex items-center gap-2">
                                            <Shield className="w-4 h-4" /> Architecture unmapped. Could not generate topology.
                                        </p>
                                    </Card>
                                )}
                            </div>

                            <div className="flex justify-center mt-4">
                                <Button
                                    size="lg"
                                    className="bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-lg shadow-orange-500/20 px-10 hover:scale-105 transition-transform"
                                    asChild
                                >
                                    <a href={getIssuesRoute(`${analysisData.repo.owner}/${analysisData.repo.name}`)}>
                                        View Issues for this Repo <ArrowRight className="w-5 h-5 ml-2" />
                                    </a>
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
