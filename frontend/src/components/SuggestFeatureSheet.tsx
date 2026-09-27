import { useState } from 'react'
import { Send, X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { submitSuggestion, SuggestionRequestError, type SuggestionError } from '../api/suggestions'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { Sheet } from './ui/Sheet'

const MIN_LENGTH = 3
const MAX_LENGTH = 2000

const errorMessages: Record<SuggestionError, string> = {
  offline: 'Нет соединения. Текст сохранится, пока окно открыто, — попробуйте позже.',
  too_many: 'Слишком много предложений подряд. Попробуйте через час.',
  unavailable: 'Приём предложений сейчас не работает.',
  failed: 'Не удалось отправить. Попробуйте ещё раз.',
}

export function SuggestFeatureSheet({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [contact, setContact] = useState('')
  const submit = useMutation({
    mutationFn: () => submitSuggestion({ text, contact: contact.trim() || undefined }),
    // A suggestion is written by hand; resending it without asking could post it twice.
    retry: false,
    networkMode: 'always',
  })
  const reason =
    submit.error instanceof SuggestionRequestError ? submit.error.reason : ('failed' as const)
  const canSend = text.trim().length >= MIN_LENGTH && !submit.isPending

  return (
    <Sheet labelledBy="suggest-feature-title" onClose={onClose}>
      <header className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-xl font-semibold" id="suggest-feature-title">
          Предложить фичу
        </h2>
        <IconButton aria-label="Закрыть" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </header>
      {submit.isSuccess ? (
        <>
          <p className="mt-3 text-sm" role="status">
            Спасибо, предложение отправлено.
          </p>
          <div className="mt-4 flex justify-end">
            <Button onClick={onClose}>Готово</Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (canSend) submit.mutate()
          }}
        >
          <p className="mt-2 text-sm text-[var(--muted)]">
            Чего не хватает в расписании? Сообщение прочитают разработчики.
          </p>
          <label className="mt-4 block text-xs text-[var(--muted)]" htmlFor="suggestion-text">
            Идея
          </label>
          <textarea
            id="suggestion-text"
            className="mt-1 min-h-36 w-full resize-y rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] p-3 text-sm outline-none focus:border-[var(--accent)]"
            value={text}
            maxLength={MAX_LENGTH}
            onChange={(event) => setText(event.target.value)}
            placeholder="Например, виджет с ближайшей парой"
            required
          />
          <label className="mt-3 block text-xs text-[var(--muted)]" htmlFor="suggestion-contact">
            Как с вами связаться — необязательно
          </label>
          <input
            id="suggestion-contact"
            className="mt-1 min-h-11 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            value={contact}
            maxLength={200}
            onChange={(event) => setContact(event.target.value)}
            placeholder="@telegram или почта"
            autoComplete="off"
          />
          {submit.isError && (
            <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
              {errorMessages[reason]}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" variant="default" disabled={!canSend}>
              <Send size={16} />
              {submit.isPending ? 'Отправляем…' : 'Отправить'}
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  )
}
