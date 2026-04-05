"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Clock,
    Shield,
    Star,
    ArrowRight,
    Filter,
    CheckCircle,
    BookOpen,
    Play,
    GitPullRequest,
    Target,
    Sparkles,
    Loader2
} from "lucide-react";

const diffColorMap: Record<string, string> = {
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
};

const issuesData = [
    {
        id: 1,
        title: "Fix hydration error in App Router with dynamic routes",
        repo: "vercel/next.js",
        difficulty: "Intermediate",
        diffColor: "yellow",
        time: "3–5 hrs",
        labels: ["bug", "app-router", "good first issue"],
        description:
            "Investigate and fix a hydration mismatch occurring when dynamic route params are accessed in client components using the new App Router.",
        tasks: [
            "Reproduce the hydration error locally",
            "Identify the root cause in the routing layer",
            "Write a fix with backward compat",
            "Add unit tests for the fix",
            "Update changelog",
        ],
        stars: 124,
    },
    {
        id: 2,
        title: "Add keyboard navigation to Combobox component",
        repo: "shadcn/shadcn-ui",
        difficulty: "Beginner",
        diffColor: "green",
        time: "1–2 hrs",
        labels: ["accessibility", "component", "good first issue"],
        description:
            "The Combobox component lacks proper arrow key navigation and Escape key handling for accessibility compliance.",
        tasks: [
            "Review ARIA Combobox pattern spec",
            "Implement arrow key navigation",
            "Add Escape key to close dropdown",
            "Test with screen reader",
        ],
        stars: 87,
    },
    {
        id: 3,
        title: "Optimize image loading in production builds",
        repo: "vercel/next.js",
        difficulty: "Advanced",
        diffColor: "orange",
        time: "6–10 hrs",
        labels: ["performance", "images", "needs-review"],
        description:
            "Improve image optimization pipeline to reduce LCP by avoiding unnecessary re-processing of already-optimized images.",
        tasks: [
            "Profile current image pipeline",
            "Implement smart caching layer",
            "Add cache invalidation logic",
            "Benchmark improvement",
            "Write documentation",
            "Submit PR with perf report",
        ],
        stars: 203,
    },
    {
        id: 4,
        title: "Improve TypeScript types for useQuery hook",
        repo: "tanstack/query",
        difficulty: "Intermediate",
        diffColor: "yellow",
        time: "2–4 hrs",
        labels: ["typescript", "types", "help wanted"],
        description:
            "The current useQuery generic types don't properly infer the error type when a custom error class is provided.",
        tasks: [
            "Understand current generic structure",
            "Propose new type signature",
            "Implement changes",
            "Add type tests with expect-type",
        ],
        stars: 156,
    },
    {
        id: 5,
        title: "Add dark mode to documentation site",
        repo: "tailwindlabs/tailwindcss",
        difficulty: "Beginner",
        diffColor: "green",
        time: "1–3 hrs",
        labels: ["documentation", "design", "good first issue"],
        description:
            "The official docs site does not respect the system dark mode preference. Implement using CSS media queries and CSS variables.",
        tasks: [
            "Set up dark mode tokens",
            "Apply to all doc pages",
            "Test on macOS and Windows",
        ],
        stars: 44,
    },
    {
        id: 6,
        title: "CUDA out-of-memory on batch normalization backward pass",
        repo: "pytorch/pytorch",
        difficulty: "Expert",
        diffColor: "red",
        time: "10–20 hrs",
        labels: ["cuda", "memory", "expert"],
        description:
            "Reproduce and fix OOM errors when running batch normalization backward pass with very large batch sizes on A100 GPUs.",
        tasks: [
            "Reproduce issue with provided repro script",
            "Profile GPU memory allocation",
            "Identify the allocation spike",
            "Implement memory-efficient backward pass",
            "Run benchmark suite",
            "Write test case",
        ],
        stars: 512,
    },
];

import { useSearchParams } from "next/navigation";

export default function IssuesPage() {
    const searchParams = useSearchParams();
    const urlParam = searchParams.get("url");

    const [fetchedIssues, setFetchedIssues] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
    const [startedIssues, setStartedIssues] = useState<number[]>([]);
    
    // AI Guide State
    const [aiGuide, setAiGuide] = useState<string | null>(null);
    const [relevantFiles, setRelevantFiles] = useState<Array<{ filePath: string; startLine: number; endLine: number; symbolName?: string | null }>>([]);
    const [isGenerating, setIsGenerating] = useState(false);


    useEffect(() => {
        if (!urlParam) {
            setFetchedIssues(issuesData);
            return;
        }

        const fetchIssues = async () => {
            setLoading(true);
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
                const encodedRepoUrl = encodeURIComponent(urlParam); 
                const res = await fetch(`${API_BASE}/api/repo/issues?url=${encodedRepoUrl}`);
                if (res.ok) {
                    const data = await res.json();
                    
                    // The backend returns { repo: { ... }, issues: [ ... ] }, assuming the shape here matches issuesData.
                    // If the backend returns standard GH issues, we map them to fit issuesData schema:
                    // IMPORTANT: issue.number is the GitHub issue number (e.g. 42).
                    // issue.id is the large node ID — NOT what the API expects.
                    const mappedIssues = (data.issues || []).map((issue: any) => ({
                        id: issue.id,          // node ID (for React key)
                        issueNumber: issue.number, // actual GitHub issue number for API calls
                        title: issue.title,
                        repo: urlParam.replace('https://github.com/', ''),
                        difficulty: "Intermediate",
                        diffColor: "yellow",
                        time: "2-4 hrs",
                        labels: issue.labels.map((l: any) => (typeof l === 'string' ? l : l.name)),
                        description: issue.body || "No description provided.",
                        tasks: ["Review issue", "Implement fix", "Test"],
                        stars: data.repo?.stars || 0,
                        htmlUrl: issue.html_url,
                    }));
                    setFetchedIssues(mappedIssues.length > 0 ? mappedIssues : issuesData);
                } else {
                     setFetchedIssues(issuesData);
                }
            } catch (e) {
                console.error(e)
                setFetchedIssues(issuesData);
            } finally {
                setLoading(false);
            }
        };
        fetchIssues();
    }, [urlParam]);

    const handleStart = (id: number) => {
        setStartedIssues((prev) => [...prev, id]);
    };

    const handleGenerateGuide = async (issue: any) => {
        setIsGenerating(true);
        setAiGuide(null);
        setRelevantFiles([]);
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const encodedRepoId = encodeURIComponent(issue.repo);
            // Use issueNumber (real GitHub issue number) for fetched issues,
            // fall back to id for mock issuesData which uses numeric IDs directly
            const issueNum = issue.issueNumber ?? issue.id;
            const res = await fetch(`${API_BASE}/api/repo/${encodedRepoId}/issues/${issueNum}/guide`, {
                credentials: "include"
            });
            if (res.ok) {
                const data = await res.json();
                setAiGuide(data.guide);
                setRelevantFiles(data.relevantFiles ?? []);
            } else {
                setAiGuide("Failed to generate the AI contribution guide. Please ensure the backend is running and Gemini API key is set.");
            }
        } catch (e) {
            setAiGuide("Error generating guide. Check your network or backend server.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="relative">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <Badge className="mb-3 bg-orange-500/10 text-orange-400 border-orange-500/20">
                        <Target className="w-3.5 h-3.5 mr-1.5" /> Issue Board
                    </Badge>
                    <h1 className="text-4xl font-bold text-white mb-2">Active Issues</h1>
                    <p className="text-slate-400">
                        Every GitHub issue is an opportunity to contribute. Pick one and make an impact.
                    </p>
                </motion.div>

                {/* Filter bar */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-wrap gap-3 mb-8"
                >
                    {["All Difficulties", "Beginner", "Intermediate", "Advanced", "Expert"].map((f) => (
                        <button
                            key={f}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${f === "All Difficulties"
                                ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                    <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                        <Filter className="w-3.5 h-3.5" /> Sort by Recently Added
                    </button>
                </motion.div>

                {/* Issue Grid */}
                <div className="space-y-4">
                    {fetchedIssues.map((issue, i) => (
                        <motion.div
                            key={issue.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.4 }}
                        >
                            <Card className="bg-[#121212] border-white/5 p-5 hover:border-orange-500/20 hover:scale-[1.01] duration-300 transition-all group">
                                <div className="flex items-start gap-4 flex-wrap">

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                                            <h3
                                                className="text-white font-semibold group-hover:text-orange-400 transition-colors cursor-pointer"
                                                onClick={() => setSelectedIssue(issue)}
                                            >
                                                {issue.title}
                                            </h3>
                                            <div className="flex items-center gap-1 text-yellow-400 text-xs ml-auto">
                                                <Star className="w-3.5 h-3.5 fill-yellow-400" />
                                                {issue.stars} watchers
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <GitPullRequest className="w-3 h-3" /> {issue.repo}
                                            </span>
                                            <Badge className={`text-xs border ${diffColorMap[issue.diffColor]}`}>
                                                <Shield className="w-3 h-3 mr-1" /> {issue.difficulty}
                                            </Badge>
                                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                                <Clock className="w-3 h-3" /> {issue.time}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {issue.labels.map((label: string) => (
                                                <Badge
                                                    key={label}
                                                    className="text-xs border border-white/5 text-slate-500 bg-transparent"
                                                >
                                                    {label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs"
                                            onClick={() => setSelectedIssue(issue)}
                                        >
                                            <BookOpen className="w-3.5 h-3.5 mr-1" /> Details
                                        </Button>
                                        {startedIssues.includes(issue.id) ? (
                                            <Button
                                                size="sm"
                                                className="bg-green-600/20 text-green-400 border border-green-500/20 text-xs cursor-default hover:bg-green-600/20 hover:text-green-400"
                                                disabled
                                            >
                                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> In Progress
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="bg-orange-600 hover:bg-orange-500 text-white border-0 text-xs shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform"
                                                onClick={() => { handleStart(issue.id); setSelectedIssue(issue); }}
                                            >
                                                <Play className="w-3.5 h-3.5 mr-1" /> Start Issue
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Issue Detail Modal */}
            <Dialog open={!!selectedIssue} onOpenChange={(o) => {
                if (!o) {
                    setSelectedIssue(null);
                    setAiGuide(null);
                    setRelevantFiles([]);
                }
            }}>
                <DialogContent className="bg-[#121212] border-white/10 max-w-2xl w-full flex flex-col max-h-[90vh] p-0 gap-0 overflow-hidden">
                    {selectedIssue && (
                        <>
                            {/* Sticky header */}
                            <div className="px-6 pt-6 pb-4 border-b border-white/5 flex-shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className={`text-xs border ${diffColorMap[selectedIssue.diffColor]}`}>
                                        <Shield className="w-3 h-3 mr-1" /> {selectedIssue.difficulty}
                                    </Badge>
                                    <Badge className="bg-slate-700 text-slate-400 border-white/5 text-xs">
                                        <Clock className="w-3 h-3 mr-1" /> {selectedIssue.time}
                                    </Badge>
                                </div>
                                <DialogHeader>
                                    <DialogTitle className="text-white text-xl leading-tight">
                                        {selectedIssue.title}
                                    </DialogTitle>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 pt-1">
                                        <GitPullRequest className="w-3 h-3" /> {selectedIssue.repo}
                                    </p>
                                </DialogHeader>
                            </div>

                            {/* Scrollable body */}
                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
                                {/* Description with Markdown */}
                                <div>
                                    <h4 className="text-sm font-semibold text-white mb-2">Overview</h4>
                                    <div className="prose prose-sm prose-invert max-w-none text-slate-400 leading-relaxed
                                        [&_h1]:text-white [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1
                                        [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1
                                        [&_h3]:text-slate-300 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1
                                        [&_p]:text-slate-400 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1
                                        [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5
                                        [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-0.5
                                        [&_li]:text-slate-400 [&_li]:text-sm
                                        [&_code]:bg-white/10 [&_code]:text-orange-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                                        [&_pre]:bg-white/5 [&_pre]:border [&_pre]:border-white/10 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto
                                        [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-300
                                        [&_blockquote]:border-l-2 [&_blockquote]:border-orange-500/40 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_blockquote]:italic
                                        [&_a]:text-orange-400 [&_a]:underline [&_a]:underline-offset-2
                                        [&_hr]:border-white/10 [&_hr]:my-3
                                        [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse
                                        [&_th]:text-slate-300 [&_th]:font-semibold [&_th]:border [&_th]:border-white/10 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-white/5
                                        [&_td]:text-slate-400 [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1
                                        [&_strong]:text-slate-200 [&_strong]:font-semibold
                                        [&_em]:text-slate-400 [&_em]:italic
                                    ">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {selectedIssue.description}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-white mb-3">
                                        Issue Checklist ({selectedIssue.tasks.length} tasks)
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedIssue.tasks.map((task: string, i: number) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <div
                                                    className={`w-4 h-4 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center ${startedIssues.includes(selectedIssue.id) && i === 0
                                                        ? "bg-green-500/20 border-green-500/40"
                                                        : "border-white/10"
                                                        }`}
                                                >
                                                    {startedIssues.includes(selectedIssue.id) && i === 0 && (
                                                        <CheckCircle className="w-3 h-3 text-green-400" />
                                                    )}
                                                </div>
                                                <span className="text-sm text-slate-400">{task}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-sm font-semibold text-white">Progress</h4>
                                        <span className="text-xs text-slate-500">
                                            {startedIssues.includes(selectedIssue.id) ? "1" : "0"} of {selectedIssue.tasks.length} complete
                                        </span>
                                    </div>
                                    <Progress
                                        value={
                                            startedIssues.includes(selectedIssue.id)
                                                ? (1 / selectedIssue.tasks.length) * 100
                                                : 0
                                        }
                                        className="h-2"
                                    />
                                </div>

                                {/* AI Contribution Guide Area */}
                                <div className="border border-white/10 rounded-xl p-4 bg-white/5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-purple-400" />
                                            <h4 className="text-sm font-semibold text-white">AI Contribution Agent</h4>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs border-purple-500/20 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                                            onClick={() => handleGenerateGuide(selectedIssue)}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? (
                                                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analyzing Codebase...</>
                                            ) : (
                                                <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate Guide</>
                                            )}
                                        </Button>
                                    </div>

                                    <AnimatePresence>
                                        {aiGuide && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-3 relative"
                                            >
                                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/60 to-orange-500/60 rounded-full" />
                                                <div className="pl-4 prose prose-sm prose-invert max-w-none
                                                    [&_h1]:text-white [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1
                                                    [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1
                                                    [&_h3]:text-purple-300 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-0.5
                                                    [&_p]:text-slate-300 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1
                                                    [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5
                                                    [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-0.5
                                                    [&_li]:text-slate-300 [&_li]:text-sm
                                                    [&_code]:bg-purple-500/10 [&_code]:text-purple-300 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                                                    [&_pre]:bg-white/5 [&_pre]:border [&_pre]:border-white/10 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto
                                                    [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-300
                                                    [&_blockquote]:border-l-2 [&_blockquote]:border-purple-500/40 [&_blockquote]:pl-3 [&_blockquote]:text-slate-400
                                                    [&_a]:text-purple-400 [&_a]:underline [&_a]:underline-offset-2
                                                    [&_strong]:text-slate-200 [&_strong]:font-semibold
                                                    [&_hr]:border-white/10
                                                    [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse
                                                    [&_th]:text-slate-300 [&_th]:font-semibold [&_th]:border [&_th]:border-white/10 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-white/5
                                                    [&_td]:text-slate-400 [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1
                                                ">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {aiGuide}
                                                    </ReactMarkdown>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Relevant Files Panel */}
                                    <AnimatePresence>
                                        {relevantFiles.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-4"
                                            >
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                    <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Files to Change</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {relevantFiles.map((f, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex items-center gap-2 bg-green-500/5 border border-green-500/15 rounded-lg px-3 py-2 group"
                                                        >
                                                            <span className="text-green-500/60 text-xs font-mono select-none">{String(i + 1).padStart(2, '0')}</span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-mono text-green-300 truncate">{f.filePath}</p>
                                                                {f.symbolName && (
                                                                    <p className="text-[10px] text-slate-500 mt-0.5">{f.symbolName}</p>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded flex-shrink-0">
                                                                L{f.startLine}–{f.endLine}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Sticky footer */}
                            <div className="px-6 py-4 border-t border-white/5 flex-shrink-0 flex gap-3">
                                {!startedIssues.includes(selectedIssue.id) ? (
                                    <Button
                                        className="flex-1 bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform"
                                        onClick={() => handleStart(selectedIssue.id)}
                                    >
                                        <Play className="w-4 h-4 mr-2" /> Start This Issue
                                    </Button>
                                ) : (
                                    <Button
                                        className="flex-1 bg-green-600/20 text-green-400 border border-green-500/20"
                                        disabled
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" /> Issue In Progress
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                                    asChild
                                >
                                    <a href={selectedIssue.htmlUrl || "#"} target="_blank" rel="noopener noreferrer">
                                        <ArrowRight className="w-4 h-4 mr-1" /> View on GitHub
                                    </a>
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
