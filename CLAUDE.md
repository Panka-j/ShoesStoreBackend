# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start with nodemon (auto-restart)
npm start        # Start without nodemon (production)
npm run format   # Prettier format entire project
```

No test runner is configured (`npm test` is a placeholder).

## Architecture

**Runtime:** Node.js ESM (`"type": "module"` in package.json). All imports use `.js` extensions.

**Pattern:** MVC + Services layer.

```
index.js                     # Server entry — mounts all routes, connects DB
src/
  common/
    db/connection.js         # Mongoose connect
    errors/ServerError.js    # throw new ServerError(statusCode, message)
    utils/
      ServerResponse.js      # new ServerResponse(statusCode, data, message)
      wrapAsync.js           # wraps controller fns to forward errors to errorHandler
      joiValidationSchemas.js # all Joi schemas (shared across routes)
      jwtHelper.js / authHelper.js
  controllers/               # Business logic — always use wrapAsync
  routes/                    # Express routers
  middlewares/
    authMiddlewares.js       # JWT auth (cookie or Authorization header)
    roleMiddleware.js        # requireRole("admin") etc.
    validationMiddlewares.js # validates req.body against Joi schemas
    errorMiddlewares.js      # global error handler — reads ServerError fields
  models/                    # Mongoose schemas
  services/
    groq.service.js          # Groq LLM via OpenAI SDK (chat + classify)
    rag.service.js           # Semantic search — embed + cosine similarity
    embedding.service.js     # @xenova/transformers singleton (all-MiniLM-L6-v2)
    sentiment.service.js     # Detects angry/frustrated/neutral/happy
    session.service.js       # In-memory session Map, max 12 messages
    toolExecutor.service.js  # Bridges chatbot tools → internal API via axios
knowledge-base/              # .txt files indexed by rag.service.js at startup
scripts/
  seedAdmin.js               # Seed admin user
  seedData.js                # Seed categories + products
```

## Key Patterns

**Response shape** (all routes): `{ statusCode, success, message, data }`  
Use `res.status(code).json(new ServerResponse(code, data, message))`.

**Error throwing**: `throw new ServerError(statusCode, message)` — the global `errorHandler` middleware catches it.

**Controller wrapping**: every controller function is exported as `wrapAsync(async (req, res) => { ... })`.

**Validation**: Joi schemas live in `joiValidationSchemas.js`; apply with `validate(schemaName)` middleware on the route.

**Auth**: JWT in `accessToken` httpOnly cookie or `Authorization: Bearer` header. Roles: `buyer`, `seller`, `admin`.

## Domain Notes

**Images**: Stored as raw Buffer in MongoDB (`imageModel`). Served at `GET /api/v1/image/:imageId`. All image uploads go through `multerMiddleware` → `imgCompress` (Sharp) → `saveImageToDb`.

**Slugs**: Auto-generated via pre-save hook. Category slug = lowercased name. Product slug = lowercased name; if collision, appends 6-char ID suffix. Never set manually.

**Stock**: Atomically decremented with `$inc` on order creation. Restored on cancellation. Prevents overselling.

**Product pricing**: `sizeVariants[n].price` overrides `basePrice` for that size when present.

**Orders**: Price and shipping address are snapshotted at creation time — changes to the product or user profile don't affect existing orders. Status transitions are strictly enforced (see `backendTechnicalSummary.md`).

**Reviews**: One per `(product, buyer)` pair. `averageRating` and `reviewCount` on the product are recalculated on every review create/edit/delete.

## Chatbot Architecture

**ReAct agent loop** using Groq (llama-3.3-70b-versatile) via the OpenAI SDK. `groq.service.js` exports `chat(messages, maxTokens, temperature)` — temperature defaults to `0.7`.

**Setup (parallel):** `detectSentiment`, `ragSearch`, `detectLanguage` all fire concurrently. Results are injected into the system prompt.

**Agent loop (`MAX_STEPS = 3`):**
Each iteration calls the LLM and expects this structured output:
```
Thought: [reasoning]
Action: [tool_name or "none"]
Action Input: {"key": "value"}
Final Answer: [reply — only when Action is "none"]
```
- `parseAgentStep(raw)` extracts the four fields via regex
- `extractJSON(inputBlock)` parses the Action Input safely (handles surrounding text)
- If `Action != "none"`: call `executeTool(name, args, token)`, append `Observation:` to messages, continue loop
- If `Action = "none"` or `finalAnswer` present: exit loop, use Final Answer as reply
- Last step forces Final Answer via an injected message; temperature rises to 0.7 / 500 tokens
- `stripReActMarkers(text)` cleans fallback text if Final Answer is missing

Only `finalReply` (the Final Answer) is stored in session history — internal Thought/Action steps are invisible to the user and not persisted.

RAG: `loadKnowledgeBase()` fires at module load — reads `.txt` files from `/knowledge-base/`, splits by `\n\n`, generates embeddings via `@xenova/transformers` (`all-MiniLM-L6-v2`, 384-dim), stores `{source, text, vector}` in memory. `search(query)` is async, returns top-3 by cosine similarity as `[Source: filename]\ncontent`.

Session history stored in-memory per `sessionId` (max 12 messages). Auth token from `Authorization` header or cookie; invalid tokens fall back to guest mode.

## Environment Variables

Required in `.env`:
```
PORT
MONGODB_URL
CORS_ORIGIN
CORS_ORIGIN_RENDER
NODE_ENV
ACCESS_TOKEN_SECRET
ACCESS_TOKEN_EXPIRY
REFRESH_TOKEN_SECRET
REFRESH_TOKEN_EXPIRY
GROQ_API_KEY
API_BASE_URL          # Base URL for internal toolExecutor axios calls (e.g. http://localhost:6969/api/v1)
```
