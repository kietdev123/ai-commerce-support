const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434"
const openWebUiUrl = process.env.OPEN_WEBUI_URL ?? "http://localhost:3000"
const model = process.env.OLLAMA_DEFAULT_MODEL ?? "qwen3:1.7b"

async function fetchJson(url, options = {}, timeoutMs = 180_000) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
  }

  return response.json()
}

const startedAt = performance.now()
const version = await fetchJson(`${ollamaUrl}/api/version`)
const tags = await fetchJson(`${ollamaUrl}/api/tags`)
const modelNames = tags.models.map((item) => item.name)

if (!modelNames.includes(model)) {
  throw new Error(`Expected ${model}; available models: ${modelNames.join(", ") || "none"}`)
}

const generationStartedAt = performance.now()
const chat = await fetchJson(
  `${ollamaUrl}/api/chat`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Chỉ trả lời đúng một từ: OK" }],
      stream: false,
      think: false,
      options: { temperature: 0, num_predict: 16 },
    }),
  },
  300_000,
)
const generationMs = performance.now() - generationStartedAt

if (!chat.message?.content?.trim()) {
  throw new Error("Ollama returned an empty chat response")
}

const webUiHealth = await fetch(`${openWebUiUrl}/health`, {
  signal: AbortSignal.timeout(30_000),
})

if (!webUiHealth.ok) {
  throw new Error(`Open WebUI health returned HTTP ${webUiHealth.status}`)
}

const webUiConfig = await fetchJson(`${openWebUiUrl}/api/config`, {}, 30_000)

if (webUiConfig.features?.auth !== false) {
  throw new Error("Open WebUI is not running in the expected local single-user mode")
}

console.log("Phase 2 smoke test passed")
console.log(`Ollama version: ${version.version}`)
console.log(`Available models: ${modelNames.join(", ")}`)
console.log(`Default model: ${model}`)
console.log(`Response: ${chat.message.content.trim().replaceAll(/\s+/g, " ").slice(0, 120)}`)
console.log(`Generation time: ${generationMs.toFixed(0)} ms`)
console.log(`Total smoke-test time: ${(performance.now() - startedAt).toFixed(0)} ms`)
console.log(`Open WebUI: ${openWebUiUrl}/health (${webUiHealth.status})`)
console.log(`Open WebUI auth: ${webUiConfig.features.auth}`)
