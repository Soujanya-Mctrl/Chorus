"use client";
import { Button } from "@/components/ui/button";
import { Flame, Bell, Target, Github } from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function TopNavbar() {
    const { isLoaded, isSignedIn, user } = useUser();

    // Default mock stats until backend connection is fully restored
    const contributionCount = 0;
    const totalRepos = 0;

    return (
        <nav className="h-14 border-b border-white/5 bg-[#0a0a0a]/20 backdrop-blur-2xl sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6">
            {/* Left side: Platform Metrics — hide on small screens, show partially on md */}
            <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
                {/* Spacer for hamburger button on mobile */}
                <div className="w-9 lg:hidden" />

                {/* Contributions stat — hidden on mobile */}
                <div className="hidden md:flex items-center gap-2 lg:gap-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Flame className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-400" />
                    </div>
                    <div>
                        <div className="text-[9px] lg:text-[10px] uppercase font-bold text-slate-500 tracking-wider">Contributions</div>
                        <div className="text-xs lg:text-sm font-black text-white">
                            {isSignedIn ? contributionCount.toLocaleString() : "--"}
                        </div>
                    </div>
                </div>

                {/* Repositories stat — hidden on mobile */}
                <div className="hidden md:flex items-center gap-2 lg:gap-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                        <Target className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-yellow-400" />
                    </div>
                    <div>
                        <div className="text-[9px] lg:text-[10px] uppercase font-bold text-slate-500 tracking-wider">Repositories</div>
                        <div className="text-xs lg:text-sm font-black text-white">
                            {isSignedIn ? totalRepos.toLocaleString() : "--"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side: User State */}
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
                {isSignedIn ? (
                    <>
                        {/* Notifications */}
                        <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
                            <Bell className="w-4 h-4" />
                        </button>

                        {/* Profile Section */}
                        <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-white/5">
                            <UserButton 
                                appearance={{ 
                                    elements: { 
                                        userButtonAvatarBox: "w-7 h-7 lg:w-8 lg:h-8 border border-white/10",
                                    } 
                                }}
                            />
                            <div className="hidden md:flex flex-col">
                                <span className="text-xs lg:text-sm font-semibold text-white leading-tight">
                                    {user?.username || user?.firstName || "Developer"}
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
                            <Bell className="w-4 h-4" />
                        </button>
                        <Button
                            variant="default"
                            size="sm"
                            className="gap-2"
                            disabled={!isLoaded}
                            asChild
                        >
                            {isLoaded ? (
                                <Link href="/sign-in">
                                    <Github className="w-4 h-4" />
                                    <span className="hidden sm:inline">Connect GitHub</span>
                                </Link>
                            ) : (
                                <div>
                                    <span className="hidden sm:inline">Checking...</span>
                                </div>
                            )}
                        </Button>
                    </>
                )}
            </div>
        </nav>
    );
}
