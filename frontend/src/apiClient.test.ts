import { ApiError, api, apiErrorMessage, authEvents, authStorage, buildAPIPath } from './api/client.js'

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: got ${String(actual)}, want ${String(expected)}`)
  }
}

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key)
    },
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

const originalFetch = globalThis.fetch
const originalLocalStorage = globalThis.localStorage

Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage(),
  configurable: true,
})

let expiredEvents = 0
let authorization = ''
const unsubscribe = authEvents.onExpired(() => {
  expiredEvents += 1
})

assertEqual(buildAPIPath('/api', '/site'), '/api/site', 'same-origin API base builds a relative URL')
assertEqual(buildAPIPath('/api/', '/site', { lang: 'zh-CN', empty: '', page: 2 }), '/api/site?lang=zh-CN&page=2', 'same-origin API query filters empty values')
assertEqual(buildAPIPath('http://localhost:8080/api', '/site'), 'http://localhost:8080/api/site', 'absolute API base stays absolute')

globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
  const headers = new Headers(init?.headers)
  authorization = headers.get('Authorization') ?? ''
  return new Response(JSON.stringify({ error: '登录状态已失效' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}) as typeof fetch

authStorage.setToken('stale-token')

try {
  await api.me()
  throw new Error('api.me should fail for unauthorized response')
} catch (err) {
  assertEqual(err instanceof ApiError, true, 'unauthorized request throws ApiError')
  assertEqual((err as ApiError).status, 401, 'unauthorized status is preserved')
}

assertEqual(authorization, 'Bearer stale-token', 'stored token is sent before expiration')
assertEqual(authStorage.token ?? '', '', 'stale token is cleared')
assertEqual(expiredEvents, 1, 'auth expired event is emitted')

let logoutUrl = ''
let logoutMethod = ''
let logoutAuthorization = ''
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const headers = new Headers(init?.headers)
  logoutUrl = String(input)
  logoutMethod = init?.method ?? 'GET'
  logoutAuthorization = headers.get('Authorization') ?? ''
  return new Response(null, { status: 204 })
}) as typeof fetch

authStorage.setToken('fresh-token')
await api.logout()

assertEqual(new URL(logoutUrl).pathname, '/api/admin/logout', 'logout endpoint path')
assertEqual(logoutMethod, 'POST', 'logout request method')
assertEqual(logoutAuthorization, 'Bearer fresh-token', 'logout sends stored token')

let archivesUrl = ''
globalThis.fetch = (async (input: RequestInfo | URL) => {
  archivesUrl = String(input)
  return new Response(JSON.stringify([]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}) as typeof fetch

await api.archives({ lang: 'en' })
const archivesURL = new URL(archivesUrl)
assertEqual(archivesURL.pathname, '/api/archives', 'archives endpoint path')
assertEqual(archivesURL.searchParams.get('lang') ?? '', 'en', 'archives request carries selected language')

let expiredStoredAuthorization = 'unset'
globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
  const headers = new Headers(init?.headers)
  expiredStoredAuthorization = headers.get('Authorization') ?? ''
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}) as typeof fetch

const past = new Date(Date.now() - 60_000).toISOString()
authStorage.setToken('expired-before-request', past)
assertEqual(authStorage.token ?? '', '', 'expired stored token is cleared when read')
await api.site()
assertEqual(expiredStoredAuthorization, '', 'expired stored token is not sent')

globalThis.fetch = (async () =>
  new Response(JSON.stringify({ error: '服务器错误' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch

try {
  await api.site()
  throw new Error('api.site should fail for server error response')
} catch (err) {
	assertEqual(apiErrorMessage(err, 'Localized fallback'), '服务器错误', 'server API error message is preserved')
	assertEqual(apiErrorMessage(err, 'Localized fallback', 'zh-CN'), '服务器错误', 'Chinese UI preserves Chinese server API error')
	assertEqual(apiErrorMessage(err, 'Localized fallback', 'en'), 'Localized fallback', 'non-Chinese UI uses localized fallback for Chinese server API error')
}

assertEqual(apiErrorMessage(new ApiError('Server failed', 500), 'Localized fallback', 'en'), 'Server failed', 'non-Chinese UI preserves non-Chinese server API error')

globalThis.fetch = (async () =>
  new Response(JSON.stringify({}), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch

try {
  await api.site()
  throw new Error('api.site should fail for empty error response')
} catch (err) {
  assertEqual(err instanceof ApiError, true, 'empty error response still throws ApiError')
  assertEqual((err as ApiError).message, '', 'empty error response leaves message empty')
  assertEqual(apiErrorMessage(err, 'Localized fallback'), 'Localized fallback', 'empty API error uses localized fallback')
}

unsubscribe()
globalThis.fetch = originalFetch
Object.defineProperty(globalThis, 'localStorage', {
  value: originalLocalStorage,
  configurable: true,
})
