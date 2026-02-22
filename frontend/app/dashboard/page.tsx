"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Lightbulb,
  ArrowRight,
  Link2,
  RefreshCw,
  AlertCircle,
  Send,
  CalendarDays,
  X,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Insight {
  insight: string;
  action_to_take: string;
  source: string;
  url: string;
  scraped_at?: string; // ISO-8601 / mongo date string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a date as a human-readable day label: "Today", "Yesterday", or "Mon, 22 Feb 2026" */
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** YYYY-MM-DD key for grouping */
function dayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

/** Group insights by calendar day, sorted newest-first */
function groupByDay(insights: Insight[]): { label: string; key: string; items: Insight[] }[] {
  const map = new Map<string, Insight[]>();
  for (const ins of insights) {
    const key = ins.scraped_at ? dayKey(ins.scraped_at) : "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ins);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest day first
    .map(([key, items]) => ({
      key,
      label: key === "unknown" ? "Unknown date" : dayLabel(items[0].scraped_at!),
      items,
    }));
}

// ── Insight Card ─────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20">
          <Lightbulb className="h-4 w-4 text-indigo-400" />
        </div>
        <p className="font-semibold leading-snug text-white">{insight.insight}</p>
      </div>

      <div className="flex items-start gap-3 pl-10">
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p className="text-sm leading-relaxed text-slate-400">{insight.action_to_take}</p>
      </div>

      <div className="flex items-center gap-2 pl-10">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-600" />
        <a
          href={insight.source}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-xs text-slate-500 underline-offset-2 transition-colors hover:text-indigo-400 hover:underline"
          title={insight.source}
        >
          {insight.source}
        </a>
      </div>
    </div>
  );
}

// ── Day Divider ───────────────────────────────────────────────────────────────

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <div className="flex-1 border-t border-white/8" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [url, setUrl] = useState("");
  const [refineStatus, setRefineStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [refineError, setRefineError] = useState<string | null>(null);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsStatus, setInsightsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Date filter state — "all" or a YYYY-MM-DD string
  const [selectedDay, setSelectedDay] = useState<string>("all");

  // ── Fetch insights ──────────────────────────────────────────────────────────
  const fetchInsights = useCallback(async () => {
    setInsightsStatus("loading");
    setInsightsError(null);
    try {
      const res = await fetch("http://localhost:8080/insights");
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data: Insight[] = await res.json();
      // Sort newest scraped_at first
      data.sort((a, b) => {
        if (!a.scraped_at && !b.scraped_at) return 0;
        if (!a.scraped_at) return 1;
        if (!b.scraped_at) return -1;
        return new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime();
      });
      setInsights(data);
      setInsightsStatus("idle");
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Failed to fetch insights.");
      setInsightsStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // ── Refine article ──────────────────────────────────────────────────────────
  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setRefineStatus("loading");
    setRefineError(null);
    try {
      const res = await fetch("http://localhost:8080/upload-substack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      setRefineStatus("success");
      setUrl("");
      setTimeout(fetchInsights, 800);
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : "Something went wrong.");
      setRefineStatus("error");
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  /** All unique days available for the filter dropdown */
  const availableDays = useMemo(() => {
    const keys = new Set(insights.map((i) => (i.scraped_at ? dayKey(i.scraped_at) : "unknown")));
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [insights]);

  /** Insights filtered by the selected day */
  const filtered = useMemo(() => {
    if (selectedDay === "all") return insights;
    return insights.filter((i) =>
      i.scraped_at ? dayKey(i.scraped_at) === selectedDay : selectedDay === "unknown"
    );
  }, [insights, selectedDay]);

  /** Grouped by day for rendering */
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 py-12 text-white">
      <div className="mx-auto max-w-5xl space-y-12">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">Daily Bytes</h1>
          <p className="text-sm text-slate-500">Turn Substack articles into actionable insights.</p>
        </div>

        {/* ── URL Input ──────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-slate-400">
            Refine an Article
          </h2>
          <form onSubmit={handleRefine} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="url"
                placeholder="https://your-substack-article.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (refineStatus === "error" || refineStatus === "success") setRefineStatus("idle");
                }}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none ring-0 transition focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <button
              type="submit"
              disabled={refineStatus === "loading"}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {refineStatus === "loading" ? "Refining…" : "Refine Article"}
            </button>
          </form>

          {refineStatus === "success" && (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Article submitted successfully! Insights will refresh shortly.
            </p>
          )}
          {refineStatus === "error" && (
            <p className="mt-3 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {refineError}
            </p>
          )}
        </section>

        {/* ── Insights ───────────────────────────────────────────────────── */}
        <section className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">
              Insights
            </h2>
            <div className="flex items-center gap-2">
              {/* Date filter */}
              {availableDays.length > 0 && (
                <div className="relative flex items-center gap-2">
                  <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="appearance-none rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-8 text-xs text-slate-300 outline-none transition focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="all">All dates</option>
                    {availableDays.map((d) => (
                      <option key={d} value={d}>
                        {d === "unknown" ? "Unknown date" : dayLabel(insights.find((i) => i.scraped_at && dayKey(i.scraped_at) === d)?.scraped_at ?? d)}
                      </option>
                    ))}
                  </select>
                  {selectedDay !== "all" && (
                    <button
                      onClick={() => setSelectedDay("all")}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
                      title="Clear filter"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Refresh */}
              <button
                onClick={fetchInsights}
                disabled={insightsStatus === "loading"}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-500 transition hover:bg-white/5 hover:text-slate-300 disabled:opacity-40"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${insightsStatus === "loading" ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Loading skeleton */}
          {insightsStatus === "loading" && insights.length === 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              ))}
            </div>
          )}

          {/* Error state */}
          {insightsStatus === "error" && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 py-12 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-red-400">{insightsError}</p>
              <button
                onClick={fetchInsights}
                className="mt-1 rounded-lg border border-red-500/30 px-4 py-2 text-xs text-red-400 transition hover:bg-red-500/10"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {insightsStatus === "idle" && insights.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
              <Lightbulb className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-500">No insights yet. Submit an article above to get started.</p>
            </div>
          )}

          {/* No results for selected filter */}
          {insightsStatus === "idle" && insights.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-12 text-center">
              <CalendarDays className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-500">No insights for this date.</p>
              <button onClick={() => setSelectedDay("all")} className="text-xs text-indigo-400 hover:underline">
                Clear filter
              </button>
            </div>
          )}

          {/* Grouped insights */}
          {groups.length > 0 && (
            <div className="space-y-8">
              {groups.map((group) => (
                <div key={group.key} className="space-y-4">
                  <DayDivider label={group.label} />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((item, idx) => (
                      <InsightCard key={idx} insight={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
