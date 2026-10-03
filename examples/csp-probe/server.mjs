import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT ?? 4321)
const here = (path) => fileURLToPath(new URL(path, import.meta.url))
const reports = new Map()

const DISCOVER_POLICY =
  "default-src 'none'; script-src 'self' 'unsafe-inline'; report-uri /csp-report"

const sendFile = async (response, path, type, headers = {}) => {
  response.writeHead(200, { 'content-type': type, ...headers })
  response.end(await readFile(here(path)))
}

const readBody = async (request) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const originOf = (uri) => {
  try {
    return new URL(uri).origin
  } catch {
    return uri
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`)

  if (request.method === 'POST' && url.pathname === '/csp-report') {
    const payload = JSON.parse(await readBody(request))
    const report = payload['csp-report'] ?? payload
    const directive = report['effective-directive'] ?? report['violated-directive']
    const blocked = originOf(report['blocked-uri'])
    reports.set(`${directive}|${blocked}`, { directive, blocked })
    console.log('[csp-report]', JSON.stringify({ directive, blocked }))
    response.writeHead(204).end()
    return
  }

  if (url.pathname === '/csp-reports') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify([...reports.values()], null, 2))
    return
  }

  if (url.pathname === '/araute.global.js') {
    await sendFile(response, '../../dist/araute.global.js', 'text/javascript')
    return
  }

  if (url.pathname === '/violations.js' || url.pathname === '/main.js') {
    await sendFile(response, `.${url.pathname}`, 'text/javascript')
    return
  }

  if (url.pathname === '/') {
    const mode = url.searchParams.get('mode') ?? 'discover'
    const headers =
      mode === 'enforce'
        ? { 'Content-Security-Policy': (await readFile(here('policy.txt'), 'utf8')).trim() }
        : { 'Content-Security-Policy-Report-Only': DISCOVER_POLICY }
    await sendFile(response, 'index.html', 'text/html; charset=utf-8', headers)
    return
  }

  response.writeHead(404).end()
}).listen(port, () => console.log(`csp-probe em http://localhost:${port}`))
