'use client'

import { useId, useState, type CSSProperties } from 'react'

export type ChartDatum = { label: string; value: number; color: string }

function toPercent(value: number, total: number): number {
  return total > 0 ? Math.max(0, (value / total) * 100) : 0
}

function ChartInfoButton({
  title,
  infoText,
}: {
  title: string
  infoText: string
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipId = useId()

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`More information about ${title}`}
        aria-describedby={showTooltip ? tooltipId : undefined}
        aria-expanded={showTooltip}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(true)}
        className="rounded-full p-1 text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0052ff]/30"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>
      {showTooltip && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium leading-5 text-white shadow-xl"
        >
          {infoText}
        </span>
      )}
    </span>
  )
}

function ChartViewToggle({
  title,
  isTableView,
  onToggleView,
}: {
  title: string
  isTableView: boolean
  onToggleView: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggleView}
      title={isTableView ? 'Show chart' : 'Show data table'}
      aria-label={isTableView ? `Show chart for ${title}` : `Show data table for ${title}`}
      aria-pressed={isTableView}
      className={`shrink-0 rounded-lg border p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0052ff]/30 ${
        isTableView
          ? 'border-[#0052ff] bg-[#0052ff]/10 text-[#0052ff]'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {isTableView ? (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 17 9 11 13 15 21 7" />
          <polyline points="15 7 21 7 21 13" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      )}
    </button>
  )
}

export function GlossyDonutChart({
  title,
  subtitle,
  items,
  total,
  size = 200,
  unit = 'records',
  centerValue,
  infoTooltip,
  showInsight = true,
  insightText,
  className = '',
}: {
  title: string
  subtitle?: string
  items: ChartDatum[]
  total?: number
  size?: number
  unit?: string
  centerValue?: string | number
  infoTooltip?: string
  showInsight?: boolean
  insightText?: string
  className?: string
}) {
  const chartId = useId().replace(/[:]/g, '')
  const [isTableView, setIsTableView] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const positiveItems = items.filter((item) => item.value > 0)
  const effectiveTotal = total ?? items.reduce((sum, item) => sum + item.value, 0)
  const denominator = positiveItems.reduce((sum, item) => sum + item.value, 0) || 1

  // Find largest item for analytical insight banner
  const largestItem = positiveItems.length > 0
    ? positiveItems.reduce((max, it) => (it.value > max.value ? it : max), positiveItems[0])
    : null

  // SVG Geometry
  const viewBoxSize = 220
  const center = viewBoxSize / 2 // 110
  const radius = 72
  const strokeWidth = 28
  const circumference = 2 * Math.PI * radius // ~452.389
  const gap = positiveItems.length > 1 ? 5 : 0

  // Calculate segment arcs
  let accumulatedOffset = 0
  const segments = positiveItems.map((item, index) => {
    const fraction = item.value / denominator
    const arcLength = fraction * circumference
    const visibleLength = Math.max(0, arcLength - gap)
    const dashArray = `${visibleLength} ${circumference - visibleLength}`
    const dashOffset = -accumulatedOffset - gap / 2
    accumulatedOffset += arcLength
    return {
      ...item,
      index,
      fraction,
      arcLength,
      dashArray,
      dashOffset,
      percent: Math.round(toPercent(item.value, effectiveTotal)),
    }
  })

  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold tracking-tight text-slate-950">{title}</h3>
            <ChartInfoButton title={title} infoText={infoTooltip || subtitle || `Details about the ${title} chart.`} />
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <ChartViewToggle
          title={title}
          isTableView={isTableView}
          onToggleView={() => setIsTableView((prev) => !prev)}
        />
      </div>

      {/* Analytical Insight Banner (Image 2 style) */}
      {showInsight && largestItem && (
        <div className="mt-2.5 text-xs text-slate-700">
          {insightText ? (
            <p>{insightText}</p>
          ) : (
            <p>
              <strong className="font-semibold text-slate-950">{largestItem.label}</strong> is the largest group:{' '}
              <strong className="font-semibold text-slate-950">
                {largestItem.value} of {effectiveTotal}
              </strong>{' '}
              {unit} (<strong className="font-semibold text-slate-950">{Math.round(toPercent(largestItem.value, effectiveTotal))}%</strong>).
            </p>
          )}
        </div>
      )}

      {/* Main Content: 3D Donut Chart or Accessible Data Table */}
      {isTableView ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Count</th>
                <th className="py-2.5 px-3 text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length ? items.map((item) => (
                <tr key={item.label} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2 px-3 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-slate-800">{item.label}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-slate-900 tabular-nums">{item.value}</td>
                  <td className="py-2 px-3 text-right text-slate-500 tabular-nums">{Math.round(toPercent(item.value, effectiveTotal))}%</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="px-3 py-5 text-center text-slate-500">No data available.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900">
              <tr>
                <td className="py-2 px-3">Total</td>
                <td className="py-2 px-3 text-right tabular-nums">{effectiveTotal}</td>
                <td className="py-2 px-3 text-right tabular-nums">{effectiveTotal > 0 ? '100%' : '0%'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="mt-5 grid items-center gap-6 sm:grid-cols-[minmax(160px,1fr)_1.25fr]">
          <div className="glossy-donut-scene" style={{ width: size, height: size }}>
            {/* SVG Gradients Definition */}
            <svg width="0" height="0" className="absolute">
              <defs>
                {/* Individual segment gradients */}
                {segments.map((seg) => (
                  <linearGradient
                    key={`grad-${seg.index}`}
                    id={`slice-grad-${chartId}-${seg.index}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={`color-mix(in srgb, ${seg.color} 75%, #ffffff)`} />
                    <stop offset="45%" stopColor={seg.color} />
                    <stop offset="100%" stopColor={`color-mix(in srgb, ${seg.color} 65%, #091322)`} />
                  </linearGradient>
                ))}
              </defs>
            </svg>

            <div
              className="glossy-donut glossy-donut-face"
              role="img"
              aria-label={`${title}: ${positiveItems.map((item) => `${item.label} ${item.value}`).join(', ') || 'No data'}`}
            >
              <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="h-full w-full">
                <g transform={`rotate(-90 ${center} ${center})`}>
                  {segments.length > 0 ? (
                    segments.map((seg) => {
                      const isHovered = hoveredIndex === seg.index
                      return (
                        <circle
                          key={`face-${seg.index}`}
                          cx={center}
                          cy={center}
                          r={radius}
                          fill="none"
                          stroke={`url(#slice-grad-${chartId}-${seg.index})`}
                          strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                          strokeDasharray={seg.dashArray}
                          strokeDashoffset={seg.dashOffset}
                          className="transition-all duration-200 cursor-pointer"
                          style={{
                            filter: isHovered
                              ? `drop-shadow(0 0 10px ${seg.color})`
                              : 'drop-shadow(0 2px 4px rgba(15,23,42,0.18))',
                          }}
                          onMouseEnter={() => setHoveredIndex(seg.index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        />
                      )
                    })
                  ) : (
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth={strokeWidth}
                    />
                  )}
                </g>

                <circle
                  cx={center}
                  cy={center}
                  r={radius + strokeWidth / 2 - 0.5}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.75)"
                  strokeWidth="1"
                  className="pointer-events-none"
                />
                <circle
                  cx={center}
                  cy={center}
                  r={radius - strokeWidth / 2 + 0.5}
                  fill="none"
                  stroke="rgba(15, 23, 42, 0.08)"
                  strokeWidth="1"
                  className="pointer-events-none"
                />
              </svg>

              {/* Center value and unit */}
              <div className="glossy-donut-hole">
                <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-950">
                  {centerValue ?? effectiveTotal}
                </span>
                <span className="mt-0.5 text-xs font-medium text-slate-500">
                  {unit}
                </span>
              </div>
            </div>
          </div>

          {/* Legend Matching Image 2: Dot + Category on Left, Count and Percentage on Right */}
          <ul className="min-w-0 space-y-2.5">
            {items.length ? (
              items.map((item, index) => {
                const percentVal = Math.round(toPercent(item.value, effectiveTotal))
                const isHovered = hoveredIndex === index
                return (
                  <li
                    key={item.label}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`flex items-center justify-between text-sm py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                      isHovered ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-3 w-5 shrink-0 rounded-full shadow-sm transition-transform"
                        style={{
                          backgroundColor: item.color,
                          transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                        }}
                        aria-hidden="true"
                      />
                      <span className={`min-w-0 truncate font-medium ${isHovered ? 'text-slate-950 font-semibold' : 'text-slate-700'}`}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 tabular-nums shrink-0 ml-4">
                      <span className="font-bold text-slate-950 w-10 text-right">{item.value}</span>
                      <span className="w-10 text-right text-xs font-semibold text-slate-500">{percentVal}%</span>
                    </div>
                  </li>
                )
              })
            ) : (
              <li className="text-sm text-slate-500">No data available.</li>
            )}
          </ul>
        </div>
      )}
    </section>
  )
}

export function MonthlyCallVolumeChart({
  items,
  title = 'Calls by Month',
}: {
  items: ChartDatum[]
  title?: string
}) {
  const [isTableView, setIsTableView] = useState(false)
  const chartId = useId().replace(/[:]/g, '')
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const average = items.length ? total / items.length : 0
  const maximum = Math.max(...items.map((item) => item.value), 0)
  const chartHeight = 176
  const chartTop = 16
  const chartBottom = 148
  const chartRange = chartBottom - chartTop
  const columnWidth = 40
  const chartWidth = Math.max(items.length * 82, 360)
  const averageY = chartBottom - (maximum > 0 ? (average / maximum) * chartRange : 0)

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold tracking-tight text-slate-950">{title}</h3>
            <ChartInfoButton title={title} infoText="Completed conversations grouped by month over the last six months. The dashed line marks the monthly average." />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Last 6 months · dashed line is the monthly average</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500">Monthly average</p>
            <p className="text-sm font-bold tabular-nums text-slate-800">{average.toFixed(1)}</p>
          </div>
          <ChartViewToggle
            title={title}
            isTableView={isTableView}
            onToggleView={() => setIsTableView((prev) => !prev)}
          />
        </div>
      </div>

      {isTableView ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-3 py-2.5">Month</th>
                <th className="px-3 py-2.5 text-right">Calls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.label}>
                  <td className="px-3 py-2 font-medium text-slate-800">{item.label}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{item.value}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={2} className="px-3 py-5 text-center text-slate-500">No data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto" role="img" aria-label={`${title}: ${items.map((item) => `${item.label}, ${item.value} calls`).join('; ') || 'No data available'}`}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="block h-[210px] min-w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`call-column-${chartId}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="55%" stopColor="#0052ff" />
                <stop offset="100%" stopColor="#0b347f" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((step) => {
              const y = chartTop + (chartRange / 3) * step
              const value = maximum > 0 ? Math.round(maximum * (1 - step / 3)) : 0
              return (
                <g key={step}>
                  <line x1="40" x2={chartWidth - 8} y1={y} y2={y} stroke="#dbe3ec" strokeDasharray="2 4" />
                  <text x="32" y={y + 3} textAnchor="end" fill="#64748b" fontSize="9">{value}</text>
                </g>
              )
            })}
            <line
              x1="40"
              x2={chartWidth - 8}
              y1={averageY}
              y2={averageY}
              stroke="#ea580c"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            {items.map((item, index) => {
              const slotWidth = (chartWidth - 50) / Math.max(items.length, 1)
              const x = 40 + slotWidth * index + (slotWidth - columnWidth) / 2
              const barHeight = maximum > 0 ? (item.value / maximum) * chartRange : 0
              const y = chartBottom - barHeight
              return (
                <g key={item.label}>
                  <rect x={x} y={chartTop} width={columnWidth} height={chartRange} rx="6" fill="#f1f5f9" />
                  <rect x={x} y={y} width={columnWidth} height={barHeight} rx="6" fill={`url(#call-column-${chartId})`} />
                  <title>{`${item.label}: ${item.value} calls`}</title>
                  <text x={x + columnWidth / 2} y={chartBottom + 18} textAnchor="middle" fill="#475569" fontSize="10">
                    {item.label}
                  </text>
                  {item.value > 0 && item.value === maximum && (
                    <text x={x + columnWidth / 2} y={Math.max(y - 7, 10)} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="600">
                      {item.value}
                    </text>
                  )}
                </g>
              )
            })}
            <line x1="40" x2={chartWidth - 8} y1={chartBottom} y2={chartBottom} stroke="#cbd5e1" />
          </svg>
        </div>
      )}
    </section>
  )
}

export function GlossyBarChart({
  title,
  subtitle,
  items,
  totalLabel,
  total,
  infoTooltip,
  variant = 'standard',
}: {
  title: string
  subtitle?: string
  items: ChartDatum[]
  totalLabel?: string
  total?: number
  infoTooltip?: string
  variant?: 'standard' | 'distribution' | 'funnel'
}) {
  const [isTableView, setIsTableView] = useState(false)
  const maximum = Math.max(...items.map((item) => item.value), 0)
  const effectiveTotal = total ?? items.reduce((sum, item) => sum + item.value, 0)

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-bold tracking-tight text-slate-950">{title}</h3>
            <ChartInfoButton title={title} infoText={infoTooltip || subtitle || `Details about the ${title} chart.`} />
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {totalLabel && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{totalLabel}</span>}
          <ChartViewToggle
            title={title}
            isTableView={isTableView}
            onToggleView={() => setIsTableView((prev) => !prev)}
          />
        </div>
      </div>
      {isTableView ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5 text-right">Count</th>
                <th className="px-3 py-2.5 text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length ? items.map((item) => (
                <tr key={item.label} className="hover:bg-slate-50/70">
                  <td className="flex items-center gap-2 px-3 py-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-slate-800">{item.label}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{item.value}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{Math.round(toPercent(item.value, effectiveTotal))}%</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="px-3 py-5 text-center text-slate-500">No data available.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
              <tr>
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{effectiveTotal}</td>
                <td className="px-3 py-2 text-right tabular-nums">{effectiveTotal > 0 ? '100%' : '0%'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : variant === 'funnel' ? (
        <div className="mt-5 space-y-3">
          {items.length ? items.map((item) => {
            const share = toPercent(item.value, effectiveTotal)
            const width = Math.max(share, item.value > 0 ? 12 : 0)
            return (
              <div key={item.label} className="grid gap-2 sm:grid-cols-[92px_1fr_auto] sm:items-center">
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                <div className="glossy-bar-track h-9" role="img" aria-label={`${item.label}: ${item.value} of ${effectiveTotal}`}>
                  <div
                    className="glossy-bar-face flex h-9 items-center justify-end rounded-md px-3 text-xs font-bold text-white"
                    style={{ width: `${width}%`, '--bar-color': item.color } as CSSProperties}
                  >
                    {/* Only label bars wide enough to hold the text legibly. */}
                    {item.value > 0 && width >= 22 ? `${Math.round(share)}%` : ''}
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-slate-950">
                  {item.value}
                  {item.value > 0 && width < 22 && <span className="ml-1 text-xs font-medium text-slate-400">{Math.round(share)}%</span>}
                </span>
              </div>
            )
          }) : <p className="text-sm text-slate-500">No data yet.</p>}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {items.length ? items.map((item) => {
            const width = variant === 'distribution'
              ? Math.max(toPercent(item.value, effectiveTotal), item.value > 0 ? 4 : 0)
              : Math.max(maximum > 0 ? (item.value / maximum) * 100 : 0, item.value > 0 ? 4 : 0)
            return (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-slate-700">{item.label}</span>
                  <span className="shrink-0 font-bold tabular-nums text-slate-950">{item.value}</span>
                </div>
                <div className="glossy-bar-track" role="img" aria-label={`${item.label}: ${item.value}`}>
                  <span className="glossy-bar-face" style={{ width: `${width}%`, '--bar-color': item.color } as CSSProperties} />
                </div>
              </div>
            )
          }) : <p className="text-sm text-slate-500">No data yet.</p>}
        </div>
      )}
    </section>
  )
}
