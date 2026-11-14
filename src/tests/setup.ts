process.env.PLATFORM_ENCRYPTION_KEY =
  process.env.PLATFORM_ENCRYPTION_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
process.env.AUTH_SECRET =
  process.env.AUTH_SECRET ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
process.env.DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'ai-scripto'
process.env.EMBED_AUTH_ENABLED = process.env.EMBED_AUTH_ENABLED || 'false'
process.env.SUBSCRIPTION_ENFORCEMENT_ENABLED =
  process.env.SUBSCRIPTION_ENFORCEMENT_ENABLED || 'false'
process.env.TENANT_RATE_LIMIT_ENABLED =
  process.env.TENANT_RATE_LIMIT_ENABLED || 'false'

