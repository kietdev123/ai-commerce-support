const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434"
const models = (process.env.OLLAMA_MODELS ?? "qwen3:1.7b,llama3.2:1b")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean)

const prompt =
  process.env.BENCHMARK_PROMPT ??
  "Một khách hàng cần laptop để lập trình, RAM tối thiểu 16GB, ngân sách 25 triệu đồng. Hãy tư vấn trong tối đa 3 câu."

async function requestJson(path, body, timeoutMs = 600_000) {
  const response = await fetch(`${ollamaUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
  }

  return response.json()
}

async function benchmark(model) {
  await requestJson("/api/chat", {
    model,
    messages: [{ role: "user", content: "Trả lời: sẵn sàng" }],
    stream: false,
    think: false,
    keep_alive: "10m",
    options: { temperature: 0, num_predict: 8 },
  })

  const startedAt = performance.now()
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: true,
      think: false,
      keep_alive: "10m",
      options: { temperature: 0, num_predict: 96 },
    }),
    signal: AbortSignal.timeout(600_000),
  })

  if (!response.ok || !response.body) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
  }

  let buffer = ""
  let firstTokenAt
  let finalChunk
  let content = ""

  for await (const chunk of response.body) {
    buffer += Buffer.from(chunk).toString("utf8")
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      if (!line.trim()) continue

      const event = JSON.parse(line)
      if (event.message?.content) {
        firstTokenAt ??= performance.now()
        content += event.message.content
      }
      if (event.done) finalChunk = event
    }
  }

  if (buffer.trim()) {
    const event = JSON.parse(buffer)
    if (event.message?.content) {
      firstTokenAt ??= performance.now()
      content += event.message.content
    }
    if (event.done) finalChunk = event
  }

  if (!finalChunk) throw new Error(`No final benchmark event for ${model}`)

  const runningModels = await requestJson("/api/ps")
  const running = runningModels.models?.find(
    (item) => item.name === model || item.model === model,
  )
  const evalSeconds = (finalChunk.eval_duration ?? 0) / 1_000_000_000

  return {
    model,
    ttftMs: firstTokenAt ? firstTokenAt - startedAt : undefined,
    wallMs: performance.now() - startedAt,
    outputTokens: finalChunk.eval_count ?? 0,
    tokensPerSecond: evalSeconds ? finalChunk.eval_count / evalSeconds : 0,
    memoryGb: running?.size ? running.size / 1024 ** 3 : undefined,
    vramGb: running?.size_vram ? running.size_vram / 1024 ** 3 : 0,
    preview: content.trim().replaceAll(/\s+/g, " ").slice(0, 100),
  }
}

const results = []

for (const model of models) {
  console.error(`Benchmarking ${model}...`)
  results.push(await benchmark(model))
}

console.log("| Model | TTFT | Tổng thời gian | Output | Tốc độ | RAM model | VRAM |")
console.log("| --- | ---: | ---: | ---: | ---: | ---: | ---: |")
for (const result of results) {
  console.log(
    `| ${result.model} | ${result.ttftMs?.toFixed(0) ?? "n/a"} ms | ${(
      result.wallMs / 1000
    ).toFixed(2)} s | ${result.outputTokens} tokens | ${result.tokensPerSecond.toFixed(
      2,
    )} tok/s | ${result.memoryGb?.toFixed(2) ?? "n/a"} GB | ${result.vramGb.toFixed(2)} GB |`,
  )
}

console.log("\nResponse previews:")
for (const result of results) console.log(`- ${result.model}: ${result.preview}`)
