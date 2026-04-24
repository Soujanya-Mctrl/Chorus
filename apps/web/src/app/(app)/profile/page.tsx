"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
    Loader2, GitPullRequest, Star, Code, GitMerge, Settings, MapPin,
    Building2, Zap, Shield, Target, Bug, FileText, TestTube,
    GraduationCap, Briefcase, Heart, Lightbulb, ArrowRight,
    Users, GitFork, ExternalLink, Calendar, Activity, Flame, Trophy,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { fetchGitHubStats, type GitHubStats } from "@/lib/github";
import ContributionGraph from "@/components/profile/ContributionGraph";
import EditProfileModal from "@/components/profile/EditProfileModal";

// ── Config ───────────────────────────────────────────────────────────

const languageColors: Record<string, string> = {
    JavaScript: "#f7df1e", TypeScript: "#3178c6", Python: "#3776ab",
    Rust: "#ce422b", Go: "#00add8", Java: "#ed8b00", "C#": "#68217a",
    "C++": "#00599c", C: "#555555", Ruby: "#cc342d", Swift: "#fa7343",
    Kotlin: "#7f52ff", PHP: "#777bb4", Dart: "#00b4ab", Shell: "#89e051",
    HTML: "#e34c26", CSS: "#563d7c", Vue: "#41b883", Svelte: "#ff3e00",
    Lua: "#000080", Scala: "#c22d40", Elixir: "#6e4a7e", Haskell: "#5e5086",
    Zig: "#f7a41d", "Jupyter Notebook": "#f37626", R: "#198ce7", SCSS: "#c6538c",
};

const expLevels: Record<string, { label: string; icon: typeof Flame }> = {
    beginner: { label: "Beginner", icon: Zap },
    intermediate: { label: "Intermediate", icon: Flame },
    advanced: { label: "Advanced", icon: Shield },
    expert: { label: "Expert", icon: Trophy },
};

const contribIcons: Record<string, typeof Code> = {
    bugfixes: Bug, features: Code, docs: FileText, testing: TestTube,
};
const contribLabels: Record<string, string> = {
    bugfixes: "Bug Fixes", features: "Features", docs: "Docs", testing: "Testing",
};

const goalMeta: Record<string, { label: string; icon: typeof Target }> = {
    learn: { label: "Learn & Grow", icon: GraduationCap },
    portfolio: { label: "Build Portfolio", icon: Briefcase },
    giveback: { label: "Give Back", icon: Heart },
    career: { label: "Get Hired", icon: Lightbulb },
};

// ── Glass card ───────────────────────────────────────────────────────

function GlassCard({ children, className = "", delay = 0 }: {
    children: React.ReactNode; className?: string; delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: "easeOut" }}
            className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${className}`}
        >
            {children}
        </motion.div>
    );
}

// ── Main ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
    const { isLoaded, isSignedIn, user } = useUser();
    const [ghStats, setGhStats] = useState<GitHubStats | null>(null);
    const [ghLoading, setGhLoading] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const loadStats = async () => {
        if (!user?.username) return;
        localStorage.removeItem("chorus:github:stats");
        setGhLoading(true);
        try {
            const stats = await fetchGitHubStats(user.username);
            setGhStats(stats);
        } catch (err) {
            console.error(err);
        } finally {
            setGhLoading(false);
        }
    };

    useEffect(() => {
        if (isLoaded && isSignedIn) loadStats();
    }, [isLoaded, isSignedIn, user?.username]);

    if (!isLoaded) return <ProfileSkeleton />;

    if (!isSignedIn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <h2 className="text-xl font-bold text-white mb-2">Connect to view profile</h2>
                <p className="text-white/40 text-sm mb-6 max-w-sm">
                    Sign in with GitHub to view your developer profile and stats.
                </p>
                <Link href="/sign-in" className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black text-sm font-semibold hover:brightness-110 transition">
                    Connect GitHub
                </Link>
            </div>
        );
    }

    const prefs = (user.unsafeMetadata?.preferences as any) || null;
    const onboarded = user.unsafeMetadata?.onboardingComplete === true;
    const exp = prefs?.experience ? expLevels[prefs.experience] : null;
    const goal = prefs?.goal ? goalMeta[prefs.goal] : null;
    const contribs: string[] = prefs?.contributions || [];

    const ghLangs = ghStats?.languages || {};
    const sortedLangs = Object.entries(ghLangs).sort(([, a], [, b]) => b - a);
    const totalLang = sortedLangs.reduce((s, [, c]) => s + c, 0);

    const stats = [
        { label: "Contributions", val: ghStats?.contributions, icon: GitMerge },
        { label: "Stars", val: ghStats?.totalStars, icon: Star },
        { label: "Repos", val: ghStats?.publicRepos, icon: Code },
        { label: "PRs Merged", val: ghStats?.prsMerged, icon: GitPullRequest },
        { label: "Followers", val: ghStats?.followers, icon: Users },
        { label: "Forks", val: ghStats?.totalForks, icon: GitFork },
    ];

    const ExpIcon = exp?.icon || Shield;
    const GoalIcon = goal?.icon || Target;

    return (
        <div className="relative min-h-screen">
            {/* ── Gradient background ────────────────────────── */}
            <div className="fixed inset-0 -z-10 pointer-events-none">
                <div className="absolute inset-0 bg-[#060608]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-orange-500/[0.07] via-amber-500/[0.03] to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-purple-600/[0.04] to-transparent rounded-full blur-3xl" />
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

                {/* ── Header ─────────────────────────────────── */}
                <GlassCard className="p-6" delay={0}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden ring-2 ring-white/10 shrink-0">
                            {user.imageUrl ? (
                                <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-white/10 flex items-center justify-center text-xl font-black text-white/60">
                                    {(user.fullName || user.username || "U").slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-xl font-bold text-white">{user.fullName || user.username || "Developer"}</h1>
                                <span className="text-white/30 text-sm">@{user.username || "user"}</span>
                                {exp && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-orange-500/15 to-amber-500/15 text-orange-300 border border-orange-500/20">
                                        <ExpIcon className="w-3 h-3" /> {exp.label}
                                    </span>
                                )}
                            </div>
                            {ghStats?.bio && <p className="text-sm text-white/40 mt-1 max-w-lg">{ghStats.bio}</p>}
                            <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-white/30">
                                <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> {ghStats?.company || "Independent"}</span>
                                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {ghStats?.location || "Earth"}</span>
                                {goal && <span className="inline-flex items-center gap-1"><GoalIcon className="w-3 h-3" /> {goal.label}</span>}
                                {ghStats?.createdAt && (
                                    <span className="inline-flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Joined {new Date(ghStats.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setEditOpen(true)}
                                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white/60 hover:text-white transition border border-white/[0.06]"
                            >
                                <Settings className="w-3.5 h-3.5" /> Edit
                            </button>
                        </div>
                    </div>
                </GlassCard>

                {/* ── Stats ──────────────────────────────────── */}
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                    {stats.map(({ label, val, icon: Icon }, i) => (
                        <GlassCard key={label} className="p-4 text-center group hover:border-orange-500/20 hover:-translate-y-0.5 transition-all duration-300" delay={0.05 * (i + 1)}>
                            <Icon className="w-4 h-4 mx-auto mb-1.5 text-white/20 group-hover:text-orange-400/70 transition-colors" />
                            <div className="text-lg font-bold text-white/90">
                                {ghLoading ? <Loader2 className="w-3.5 h-3.5 mx-auto animate-spin text-white/20" /> : (val ?? "—")}
                            </div>
                            <div className="text-[9px] text-white/25 mt-0.5 uppercase font-semibold tracking-wider">{label}</div>
                        </GlassCard>
                    ))}
                </div>

                {/* ── Contributions ──────────────────────────── */}
                {user?.username && (
                    <GlassCard className="p-6" delay={0.15}>
                        <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-orange-400/70" /> Contribution Activity
                        </h3>
                        <ContributionGraph
                            username={user.username}
                            joinYear={ghStats?.createdAt ? new Date(ghStats.createdAt).getFullYear() : undefined}
                        />
                    </GlassCard>
                )}

                {/* ── Tech Stack ─────────────────────────────── */}
                <GlassCard className="p-6" delay={0.2}>
                    <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                        <Code className="w-4 h-4 text-orange-400/70" /> Tech Stack
                        <span className="text-[10px] text-white/20 font-normal ml-auto">from GitHub</span>
                    </h3>
                    {ghLoading ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-white/20 animate-spin" /></div>
                    ) : sortedLangs.length > 0 ? (
                        <div className="space-y-4">
                            {/* Bar */}
                            <div className="flex rounded-full overflow-hidden h-2 bg-white/[0.04]">
                                {sortedLangs.slice(0, 10).map(([lang, count]) => (
                                    <div key={lang} className="h-full" style={{
                                        width: `${(count / totalLang) * 100}%`,
                                        backgroundColor: languageColors[lang] || "#555",
                                        minWidth: 3,
                                    }} />
                                ))}
                            </div>
                            {/* Chips */}
                            <div className="flex flex-wrap gap-1.5">
                                {sortedLangs.map(([lang, count]) => (
                                    <div key={lang} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.05] text-xs">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: languageColors[lang] || "#555" }} />
                                        <span className="text-white/70">{lang}</span>
                                        <span className="text-white/20 font-mono text-[10px]">{Math.round((count / totalLang) * 100)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-white/25 text-sm py-2">No languages detected</p>
                    )}
                </GlassCard>

                {/* ── Summary Row ────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <GlassCard className="p-5" delay={0.25}>
                        <div className="text-[9px] uppercase font-bold text-white/20 tracking-wider mb-3">Experience</div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center border border-orange-500/10">
                                <ExpIcon className="w-5 h-5 text-orange-400/80" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white/90">{exp?.label || "Not set"}</div>
                                <div className="text-[10px] text-white/25">Self-assessed</div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5" delay={0.28}>
                        <div className="text-[9px] uppercase font-bold text-white/20 tracking-wider mb-3">Goal</div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center border border-orange-500/10">
                                <GoalIcon className="w-5 h-5 text-orange-400/80" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white/90">{goal?.label || "Not set"}</div>
                                <div className="text-[10px] text-white/25">Open source motivation</div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5" delay={0.31}>
                        <div className="text-[9px] uppercase font-bold text-white/20 tracking-wider mb-3">Contribution Style</div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center border border-orange-500/10">
                                <Zap className="w-5 h-5 text-orange-400/80" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white/90">
                                    {contribs.length > 0 ? `${contribs.length} Area${contribs.length > 1 ? "s" : ""}` : "Not set"}
                                </div>
                                <div className="text-[10px] text-white/25">
                                    {contribs.length > 0
                                        ? contribs.map((t) => contribLabels[t] || t).join(" · ")
                                        : "Complete onboarding"}
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* ── Top Repos ──────────────────────────────── */}
                {ghStats && ghStats.topRepos.length > 0 && (
                    <GlassCard className="p-6" delay={0.35}>
                        <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                            <Star className="w-4 h-4 text-orange-400/70" /> Top Repositories
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {ghStats.topRepos.map((repo) => (
                                <a
                                    key={repo.name}
                                    href={repo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-orange-500/20 hover:bg-white/[0.04] transition-all duration-200"
                                >
                                    <div className="flex items-start justify-between mb-1.5">
                                        <span className="text-sm font-semibold text-white/80 group-hover:text-orange-300 transition truncate">
                                            {repo.name}
                                        </span>
                                        <ExternalLink className="w-3 h-3 text-white/10 group-hover:text-orange-400/50 transition shrink-0 mt-0.5" />
                                    </div>
                                    {repo.description && (
                                        <p className="text-[11px] text-white/25 line-clamp-2 mb-2.5">{repo.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 text-[11px] text-white/25">
                                        {repo.language && (
                                            <span className="inline-flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: languageColors[repo.language] || "#555" }} />
                                                {repo.language}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-0.5"><Star className="w-3 h-3" />{repo.stars}</span>
                                        <span className="inline-flex items-center gap-0.5"><GitFork className="w-3 h-3" />{repo.forks}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </GlassCard>
                )}
            </div>

            {/* Edit Modal */}
            <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} ghStats={ghStats} />
        </div>
    );
}

// ── Skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5 animate-pulse">
            <div className="h-32 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
                ))}
            </div>
            <div className="h-64 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
            <div className="h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
                ))}
            </div>
        </div>
    );
}
