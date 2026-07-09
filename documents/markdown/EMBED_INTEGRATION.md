# Voice Agent Embed Guide

Use this guide to embed the hosted voice agent inside a customer website section.

## 1) Host the app

Deploy this app on a public HTTPS domain, for example:

- `https://agent.yourdomain.com`

The embedded page URL is:

- `https://agent.yourdomain.com/voice`

## 2) Allow specific parent domains

Set `ALLOWED_FRAME_ANCESTORS` in your deployment environment to a comma-separated list of domains that are allowed to embed the agent.

Example:

```bash
ALLOWED_FRAME_ANCESTORS=https://www.customer.com,https://staging.customer.com
```

If this variable is not set, embedding is blocked everywhere except your own origin.

## 3) Enable tenant token authentication (recommended)

Set these environment variables:

```bash
EMBED_AUTH_ENABLED=true
EMBED_TENANTS=[{"id":"customer-a","token":"replace-with-long-random-secret","allowedParents":["https://www.customer.com","https://staging.customer.com"]}]
```

- `id`: Tenant/customer identifier.
- `token`: Shared secret for this embed link.
- `allowedParents`: Optional parent origins allowed to host this tenant.

If `EMBED_AUTH_ENABLED=false` (default), the app works without tenant auth.

## 4) Give customer iframe snippet

If the customer website already has its own floating chat button, use inline mode.
This avoids showing a second launcher button inside the iframe.

```html
<iframe
  src="https://agent.yourdomain.com/voice?tenant=customer-a&token=replace-with-long-random-secret&mode=inline&margin=sm"
  title="Support Agent Voice Agent"
  width="100%"
  height="680"
  style="border:0;border-radius:12px;"
  loading="lazy"
  allow="microphone; autoplay"
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>
```

Use `margin=none` when the host page already provides spacing around the iframe.

If the iframe is the only chat control on the page, use floating mode. This shows
the built-in launcher button.

```html
<iframe
  src="https://agent.yourdomain.com/voice?tenant=customer-a&token=replace-with-long-random-secret"
  title="Support Agent Voice Agent"
  width="100%"
  height="680"
  style="border:0;border-radius:12px;"
  loading="lazy"
  allow="microphone; autoplay"
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>
```

## 5) Customer-side requirements

- Page must be served over HTTPS.
- Browser microphone permission must be granted by end users.
- Customer CSP must allow your domain in `frame-src` (or `child-src` if used).
- If they use restrictive `Permissions-Policy`, it must allow microphone in embedded frames.

## 6) Quick test checklist

- Open customer page and confirm iframe renders.
- Start a voice call and verify browser mic prompt appears.
- Confirm transcript, TTS playback, and call-end summary work.
- Verify the same flow in Chrome + Safari (desktop and mobile if needed).

## 7) Gmail SMTP call-summary emails

Each tenant can send a call-summary email after the conversation ends. Configure
`emailNotifications` in `src/data/tenants.json`.

```json
"emailNotifications": {
  "enabled": true,
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 465,
    "secure": true,
    "userEnv": "GMAIL_SMTP_USER",
    "passEnv": "GMAIL_SMTP_APP_PASSWORD"
  },
  "fromName": "tkxel Voice Agent",
  "fromEmail": "your-gmail-address@gmail.com",
  "recipients": ["sales@yourdomain.com"],
  "sendToLeadEmail": true
}
```

`sendToLeadEmail: true` sends the summary to the visitor email captured during
the conversation. `recipients` sends a copy to fixed addresses such as your sales
or support inbox.

Set the referenced environment variables in `.env.local` or your hosting
platform:

```bash
GMAIL_SMTP_USER=your-gmail-address@gmail.com
GMAIL_SMTP_APP_PASSWORD=your-google-app-password
```

For Gmail, use a Google App Password, not your normal Gmail password.
