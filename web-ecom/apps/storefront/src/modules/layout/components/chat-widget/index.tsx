"use client"

import { useEffect, useState } from "react"

const DIFY_CHATBOT_URL = process.env.NEXT_PUBLIC_DIFY_CHATBOT_URL?.trim()

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[70] sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          aria-label="Trợ lý mua sắm AI"
          className="mb-3 flex h-[min(720px,calc(100vh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-ui-border-base bg-ui-bg-base shadow-2xl sm:mb-4 sm:w-[420px]"
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
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Dify Web App
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

          {DIFY_CHATBOT_URL ? (
            <iframe
              src={DIFY_CHATBOT_URL}
              title="Dify - Trợ lý mua sắm AI"
              className="min-h-0 flex-1 border-0 bg-white"
              allow="microphone; clipboard-write"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-ui-fg-muted">
              Chưa cấu hình NEXT_PUBLIC_DIFY_CHATBOT_URL.
            </div>
          )}
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
