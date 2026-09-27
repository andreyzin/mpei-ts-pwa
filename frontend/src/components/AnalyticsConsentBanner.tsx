import { localDataStore } from '../domain/localDataStore'
import { Button } from './ui/Button'

/** Sits above the bottom navigation until the person answers once. */
export function AnalyticsConsentBanner() {
  return (
    <section
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-lg rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-lg"
      aria-labelledby="analytics-consent-title"
    >
      <strong id="analytics-consent-title">Статистика посещений</strong>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Разрешите собирать обезличенную статистику: какие экраны открывают и с каких устройств. Она
        хранится на нашем сервере и не передаётся рекламным сетям. Решение можно поменять в
        настройках.
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button
          className="min-h-11"
          variant="ghost"
          onClick={() => void localDataStore.setAnalyticsConsent('denied')}
        >
          Не разрешать
        </Button>
        <Button
          className="min-h-11"
          variant="default"
          onClick={() => void localDataStore.setAnalyticsConsent('granted')}
        >
          Разрешить
        </Button>
      </div>
    </section>
  )
}
