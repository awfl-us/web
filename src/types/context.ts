// Minimal shape for Yoj messages emitted by TopicContextYoj
export type YojMessage = {
  role?: 'system' | 'user' | 'assistant' | string
  content?: string | null
  // Epoch seconds when available
  create_time?: number | string
  // Estimated cost in USD for this chat message, if available
  cost?: number | null
  // Allow unknown extra fields from backend
  [key: string]: any
}
