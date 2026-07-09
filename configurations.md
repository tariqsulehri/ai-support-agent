# Configurations

## Site Admin

Login page:

```text
https://voiceagent-aiscripto.vercel.app/admin/login
```

Platform admin / tenant management page:

```text
https://voiceagent-aiscripto.vercel.app/admin/tenants
```

Use this area to manage tenants, subscriptions, domains, embed setup, and platform-level configuration.

## Ai-scripto Tenant Admin

Tenant login page:

```text
https://voiceagent-aiscripto.vercel.app/tenant/login
```

Tenant-specific configuration page:

```text
https://voiceagent-aiscripto.vercel.app/admin/tenants/ai-scripto
```

Use this page to configure the `ai-scripto` tenant settings, including OpenAI key, optional lead database URL, SMTP email, domains, embed token, agent profile, services, and knowledge base.

Database target:

```text
MongoDB database name: voiceagent
```

Use the `voiceagent` database for Ai-scripto tenant conversation storage.

## Public Voice Agent

Public voice agent page:

```text
https://voiceagent-aiscripto.vercel.app/voice?tenant=ai-scripto&token=testToken123Abcd
```

Use this URL to test or open the Ai-scripto voice agent directly. The bare `/voice` path may fall back to the default tenant, so include the tenant and token parameters for Ai-scripto.
