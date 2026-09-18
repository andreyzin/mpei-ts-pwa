import { Download } from 'lucide-react'
import { Button } from './ui/Button'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

export function InstallPwaButton() {
  const { canInstall, install } = useInstallPrompt()
  if (!canInstall) return null

  return (
    <Button variant="soft" className="mt-4" onClick={() => void install()}>
      <Download size={16} />
      Установить приложение
    </Button>
  )
}
