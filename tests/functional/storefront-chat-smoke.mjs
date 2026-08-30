const storefrontUrl = process.env.STOREFRONT_URL ?? "http://localhost:8000"
const startedAt = performance.now()
const response = await fetch(`${storefrontUrl}/api/chat`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    messages: [
      {
        role: "user",
        content: "Chào bạn, hãy giới thiệu ngắn gọn bạn có thể hỗ trợ gì.",
      },
    ],
  }),
  signal: AbortSignal.timeout(180_000),
})

if (!response.ok || !response.body) {
  throw new Error(
    `Storefront chat returned HTTP ${response.status}: ${await response.text()}`
  )
}

const decoder = new TextDecoder()
let buffer = ""
let answer = ""
let firstContentAt
let reasoningChunks = 0

function processLine(line) {
  const trimmedLine = line.trim()
  if (!trimmedLine.startsWith("data:")) return

  const rawEvent = trimmedLine.slice(5).trim()
  if (!rawEvent || rawEvent === "[DONE]") return

  const event = JSON.parse(rawEvent)
  const delta = event.choices?.[0]?.delta

  if (delta?.reasoning_content) reasoningChunks += 1
  if (delta?.content) {
    firstContentAt ??= performance.now()
    answer += delta.content
  }
}

for await (const chunk of response.body) {
  buffer += decoder.decode(chunk, { stream: true })
  const lines = buffer.split("\n")
  buffer = lines.pop() ?? ""
  lines.forEach(processLine)
}

buffer += decoder.decode()
if (buffer) processLine(buffer)

if (answer.trim().length < 10) {
  throw new Error(`Expected a useful answer; received: ${answer || "empty response"}`)
}

console.log("Storefront chat smoke test passed")
console.log(`Answer: ${answer.trim().replaceAll(/\s+/g, " ").slice(0, 160)}`)
console.log(
  `Time to visible content: ${firstContentAt ? (firstContentAt - startedAt).toFixed(0) : "n/a"} ms`
)
console.log(`Reasoning chunks hidden by widget: ${reasoningChunks}`)
console.log(`Total time: ${(performance.now() - startedAt).toFixed(0)} ms`)
