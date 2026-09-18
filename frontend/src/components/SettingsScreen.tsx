import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Download, Upload } from 'lucide-react'
import type { ScheduleTarget } from '../domain/models'
import { localDataStore } from '../domain/localDataStore'
import { exportLocalData } from '../domain/dataTransfer'
import { GroupPicker } from './GroupPicker'
import { Button } from './ui/Button'
import { Panel } from './ui/Panel'
import { DataTransferDialog } from './DataTransferDialog'

export function SettingsScreen({
  group,
  onGroupChange,
}: {
  group: ScheduleTarget | null
  onGroupChange: (group: ScheduleTarget | null) => void
}) {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [deleteConfirmation, setDeleteConfirmation] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  useEffect(() => {
    localDataStore.getPreferences().then((preferences) => setTheme(preferences.theme))
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const updateTheme = (value: 'system' | 'light' | 'dark') => {
    setTheme(value)
    localDataStore.exportSnapshot().then((snapshot) =>
      localDataStore.importSnapshot({
        ...snapshot,
        preferences: { ...snapshot.preferences, theme: value },
      }),
    )
  }
  return (
    <section className="pt-6">
      <p className="m-0 text-[11px] font-bold tracking-[.14em] text-[var(--accent)]">ПРИЛОЖЕНИЕ</p>
      <h2 className="my-1 mb-6 text-3xl font-semibold tracking-tight">Настройки</h2>
      <Panel className="max-w-lg">
        <GroupPicker value={group} onChange={onGroupChange} />
      </Panel>
      <Panel className="mt-4 grid max-w-lg gap-4">
        <div>
          <strong>Тема</strong>
          <p className="mt-1 text-xs text-[var(--muted)]">Выбери оформление интерфейса.</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(['system', 'light', 'dark'] as const).map((value) => (
            <Button
              key={value}
              className={theme === value ? '!bg-[var(--accent)] !text-white' : ''}
              onClick={() => updateTheme(value)}
            >
              {value === 'system' ? 'Система' : value === 'light' ? 'Светлая' : 'Тёмная'}
            </Button>
          ))}
        </div>
      </Panel>
      <Panel className="mt-4 grid max-w-lg gap-3">
        <div>
          <strong>Данные</strong>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Перенесите настройки и заметки на другое устройство.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void exportLocalData()}>
            <Download size={16} />
            Экспорт
          </Button>
          <Button variant="ghost" onClick={() => setIsImportOpen(true)}>
            <Upload size={16} />
            Импорт
          </Button>
        </div>
      </Panel>
      <AnimatePresence>
        {isImportOpen && (
          <DataTransferDialog
            open={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onImported={() => undefined}
          />
        )}
      </AnimatePresence>
      <Button
        className="mt-3 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
        onClick={() => {
          if (!deleteConfirmation) {
            setDeleteConfirmation(true)
            return
          }
          void localDataStore.deleteAllNotes()
          setDeleteConfirmation(false)
        }}
      >
        {deleteConfirmation ? 'Точно удалить все заметки?' : 'Удалить все заметки'}
      </Button>
      {deleteConfirmation && (
        <button
          className="ml-2 text-sm text-[var(--muted)] underline-offset-2 hover:underline"
          type="button"
          onClick={() => setDeleteConfirmation(false)}
        >
          Отмена
        </button>
      )}
    </section>
  )
}
