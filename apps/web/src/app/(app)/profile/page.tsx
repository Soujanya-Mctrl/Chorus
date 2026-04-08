"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, GitPullRequest, Star, Code, GitMerge, Settings, MapPin, Link as LinkIcon, Building2 } from "lucide-react";

interface StatItem {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

interface ProfileData {
    username: string;
    name: string;
    avatar: string;
    avatarUrl?: string;
    contributions: number;
    mergedPRs: number;
    repos: number;
    stars: number;
    stats: StatItem[];
}

const MOCK_PROFILE: ProfileData = {
    username: "guest",
    name: "Guest User",
    avatar: "GU",
    contributions: 0,
    mergedPRs: 0,
    repos: 0,
    stars: 0,
    stats: [],
};

function buildProfileFromApi(data: any): ProfileData {
    const sp = data.skillProfile;
    const totalContributions = sp?.contributionCount ?? 0;
    const totalRepos = sp?.totalRepos ?? 0;
    const totalStars = sp?.totalStars ?? 0;

    return {
        username: data.username || "user",
        name: data.name || data.username || "User",
        avatar: (data.name || data.username || "U").slice(0, 2).toUpperCase(),
        avatarUrl: data.avatarUrl,
        contributions: totalContributions,
        mergedPRs: 0, // Placeholder
        repos: totalRepos,
        stars: totalStars,
        stats: [
            { label: "Contributions", value: String(totalContributions), icon: GitMerge, color: "text-green-400" },
            { label: "Stars", value: String(totalStars), icon: Star, color: "text-purple-400" },
            { label: "Repos", value: String(totalRepos), icon: Code, color: "text-cyan-400" },
            { label: "PRs Merged", value: "0", icon: GitPullRequest, color: "text-blue-400" },
        ],
    };
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProfile() {
            try {
                const res = await fetch("http://localhost:3001/api/user/profile", {
                    credentials: "include",
                });
                if (res.ok) {
                    const data = await res.json();
                    setProfile(buildProfileFromApi(data));
                } else {
                    setProfile(MOCK_PROFILE);
                }
            } catch {
                setProfile(MOCK_PROFILE);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, []);

    if (loading || !profile) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Profile Header Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:shadow-[0_0_30px_rgba(249,115,22,0.05)] transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-slate-900/20">
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full rounded-2xl object-cover" />
                                ) : (
                                    profile.avatar
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                                    <span className="text-slate-500">@{profile.username}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                                        <Building2 className="w-4 h-4 text-slate-500" />
                                        <span>Independent</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                                        <MapPin className="w-4 h-4 text-slate-500" />
                                        <span>Earth</span>
                                    </div>
                                </div>
                            </div>

                            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white transition-colors border border-white/10">
                                <Settings className="w-4 h-4" /> Edit Profile
                            </button>
                        </div>
                    </Card>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8"
                >
                    {profile.stats.map(({ label, value, icon: Icon, color }: StatItem, i: number) => (
                        <Card
                            key={label}
                            className="bg-[#121212] border-white/5 p-4 text-center hover:border-orange-500/20 hover:-translate-y-1 transition duration-300"
                        >
                            <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
                            <div className={`text-xl font-black ${color}`}>{value}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                        </Card>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
