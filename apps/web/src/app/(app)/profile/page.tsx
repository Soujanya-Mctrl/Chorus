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



import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
    const { isLoaded, isSignedIn, user } = useUser();

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h2 className="text-xl font-bold text-white mb-2">Connect to view profile</h2>
                <p className="text-slate-400 text-sm mb-6 max-w-sm">
                    Sign in with GitHub to view your developer profile, contributions, and stats.
                </p>
                <Button asChild className="gap-2">
                    <Link href="/sign-in">
                        Connect GitHub
                    </Link>
                </Button>
            </div>
        );
    }

    // Default placeholder stats while backend is disconnected
    const stats: StatItem[] = [
        { label: "Contributions", value: "0", icon: GitMerge, color: "text-green-400" },
        { label: "Stars", value: "0", icon: Star, color: "text-purple-400" },
        { label: "Repos", value: "0", icon: Code, color: "text-cyan-400" },
        { label: "PRs Merged", value: "0", icon: GitPullRequest, color: "text-blue-400" },
    ];

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
                                {user.imageUrl ? (
                                    <img src={user.imageUrl} alt={user.fullName || user.username || "User"} className="w-full h-full rounded-2xl object-cover" />
                                ) : (
                                    (user.fullName || user.username || "U").slice(0, 2).toUpperCase()
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <h1 className="text-2xl font-bold text-white">{user.fullName || user.username || "Developer"}</h1>
                                    <span className="text-slate-500">@{user.username || "user"}</span>
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
                    {stats.map(({ label, value, icon: Icon, color }: StatItem, i: number) => (
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
