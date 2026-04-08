import { readdir, stat, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const SITE_ORIGIN = 'https://eonswap.us'
const ROOT_DIR = new URL('../', import.meta.url).pathname
const DOCS_DIR = join(ROOT_DIR, 'documentation', 'docs')
const OUTPUT_FILE = join(ROOT_DIR, 'public', 'sitemap.xml')

const APP_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/swap', changefreq: 'daily', priority: '0.9' },
  { path: '/bridge', changefreq: 'daily', priority: '0.9' },
  { path: '/earn', changefreq: 'weekly', priority: '0.7' },
  { path: '/activity', changefreq: 'daily', priority: '0.7' },
  { path: '/status', changefreq: 'hourly', priority: '0.8' },
  { path: '/docs', changefreq: 'weekly', priority: '0.8' },
  { path: '/faq', changefreq: 'weekly', priority: '0.7' },
  { path: '/contact-support', changefreq: 'monthly', priority: '0.6' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/careers', changefreq: 'weekly', priority: '0.4' },
  { path: '/press-kit', changefreq: 'monthly', priority: '0.5' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/risk-disclosure', changefreq: 'yearly', priority: '0.3' },
  { path: '/disclaimer', changefreq: 'yearly', priority: '0.3' },
  { path: '/aml-policy', changefreq: 'yearly', priority: '0.3' },
]

async function collectMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '.vitepress') continue
      files.push(...(await collectMarkdownFiles(fullPath)))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(fullPath)
  }
  return files
}

function docsRouteFromFile(filePath) {
  const rel = relative(DOCS_DIR, filePath)
  if (rel.startsWith('..')) return null
  const normalized = rel.split('\\').join('/')
  const withoutExt = normalized.replace(/\.md$/i, '')
  if (withoutExt === 'index') return '/docs/'
  return `/docs/${withoutExt}`
}

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

async function main() {
  const now = new Date().toISOString()
  const routes = new Map()

  for (const route of APP_ROUTES) {
    routes.set(route.path, { ...route, lastmod: now })
  }

  const docsFiles = await collectMarkdownFiles(DOCS_DIR)
  for (const filePath of docsFiles) {
    const route = docsRouteFromFile(filePath)
    if (!route) continue
    const fileStats = await stat(filePath)
    const key = route.endsWith('/') && route !== '/' ? route.slice(0, -1) : route
    routes.set(key, {
      path: key,
      changefreq: 'weekly',
      priority: key === '/docs' ? '0.8' : '0.6',
      lastmod: fileStats.mtime.toISOString(),
    })
  }

  const sorted = [...routes.values()].sort((a, b) => a.path.localeCompare(b.path))
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sorted.map((entry) => {
      const loc = `${SITE_ORIGIN}${entry.path}`
      return [
        '  <url>',
        `    <loc>${xmlEscape(loc)}</loc>`,
        `    <lastmod>${entry.lastmod}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ].join('\n')
    }),
    '</urlset>',
    '',
  ]

  await writeFile(OUTPUT_FILE, lines.join('\n'), 'utf8')
  process.stdout.write(`Generated sitemap with ${sorted.length} URLs\n`)
}

main().catch((error) => {
  process.stderr.write(`Failed to generate sitemap: ${String(error)}\n`)
  process.exit(1)
})
