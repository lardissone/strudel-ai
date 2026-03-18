"use client";

import { useState, useRef, useEffect, useMemo, useCallback, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY_MESSAGES = 12;
const MAX_API_MESSAGE_LENGTH = 1800;

function compactMessageContent(message: Message, hasCurrentCode: boolean): string {
  let content = message.content;

  if (message.role === "assistant") {
    content = content.replace(
      /```[\s\S]*?```/g,
      hasCurrentCode
        ? "[previous code block omitted; use the current REPL code as the latest code context]"
        : "[previous code block omitted]"
    );
  }

  content = content.replace(/\n{3,}/g, "\n\n").trim();

  if (content.length > MAX_API_MESSAGE_LENGTH) {
    content = `${content.slice(0, MAX_API_MESSAGE_LENGTH - 1)}…`;
  }

  return content;
}

function buildApiMessages(messages: Message[], currentCode?: string): Message[] {
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
  const hasCurrentCode = Boolean(currentCode?.trim());

  return recentMessages
    .map((message) => ({
      ...message,
      content: compactMessageContent(message, hasCurrentCode),
    }))
    .filter((message) => message.content.length > 0);
}

export default function ChatPanel({
  onInsertCode,
  onInsertAtCursor,
  samplesReady,
  loadedSounds,
  getCurrentCode,
}: {
  onInsertCode?: (code: string) => void;
  onInsertAtCursor?: (code: string) => void;
  samplesReady?: boolean;
  loadedSounds?: string[];
  getCurrentCode?: () => string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimit, setRateLimit] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCopy = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      // Clipboard API unavailable (non-HTTPS, permissions denied, etc.)
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    const currentCode = getCurrentCode?.() || undefined;
    const apiMessages = buildApiMessages(newMessages, currentCode);
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          samplesReady: samplesReady ?? false,
          loadedSounds: samplesReady ? loadedSounds : undefined,
          currentCode,
        }),
      });

      const rateLimitRemaining = res.headers.get("x-ratelimit-remaining");
      if (rateLimitRemaining) setRateLimit(rateLimitRemaining);

      if (!res.ok) {
        const err = await res.json();
        setMessages([
          ...newMessages,
          { role: "assistant", content: `Error: ${err.error ?? "Request failed"}` },
        ]);
        return;
      }

      // Stream response
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      let buffer = "";
      let streamDone = false;

      const processSseBuffer = (flush = false) => {
        const lastNewline = buffer.lastIndexOf("\n");
        if (lastNewline === -1 && !flush) return;

        const splitAt = flush ? buffer.length : lastNewline;
        const complete = buffer.slice(0, splitAt);
        buffer = flush ? "" : buffer.slice(lastNewline + 1);

        const lines = complete.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6);
          if (data === "[DONE]") {
            streamDone = true;
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              assistantContent += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            }
          } catch {
            // skip malformed SSE
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          processSseBuffer(true);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        processSseBuffer();
        if (streamDone) break;
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Error: Failed to connect to AI service" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const markdownComponents = useMemo(
    () => ({
      pre({ children }: { children?: React.ReactNode }) {
        // Extract the raw code text from the nested <code> element
        let codeText = "";
        if (
          children &&
          typeof children === "object" &&
          "props" in (children as React.ReactElement)
        ) {
          const codeEl = children as React.ReactElement<{
            children?: React.ReactNode;
          }>;
          codeText =
            typeof codeEl.props.children === "string"
              ? codeEl.props.children.trim()
              : "";
        }

        return (
          <div>
            <pre className="overflow-x-auto rounded p-2 my-2 text-xs" style={{ background: "var(--background)" }}>
              {children}
            </pre>
            {codeText && (
              <div className="flex gap-1 mb-2 flex-wrap">
                <button
                  onClick={() => handleCopy(codeText)}
                  className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity border"
                  style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}
                >
                  {copiedCode === codeText ? "Copied!" : "Copy"}
                </button>
                {onInsertAtCursor && (
                  <button
                    onClick={() => onInsertAtCursor(codeText)}
                    className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity border"
                    style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}
                  >
                    Insert at cursor
                  </button>
                )}
                {onInsertCode && (
                  <button
                    onClick={() => onInsertCode(codeText)}
                    className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    Replace REPL
                  </button>
                )}
              </div>
            )}
          </div>
        );
      },
      code({
        className,
        children,
        ...props
      }: {
        className?: string;
        children?: React.ReactNode;
        node?: unknown;
      } & React.HTMLAttributes<HTMLElement>) {
        // Inline code (not inside a <pre>)
        return (
          <code
            className={`${className ?? ""} rounded px-1 py-0.5 text-xs`}
            style={{ background: "var(--background)" }}
            {...props}
          >
            {children}
          </code>
        );
      },
    }),
    [onInsertCode, onInsertAtCursor, handleCopy, copiedCode]
  );

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--panel-bg)" }}>
      {/* Header */}
      <div
        className="px-3 py-2 text-sm font-semibold border-b flex items-center gap-2"
        style={{ borderColor: "var(--panel-border)" }}
      >
        <span>💬</span> AI Chat
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm opacity-50 italic">
            Ask me about Strudel patterns, mini-notation, or music coding...
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className="rounded-lg p-3 text-sm"
            style={{
              background:
                msg.role === "user"
                  ? "var(--chat-user)"
                  : "var(--chat-assistant)",
            }}
          >
            <div className="text-xs opacity-50 mb-1">
              {msg.role === "user" ? "You" : "AI"}
            </div>
            {msg.role === "assistant" ? (
              <div className="break-words font-mono text-xs leading-relaxed prose prose-invert prose-xs max-w-none">
                {msg.content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  loading && i === messages.length - 1 ? "..." : ""
                )}
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                {msg.content}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Rate limit */}
      {rateLimit && (
        <div
          className="px-3 py-1 text-xs opacity-50 border-t"
          style={{ borderColor: "var(--panel-border)" }}
        >
          Rate limit remaining: {rateLimit}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t flex gap-2"
        style={{ borderColor: "var(--panel-border)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Strudel..."
          disabled={loading}
          className="flex-1 px-3 py-2 rounded text-sm outline-none border"
          style={{
            background: "var(--background)",
            borderColor: "var(--panel-border)",
            color: "var(--foreground)",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded text-sm font-semibold cursor-pointer disabled:opacity-30 transition-opacity"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
