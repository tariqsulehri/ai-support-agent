import { NextRequest, NextResponse } from 'next/server'
import { getVerifiedSession, dashboardScopeForSession } from '@/lib/auth/session'
import { getDashboardAnalytics, type DashboardFilters } from '@/lib/dashboard/analytics'
export { OPTIONS } from '@/lib/utils/cors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/dashboard/calls
 * High-performance paginated API endpoint for communications and leads.
 * Query Parameters:
 *   - page: integer (default: 1)
 *   - limit: integer (default: 10, max: 100)
 *   - sort: 'recent' | 'created_desc' | 'created_asc' | 'maturity_desc' | 'quality_desc'
 *   - q: text search query
 *   - status: 'all' | 'new' | 'reviewing' | 'qualified' | 'proposal' | 'won' | 'lost'
 *   - quality: 'all' | 'hot' | 'warm' | 'cold' | 'unknown'
 *   - urgency: 'all' | 'high' | 'medium' | 'low' | 'unknown'
 *   - range: 'all' | 'today' | '7' | '30' | '90'
 */
export async function GET(req: NextRequest) {
  const session = await getVerifiedSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10) || 10))
  const sort = searchParams.get('sort') || 'recent'

  const filters: DashboardFilters = {
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    quality: searchParams.get('quality') ?? undefined,
    urgency: searchParams.get('urgency') ?? undefined,
    range: searchParams.get('range') ?? undefined,
    selectedId: searchParams.get('selectedId') ?? undefined,
    page,
    limit,
    sort,
  }

  const analytics = await getDashboardAnalytics(filters, {
    scope: dashboardScopeForSession(session),
  })

  return NextResponse.json({
    records: analytics.recentCalls,
    pagination: analytics.pagination,
    summary: {
      totalCalls: analytics.totalCalls,
      filteredCalls: analytics.filteredCalls,
      callsWithLead: analytics.callsWithLead,
      hotLeads: analytics.hotLeads,
      qualifiedPipeline: analytics.qualifiedPipeline,
      openFollowUps: analytics.openFollowUps,
      conversionReadiness: analytics.conversionReadiness,
    },
    generatedAt: analytics.generatedAt,
  })
}

