import { descriptionForPathname, robotsForPathname, titleForPathname } from './pageTitles'

function setMetaContent(selector: string, content: string) {
  const el = document.head.querySelector(selector)
  if (el) el.setAttribute('content', content)
}

/** Keep Open Graph / Twitter titles and URLs aligned with the current route (SPA). */
export function syncSocialMetaForRoute(pathname: string) {
  const title = titleForPathname(pathname)
  const description = descriptionForPathname(pathname)
  const robots = robotsForPathname(pathname)
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  const url = `${window.location.origin}${path}`

  setMetaContent('meta[property="og:title"]', title)
  setMetaContent('meta[name="twitter:title"]', title)
  setMetaContent('meta[name="description"]', description)
  setMetaContent('meta[property="og:description"]', description)
  setMetaContent('meta[name="twitter:description"]', description)
  setMetaContent('meta[name="robots"]', robots)
  setMetaContent('meta[property="og:url"]', url)

  let canonical = document.head.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = url
}
