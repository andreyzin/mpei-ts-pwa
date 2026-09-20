import { useEffect, useState } from 'react'

/** One breakpoint for the whole app: below it, layouts are built for a thumb. */
export const MOBILE_MEDIA_QUERY = '(max-width: 700px)'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => matchMedia(MOBILE_MEDIA_QUERY).matches)

  useEffect(() => {
    const media = matchMedia(MOBILE_MEDIA_QUERY)
    const handler = () => setIsMobile(media.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  return isMobile
}
