import { localDataStore } from '../domain/localDataStore'
import type { AnalyticsConsent } from '../domain/models'
import { useAnalyticsConsent } from '../hooks/useAnalyticsConsent'
import { analyticsConfigured, isAnalyticsLoaded } from '../lib/analytics'
import { Button } from './ui/Button'
import { Panel } from './ui/Panel'

const statusText: Record<AnalyticsConsent | 'unset', string> = {
  granted: 'Сейчас разрешено: обезличенная статистика посещений отправляется на наш сервер.',
  denied: 'Сейчас запрещено: статистика не собирается.',
  unset: 'Вы ещё не решили. Пока статистика не собирается.',
}

export function AnalyticsSettings() {
  const consent = useAnalyticsConsent()
  if (!analyticsConfigured || consent === undefined) return null

  const change = async (next: AnalyticsConsent) => {
    await localDataStore.setAnalyticsConsent(next)
    // A loaded tracker cannot be unloaded; a fresh page starts without it.
    if (next === 'denied' && isAnalyticsLoaded()) location.reload()
  }

  return (
    <Panel className="mt-4 grid max-w-lg gap-3">
      <div>
        <strong>Статистика</strong>
        <p className="mt-1 text-xs text-[var(--muted)]">{statusText[consent ?? 'unset']}</p>
      </div>
      <div>
        {consent === 'granted' ? (
          <Button onClick={() => void change('denied')}>Запретить</Button>
        ) : (
          <Button onClick={() => void change('granted')}>Разрешить</Button>
        )}
      </div>
    </Panel>
  )
}
