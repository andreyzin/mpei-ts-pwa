const scriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL
const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
const umami = scriptUrl && websiteId ? { scriptUrl, websiteId } : null

/** Without both values there is nothing to consent to, and no banner is shown. */
export const analyticsConfigured = umami !== null

let loaded = false

export function isAnalyticsLoaded(): boolean {
  return loaded
}

/** Umami is only fetched after consent; until then no request leaves for it. */
export function loadAnalytics(): void {
  if (!umami || loaded) return
  const script = document.createElement('script')
  script.defer = true
  script.src = umami.scriptUrl
  script.dataset.websiteId = umami.websiteId
  document.head.append(script)
  loaded = true
}
