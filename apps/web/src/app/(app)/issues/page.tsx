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
    Loader2,
    Plus,
    Lightbulb,
    Inbox,
} from "lucide-react";

const diffColorMap: Record<string, string> = {
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

// AI-suggested issue templates based on common contribution opportunities
function generateSuggestedIssues(repoSlug: string): any[] {
    return [
        {
            id: "suggested-1",
            title: "Add comprehensive README with setup instructions",
            repo: repoSlug,
            difficulty: "Beginner",
            diffColor: "green",
            time: "1–2 hrs",
            labels: ["documentation", "good first issue"],
            description:
                "This repository is missing a detailed README file. A good README should include:\n\n" +
                "- **Project overview** — what the project does and why it exists\n" +
                "- **Installation instructions** — step-by-step setup guide\n" +
                "- **Usage examples** — code snippets showing common use cases\n" +
                "- **Contributing guidelines** — how others can contribute\n" +
                "- **License information**\n\n" +
                "This is a great first issue for anyone looking to contribute to open source.",
            tasks: [
                "Fork the repository",
                "Create a detailed README.md file",
                "Add installation and setup instructions",
                "Include usage examples",
                "Submit a pull request",
            ],
            stars: 0,
            isSuggested: true,
        },
        {
            id: "suggested-2",
            title: "Add CONTRIBUTING.md with contributor guidelines",
            repo: repoSlug,
            difficulty: "Beginner",
            diffColor: "green",
            time: "1–2 hrs",
            labels: ["documentation", "community"],
            description:
                "Adding a CONTRIBUTING.md file helps new contributors understand how to get involved. It should cover:\n\n" +
                "- **Code of Conduct** — expected behavior\n" +
                "- **How to report bugs** — issue templates\n" +
                "- **How to suggest features** — proposal process\n" +
                "- **Development setup** — local environment requirements\n" +
                "- **Pull request process** — branch naming, commit messages, review workflow\n" +
                "- **Coding standards** — linting, formatting, testing requirements",
            tasks: [
                "Review existing project structure",
                "Create CONTRIBUTING.md with guidelines",
                "Add code of conduct reference",
                "Document the PR workflow",
                "Submit a pull request",
            ],
            stars: 0,
            isSuggested: true,
        },
        {
            id: "suggested-3",
            title: "Set up CI/CD pipeline with GitHub Actions",
            repo: repoSlug,
            difficulty: "Intermediate",
            diffColor: "yellow",
            time: "2–4 hrs",
            labels: ["devops", "automation", "enhancement"],
            description:
                "This repository would benefit from an automated CI/CD pipeline. Consider adding:\n\n" +
                "- **Linting** — automated code style checks on every PR\n" +
                "- **Testing** — run the test suite on push and PR\n" +
                "- **Build verification** — ensure the project builds successfully\n" +
                "- **Release automation** — optional: auto-publish on tag push\n\n" +
                "A `.github/workflows/ci.yml` file should be created.",
            tasks: [
                "Identify the project's build/test tooling",
                "Create .github/workflows/ci.yml",
                "Add lint, test, and build steps",
                "Test the workflow on a branch",
                "Submit a pull request",
            ],
            stars: 0,
            isSuggested: true,
        },
        {
            id: "suggested-4",
            title: "Add unit tests to improve code coverage",
            repo: repoSlug,
            difficulty: "Intermediate",
            diffColor: "yellow",
            time: "3–6 hrs",
            labels: ["testing", "quality", "enhancement"],
            description:
                "Improving test coverage is one of the best ways to contribute to a project's long-term health. Steps:\n\n" +
                "- **Identify untested modules** — look for files without corresponding test files\n" +
                "- **Write unit tests** — cover core functions and edge cases\n" +
                "- **Set up test runner** (if not already configured) — Jest, Vitest, pytest, etc.\n" +
                "- **Add coverage reporting** — track progress over time",
            tasks: [
                "Audit current test coverage",
                "Choose a testing framework if none exists",
                "Write tests for core modules",
                "Add a test script to package.json / Makefile",
                "Submit a pull request with coverage report",
            ],
            stars: 0,
            isSuggested: true,
        },
        {
            id: "suggested-5",
            title: "Improve error handling and add user-friendly error messages",
            repo: repoSlug,
            difficulty: "Advanced",
            diffColor: "orange",
            time: "4–8 hrs",
            labels: ["bug", "UX", "enhancement"],
            description:
                "Many projects lack proper error handling, leading to cryptic failures. This issue involves:\n\n" +
                "- **Auditing existing error handling** — find uncaught exceptions and silent failures\n" +
                "- **Adding try/catch blocks** — wrap risky operations\n" +
                "- **User-friendly messages** — replace stack traces with actionable errors\n" +
                "- **Logging** — add structured logging for debugging",
            tasks: [
                "Audit codebase for missing error handling",
                "Categorize errors (user-facing vs internal)",
                "Implement proper error boundaries/handlers",
                "Add meaningful error messages",
                "Submit a pull request",
            ],
            stars: 0,
            isSuggested: true,
        },
    ];
}

import { useSearchParams } from "next/navigation";

export default function IssuesPage() {
    const searchParams = useSearchParams();
    const urlParam = searchParams.get("url");

    const [fetchedIssues, setFetchedIssues] = useState<any[]>([]);
    const [suggestedIssues, setSuggestedIssues] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasRealIssues, setHasRealIssues] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
    const [startedIssues, setStartedIssues] = useState<string[]>([]);
    
    // AI Guide State
    const [aiGuide, setAiGuide] = useState<string | null>(null);
    const [relevantFiles, setRelevantFiles] = useState<Array<{ filePath: string; startLine: number; endLine: number; symbolName?: string | null }>>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Derive repo slug from URL param
    const repoSlug = urlParam ? urlParam.replace("https://github.com/", "").replace(/\/$/, "") : "";

    useEffect(() => {
        if (!urlParam) {
            setFetchedIssues([]);
            setSuggestedIssues([]);
            setHasRealIssues(false);
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
                    const mappedIssues = (data.issues || []).map((issue: any) => ({
                        id: issue.id,
                        issueNumber: issue.number,
                        title: issue.title,
                        repo: repoSlug,
                        difficulty: "Intermediate",
                        diffColor: "yellow",
                        time: "2-4 hrs",
                        labels: issue.labels.map((l: any) => (typeof l === 'string' ? l : l.name)),
                        description: issue.body || "No description provided.",
                        tasks: ["Review issue", "Implement fix", "Test"],
                        stars: data.repo?.stars || 0,
                        htmlUrl: issue.html_url,
                        isSuggested: false,
                    }));

                    if (mappedIssues.length > 0) {
                        setFetchedIssues(mappedIssues);
                        setSuggestedIssues([]);
                        setHasRealIssues(true);
                    } else {
                        setFetchedIssues([]);
                        setSuggestedIssues(generateSuggestedIssues(repoSlug));
                        setHasRealIssues(false);
                    }
                } else {
                    setFetchedIssues([]);
                    setSuggestedIssues(generateSuggestedIssues(repoSlug));
                    setHasRealIssues(false);
                }
            } catch (e) {
                console.error(e);
                setFetchedIssues([]);
                setSuggestedIssues(generateSuggestedIssues(repoSlug));
                setHasRealIssues(false);
            } finally {
                setLoading(false);
            }
        };
        fetchIssues();
    }, [urlParam, repoSlug]);

    const handleStart = (id: string) => {
        setStartedIssues((prev) => [...prev, id]);
    };

    const handleGenerateGuide = async (issue: any) => {
        setIsGenerating(true);
        setAiGuide(null);
        setRelevantFiles([]);
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const encodedRepoId = encodeURIComponent(issue.repo);
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

    // Build the GitHub "create new issue" URL for a suggested issue
    const getCreateIssueUrl = (issue: any) => {
        const title = encodeURIComponent(issue.title);
        const body = encodeURIComponent(issue.description);
        const labels = issue.labels.map((l: string) => encodeURIComponent(l)).join(",");
        return `https://github.com/${issue.repo}/issues/new?title=${title}&body=${body}&labels=${labels}`;
    };

    // The issues to display in the grid
    const displayIssues = hasRealIssues ? fetchedIssues : suggestedIssues;

    // Markdown prose classes reusable across sections
    const mdProseClasses = `prose prose-sm prose-invert max-w-none text-slate-400 leading-relaxed
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
        [&_em]:text-slate-400 [&_em]:italic`;

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
                    <h1 className="text-4xl font-bold text-white mb-2">
                        {repoSlug ? `Issues — ${repoSlug}` : "Active Issues"}
                    </h1>
                    <p className="text-slate-400">
                        {repoSlug
                            ? "Showing issues for this repository. Pick one and start contributing."
                            : "Analyze a repository first to see its issues here."}
                    </p>
                </motion.div>

                {/* No repo selected state */}
                {!urlParam && !loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
                            <Inbox className="w-7 h-7 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">No repository selected</h3>
                        <p className="text-slate-500 text-sm max-w-sm">
                            Go to the <span className="text-orange-400 font-medium">Analyze</span> page, paste a GitHub URL, and then navigate here to see its issues.
                        </p>
                    </motion.div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20 gap-3">
                        <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                        <span className="text-slate-400 text-sm">Fetching issues from GitHub…</span>
                    </div>
                )}

                {/* Empty state — no real issues found, show suggestions */}
                {!loading && urlParam && !hasRealIssues && suggestedIssues.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="flex items-center gap-3 bg-purple-500/5 border border-purple-500/15 rounded-xl px-5 py-4 mb-6">
                            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                <Lightbulb className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-purple-300">No open issues found for this repository</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Here are some AI-suggested contribution opportunities you can create as new issues. Click <strong className="text-slate-400">"Create this Issue"</strong> to open it directly on GitHub.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Filter bar — only show for real issues */}
                {!loading && hasRealIssues && (
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
                )}

                {/* Issue Grid */}
                {!loading && displayIssues.length > 0 && (
                    <div className="space-y-4">
                        {displayIssues.map((issue, i) => (
                            <motion.div
                                key={issue.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.4 }}
                            >
                                <Card className={`bg-[#121212] border-white/5 p-5 hover:scale-[1.01] duration-300 transition-all group ${
                                    issue.isSuggested
                                        ? "border-l-2 border-l-purple-500/40 hover:border-purple-500/30"
                                        : "hover:border-orange-500/20"
                                }`}>
                                    <div className="flex items-start gap-4 flex-wrap">

                                        {/* Main info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                                                <div className="flex items-center gap-2">
                                                    {issue.isSuggested && (
                                                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] px-1.5 py-0.5">
                                                            <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI Suggested
                                                        </Badge>
                                                    )}
                                                    <h3
                                                        className="text-white font-semibold group-hover:text-orange-400 transition-colors cursor-pointer"
                                                        onClick={() => setSelectedIssue(issue)}
                                                    >
                                                        {issue.title}
                                                    </h3>
                                                </div>
                                                {!issue.isSuggested && (
                                                    <div className="flex items-center gap-1 text-yellow-400 text-xs ml-auto">
                                                        <Star className="w-3.5 h-3.5 fill-yellow-400" />
                                                        {issue.stars} watchers
                                                    </div>
                                                )}
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
                                            {issue.isSuggested ? (
                                                <Button
                                                    size="sm"
                                                    className="bg-purple-600 hover:bg-purple-500 text-white border-0 text-xs shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform"
                                                    asChild
                                                >
                                                    <a href={getCreateIssueUrl(issue)} target="_blank" rel="noopener noreferrer">
                                                        <Plus className="w-3.5 h-3.5 mr-1" /> Create Issue
                                                    </a>
                                                </Button>
                                            ) : startedIssues.includes(String(issue.id)) ? (
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
                                                    onClick={() => { handleStart(String(issue.id)); setSelectedIssue(issue); }}
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
                )}
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
                                    {selectedIssue.isSuggested && (
                                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                                            <Sparkles className="w-3 h-3 mr-1" /> AI Suggested
                                        </Badge>
                                    )}
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
                                    <div className={mdProseClasses}>
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
                                                    className={`w-4 h-4 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center ${startedIssues.includes(String(selectedIssue.id)) && i === 0
                                                        ? "bg-green-500/20 border-green-500/40"
                                                        : "border-white/10"
                                                        }`}
                                                >
                                                    {startedIssues.includes(String(selectedIssue.id)) && i === 0 && (
                                                        <CheckCircle className="w-3 h-3 text-green-400" />
                                                    )}
                                                </div>
                                                <span className="text-sm text-slate-400">{task}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {!selectedIssue.isSuggested && (
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-sm font-semibold text-white">Progress</h4>
                                            <span className="text-xs text-slate-500">
                                                {startedIssues.includes(String(selectedIssue.id)) ? "1" : "0"} of {selectedIssue.tasks.length} complete
                                            </span>
                                        </div>
                                        <Progress
                                            value={
                                                startedIssues.includes(String(selectedIssue.id))
                                                    ? (1 / selectedIssue.tasks.length) * 100
                                                    : 0
                                            }
                                            className="h-2"
                                        />
                                    </div>
                                )}

                                {/* AI Contribution Guide Area — only for real issues */}
                                {!selectedIssue.isSuggested && (
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
                                                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analyzing Codebase…</>
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
                                )}
                            </div>

                            {/* Sticky footer */}
                            <div className="px-6 py-4 border-t border-white/5 flex-shrink-0 flex gap-3">
                                {selectedIssue.isSuggested ? (
                                    /* Suggested issue footer — Create on GitHub */
                                    <Button
                                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white border-0 shadow-lg shadow-purple-500/20 hover:scale-[1.02] transition-transform"
                                        asChild
                                    >
                                        <a href={getCreateIssueUrl(selectedIssue)} target="_blank" rel="noopener noreferrer">
                                            <Plus className="w-4 h-4 mr-2" /> Create this Issue on GitHub
                                        </a>
                                    </Button>
                                ) : (
                                    /* Real issue footer — Start + View on GitHub */
                                    <>
                                        {!startedIssues.includes(String(selectedIssue.id)) ? (
                                            <Button
                                                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform"
                                                onClick={() => handleStart(String(selectedIssue.id))}
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
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
