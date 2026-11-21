import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)))

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
}

export async function startServer() {
  const server = createServer(async (request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname))

    const file =
      path === '/'
        ? join(PACKAGE, 'tests/fixtures/smoke.html')
        : path.startsWith('/dist/')
          ? join(PACKAGE, path)
          : path.startsWith('/assets/')
            ? join(PACKAGE, 'dist', path)
            : null

    if (!file) {
      response.writeHead(404).end()

      return
    }

    try {
      const body = await readFile(file)
      response.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      })
      response.end(body)
    } catch {
      response.writeHead(404).end()
    }
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()

  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}
