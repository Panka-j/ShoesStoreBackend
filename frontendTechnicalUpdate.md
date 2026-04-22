# Frontend Update Notes — Chatbot Phase 1–3

No breaking API changes. The response shape `{ reply, sentiment, language, tool_used, api_data, sources }` is identical. Two code changes are needed.

---

## 1. Required — Add axios timeout in `useChatbot.js`

The ReAct agent loop (Phase 3) makes up to 3 LLM calls plus tool executions per message. Responses on tool paths can take **10–20 seconds**. Without a timeout, slow responses look like a hung network request.

**Change** the axios POST in `sendMessage`:

```js
// Before
const { data } = await axios.post(
  `${API_BASE}/chatbot/message`,
  { message: trimmed, sessionId: sessionId.current },
  { withCredentials: true }
);

// After
const { data } = await axios.post(
  `${API_BASE}/chatbot/message`,
  { message: trimmed, sessionId: sessionId.current },
  { withCredentials: true, timeout: 60000 }
);
```

---

## 2. Recommended — Improve loading indicator in `ChatWindow.jsx`

With responses taking up to 20 seconds on multi-tool paths, the 3-dot bounce alone can feel like the app froze. Add a text label below the dots.

**Change** the loading block:

```jsx
{
  /* Before */
}
{
  loading && (
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
  );
}

{
  /* After — add the text line inside the bubble */
}
{
  loading && (
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
        <p className="text-xs text-gray-400 mt-1.5">ShoeBot is thinking...</p>
      </div>
    </div>
  );
}
```

---

## 3. Behavioural changes (no code change needed)

| Field            | Before Phase 1–3        | After Phase 1–3                                                    |
| ---------------- | ----------------------- | ------------------------------------------------------------------ |
| `sources`        | Keyword-matched excerpt | Semantic similarity excerpt — better relevance                     |
| `tool_used`      | The single tool called  | Last tool in the chain (e.g. `cancel_order` after `get_my_orders`) |
| `api_data`       | Single tool result      | Last tool's result when multiple tools were chained                |
| Response latency | ~2–4s                   | ~5–20s on tool paths                                               |

**Multi-step flows now resolve in one message:**

- `"Cancel my most recent order"` → ShoeBot internally calls `get_my_orders` to find the order, then `cancel_order` — no extra prompting needed from the user.

---

## 4. Nothing else changed

- `SourcePill` regex `[Source: filename]` format — same
- `SentimentBadge` values (`angry`, `frustrated`, `neutral`, `happy`) — same
- `clear-session` endpoint — same
- Cookie-based auth (`withCredentials: true`) — same
- `sessionId` via `sessionStorage` — same
