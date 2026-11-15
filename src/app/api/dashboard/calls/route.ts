import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedSession, dashboardScopeForSession } from '@/lib/auth/session'
import { getDashboardAnalytics } from '@/lib/dashboard/analytics'
import type { DashboardFilters } from '@/lib/dashboard/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/dashboard/calls — authenticated, same-origin JSON endpoint.
 * Query: page, limit (≤100), sort (recent|created_desc|created_asc|maturity_desc),
 * q, status, quality, urgency, range (all|today|7|30|90), summary=1 to include KPI counters.
 * Session-cookie authenticated, so it intentionally exposes no CORS preflight handler.
 */
export async function GET(req: NextRequest) {
  const session = await getVerifiedSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const sp = req.nextUrl.searchParams
  const filters: DashboardFilters = {
    q: sp.get('q') ?? undefined,
    status: sp.get('status') ?? undefined,
    quality: sp.get('quality') ?? undefined,
    urgency: sp.get('urgency') ?? undefined,
    range: sp.get('range') ?? undefined,
    page: sp.get('page') ?? undefined,
    limit: sp.get('limit') ?? undefined,
    sort: sp.get('sort') ?? undefined,
  }
  const includeSummary = sp.get('summary') === '1'

  try {
    const analytics = await getDashboardAnalytics(filters, {
      scope: dashboardScopeForSession(session),
      sections: { list: true, aggregates: includeSummary, followUps: includeSummary, followUpQueue: false, selected: false },
    })

    return NextResponse.json(
      {
        records: analytics.recentCalls,
        pagination: analytics.pagination,
        ...(includeSummary && {
          summary: {
            totalCalls: analytics.totalCalls,
            filteredCalls: analytics.filteredCalls,
            callsWithLead: analytics.callsWithLead,
            hotLeads: analytics.hotLeads,
            qualifiedPipeline: analytics.qualifiedPipeline,
            openFollowUps: analytics.openFollowUps,
            conversionReadiness: analytics.conversionReadiness,
          },
        }),
        generatedAt: analytics.generatedAt,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (err) {
    console.error('[api:dashboard:calls] analytics query failed', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
