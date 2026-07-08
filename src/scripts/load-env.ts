import { config } from 'dotenv'

// Next.js loads .env.local automatically, but standalone tsx scripts do not.
// Load local overrides first, then fall back to .env without overriding them.
config({ path: '.env.local' })
config({ path: '.env' })
