import assert from 'node:assert/strict'

import pricesHandler from '../../api/prices'
import quoteHandler from '../../api/quote'
import statusHandler from '../../api/status'

type MockReq = {
  method: string
  query: Record<string, string | undefined>
}

type MockRes = {
  headers: Record<string, string>
  statusCode: number
  body: unknown
  ended: boolean
  setHeader: (key: string, value: string) => void
  status: (code: number) => MockRes
  json: (payload: unknown) => MockRes
  end: () => MockRes
}

function createMockRes(): MockRes {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    ended: false,
    setHeader(key: string, value: string) {
      this.headers[key] = value
    },
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
    end() {
      this.ended = true
      return this
    },
  }
}

async function testQuoteRejectsMissingParams() {
  const req: MockReq = { method: 'GET', query: {} }
  const res = createMockRes()

  await quoteHandler(req as never, res as never)

  assert.equal(res.statusCode, 400)
  const body = res.body as { error?: string }
  assert.equal(body.error, 'Missing required parameters')
}

async function testStatusRejectsBadHash() {
  const req: MockReq = { method: 'GET', query: { txHash: '0x1234' } }
  const res = createMockRes()

  await statusHandler(req as never, res as never)

  assert.equal(res.statusCode, 400)
  const body = res.body as { error?: string }
  assert.equal(body.error, 'Invalid transaction hash format')
}

async function testPricesCacheIsCurrencyScoped() {
  const originalFetch = globalThis.fetch
  let fetchCalls = 0

  globalThis.fetch = (async (input: URL | RequestInfo, _init?: RequestInit) => {
    fetchCalls += 1
    const url = String(input)

    if (url.includes('vs_currencies=eur')) {
      return {
        ok: true,
        json: async () => ({ ethereum: { eur: 1234 } }),
      } as Response
    }

    if (url.includes('vs_currencies=usd')) {
      return {
        ok: true,
        json: async () => ({ ethereum: { usd: 2345 } }),
      } as Response
    }

    return {
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response
  }) as typeof fetch

  try {
    const reqEur: MockReq = { method: 'GET', query: { tokens: 'ETH', vs: 'eur' } }
    const resEur = createMockRes()
    await pricesHandler(reqEur as never, resEur as never)

    assert.equal(resEur.statusCode, 200)
    const bodyEur = resEur.body as {
      data: Record<string, { price: number; currency: string }>
    }
    assert.equal(bodyEur.data.eth.price, 1234)
    assert.equal(bodyEur.data.eth.currency, 'EUR')

    const reqUsd: MockReq = { method: 'GET', query: { tokens: 'ETH', vs: 'usd' } }
    const resUsd = createMockRes()
    await pricesHandler(reqUsd as never, resUsd as never)

    assert.equal(resUsd.statusCode, 200)
    const bodyUsd = resUsd.body as {
      data: Record<string, { price: number; currency: string }>
    }
    assert.equal(bodyUsd.data.eth.price, 2345)
    assert.equal(bodyUsd.data.eth.currency, 'USD')

    assert.ok(fetchCalls >= 2, 'Expected separate upstream calls for EUR and USD caches')
  } finally {
    globalThis.fetch = originalFetch
  }
}

async function run() {
  const tests: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: 'quote missing params validation', fn: testQuoteRejectsMissingParams },
    { name: 'status txHash validation', fn: testStatusRejectsBadHash },
    { name: 'prices cache separated by currency', fn: testPricesCacheIsCurrencyScoped },
  ]

  for (const t of tests) {
    await t.fn()
    console.log(`PASS ${t.name}`)
  }
}

run().catch((error) => {
  console.error('API contract tests failed')
  console.error(error)
  process.exitCode = 1
})
