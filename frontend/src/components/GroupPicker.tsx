import { Search, X } from 'lucide-react'
import { useState } from 'react'
import type { ScheduleTarget, ScheduleTargetType } from '../domain/models'
import { useEntitySearch } from '../hooks/useGroupSearch'
import { SearchResultEntity } from './SearchResultEntity'
import { IconButton } from './ui/IconButton'

type Props = { value: ScheduleTarget | null; onChange: (target: ScheduleTarget | null) => void }

export function GroupPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<ScheduleTargetType>('group')
  const results = useEntitySearch(query, type)

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2">
        <span>{value.name}</span>
        <IconButton aria-label="Сменить группу" onClick={() => onChange(null)}>
          <X size={16} />
        </IconButton>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="schedule-target-search">
        Расписание для
      </label>
      <div className="mb-2 flex gap-1">
        {(['group', 'teacher', 'room'] as const).map((item) => (
          <button
            className={`rounded-md px-2 py-1 text-xs ${type === item ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)]'}`}
            key={item}
            type="button"
            onClick={() => {
              setType(item)
              setQuery('')
            }}
          >
            {item === 'group' ? 'Группа' : item === 'teacher' ? 'Преподаватель' : 'Аудитория'}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2">
        <Search size={16} aria-hidden="true" />
        <input
          className="min-w-0 flex-1 border-0 bg-transparent font-inherit outline-none"
          id="schedule-target-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            type === 'group'
              ? 'Например, А-18-26'
              : type === 'teacher'
                ? 'Фамилия преподавателя'
                : 'Номер аудитории'
          }
          autoComplete="off"
        />
      </div>
      {results.isError && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Не удалось выполнить поиск. Проверьте соединение.
        </p>
      )}
      {results.data && results.data.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface)] shadow-lg">
          {results.data.map((item) => (
            <li key={item.id}>
              <SearchResultEntity
                entity={{
                  id: item.id,
                  name: item.name,
                  description: item.faculty?.name ?? item.description,
                }}
                onSelect={(entity) => {
                  onChange({ id: entity.id, name: entity.name, type })
                  setQuery('')
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
