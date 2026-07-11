/**
 * Robust JSON extraction from LLM/VLM responses.
 * Models occasionally wrap JSON in ```json fences or add stray prose.
 */

export function extractJson<T = unknown>(raw: string): T {
  if (!raw) throw new Error('Empty model response')

  let text = raw.trim()

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) text = fence[1].trim()

  // Find the first { or [ and the matching last } or ]
  const start = text.search(/[{[]/)
  if (start === -1) throw new Error('No JSON found in response')
  const open = text[start]
  const close = open === '{' ? '}' : ']'
  const end = text.lastIndexOf(close)
  if (end === -1 || end < start) throw new Error('Unterminated JSON in response')
  text = text.slice(start, end + 1)

  return JSON.parse(text) as T
}
