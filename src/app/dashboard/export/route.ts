import { NextRequest, NextResponse } from 'next/server'
import { iterateDashboardExport } from '@/lib/dashboard/analytics'
import type { DashboardCall, DashboardFilters } from '@/lib/dashboard/types'
import { dashboardScopeForSession, getVerifiedSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COLUMNS: Array<[string, (call: DashboardCall) => string | number | null | undefined]> = [
  ['Created At', (c) => c.createdAt],
  ['Updated At', (c) => c.updatedAt],
  ['Tenant', (c) => c.tenantId],
  ['Lead Name', (c) => c.lead.name],
  ['Email', (c) => c.lead.email],
  ['Phone', (c) => c.lead.phone],
  ['Company', (c) => c.lead.company],
  ['Country', (c) => c.lead.country],
  ['Purpose', (c) => c.lead.purpose],
  ['Status', (c) => c.status],
  ['Quality', (c) => c.leadQuality],
  ['Urgency', (c) => c.urgency],
  ['Intent', (c) => c.intent],
  ['Category', (c) => c.category],
  ['Sentiment', (c) => c.sentiment],
  ['Maturity Score', (c) => c.maturityScore],
  ['Owner', (c) => c.owner],
  ['Follow Up At', (c) => c.followUpAt],
  ['Email Sent', (c) => (c.emailSent ? 'yes' : 'no')],
  ['Summary', (c) => c.summary],
  ['Notes', (c) => c.notes],
]

/**
 * Quotes a CSV cell and neutralizes spreadsheet formula injection: values starting
 * with = + - @ (or tab/CR) are prefixed with a single quote so Excel/Sheets treat
 * them as text. Lead fields are visitor-supplied, so this matters.
 */
function csvValue(value: string | number | null | undefined): string {
  let text = value == null ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

const csvRow = (cells: Array<string | number | null | undefined>) => `${cells.map(csvValue).join(',')}\r\n`

export async function GET(req: NextRequest) {
  const session = await getVerifiedSession()
  if (!session) {
    return NextResponse.redirect(new URL('/tenant/login?next=/dashboard', req.url))
  }

  const sp = req.nextUrl.searchParams
  const filters: DashboardFilters = {
    q: sp.get('q') ?? undefined,
    status: sp.get('status') ?? undefined,
    quality: sp.get('quality') ?? undefined,
    urgency: sp.get('urgency') ?? undefined,
    range: sp.get('range') ?? undefined,
    sort: sp.get('sort') ?? undefined,
  }
  const scope = dashboardScopeForSession(session)
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // UTF-8 BOM so Excel detects the encoding of non-ASCII names correctly.
        controller.enqueue(encoder.encode(`﻿${csvRow(COLUMNS.map(([header]) => header))}`))
        let buffer = ''
        for await (const call of iterateDashboardExport(filters, scope)) {
          buffer += csvRow(COLUMNS.map(([, get]) => get(call)))
          if (buffer.length > 64_000) {
            controller.enqueue(encoder.encode(buffer))
            buffer = ''
          }
        }
        if (buffer) controller.enqueue(encoder.encode(buffer))
        controller.close()
      } catch (err) {
        console.error('[dashboard:export] failed', err instanceof Error ? err.message : err)
        controller.error(err)
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="conversations-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
