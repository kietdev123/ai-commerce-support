import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

const MAX_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 2_000

function getApiKey() {
  const apiKey = process.env.DIFY_API_KEY?.trim()
  if (!apiKey) throw new Error("DIFY_API_KEY is empty")
  return apiKey
}

function parseMessages(value: unknown): ChatMessage[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_MESSAGES
  ) {
    return null
  }

  const messages: ChatMessage[] = []

  for (const item of value) {
    if (!item || typeof item !== "object") return null

    const role = "role" in item ? item.role : undefined
    const content = "content" in item ? item.content : undefined

    if (
      (role !== "user" && role !== "assistant") ||
      typeof content !== "string" ||
      !content.trim() ||
      content.length > MAX_MESSAGE_LENGTH
    ) {
      return null
    }

    messages.push({ role, content: content.trim() })
  }

  if (messages.at(-1)?.role !== "user") return null

  return messages
}

export async function POST(request: Request) {
  let body: {
    messages?: unknown
    conversationId?: unknown
    user?: unknown
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu gửi lên không hợp lệ." },
      { status: 400 },
    )
  }

  const messages = parseMessages(body.messages)
  if (!messages) {
    return NextResponse.json(
      { error: "Hội thoại không hợp lệ hoặc vượt quá giới hạn." },
      { status: 400 },
    )
  }

  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId.trim() : ""
  const user = typeof body.user === "string" ? body.user.trim() : ""

  if (conversationId.length > 128 || !user || user.length > 128) {
    return NextResponse.json(
      { error: "Thông tin phiên hội thoại không hợp lệ." },
      { status: 400 },
    )
  }

  try {
    const apiKey = getApiKey()
    const difyApiUrl = (process.env.DIFY_API_URL ?? "http://dify/v1").replace(
      /\/$/,
      "",
    )
    const upstream = await fetch(`${difyApiUrl}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query: messages.at(-1)?.content,
        response_mode: "streaming",
        conversation_id: conversationId,
        user,
        files: [],
        auto_generate_name: false,
      }),
      cache: "no-store",
      signal: request.signal,
    })

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text()
      console.error(
        `Dify chat failed with HTTP ${upstream.status}: ${detail.slice(
          0,
          500,
        )}`,
      )
      return NextResponse.json(
        { error: "Trợ lý AI đang tạm thời không phản hồi." },
        { status: 502 },
      )
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type":
          upstream.headers.get("content-type") ?? "text/event-stream",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    console.error("Storefront chat integration failed", error)
    return NextResponse.json(
      { error: "Không thể kết nối tới trợ lý AI." },
      { status: 503 },
    )
  }
}
