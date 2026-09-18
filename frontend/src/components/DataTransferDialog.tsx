import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import { motion } from 'motion/react'
import { localDataStore } from '../domain/localDataStore'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'

type Props = {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function DataTransferDialog({ open, onClose, onImported }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const importData = async () => {
    try {
      const parsed = JSON.parse(value)
      await localDataStore.importSnapshot(parsed)
      setValue('')
      setError('')
      onImported()
      onClose()
    } catch {
      setError('Не удалось импортировать данные. Проверьте JSON и попробуйте снова.')
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-[var(--overlay)] min-[701px]:grid min-[701px]:place-items-center min-[701px]:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.section
        className="fixed inset-x-0 bottom-0 rounded-t-2xl bg-[var(--surface)] p-4 shadow-2xl min-[701px]:static min-[701px]:w-full min-[701px]:max-w-lg min-[701px]:rounded-2xl min-[701px]:p-5"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-transfer-title"
      >
        <header className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-xl font-semibold" id="data-transfer-title">
            Импорт данных
          </h2>
          <IconButton aria-label="Закрыть" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Вставьте JSON, экспортированный из приложения.
        </p>
        <textarea
          className="mt-4 min-h-48 w-full resize-y rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] p-3 font-mono text-xs outline-none focus:border-[var(--accent)]"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder='{"preferences": {...}, "notes": [...]}'
          aria-label="Данные для импорта"
        />
        {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={importData} disabled={!value.trim()}>
            <Upload size={16} />
            Импортировать
          </Button>
        </div>
      </motion.section>
    </motion.div>
  )
}
