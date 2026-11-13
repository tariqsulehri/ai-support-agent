export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapDefaultTenantOpenAIKey } = await import('@/lib/tenants/bootstrap')
    await bootstrapDefaultTenantOpenAIKey().catch((err) => {
      console.warn('[instrumentation] Failed to bootstrap default tenant OpenAI key:', err)
    })
  }
}

