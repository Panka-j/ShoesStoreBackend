# ShoesStore Chatbot — Frontend Build Guide

> This guide is for building the chatbot UI in the existing React + Tailwind CSS v4 + Redux frontend.
> Backend is already complete at `POST /api/v1/chatbot/message`.

---

## How the Backend Works (what the frontend must handle)

**Endpoint:** `POST http://localhost:6969/api/v1/chatbot/message`

**Request body:**

```json
{
  "message": "where is my order",
  "sessionId": "uuid-generated-once-per-browser-session"
}
```

**Auth:** Send with `withCredentials: true` — the existing auth cookie is picked up automatically. No Authorization header needed.

**Response shape:**

```json
{
  "success": true,
  "data": {
    "reply": "Hey Jivee! Your Nike Air Force 1 (Size 9) is shipped...",
    "sentiment": "neutral",
    "language": "English",
    "tool_used": "get_my_orders",
    "api_data": { ... },
    "sources": "[Source: faq.txt]\nReturns accepted within 7 days..."
  }
}
```

**Clear session on logout:**
`POST /api/v1/chatbot/clear-session` with body `{ "sessionId": "..." }`

---

## File Structure to Create

```
src/
  components/
    chatbot/
      ChatWidget.jsx       ← floating bubble + open/close toggle
      ChatWindow.jsx       ← the full chat panel (header + messages + input)
      ChatMessage.jsx      ← single message bubble (user vs bot)
      ChatInput.jsx        ← textarea + send button + mic button
      SentimentBadge.jsx   ← coloured pill showing mood (angry/happy/etc.)
      SourcePill.jsx       ← small tag showing "from: faq.txt"
  hooks/
    useChatbot.js          ← all state, API calls, sessionId, voice logic
```

---

## Step 1 — `useChatbot.js`

This hook manages everything. Create at `src/hooks/useChatbot.js`.

```jsx
import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";

// Generate or retrieve a stable sessionId for this browser session
const getSessionId = () => {
  let id = sessionStorage.getItem("chatbot_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("chatbot_session_id", id);
  }
  return id;
};

const API_BASE = "http://localhost:6969/api/v1";

export const useChatbot = () => {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content:
        "Hey! I'm ShoeBot 👟 Ask me anything — orders, sizing, product recs, or returns!",
      sentiment: "happy",
      sources: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const sessionId = useRef(getSessionId());
  const recognitionRef = useRef(null);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text?.trim();
      if (!trimmed || loading) return;

      // Add user message immediately
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      setLoading(true);

      try {
        const { data } = await axios.post(
          `${API_BASE}/chatbot/message`,
          { message: trimmed, sessionId: sessionId.current },
          { withCredentials: true }
        );

        if (data.success) {
          setMessages((prev) => [
            ...prev,
            {
              role: "bot",
              content: data.data.reply,
              sentiment: data.data.sentiment,
              sources: data.data.sources,
              tool_used: data.data.tool_used,
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content: "Something went wrong. Please try again!",
            sentiment: "neutral",
            sources: null,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const clearSession = useCallback(async () => {
    await axios
      .post(
        `${API_BASE}/chatbot/clear-session`,
        { sessionId: sessionId.current },
        { withCredentials: true }
      )
      .catch(() => {});
    // Regenerate session ID
    const newId = crypto.randomUUID();
    sessionStorage.setItem("chatbot_session_id", newId);
    sessionId.current = newId;
    setMessages([
      {
        role: "bot",
        content: "Chat cleared! Ask me anything.",
        sentiment: "neutral",
        sources: null,
      },
    ]);
  }, []);

  // Voice input using Web Speech API (Chrome only)
  const toggleVoice = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is only supported in Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      sendMessage(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, sendMessage]);

  return {
    messages,
    input,
    setInput,
    loading,
    isOpen,
    setIsOpen,
    isListening,
    sendMessage,
    clearSession,
    toggleVoice,
  };
};
```

---

## Step 2 — `SentimentBadge.jsx`

```jsx
const SENTIMENT_CONFIG = {
  angry: { label: "Angry", color: "bg-red-100 text-red-700" },
  frustrated: { label: "Frustrated", color: "bg-orange-100 text-orange-700" },
  happy: { label: "Happy", color: "bg-green-100 text-green-700" },
  neutral: { label: "Neutral", color: "bg-gray-100 text-gray-600" },
};

export default function SentimentBadge({ sentiment }) {
  if (!sentiment || sentiment === "neutral") return null;
  const config = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}
```

---

## Step 3 — `SourcePill.jsx`

```jsx
export default function SourcePill({ sources }) {
  if (!sources) return null;

  // Extract filename from "[Source: faq.txt]..." pattern
  const match = sources.match(/\[Source:\s*([^\]]+)\]/);
  const filename = match ? match[1] : null;
  if (!filename) return null;

  return (
    <span className="text-xs text-gray-400 mt-1 block">
      📄 from: {filename}
    </span>
  );
}
```

---

## Step 4 — `ChatMessage.jsx`

```jsx
import SentimentBadge from "./SentimentBadge";
import SourcePill from "./SourcePill";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}
      >
        {/* Sentiment badge — only on bot messages */}
        {!isUser && message.sentiment && (
          <div className="mb-1">
            <SentimentBadge sentiment={message.sentiment} />
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-black text-white rounded-br-sm"
              : "bg-gray-100 text-gray-900 rounded-bl-sm"
          }`}
        >
          {message.content}
        </div>

        {/* Source pill — only on bot messages with RAG context */}
        {!isUser && <SourcePill sources={message.sources} />}
      </div>
    </div>
  );
}
```

---

## Step 5 — `ChatInput.jsx`

```jsx
import { useRef } from "react";

export default function ChatInput({
  input,
  setInput,
  onSend,
  loading,
  isListening,
  onVoiceToggle,
}) {
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    // Send on Enter (but allow Shift+Enter for newline)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(input);
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-gray-100">
      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask ShoeBot anything..."
        disabled={loading}
        className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
                   disabled:opacity-50 max-h-24 overflow-y-auto"
      />

      {/* Voice button */}
      <button
        onClick={onVoiceToggle}
        title={isListening ? "Stop listening" : "Voice input"}
        className={`p-2 rounded-xl transition-colors ${
          isListening
            ? "bg-red-500 text-white animate-pulse"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
      >
        🎤
      </button>

      {/* Send button */}
      <button
        onClick={() => onSend(input)}
        disabled={!input.trim() || loading}
        className="p-2 rounded-xl bg-black text-white hover:bg-gray-800 
                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
```

---

## Step 6 — `ChatWindow.jsx`

```jsx
import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

export default function ChatWindow({
  messages,
  input,
  setInput,
  loading,
  isListening,
  onSend,
  onVoiceToggle,
  onClear,
  onClose,
}) {
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-2xl w-[360px] h-[520px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black text-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">👟</span>
          <div>
            <p className="text-sm font-semibold leading-none">ShoeBot</p>
            <p className="text-xs text-gray-400">ShoesStore Support</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            title="Clear chat"
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1">
                <span
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={onSend}
        loading={loading}
        isListening={isListening}
        onVoiceToggle={onVoiceToggle}
      />
    </div>
  );
}
```

---

## Step 7 — `ChatWidget.jsx` (the floating bubble)

```jsx
import { useChatbot } from "../../hooks/useChatbot";
import ChatWindow from "./ChatWindow";

export default function ChatWidget() {
  const {
    messages,
    input,
    setInput,
    loading,
    isOpen,
    setIsOpen,
    isListening,
    sendMessage,
    clearSession,
    toggleVoice,
  } = useChatbot();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat window — shown when open */}
      {isOpen && (
        <ChatWindow
          messages={messages}
          input={input}
          setInput={setInput}
          loading={loading}
          isListening={isListening}
          onSend={sendMessage}
          onVoiceToggle={toggleVoice}
          onClear={clearSession}
          onClose={() => setIsOpen(false)}
        />
      )}

      {/* Floating bubble button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 bg-black text-white rounded-full shadow-lg hover:scale-105
                   active:scale-95 transition-transform flex items-center justify-center text-2xl"
        title="Chat with ShoeBot"
      >
        {isOpen ? "✕" : "👟"}
      </button>
    </div>
  );
}
```

---

## Step 8 — Mount in `App.jsx`

Add the `ChatWidget` at the bottom of your root `App.jsx` so it appears on every page:

```jsx
import ChatWidget from "./components/chatbot/ChatWidget";

function App() {
  return (
    <>
      {/* ... your existing router, navbar, routes ... */}

      {/* Chatbot — renders on top of every page */}
      <ChatWidget />
    </>
  );
}
```

No Redux changes needed — the hook is fully self-contained.

---

## Step 9 — Clear session on logout

In your logout thunk or logout handler, call the clear-session endpoint:

```js
// Inside your logoutThunk or wherever you handle logout
import axios from "axios";

const sessionId = sessionStorage.getItem("chatbot_session_id");
if (sessionId) {
  await axios
    .post(
      "http://localhost:6969/api/v1/chatbot/clear-session",
      { sessionId },
      { withCredentials: true }
    )
    .catch(() => {});
  sessionStorage.removeItem("chatbot_session_id");
}
```

---

## Demo Flow to Test

| Turn | You type                                  | Expected behaviour                                         |
| ---- | ----------------------------------------- | ---------------------------------------------------------- |
| 1    | `What is your return policy?`             | Bot answers from faq.txt, SourcePill shows "from: faq.txt" |
| 2    | `Where is my order?`                      | Bot calls `get_my_orders`, lists real orders               |
| 3    | `I want to cancel it`                     | Bot asks for confirmation before doing anything            |
| 4    | `This is taking forever!!`                | SentimentBadge shows "Frustrated", bot leads with empathy  |
| 5    | `What size should I get for Air Force 1?` | Bot asks 3 questions then answers from size_guide.txt      |
| 6    | Click mic → speak "Show me Nike shoes"    | Voice transcribed, bot calls `search_products`             |

---

## Notes

- **Guest mode**: If the user is not logged in, ShoeBot still works — it just can't show orders or reviews.
- **Session**: `sessionId` is stored in `sessionStorage` (cleared on tab close). The backend keeps the last 12 messages in memory per session.
- **Voice**: Only works in Chrome/Edge (Web Speech API). The mic button is hidden gracefully on unsupported browsers — handle by checking `!!(window.SpeechRecognition || window.webkitSpeechRecognition)` before rendering the mic button.
- **Tailwind**: All classnames above are standard Tailwind v4 utility classes. No extra config needed.
