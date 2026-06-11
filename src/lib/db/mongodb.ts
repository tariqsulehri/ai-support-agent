import { MongoClient, type Db } from 'mongodb'
import { env } from '@/lib/config/env'

type MongoGlobal = typeof globalThis & {
  __voiceAgentMongoClient?: Promise<MongoClient>
}

const globalForMongo = globalThis as MongoGlobal

export function isMongoConfigured(): boolean {
  return Boolean(env.MONGODB_URI?.trim())
}

export async function getMongoDb(): Promise<Db | null> {
  if (!env.MONGODB_URI) return null

  globalForMongo.__voiceAgentMongoClient ??= MongoClient.connect(env.MONGODB_URI, {
    appName: 'voiceagent',
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  })

  const client = await globalForMongo.__voiceAgentMongoClient
  return client.db(env.MONGODB_DB_NAME)
}
