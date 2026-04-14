"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Search,
    Filter,
    Star,
    GitPullRequest,
    Clock,
    Brain,
    ArrowRight,
    Shield,
} from "lucide-react";
import Link from "next/link";

const difficulties = [
    { label: "All", active: true },
    { label: "Beginner", color: "green" },
    { label: "Intermediate", color: "yellow" },
    { label: "Advanced", color: "orange" },
    { label: "Expert", color: "red" },
];

function formatNumber(num: number): string {
    if (!num) return "0";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
}

function getDifficultyColor(score: number): string {
    if (score <= 1) return 'green';
    if (score <= 3) return 'yellow';
    if (score <= 4) return 'orange';
    return 'red';
}

function mapAnalysisToProject(data: any) {
    const lang = data.difficulty?.dominantLanguages?.[0] || "Unknown";
    const langColor = "blue"; 
    return {
        name: data.repo?.name || "Unknown",
        org: data.repo?.owner || "Unknown",
        description: data.repo?.description || "No description available.",
        aiSummary: data.communityHealth?.label ? `Health Score: ${data.communityHealth.score}. ${data.communityHealth.label}` : "Pending complete deep analysis.",
        difficulty: data.difficulty?.rampLabel || "Unknown",
        diffColor: getDifficultyColor(data.difficulty?.rampScore || 0),
        issueCount: data.repo?.openIssues || 0,
        mergeVelocity: data.communityHealth?.breakdown?.prHealthScore ? `${data.communityHealth.breakdown.prHealthScore}/20 PR Health` : "Unknown",
        quality: data.communityHealth?.score || Math.floor(Math.random() * 100),
        stars: formatNumber(data.repo?.stars || 0),
        language: lang,
        langColor: langColor,
        tags: data.difficulty?.dominantLanguages || [],
    };
}

const diffColorMap: Record<string, string> = {
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function ProjectsPage() {
    const [projectsData, setProjectsData] = useState<any[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const list = JSON.parse(localStorage.getItem("chorus:projects:analyzed") || "[]");
            if (list.length > 0) {
                setProjectsData(list.map(mapAnalysisToProject));
            }
        } catch (e) {
            console.error(e);
        }
        setHydrated(true);
    }, []);

    return (
        <div className="relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <Badge className="mb-3 bg-orange-500/10 text-orange-400 border-orange-500/20">
                        Project Discovery
                    </Badge>
                    <h1 className="text-4xl font-bold text-white mb-2">Find Your Next Project</h1>
                    <p className="text-slate-400">
                        AI-curated repositories matched to your skill level. Every project, ranked by community health.
                    </p>
                </motion.div>

                {/* Search + Filter bar */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-wrap gap-3 mb-8"
                >
                    <div className="flex-1 min-w-[240px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search repositories..."
                            className="w-full bg-[#121212] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40 transition-colors"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {difficulties.map(({ label, active }) => (
                            <button
                                key={label}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${active
                                    ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                                    : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                        size="sm"
                    >
                        <Filter className="w-4 h-4 mr-1.5" /> More Filters
                    </Button>
                </motion.div>

                {/* Project Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {!hydrated ? (
                        <div className="col-span-1 lg:col-span-2 text-center text-slate-500 py-10">Loading your projects...</div>
                    ) : projectsData.length === 0 ? (
                        <div className="col-span-1 lg:col-span-2">
                             <Card className="bg-[#121212] border-orange-500/20 p-10 flex flex-col items-center justify-center text-center">
                                 <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                                     <Brain className="w-8 h-8 text-orange-400" />
                                 </div>
                                 <h2 className="text-2xl font-bold text-white mb-3">No Projects Analyzed Yet</h2>
                                 <p className="text-slate-400 max-w-md mx-auto mb-6">
                                     Start your journey by analyzing a GitHub repository. Our AI will break down exactly how you can contribute.
                                 </p>
                                 <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-500 text-white font-semibold gap-2">
                                     <Link href="/analyze">
                                         Go to Analyze Hub <ArrowRight className="w-4 h-4" />
                                     </Link>
                                 </Button>
                             </Card>
                         </div>
                    ) : (
                        projectsData.map((project: any, i: number) => (
                        <motion.div
                            key={project.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.4 }}
                        >
                            <Card className="bg-[#121212] border-white/5 p-6 h-full hover:border-orange-500/20 hover:scale-[1.02] duration-300 transition-all group">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-slate-500 text-sm">{project.org}/</span>
                                            <span className="text-white font-semibold text-lg">{project.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge className={`text-xs border ${diffColorMap[project.diffColor]}`}>
                                                <Shield className="w-3 h-3 mr-1" />
                                                {project.difficulty}
                                            </Badge>
                                            <Badge className="text-xs border border-white/5 text-slate-400 bg-white/5">
                                                {project.language}
                                            </Badge>
                                            {project.tags.map((tag: string) => (
                                                <Badge key={tag} className="text-xs border border-white/5 text-slate-500 bg-transparent">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-yellow-400 text-sm font-medium">
                                        <Star className="w-4 h-4 fill-yellow-400" />
                                        {project.stars}
                                    </div>
                                </div>

                                <p className="text-slate-400 text-sm mb-3 leading-relaxed">{project.description}</p>

                                {/* AI summary */}
                                <div className="flex items-start gap-2 bg-orange-500/5 border border-orange-500/10 rounded-lg p-3 mb-4 transition-colors group-hover:border-orange-500/20">
                                    <Brain className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-orange-300/80 leading-relaxed">{project.aiSummary}</p>
                                </div>

                                {/* Stats row */}
                                <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <GitPullRequest className="w-3.5 h-3.5" />
                                        {project.issueCount} issues
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {project.mergeVelocity} merges
                                    </div>
                                    <div className="ml-auto flex items-center gap-1">
                                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 rounded-full"
                                                style={{ width: `${project.quality}%` }}
                                            />
                                        </div>
                                        <span>{project.quality}% quality</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-orange-600 hover:bg-orange-500 text-white border-0 text-xs hover:scale-105 transition-transform"
                                        asChild
                                    >
                                        <Link href="/issues">
                                            View Issues <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                        </Link>
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs"
                                        asChild
                                    >
                                        <Link href="/analyze">Analyze</Link>
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    )))}
                </div>
            </div>
        </div>
    );
}
