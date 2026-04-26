import { getOpenAIClient } from './client'
import { buildSystemPrompt } from '@/lib/config/prompt'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

/**
 * Returns a streaming OpenAI chat completion.
 * The caller is responsible for consuming the stream.
 */
export async function streamChatReply(
  messages: ChatMessage[],
  langName: string
) {
  const client = getOpenAIClient()
  const systemPrompt = buildSystemPrompt(langName)

  return client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 200,
    temperature: 0.6,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })
}

/**
 * Split accumulated text into complete sentences and a leftover remainder.
 * Fires on: . ! ? and common multilingual sentence-ending punctuation.
 */
export function extractSentences(text: string): {
  sentences: string[]
  remainder: string
} {
  const sentences: string[] = []
  // Match sentence endings: punctuation followed by whitespace or end-of-string
  const pattern = /[^.!?।؟。！？]+[.!?।؟。！？]+(\s|$)/g
  let match: RegExpExecArray | null
  let lastIndex = 0

  while ((match = pattern.exec(text)) !== null) {
    const sentence = match[0].trim()
    if (sentence.length >= 8) {
      sentences.push(sentence)
    }
    lastIndex = pattern.lastIndex
  }

  return {
    sentences,
    remainder: text.slice(lastIndex).trimStart(),
  }
}
