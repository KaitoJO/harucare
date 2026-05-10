/** Vercel serverless: forwards POST body to Anthropic; API key は環境変数のみ（クライアントには載せない） */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, anthropic-version',
  )

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    res
      .status(503)
      .json({
        error: {
          message:
            'サーバーに ANTHROPIC_API_KEY が設定されていません。Vercel の環境変数を確認してください。',
        },
      })
    return
  }

  const anthropicVersion =
    req.headers['anthropic-version'] || '2023-06-01'

  const body =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body
      : {}

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': Array.isArray(anthropicVersion)
        ? anthropicVersion[0]
        : anthropicVersion,
    },
    body: JSON.stringify(body),
  })

  const text = await upstream.text()
  const ct = upstream.headers.get('content-type') || 'application/json'
  res.status(upstream.status).setHeader('Content-Type', ct).send(text)
}
