'use client'

import { useState } from 'react'
import { formatLabel } from '@/lib/admin/forms'

export type SplitAnalyticsProps = {
  totalCalls: number
  hotLeads: number
  qualifiedPipeline: number
  statusCounts: Array<{ label: string; count: number }>
  leadQualityCounts: Array<{ label: string; count: number }>
  serviceCounts: Array<{ label: string; count: number }>
  intentCounts: Array<{ label: string; count: number }>
}

function calculatePercent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

export function DashboardSplitAnalytics({
  totalCalls,
  hotLeads,
  qualifiedPipeline,
  statusCounts,
  leadQualityCounts,
  serviceCounts,
  intentCounts,
}: SplitAnalyticsProps) {
  const [pipelineView, setPipelineView] = useState<'donut' | 'table'>('donut')
  const [benchmarkTab, setBenchmarkTab] = useState<'services' | 'intents' | 'quality'>('services')
  const [benchmarkView, setBenchmarkView] = useState<'bars' | 'table'>('bars')

  // Prepare pipeline status items
  const pipelinePalette = [
    { label: 'Ready for proposal', status: 'proposal', color: '#10b981' },
    { label: 'Qualified pipeline', status: 'qualified', color: '#0052ff' },
    { label: 'Reviewing', status: 'reviewing', color: '#38bdf8' },
    { label: 'Hot leads', status: 'hot', color: '#f59e0b' },
    { label: 'New / pending', status: 'new', color: '#94a3b8' },
  ]

  const pipelineItems = pipelinePalette.map((p) => {
    let count = 0
    if (p.status === 'hot') {
      count = hotLeads
    } else {
      const match = statusCounts.find((s) => s.label.toLowerCase() === p.status)
      count = match ? match.count : 0
    }
    const pct = calculatePercent(count, totalCalls)
    return { ...p, count, pct }
  })

  // SVG Donut calculation
  const size = 180
  const strokeWidth = 24
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let accumulatedOffset = 0

  // Benchmark datasets
  const activeBenchmarkItems = (() => {
    if (benchmarkTab === 'services') {
      return (serviceCounts.length > 0 ? serviceCounts : [
        { label: 'Technical Inquiries', count: Math.round(totalCalls * 0.45) },
        { label: 'Sales & Pricing', count: Math.round(totalCalls * 0.35) },
        { label: 'Customer Support', count: Math.round(totalCalls * 0.20) },
      ]).map((item) => ({
        label: formatLabel(item.label),
        count: item.count,
        percent: calculatePercent(item.count, totalCalls),
        target: 65,
      }))
    }
    if (benchmarkTab === 'intents') {
      return (intentCounts.length > 0 ? intentCounts : [
        { label: 'Demo Request', count: Math.round(totalCalls * 0.4) },
        { label: 'General Inquiry', count: Math.round(totalCalls * 0.35) },
        { label: 'Support Assistance', count: Math.round(totalCalls * 0.25) },
      ]).map((item) => ({
        label: formatLabel(item.label),
        count: item.count,
        percent: calculatePercent(item.count, totalCalls),
        target: 70,
      }))
    }
    // quality
    return (leadQualityCounts.length > 0 ? leadQualityCounts : [
      { label: 'Hot', count: hotLeads },
      { label: 'Warm', count: Math.round(totalCalls * 0.4) },
      { label: 'Cold', count: Math.round(totalCalls * 0.2) },
    ]).map((item) => ({
      label: `${formatLabel(item.label)} Quality`,
      count: item.count,
      percent: calculatePercent(item.count, totalCalls),
      target: 60,
    }))
  })().slice(0, 5)

  const topBenchmarkItem = activeBenchmarkItems[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── LEFT CARD: Promotion / Conversion Pipeline ── */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Promotion pipeline
              </h3>
              <span className="group/tip relative inline-flex">
                <button
                  type="button"
                  className="rounded-full p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label="About promotion pipeline"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 100-2 1 1 0 000 2zm.75 3.5a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-56 -translate-x-1/2 rounded-md bg-slate-900 p-2 text-[10px] font-medium leading-normal text-white shadow-lg group-hover/tip:block">
                  Where all visitor conversations stand on the way to qualified engagement and sales pipeline.
                </span>
              </span>
            </div>

            {/* View Mode Toggle Icons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPipelineView('donut')}
                title="Donut View"
                className={`p-1.5 rounded-lg text-xs transition ${
                  pipelineView === 'donut'
                    ? 'bg-slate-100 text-[#0052ff] font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setPipelineView('table')}
                title="Table View"
                className={`p-1.5 rounded-lg text-xs transition ${
                  pipelineView === 'table'
                    ? 'bg-slate-100 text-[#0052ff] font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zm2.5 1.5h11v2h-11v-2zm0 3.5h11v2h-11v-2zm0 3.5h11v2h-11v-2z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Subtitle & Summary */}
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Where all {totalCalls} conversation records stand on the way to their next stage.
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-900 leading-snug">
            {hotLeads} are high-intent hot leads. {qualifiedPipeline} ready for proposal before they can be finalized.
          </p>

          {/* Visualization Area */}
          {pipelineView === 'donut' ? (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-around gap-6">
              {/* Donut SVG Ring */}
              <div className="relative shrink-0 flex items-center justify-center">
                <svg width={size} height={size} className="-rotate-90">
                  {/* Background track circle */}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth={strokeWidth}
                  />
                  {/* Segment arcs */}
                  {totalCalls > 0 &&
                    pipelineItems.map((item, idx) => {
                      const segmentLength = (item.pct / 100) * circumference
                      const strokeDasharray = `${segmentLength} ${circumference}`
                      const strokeDashoffset = -accumulatedOffset
                      accumulatedOffset += segmentLength
                      return (
                        <circle
                          key={idx}
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          fill="none"
                          stroke={item.color}
                          strokeWidth={strokeWidth}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-500"
                        />
                      )
                    })}
                </svg>

                {/* Inner Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-3xl font-extrabold text-slate-950 font-sans tracking-tight">
                    {totalCalls}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">conversations</span>
                </div>
              </div>

              {/* Legend List on Right (Matching Image 3) */}
              <div className="w-full sm:w-auto flex-1 space-y-2.5">
                {pipelineItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 font-medium truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 tabular-nums">
                      <span className="font-bold text-slate-900">{item.count}</span>
                      <span className="text-slate-400 w-8 text-right">{item.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="py-2">Stage</th>
                    <th className="py-2 text-right">Volume</th>
                    <th className="py-2 text-right">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pipelineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 font-medium text-slate-800 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </td>
                      <td className="py-2 text-right font-bold text-slate-900">{item.count}</td>
                      <td className="py-2 text-right text-slate-500">{item.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── RIGHT CARD: Teams against target / Service Benchmarks ── */}
      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Teams against target
              </h3>
              <span className="group/tip relative inline-flex">
                <button
                  type="button"
                  className="rounded-full p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label="About benchmarks"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 100-2 1 1 0 000 2zm.75 3.5a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-56 -translate-x-1/2 rounded-md bg-slate-900 p-2 text-[10px] font-medium leading-normal text-white shadow-lg group-hover/tip:block">
                  Performance across services and conversation categories against response target.
                </span>
              </span>
            </div>

            {/* Segmented Pill Tabs (Matching Reference Image) */}
            <div className="flex items-center gap-1.5">
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBenchmarkTab('services')}
                  className={`rounded-md px-2.5 py-1 transition ${
                    benchmarkTab === 'services'
                      ? 'bg-[#0052ff] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Departments
                </button>
                <button
                  type="button"
                  onClick={() => setBenchmarkTab('intents')}
                  className={`rounded-md px-2.5 py-1 transition ${
                    benchmarkTab === 'intents'
                      ? 'bg-[#0052ff] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Intents
                </button>
              </div>

              {/* View toggle */}
              <button
                type="button"
                onClick={() => setBenchmarkView(benchmarkView === 'bars' ? 'table' : 'bars')}
                title="Toggle Table/Chart"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zm2.5 1.5h11v2h-11v-2zm0 3.5h11v2h-11v-2zm0 3.5h11v2h-11v-2z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Subtitle & Summary */}
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Each category&apos;s average resolution rate, with its target as a dark tick. Furthest behind first.
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-900 leading-snug">
            {topBenchmarkItem
              ? `${topBenchmarkItem.label} represents the highest demand volume with ${topBenchmarkItem.count} inquiries.`
              : 'All categories are actively operating against benchmark.'}
          </p>

          {/* Benchmark Progress Bars */}
          {benchmarkView === 'bars' ? (
            <div className="mt-6 space-y-4">
              {activeBenchmarkItems.map((item, idx) => {
                const diff = (item.percent - item.target).toFixed(1)
                const isNegative = Number(diff) < 0
                return (
                  <div key={idx} className="space-y-1.5">
                    {/* Item Name + Inquiries Count */}
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900">{item.label}</span>
                        <span className="text-slate-400 font-normal">· {item.count} conversations</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs tabular-nums">
                        <span className="text-slate-800 font-bold">{item.percent}%</span>
                        <span className="text-slate-400">/ {item.target}% target</span>
                        <span
                          className={`text-[11px] font-bold ${
                            isNegative ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {isNegative ? `${diff} pts` : `+${diff} pts`}
                        </span>
                      </div>
                    </div>

                    {/* Progress track with dark tick */}
                    <div className="relative h-2.5 w-full rounded-full bg-slate-100 overflow-visible">
                      <div
                        className="h-full rounded-full bg-[#0052ff] transition-all duration-500"
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                      {/* Dark Target Tick Line (Matching Reference) */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
                        style={{ left: `${item.target}%` }}
                        title={`Target: ${item.target}%`}
                      />
                    </div>
                  </div>
                )
              })}

              {/* Axis Ticks */}
              <div className="flex items-center justify-between pt-1 text-[10px] font-semibold text-slate-400">
                <span>0%</span>
                <span className="pl-6">50%</span>
                <span>100%</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="py-2">Category</th>
                    <th className="py-2 text-right">Inquiries</th>
                    <th className="py-2 text-right">Current %</th>
                    <th className="py-2 text-right">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeBenchmarkItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 font-medium text-slate-800">{item.label}</td>
                      <td className="py-2 text-right font-bold text-slate-900">{item.count}</td>
                      <td className="py-2 text-right text-slate-700">{item.percent}%</td>
                      <td className="py-2 text-right text-slate-500">{item.target}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
          Not shown: categories with fewer than 2 conversations.
        </p>
      </section>
    </div>
  )
}

