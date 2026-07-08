import nodemailer from 'nodemailer'
import { env } from '@/lib/config/env'
import { emailStyles } from '@/lib/email/email-styles'
import type { CallSummary, ChatHistory, LeadData } from '@/types'
import type { TenantConfig } from '@/lib/tenants/types'

interface SendCallSummaryEmailInput {
  tenant: TenantConfig
  lead: LeadData
  summary: CallSummary
  messages: ChatHistory
}

type EmailTransportConfig =
  | { service: string }
  | { host: string; port: number; secure: boolean }

type ResolvedEmailConfig =
  | {
      enabled: true
      recipients: string[]
      sendToLeadEmail: boolean
      fromName: string
      fromEmail: string
      user: string
      pass: string
      transport: EmailTransportConfig
    }
  | {
      enabled: false
      error: string
    }

export interface SendCallSummaryEmailResult {
  sent: boolean
  recipients?: string[]
  messageId?: string
  error?: string
  skippedLeadEmail?: string
}

function compactRecipients(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])]
}

function normalizeValidEmail(value: string | null | undefined): string | null {
  const email = value?.trim()
  if (!email) return null

  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!name || !domain) return email

  return `${name.slice(0, 2)}***@${domain}`
}

function describeTransport(transport: EmailTransportConfig): string {
  return 'service' in transport
    ? `service:${transport.service}`
    : `smtp:${transport.host ?? 'unknown'}:${transport.port}`
}

function hasGenericEmailConfig(): boolean {
  return Boolean(env.EMAIL_USER?.trim() && env.EMAIL_PASS?.trim() && (env.SERVICE?.trim() || env.HOST?.trim()))
}

function resolveTenantEmailConfig(tenant: TenantConfig): ResolvedEmailConfig | null {
  const tenantConfig = tenant.emailNotifications
  if (!tenantConfig?.enabled) return null

  const user = tenantConfig.smtp.user?.trim() ||
    (tenantConfig.smtp.userEnv ? process.env[tenantConfig.smtp.userEnv]?.trim() : undefined)
  const pass = tenant.runtimeSecrets?.smtpPassword?.trim() ||
    (tenantConfig.smtp.passEnv ? process.env[tenantConfig.smtp.passEnv]?.trim() : undefined)
  const service = tenantConfig.smtp.service?.trim()
  const host = tenantConfig.smtp.host?.trim()

  if (!user || !pass) {
    return {
      enabled: false,
      error: tenantConfig.smtp.userEnv || tenantConfig.smtp.passEnv
        ? `Missing SMTP credentials for ${tenantConfig.smtp.userEnv ?? 'configured user'}/${tenantConfig.smtp.passEnv ?? 'configured password'}`
        : 'Missing tenant SMTP username or password.',
    }
  }
  if (!service && !host) {
    return {
      enabled: false,
      error: 'Missing tenant SMTP service or host.',
    }
  }

  return {
    enabled: true,
    recipients: tenantConfig.recipients ?? [],
    sendToLeadEmail: tenantConfig.sendToLeadEmail ?? false,
    fromName: tenantConfig.fromName,
    fromEmail: tenantConfig.fromEmail,
    user,
    pass,
    transport: service
      ? { service }
      : {
          host: host as string,
          port: tenantConfig.smtp.port,
          secure: tenantConfig.smtp.secure,
        },
  }
}

function resolveEmailConfig(tenant: TenantConfig): ResolvedEmailConfig | null {
  const tenantConfig = tenant.emailNotifications
  const tenantEmailConfig = resolveTenantEmailConfig(tenant)
  if (tenantEmailConfig) return tenantEmailConfig

  if (hasGenericEmailConfig()) {
    const port = env.EMAIL_PORT ?? tenantConfig?.smtp.port ?? 465
    const host = env.HOST?.trim() ?? tenantConfig?.smtp.host?.trim()
    if (!env.SERVICE?.trim() && !host) {
      return {
        enabled: false,
        error: 'Missing SMTP host.',
      }
    }

    return {
      enabled: true,
      recipients: tenantConfig?.recipients ?? [],
      sendToLeadEmail: tenantConfig?.sendToLeadEmail ?? true,
      fromName: tenantConfig?.fromName ?? `${tenant.companyName} Voice Agent`,
      fromEmail: env.EMAIL_USER as string,
      user: env.EMAIL_USER as string,
      pass: env.EMAIL_PASS as string,
      transport: env.SERVICE?.trim()
        ? { service: env.SERVICE.trim() }
        : {
            host: host as string,
            port,
            secure: port === 465,
          },
    }
  }

  return null
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
    `Country: ${textValue(lead.country)}`,
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
    ['Country', lead.country],
    ['Purpose', lead.purpose],
  ]
    .map(
      ([label, value]) => `
        <p class="p2"><strong>${label}:</strong> ${escapeHtml(textValue(value))}</p>`
    )
    .join('')

  const transcriptItems = messages
    .filter((m) => m.content !== '__GREET__')
    .map((m) => {
      const isVisitor = m.role === 'user'
      const roleLabel = isVisitor ? 'Visitor' : tenant.agentName
      const colorClass = isVisitor ? 'visitor' : 'agent'
      return `
        <li class="transcript-item ${colorClass}">
          <span class="transcript-role">${escapeHtml(roleLabel)}</span>: ${escapeHtml(m.content)}
        </li>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
${emailStyles}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <img src="https://www.aiscripto.com/images/logo.png" alt="Company Logo" />
      <span> New ${escapeHtml(tenant.companyName)} voice-agent call summary</span>
    </div>
    <div class="divider"></div>
    <div class="email-body">
      <h3>Contact Details</h3>
      ${contactRows}
      <h3>Purpose</h3>
      <p class="p2">${escapeHtml(textValue(lead.purpose))}</p>
      <h3>Summary</h3>
      <p class="p2">${escapeHtml(summary.summary || 'No summary available.')}</p>
      <h3>Key points</h3>
      <ul>${keyPoints}</ul>
      <h3>Transcript</h3>
      <ul class="transcript-list">
        ${transcriptItems || '<li class="transcript-item"><span class="transcript-role">Transcript:</span> No transcript available.</li>'}
      </ul>
    </div>
    <div class="email-footer">
      <p class="p2">Thank you for considering our services. If you have any questions, feel free to <a href="mailto:support@example.com">contact us</a>.</p>
      <p class="p2">This is an automated email. Please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendCallSummaryEmail(
  input: SendCallSummaryEmailInput
): Promise<SendCallSummaryEmailResult> {
  const config = resolveEmailConfig(input.tenant)
  if (!config) {
    console.info('[call-email] skipped: email notifications are not configured', {
      tenantId: input.tenant.id,
    })
    return { sent: false }
  }
  if (!config.enabled) {
    console.info('[call-email] skipped: email configuration is incomplete', {
      tenantId: input.tenant.id,
      error: config.error,
    })
    return { sent: false, error: config.error }
  }

  const leadEmail = normalizeValidEmail(input.lead.email)
  const skippedLeadEmail = input.lead.email?.trim() && !leadEmail
    ? input.lead.email.trim()
    : undefined

  const recipients = compactRecipients([
    ...config.recipients,
    config.sendToLeadEmail ? leadEmail : null,
  ])

  if (recipients.length === 0) {
    console.info('[call-email] skipped: no valid recipient', {
      tenantId: input.tenant.id,
      skippedLeadEmail: skippedLeadEmail ? maskEmail(skippedLeadEmail) : undefined,
    })
    return {
      sent: false,
      error: skippedLeadEmail
        ? 'Captured lead email is invalid, so email was skipped.'
        : 'No email recipients configured or captured.',
      skippedLeadEmail,
    }
  }

  const transporter = nodemailer.createTransport({
    ...config.transport,
    auth: { user: config.user, pass: config.pass },
  })

  try {
    console.info('[call-email] sending email', {
      tenantId: input.tenant.id,
      recipients: recipients.map(maskEmail),
      transport: describeTransport(config.transport),
    })

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: recipients,
      subject: `Voice agent summary - ${input.tenant.companyName}`,
      text: renderText(input),
      html: renderHtml(input),
    })

    console.info('[call-email] email sent', {
      tenantId: input.tenant.id,
      recipients: recipients.map(maskEmail),
      messageId: info.messageId,
    })

    return { sent: true, recipients, messageId: info.messageId, skippedLeadEmail }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[call-email] email failed', {
      tenantId: input.tenant.id,
      recipients: recipients.map(maskEmail),
      error,
    })
    return {
      sent: false,
      recipients,
      error,
      skippedLeadEmail,
    }
  }
}
