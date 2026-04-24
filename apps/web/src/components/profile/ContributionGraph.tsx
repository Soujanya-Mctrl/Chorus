"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface ContributionDay {
    date: string;
    count: number;
    level: number; // 0-4
}

interface ContributionData {
    total: Record<string, number>;
    contributions: ContributionDay[];
}

const LEVEL_COLORS = [
    "rgba(255,255,255,0.04)",  // level 0
    "rgba(234,136,18,0.25)",   // level 1
    "rgba(234,136,18,0.45)",   // level 2
    "rgba(234,136,18,0.65)",   // level 3
    "rgba(245,158,11,0.9)",    // level 4
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
    username: string;
    joinYear?: number; // GitHub join year to determine available tabs
}

export default function ContributionGraph({ username, joinYear }: Props) {
    const currentYear = new Date().getFullYear();
    const startYear = joinYear || currentYear - 4;
    const availableYears = useMemo(() => {
        const years: (number | "last")[] = ["last"];
        for (let y = currentYear; y >= startYear; y--) {
            years.push(y);
        }
        return years;
    }, [currentYear, startYear]);

    const [selectedYear, setSelectedYear] = useState<number | "last">("last");
    const [data, setData] = useState<ContributionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [tooltip, setTooltip] = useState<{ day: ContributionDay } | null>(null);

    const fetchData = useCallback((year: number | "last") => {
        if (!username) return;

        setLoading(true);
        setError(false);

        fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=${year}`)
            .then((res) => {
                if (!res.ok) throw new Error("API error");
                return res.json();
            })
            .then((json) => {
                setData(json);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [username]);

    useEffect(() => {
        fetchData(selectedYear);
    }, [selectedYear, fetchData]);

    const { weeks, monthLabels, totalContributions } = useMemo(() => {
        if (!data?.contributions?.length) return { weeks: [], monthLabels: [], totalContributions: 0 };

        const sorted = [...data.contributions].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const weeksArr: ContributionDay[][] = [];
        let currentWeek: ContributionDay[] = [];

        const firstDay = new Date(sorted[0].date).getDay();
        for (let i = 0; i < firstDay; i++) {
            currentWeek.push({ date: "", count: 0, level: 0 });
        }

        for (const day of sorted) {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weeksArr.push(currentWeek);
                currentWeek = [];
            }
        }
        if (currentWeek.length > 0) {
            weeksArr.push(currentWeek);
        }

        const labels: { label: string; weekIndex: number }[] = [];
        let lastMonth = -1;
        for (let w = 0; w < weeksArr.length; w++) {
            const firstValidDay = weeksArr[w].find((d) => d.date);
            if (!firstValidDay) continue;
            const month = new Date(firstValidDay.date).getMonth();
            if (month !== lastMonth) {
                labels.push({ label: MONTHS[month], weekIndex: w });
                lastMonth = month;
            }
        }

        const total = sorted.reduce((sum, d) => sum + d.count, 0);
        return { weeks: weeksArr, monthLabels: labels, totalContributions: total };
    }, [data]);

    const CELL = 11;
    const GAP = 2;
    const STEP = CELL + GAP;
    const DAY_LABEL_W = 28;
    const MONTH_LABEL_H = 16;
    const svgWidth = DAY_LABEL_W + Math.max(weeks.length, 1) * STEP;
    const svgHeight = MONTH_LABEL_H + 7 * STEP;

    return (
        <div className="space-y-3">
            {/* Summary + Year tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-white/40">
                    <span className="font-bold text-white">{totalContributions.toLocaleString()}</span>{" "}
                    contributions{selectedYear === "last" ? " in the last year" : ` in ${selectedYear}`}
                </p>

                {/* Tooltip info */}
                {tooltip && (
                    <p className="text-xs text-white/30 hidden sm:block">
                        <span className="font-semibold text-white">{tooltip.day.count}</span>{" "}
                        on{" "}
                        {new Date(tooltip.day.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        })}
                    </p>
                )}
            </div>

            {/* SVG Graph */}
            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                </div>
            ) : error || !data ? (
                <div className="text-center py-6">
                    <p className="text-sm text-slate-500">Could not load contribution graph</p>
                </div>
            ) : (
                <div className="w-full rounded-lg">
                    <svg
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        width="100%"
                        height="auto"
                        className="block"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        {/* Month labels */}
                        {monthLabels.map((m, i) => (
                            <text
                                key={i}
                                x={DAY_LABEL_W + m.weekIndex * STEP}
                                y={10}
                                className="fill-white/20"
                                fontSize="9"
                                fontFamily="system-ui, sans-serif"
                            >
                                {m.label}
                            </text>
                        ))}

                        {/* Day labels */}
                        {["Mon", "Wed", "Fri"].map((d) => {
                            const row = d === "Mon" ? 1 : d === "Wed" ? 3 : 5;
                            return (
                                <text
                                    key={d}
                                    x={DAY_LABEL_W - 4}
                                    y={MONTH_LABEL_H + row * STEP + CELL - 2}
                                    className="fill-white/20"
                                    fontSize="9"
                                    fontFamily="system-ui, sans-serif"
                                    textAnchor="end"
                                >
                                    {d}
                                </text>
                            );
                        })}

                        {/* Cells */}
                        {weeks.map((week, wi) =>
                            week.map((day, di) => {
                                if (!day.date) return null;
                                return (
                                    <rect
                                        key={`${wi}-${di}`}
                                        x={DAY_LABEL_W + wi * STEP}
                                        y={MONTH_LABEL_H + di * STEP}
                                        width={CELL}
                                        height={CELL}
                                        rx={2}
                                        fill={LEVEL_COLORS[day.level]}
                                        stroke={tooltip?.day.date === day.date ? "rgba(255,255,255,0.3)" : "none"}
                                        strokeWidth={1}
                                        className="cursor-pointer transition-colors duration-75"
                                        onMouseEnter={() => setTooltip({ day })}
                                        onMouseLeave={() => setTooltip(null)}
                                    />
                                );
                            })
                        )}
                    </svg>
                </div>
            )}

            {/* Bottom row: Legend + Year tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                {/* Legend */}
                <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20 mr-1">Less</span>
                    {LEVEL_COLORS.map((color, i) => (
                        <div
                            key={i}
                            className="rounded-[2px]"
                            style={{ width: 11, height: 11, backgroundColor: color }}
                        />
                    ))}
                    <span className="text-[9px] text-white/20 ml-1">More</span>
                </div>

                {/* Year tabs */}
                <div className="flex items-center gap-1">
                    {availableYears.map((year) => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-150 ${
                                selectedYear === year
                                    ? "bg-orange-500/15 text-orange-300 border border-orange-500/25"
                                    : "text-white/25 hover:text-white/50 hover:bg-white/[0.04] border border-transparent"
                            }`}
                        >
                            {year === "last" ? "1Y" : year}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
