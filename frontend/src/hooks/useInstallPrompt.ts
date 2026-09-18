import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPromptEvent)
    }
    addEventListener('beforeinstallprompt', capturePrompt)
    return () => removeEventListener('beforeinstallprompt', capturePrompt)
  }, [])

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }

  return { canInstall: prompt !== null, install }
}
