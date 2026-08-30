"use client"

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type ChatWidgetProps = {
  customerName?: string | null
}

const SUGGESTED_QUESTIONS = [
  "Shop có chính sách đổi trả thế nào?",
  "Tư vấn laptop phù hợp để lập trình",
  "Tôi có thể thanh toán bằng cách nào?",
]

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export default function ChatWidget({ customerName }: ChatWidgetProps) {
  const welcomeMessage = customerName
    ? `Chào ${customerName}! Mình có thể tư vấn cách chọn sản phẩm và tiếp nhận câu hỏi mua hàng của bạn.`
    : "Xin chào! Mình có thể tư vấn cách chọn sản phẩm và tiếp nhận câu hỏi mua hàng của bạn."
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusText, setStatusText] = useState("Sẵn sàng hỗ trợ")
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: welcomeMessage },
  ])
  const abortControllerRef = useRef<AbortController | null>(null)
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isGenerating])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [])

  const updateAssistantMessage = (id: string, content: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, content } : message
      )
    )
  }

  const sendMessage = async (content: string) => {
    const trimmedContent = content.trim()
    if (!trimmedContent || isGenerating) return

    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: trimmedContent,
    }
    const assistantMessage: Message = {
      id: createId(),
      role: "assistant",
      content: "",
    }
    const conversation = [...messages, userMessage]
      .filter((message) => message.id !== "welcome")
      .slice(-12)
      .map(({ role, content: messageContent }) => ({
        role,
        content: messageContent,
      }))

    setMessages((current) => [...current, userMessage, assistantMessage])
    setInput("")
    setIsGenerating(true)
    setStatusText("Đang kết nối...")

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation }),
        signal: abortController.signal,
      })

      if (!response.ok || !response.body) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.error ?? "Trợ lý AI không phản hồi.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let fullResponse = ""

      const processLine = (line: string) => {
        const trimmedLine = line.trim()
        if (!trimmedLine.startsWith("data:")) return

        const rawEvent = trimmedLine.slice(5).trim()
        if (!rawEvent || rawEvent === "[DONE]") return

        try {
          const event = JSON.parse(rawEvent)
          const delta = event.choices?.[0]?.delta

          if (delta?.reasoning_content && !fullResponse) {
            setStatusText("Đang suy nghĩ...")
          }

          if (typeof delta?.content === "string" && delta.content) {
            fullResponse += delta.content
            updateAssistantMessage(assistantMessage.id, fullResponse)
            setStatusText("Đang trả lời...")
          }
        } catch {
          // Ignore non-JSON keep-alive events from the upstream SSE stream.
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        lines.forEach(processLine)
      }

      buffer += decoder.decode()
      if (buffer) processLine(buffer)

      if (!fullResponse.trim()) {
        throw new Error("Model không tạo được câu trả lời.")
      }

      setStatusText("Sẵn sàng hỗ trợ")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        updateAssistantMessage(assistantMessage.id, "Đã dừng câu trả lời.")
        setStatusText("Đã dừng")
      } else {
        updateAssistantMessage(
          assistantMessage.id,
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra. Vui lòng thử lại."
        )
        setStatusText("Mất kết nối")
      }
    } finally {
      abortControllerRef.current = null
      setIsGenerating(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendMessage(input)
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(input)
    }
  }

  const stopGenerating = () => abortControllerRef.current?.abort()

  return (
    <div className="fixed bottom-4 right-4 z-[70] sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          aria-label="Trợ lý mua sắm AI"
          className="mb-3 flex h-[min(640px,calc(100vh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-ui-border-base bg-ui-bg-base shadow-2xl sm:mb-4 sm:w-[390px]"
        >
          <header className="flex items-center justify-between border-b border-ui-border-base bg-ui-bg-subtle px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ui-fg-base text-ui-bg-base">
                <SparklesIcon />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ui-fg-base">
                  Trợ lý mua sắm
                </h2>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ui-fg-muted">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      statusText === "Mất kết nối"
                        ? "bg-red-500"
                        : "bg-emerald-500"
                    }`}
                  />
                  {statusText}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Đóng khung chat"
              className="rounded-full p-2 text-ui-fg-muted transition hover:bg-ui-bg-base-hover hover:text-ui-fg-base"
              onClick={() => setIsOpen(false)}
            >
              <CloseIcon />
            </button>
          </header>

          <div
            className="flex-1 space-y-4 overflow-y-auto bg-ui-bg-base px-4 py-4"
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${
                    message.role === "user"
                      ? "rounded-br-md bg-ui-fg-base text-ui-bg-base"
                      : "rounded-bl-md bg-ui-bg-subtle text-ui-fg-base"
                  }`}
                >
                  {message.content || (
                    <span
                      className="flex items-center gap-1 py-1"
                      aria-label="Đang trả lời"
                    >
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ui-fg-muted [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ui-fg-muted [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ui-fg-muted" />
                    </span>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium uppercase tracking-wide text-ui-fg-muted">
                  Câu hỏi gợi ý
                </p>
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    type="button"
                    key={question}
                    className="block w-full rounded-xl border border-ui-border-base px-3 py-2.5 text-left text-sm text-ui-fg-base transition hover:border-ui-border-strong hover:bg-ui-bg-subtle"
                    onClick={() => void sendMessage(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>

          <form
            className="border-t border-ui-border-base bg-ui-bg-base p-3"
            onSubmit={handleSubmit}
          >
            <div className="flex items-end gap-2 rounded-xl border border-ui-border-base bg-ui-bg-field px-3 py-2 focus-within:border-ui-border-interactive focus-within:ring-1 focus-within:ring-ui-border-interactive">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                maxLength={2_000}
                aria-label="Nhập câu hỏi"
                placeholder="Nhập câu hỏi của bạn..."
                className="max-h-24 min-h-6 flex-1 resize-none bg-transparent text-sm leading-6 text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
                disabled={isGenerating}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              {isGenerating ? (
                <button
                  type="button"
                  aria-label="Dừng trả lời"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ui-fg-base text-ui-bg-base"
                  onClick={stopGenerating}
                >
                  <StopIcon />
                </button>
              ) : (
                <button
                  type="submit"
                  aria-label="Gửi câu hỏi"
                  disabled={!input.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ui-fg-base text-ui-bg-base transition disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <SendIcon />
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-[10px] leading-4 text-ui-fg-muted">
              AI có thể trả lời chưa chính xác. Vui lòng kiểm tra thông tin quan
              trọng.
            </p>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-label={isOpen ? "Đóng trợ lý mua sắm" : "Mở trợ lý mua sắm"}
        aria-expanded={isOpen}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-ui-fg-base text-ui-bg-base shadow-xl transition hover:scale-105 hover:bg-ui-fg-subtle active:scale-95"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  )
}

function ChatIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.5 18.5 3.75 20l1.5-3.75A8.25 8.25 0 1 1 7.5 18.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 12h.01M12 12h.01M16 12h.01"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m12 3 1.1 3.4a5 5 0 0 0 3.2 3.2L20 11l-3.7 1.4a5 5 0 0 0-3.2 3.2L12 19l-1.1-3.4a5 5 0 0 0-3.2-3.2L4 11l3.7-1.4a5 5 0 0 0 3.2-3.2L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m5 12 14-7-4.5 14-3-5.5L5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m11.5 13.5 3-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}
