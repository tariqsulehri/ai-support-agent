import nodemailer from 'nodemailer'
import type { CallSummary, ChatHistory, LeadData } from '@/types'
import type { TenantConfig } from '@/lib/tenants/types'

interface SendCallSummaryEmailInput {
  tenant: TenantConfig
  lead: LeadData
  summary: CallSummary
  messages: ChatHistory
}

export interface SendCallSummaryEmailResult {
  sent: boolean
  recipients?: string[]
  error?: string
}

function compactRecipients(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textValue(value: string | null | undefined): string {
  return value?.trim() || 'Not provided'
}

function renderTranscript(messages: ChatHistory, agentName: string): string {
  return messages
    .filter((m) => m.content !== '__GREET__')
    .map((m) => `${m.role === 'user' ? 'Visitor' : agentName}: ${m.content}`)
    .join('\n')
}

function renderText(input: SendCallSummaryEmailInput): string {
  const { tenant, lead, summary, messages } = input
  const keyPoints = summary.keyPoints.length
    ? summary.keyPoints.map((point) => `- ${point}`).join('\n')
    : '- None'

  return [
    `New ${tenant.companyName} voice-agent call summary`,
    '',
    'Contact',
    `Name: ${textValue(lead.name)}`,
    `Email: ${textValue(lead.email)}`,
    `Phone: ${textValue(lead.phone)}`,
    `Company: ${textValue(lead.company)}`,
    `Purpose: ${textValue(lead.purpose)}`,
    '',
    'Summary',
    summary.summary || 'No summary available.',
    '',
    'Key points',
    keyPoints,
    '',
    'Transcript',
    renderTranscript(messages, tenant.agentName) || 'No transcript available.',
  ].join('\n')
}

function renderHtml(input: SendCallSummaryEmailInput): string {
  const { tenant, lead, summary, messages } = input
  const keyPoints = summary.keyPoints.length
    ? summary.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join('')
    : '<li>None</li>'

  const contactRows = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Company', lead.company],
    ['Purpose', lead.purpose],
  ]
    .map(([label, value]) => `
      <tr>
        <td style="padding:6px 10px;color:#666;font-weight:600;">${label}</td>
        <td style="padding:6px 10px;color:#222;">${escapeHtml(textValue(value))}</td>
      </tr>
    `)
    .join('')

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.5;">
      <h2 style="margin:0 0 12px;">New ${escapeHtml(tenant.companyName)} voice-agent call summary</h2>
      <h3 style="margin:18px 0 8px;">Contact</h3>
      <table style="border-collapse:collapse;background:#f7f7f7;border-radius:8px;overflow:hidden;">
        ${contactRows}
      </table>
      <h3 style="margin:18px 0 8px;">Summary</h3>
      <p>${escapeHtml(summary.summary || 'No summary available.')}</p>
      <h3 style="margin:18px 0 8px;">Key points</h3>
      <ul>${keyPoints}</ul>
      <h3 style="margin:18px 0 8px;">Transcript</h3>
      <pre style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:8px;font-family:Arial,sans-serif;">${escapeHtml(renderTranscript(messages, tenant.agentName) || 'No transcript available.')}</pre>
    </div>
  `
}

export async function sendCallSummaryEmail(
  input: SendCallSummaryEmailInput
): Promise<SendCallSummaryEmailResult> {
  const config = input.tenant.emailNotifications
  if (!config?.enabled) return { sent: false }

  const user = process.env[config.smtp.userEnv]
  const pass = process.env[config.smtp.passEnv]
  if (!user || !pass) {
    return {
      sent: false,
      error: `Missing SMTP env vars: ${config.smtp.userEnv}/${config.smtp.passEnv}`,
    }
  }

  const recipients = compactRecipients([
    ...(config.recipients ?? []),
    config.sendToLeadEmail ? input.lead.email : null,
  ])

  if (recipients.length === 0) {
    return { sent: false, error: 'No email recipients configured or captured.' }
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user, pass },
  })

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: recipients,
      subject: `Voice agent summary - ${input.tenant.companyName}`,
      text: renderText(input),
      html: renderHtml(input),
    })
    return { sent: true, recipients }
  } catch (err) {
    return { sent: false, recipients, error: err instanceof Error ? err.message : String(err) }
  }
}
