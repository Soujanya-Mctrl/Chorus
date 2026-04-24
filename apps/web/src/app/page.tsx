"use client";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  Zap,
  Star,
  GitPullRequest,
  Target,
  Brain,
  TrendingUp,
  Rocket,
  Github,
} from "lucide-react";
import Link from "next/link";

import type { Variants } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

const handleGithubLogin = () => {
  window.location.href = "/sign-in";
};

const handleGithubSignUp = () => {
  window.location.href = "/sign-up";
};

const problems = [
  {
    icon: Target,
    title: "Where do I start?",
    desc: "Finding beginner-friendly issues in large repos is frustrating and time-consuming.",
  },
  {
    icon: Brain,
    title: "No feedback loop",
    desc: "Contributions feel invisible. Large codebases are difficult to navigate without clear insight.",
  },
  {
    icon: TrendingUp,
    title: "No direction",
    desc: "Without guidance, contributors jump between projects with no clear path forward.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Connect GitHub",
    desc: "Sign in with your GitHub account. We analyze your repos and activity to understand your skill level.",
  },
  {
    step: "02",
    title: "Get Matched",
    desc: "AI surfaces the best issues for your skill level — no more scrolling through thousands of repos.",
  },
  {
    step: "03",
    title: "Analyze Issues",
    desc: "Our RAG pipeline analyzes issues, calculates their exact difficulty, and points out the key files you need to look at.",
  },
  {
    step: "04",
    title: "Make an Impact",
    desc: "Successfully land PRs in challenging repositories and build an open-source portfolio that speaks for itself.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/projects");
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) {
    return null;
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen overflow-x-hidden">
      {/* STANDALONE NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[6px] bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-md shadow-orange-500/20">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">
              Chorus
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <a href="#how-it-works" className="text-xs text-slate-400 hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#" className="text-xs text-slate-400 hover:text-white transition-colors">
              Docs
            </a>
            <a href="#community" className="text-xs text-slate-400 hover:text-white transition-colors">
              Community
            </a>
          </div>

          <Button
            size="sm"
            className="gap-2"
            asChild
          >
            <Link href="/sign-in">
              <Github className="w-4 h-4" />
              Connect GitHub
            </Link>
          </Button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-24 pb-14 sm:pt-24 sm:pb-16">
        {/* Animated gradient blob */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[220px] sm:w-[400px] sm:h-[300px] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.2) 0%, rgba(249,115,22,0.05) 50%, transparent 70%)' }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="flex flex-col items-center"
          >
            <Badge className="mb-5 bg-orange-500/[0.12] text-orange-400 border-orange-500/40 hover:bg-orange-500/20 text-xs px-3 py-1 font-medium rounded-[3px]">
              <Rocket className="w-3 h-3 mr-1.5 text-orange-400" />
              Open source, reimagined
            </Badge>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] mb-4 sm:mb-5 tracking-tight px-1"
          >
            Your open source journey,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              simplified.
            </span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto mb-8 sm:mb-10 leading-relaxed px-2"
          >
            Connect your GitHub, discover projects matched to your skill level,
            find the perfect issues, and dramatically accelerate your workflow.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-sm sm:max-w-none mx-auto"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 text-sm font-semibold gap-2"
              asChild
            >
              <Link href="/sign-up">
                <Github className="w-4 h-4" />
                Get Started — It&apos;s Free
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-6 text-sm border-white/35 text-white bg-white/5 hover:bg-white/10 hover:border-white/60"
              asChild
            >
              <a href="#how-it-works">
                See How It Works <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section className="py-14 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8 sm:mb-10"
          >
            <Badge className="mb-3 bg-orange-500/10 text-orange-400 border-orange-500/20 rounded-[3px] text-xs">
              The Problem
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Open source is{" "}
              <span className="text-orange-400">broken for beginners</span>
            </h2>
            <p className="text-slate-300 text-sm max-w-md mx-auto px-2">
              Most developers want to contribute, but the experience is overwhelming, unstructured, and directionless.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {problems.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Card className="bg-[#111] border-white/5 p-5 sm:p-6 h-full hover:border-orange-500/20 duration-200 transition-all rounded-[6px]">
                  <div className="w-10 h-10 rounded-[4px] bg-orange-500/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-orange-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-14 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-10"
          >
            <Badge className="mb-3 bg-orange-500/10 text-orange-400 border-orange-500/20 rounded-[3px] text-xs">
              How It Works
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Four steps to{" "}
              <span className="text-orange-400">making an impact</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {howItWorks.map(({ step, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Card className="bg-[#111] border-white/5 p-5 sm:p-6 h-full hover:border-orange-500/20 duration-200 transition-all rounded-[6px]">
                  <div className="text-4xl font-black text-orange-500/15 mb-4 leading-none">{step}</div>
                  <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-14 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-[6px] bg-[#111] border border-orange-500/15 p-6 sm:p-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Ready to accelerate your{" "}
              <span className="text-orange-400">journey?</span>
            </h2>
            <p className="text-slate-300 text-sm mb-6 sm:mb-8 max-w-md mx-auto px-1">
              Join 12,400+ developers who are seamlessly discovering and landing impactful PRs. Connect your GitHub and start in under a minute.
            </p>
            <Button
              size="lg"
              className="w-full sm:w-auto px-10 text-sm font-semibold gap-2"
              asChild
            >
              <Link href="/sign-up">
                <Github className="w-4 h-4" />
                Connect GitHub & Start
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pt-16 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-[3px] bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-bold text-white">
                  Chorus
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Simplify your open source journey. Discover, analyze, and make an impact.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">Platform</h4>
              <ul className="space-y-2">
                <li><a href="#how-it-works" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">How It Works</a></li>
                <li><a href="#community" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">GitHub</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="text-[11px] text-slate-600">© 2025 Chorus. Built for developers, by developers.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">Privacy</a>
              <a href="#" className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
