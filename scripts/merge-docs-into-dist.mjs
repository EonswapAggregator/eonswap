import { cp, mkdir, rm } from 'node:fs/promises'

const appDistDir = new URL('../dist/', import.meta.url)
const docsBuildDir = new URL('../documentation/docs/.vitepress/dist/', import.meta.url)
const docsTargetDir = new URL('../dist/docs/', import.meta.url)

async function main() {
  await mkdir(appDistDir, { recursive: true })
  await rm(docsTargetDir, { recursive: true, force: true })
  await cp(docsBuildDir, docsTargetDir, { recursive: true })
  process.stdout.write('Merged VitePress docs into dist/docs\n')
}

main().catch((error) => {
  process.stderr.write(`Failed to merge docs build: ${String(error)}\n`)
  process.exit(1)
})
