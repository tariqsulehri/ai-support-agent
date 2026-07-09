import { NextRequest, NextResponse } from 'next/server'
import { getDashboardAnalytics, type DashboardFilters } from '@/lib/dashboard/analytics'
import { dashboardScopeForSession, getVerifiedSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function csvValue(value: string | number | null | undefined): string {
  const normalized = value == null ? '' : String(value)
  return `"${normalized.replace(/"/g, '""')}"`
}

export async function GET(req: NextRequest) {
  const session = await getVerifiedSession()
  if (!session) {
    return NextResponse.redirect(new URL('/tenant/login?next=/dashboard/export', req.url))
  }

  const searchParams = req.nextUrl.searchParams
  const filters: DashboardFilters = {
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    quality: searchParams.get('quality') ?? undefined,
    urgency: searchParams.get('urgency') ?? undefined,
    range: searchParams.get('range') ?? undefined,
  }
  const analytics = await getDashboardAnalytics(filters, {
    scope: dashboardScopeForSession(session),
  })

  const rows = [
    [
      'Created At',
      'Lead Name',
      'Email',
      'Phone',
      'Company',
      'Country',
      'Purpose',
      'Status',
      'Quality',
      'Urgency',
      'Intent',
      'Category',
      'Owner',
      'Follow Up At',
      'Email Sent',
      'Summary',
      'Notes',
    ],
    ...analytics.recentCalls.map((call) => [
      call.createdAt,
      call.lead.name,
      call.lead.email,
      call.lead.phone,
      call.lead.company,
      call.lead.country,
      call.lead.purpose,
      call.status,
      call.leadQuality,
      call.urgency,
      call.intent,
      call.category,
      call.owner,
      call.followUpAt,
      call.emailSent ? 'yes' : 'no',
      call.summary,
      call.notes,
    ]),
  ]

  const csv = rows.map((row) => row.map(csvValue).join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="voice-agent-dashboard-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
