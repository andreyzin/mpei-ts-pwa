import type { ScheduleTarget } from '../domain/models'
import { SettingsScreen } from '../components/SettingsScreen'

type Props = {
  target: ScheduleTarget | null
  onTargetChange: (target: ScheduleTarget | null) => void
}

export function SettingsPage({ target, onTargetChange }: Props) {
  return <SettingsScreen group={target} onGroupChange={onTargetChange} />
}
