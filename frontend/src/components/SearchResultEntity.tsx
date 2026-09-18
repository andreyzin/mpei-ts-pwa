import type { EntityRef } from '../domain/models'

type SearchEntity = EntityRef & { description?: string }

type SearchResultEntityProps = {
  entity: SearchEntity
  onSelect: (entity: EntityRef) => void
}

export function SearchResultEntity({ entity, onSelect }: SearchResultEntityProps) {
  return (
    <button
      type="button"
      className="grid w-full gap-1 border-b border-[var(--line)] px-3 py-3 text-left last:border-b-0 hover:bg-[var(--accent-soft)]"
      onClick={() => onSelect(entity)}
    >
      <strong className="text-sm">{entity.name}</strong>
      {entity.description && (
        <span className="text-xs text-[var(--muted)]">{entity.description}</span>
      )}
    </button>
  )
}
