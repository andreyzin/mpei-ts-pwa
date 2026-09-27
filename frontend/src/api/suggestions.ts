export type Suggestion = { text: string; contact?: string }

/** Codes the form explains differently; anything else is a generic failure. */
export type SuggestionError = 'offline' | 'too_many' | 'unavailable' | 'failed'

export class SuggestionRequestError extends Error {
  constructor(readonly reason: SuggestionError) {
    super(`SUGGESTION_${reason.toUpperCase()}`)
  }
}

export async function submitSuggestion(suggestion: Suggestion): Promise<void> {
  let response: Response
  try {
    response = await fetch('/api/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestion),
    })
  } catch {
    throw new SuggestionRequestError('offline')
  }
  if (response.ok) return
  if (response.status === 429) throw new SuggestionRequestError('too_many')
  if (response.status === 503) throw new SuggestionRequestError('unavailable')
  throw new SuggestionRequestError('failed')
}
