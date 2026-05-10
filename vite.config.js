import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** Dev のみ: POST /api/anthropic を Anthropic へ中継し API キーはサーバー側 (.env の ANTHROPIC_API_KEY) で付与 */
function anthropicDevProxy(env) {
  return {
    name: 'anthropic-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathOnly = req.url?.split('?')[0] ?? ''
        if (pathOnly !== '/api/anthropic') {
          next()
          return
        }
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: { message: 'Method not allowed' } }))
          return
        }

        const apiKey =
          env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim()
        if (!apiKey) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: {
                message:
                  '開発環境に ANTHROPIC_API_KEY が設定されていません。.env に ANTHROPIC_API_KEY を設定してください（VITE_ プレフィックスは不要です）。',
              },
            }),
          )
          return
        }

        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const bodyRaw = Buffer.concat(chunks)

        const ver =
          req.headers['anthropic-version'] ||
          req.headers['Anthropic-Version'] ||
          '2023-06-01'
        const anthropicVersion = Array.isArray(ver) ? ver[0] : ver

        try {
          const upstream = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'content-type':
                req.headers['content-type'] || 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': anthropicVersion,
            },
            body: bodyRaw,
          })
          const text = await upstream.text()
          const ct =
            upstream.headers.get('content-type') || 'application/json'
          res.statusCode = upstream.status
          res.setHeader('Content-Type', ct)
          res.end(text)
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: {
                message:
                  e instanceof Error ? e.message : 'Upstream request failed',
              },
            }),
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), anthropicDevProxy(env)],
    server: {
      proxy: {
        '/openai-api': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/openai-api/, ''),
        },
      },
    },
  }
})
