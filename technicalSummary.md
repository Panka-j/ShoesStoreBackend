# ShoesStoreBackend — Technical Summary

> _Likha hai Hinglish mein, kyunki English toh sab samajhte hain — maza nahi aata._

---

## 1. Kya hai ye project? (Intro)

Yaar, ye ek **shoes ka e-commerce backend** hai. Bas itna hi nahi — isme ek **AI chatbot** bhi hai jo tumse baat karta hai, tumhara order place karta hai, aur tumhe bata deta hai ki Nike ka size 9 lena chahiye ya nahi.

Teen types ke users hain:

- **Buyer** — juta khareedne wala (tum log)
- **Seller** — juta bechne wala (Pankaj bhai types)
- **Admin** — sab pe nazar rakhne wala (boss)

Tech stack mein Node.js, Express, MongoDB, aur ek AI bot hai jo Groq ke LLM se baat karta hai. Matlab ekdum full-stack AI wali baat hai, sirf jute ke liye. Commitment dekho.

---

## 2. Tech Stack — Kya use kiya aur kyun

### Node.js (with ESM)

Bhai, Node.js isliye kyunki JavaScript ek hi language mein frontend aur backend dono handle hota hai. Context switching nahi. Aur `"type": "module"` likha hai `package.json` mein — matlab ye project **ES Modules** use karta hai (`import`/`export`), na ki purana `require()`. Future-proof hai, chill karo.

### Express 5

Express 5 hai — latest stable version. Routing ke liye best hai, lightweight hai, aur async errors automatically next() pe forward ho jaate hain (Express 5 mein ye free milta hai, pehle manually karna padta tha). Simple, reliable, tested.

### MongoDB + Mongoose

Relational DB kyun nahi? Kyunki shoes ka data thoda flexible hai bhai — ek product ke multiple sizes hain, har size ka alag stock aur price ho sakta hai. SQL mein ye sab normalize karo toh bohot tables banengi. MongoDB mein ek document mein sab fit. Mongoose use kiya kyunki raw MongoDB driver pe validation aur schema manually likhna padta — Mongoose ye sab seedha handle karta hai.

### Groq (LLM)

OpenAI toh costly hai yaar. Groq free tier deta hai aur **llama-3.3-70b-versatile** model pe inference blazing fast hai. Aur Groq OpenAI-compatible API deta hai — matlab `openai` npm package use karke Groq se baat kar sakte ho, koi alag SDK nahi chahiye. Jugaad? Nahi, engineering.

### FAISS + LangChain

Chatbot ko smart banana tha — sirf LLM se answers nahi, real knowledge chahiye (sizing guide, FAQ, return policy). Toh **RAG (Retrieval-Augmented Generation)** use kiya. Knowledge base ke `.txt` files ko embeddings mein convert kiya, **FAISS** (Facebook AI Similarity Search) vector DB mein store kiya. User ka question aata hai → similar chunks dhundho → LLM ko context de do → accurate answer milta hai. Seedha aur clean.

---

## 3. Libraries — Har ek ka reason

### Production Dependencies

| Library | Version | Kya karta hai? |
|---|---|---|
| `express` | 5.2.1 | Web framework — routes, middleware, server |
| `mongoose` | 9.4.1 | MongoDB ODM — schema, validation, queries |
| `bcrypt` | 6.0.0 | Password hash karta hai (plain text store karna crime hai) |
| `jsonwebtoken` | 9.0.3 | JWT tokens banata hai — access + refresh dono |
| `joi` | 18.1.2 | Request body validate karta hai DB touch karne se pehle |
| `multer` | 2.1.1 | File uploads handle karta hai, temp disk pe store karta hai |
| `sharp` | 0.34.5 | Images compress karta hai MongoDB save se pehle (size kam karo) |
| `openai` | 6.34.0 | Groq se baat karta hai (OpenAI-compatible API hai Groq ki) |
| `@xenova/transformers` | 2.17.2 | Text ko embeddings mein convert karta hai, **locally** — koi external API nahi |
| `faiss-node` | 0.5.1 | Vector similarity search — RAM mein store, fast retrieval |
| `langchain` | 1.3.5 | RAG pipeline ka glue — document loaders, chains |
| `@langchain/community` | 1.1.27 | FAISS vector store integration |
| `@langchain/core` | 1.1.42 | LangChain core abstractions (Embeddings class, etc.) |
| `axios` | 1.15.1 | Internal HTTP calls — chatbot tools apne hi API ko call karte hain |
| `cors` | 2.8.6 | Frontend ke domain se requests allow karta hai |
| `cookie-parser` | 1.4.7 | JWT cookies parse karta hai request se |
| `morgan` | 1.10.1 | HTTP request logs — kaun aaya, kab aaya, kitna time laga |
| `winston` | 3.19.0 | Proper structured logging — levels hain (error, warn, info, debug) |
| `dotenv` | 17.4.2 | `.env` file se environment variables load karta hai |
| `form-data` | 4.0.5 | Multipart form data encoding (file upload internals ke liye) |

### Dev Dependencies

| Library | Kya karta hai? |
|---|---|
| `nodemon` | File change pe server auto-restart karta hai (dev mein lifesaver) |
| `prettier` | Code format consistent rakhta hai — tabs, quotes, commas sab fix |

---

## 4. Folder Structure — Kyon aisa banaya

```
ShoesStoreBackend/
├── index.js                   ← Server entry point, yahan se sab shuru
├── .env                       ← Secrets (mat share karna)
├── knowledge-base/            ← Chatbot ki padhai ki books (.txt files)
├── vector-store/              ← FAISS index persisted here
├── scripts/                   ← One-time scripts (seed data, images)
└── src/
    ├── constants.js           ← DB name, etc.
    ├── common/
    │   ├── db/connection.js   ← MongoDB connect karo
    │   ├── errors/            ← Custom error class
    │   └── utils/             ← Reusable helpers (JWT, bcrypt, Joi schemas, image save)
    ├── models/                ← MongoDB schemas (6 models)
    ├── routes/                ← Express routers (sirf routing + middleware)
    ├── middlewares/           ← Auth, role check, validation, error handler, multer
    ├── controllers/           ← Business logic (controllers delegate to services)
    └── services/              ← Heavy lifting — sab kuch yahan hota hai
```

**Kyun MVC + Services pattern?**

Seedha baat — agar sab kuch controller mein likhte toh file 500+ lines ki ho jaati aur kuch bhi reuse nahi hota. Services alag isliye hain kyunki chatbot ke `toolExecutor` ko bhi wahi product search, order place, review submit karna hota hai — matlab ek hi service function ko controller bhi call karta hai aur chatbot bhi. DRY principle, dekho.

**`src/common/` kyun alag hai?**

Yaar, `ServerError`, `ServerResponse`, `wrapAsync`, Joi schemas — ye sab poore app mein use hote hain. Ek jagah rakhne se import easy hai aur duplication nahi hoti. Common matlab truly common.

---

## 5. Database Models — Kya kya store kiya hai

### User Model
- `firstName`, `lastName`, `email`, `password` (select: false — query mein automatically nahi aata)
- `role` — `"buyer"` | `"seller"` | `"admin"` (default: buyer)
- `address` — nested object (street, city, state, zipCode, country)
- `shoeSizes` — `Map<categoryName, size>` — chatbot yaad rakhta hai tumhara size per category
- `avatar` — Image ka reference (ObjectId)
- `refreshToken` (select: false), `isBlocked`, `isUserVerified`

### Category Model
- `name`, `slug` (auto-generated from name via pre-save hook), `description`, `image`
- Slug example: "Running Shoes" → `"running-shoes"` — human-readable URLs ke liye

### Product Model
- `name`, `slug`, `description`, `brand`, `basePrice`
- `category` + `seller` — ObjectId refs
- `sizeVariants` — array of `{ size, stock, price? }` — har size ka alag stock aur optional price override
- `images` — Image refs ka array (max 10)
- `averageRating`, `reviewCount` — review create/update/delete pe recalculate hota hai
- Slug collision pe 6-char ID suffix automatically lagta hai

### Order Model
- `buyer`, `seller`, `product` — sab refs
- `size`, `quantity`, `unitPrice`, `totalPrice` — snapshot at creation (product change karo baad mein, order pe impact nahi)
- `shippingAddress` — bhi snapshot (user address change karo, order same rahega)
- `status` — state machine: `pending → confirmed → processing → shipped → out_for_delivery → delivered`
- `statusHistory` — har status change ka log (kaun ne, kab, kyon)
- `cancelReason`, `cancelledBy` — buyer/seller/admin

### Review Model
- `product` + `buyer` — unique compound index (ek product pe ek hi review per buyer)
- `rating` (1-5, integer only), `comment`, `isEdited` flag

### Image Model
- `fileName`, `mimeType`, `data` (raw Buffer)
- Haan bhai, images directly MongoDB mein hain. No S3, no Cloudinary. Seedha Buffer. Simple project ke liye kafi hai.

---

## 6. API Routes — Sab kuch

Base URL: `/api/v1`

---

### Auth Routes `/api/v1/auth`

| Method | Path | Kaun | Kya karta hai |
|---|---|---|---|
| `POST` | `/register` | Anyone | Account banao |
| `POST` | `/login` | Anyone | Login karo, JWT milega |
| `POST` | `/logout` | Logged in | Logout, cookies clear |
| `POST` | `/refresh-token` | Anyone (with refresh cookie) | Naya access token lo |
| `GET` | `/get-me` | Logged in | Apna profile dekho |

---

### User Routes `/api/v1/users`

**Apna account:**

| Method | Path | Kaun | Kya karta hai |
|---|---|---|---|
| `GET` | `/me` | Logged in | Profile dekho |
| `PATCH` | `/me` | Logged in | Profile update karo (name, phone, address, shoe sizes) |
| `PATCH` | `/me/change-password` | Logged in | Password badlo |
| `DELETE` | `/me` | Logged in | Account delete karo (agar itna hi bura laga) |
| `PATCH` | `/me/avatar` | Logged in | Avatar upload karo |

**Admin wale:**

| Method | Path | Kaun | Kya karta hai |
|---|---|---|---|
| `GET` | `/admin/all` | Admin | Sab users list karo |
| `GET` | `/admin/:userId` | Admin | Specific user dekho |
| `PATCH` | `/admin/:userId` | Admin | User update karo |
| `DELETE` | `/admin/:userId` | Admin | User delete karo |
| `PATCH` | `/admin/:userId/block` | Admin | User block karo |
| `PATCH` | `/admin/:userId/unblock` | Admin | User unblock karo |
| `PATCH` | `/admin/:userId/change-role` | Admin | Role badlo |

---

### Category Routes `/api/v1/categories`

| Method | Path | Kaun | Kya karta hai |
|---|---|---|---|
| `GET` | `/` | Anyone | Sab categories dekho |
| `GET` | `/:slugOrId` | Anyone | Ek category dekho (slug ya ID dono kaam karte hain) |
| `POST` | `/` | Admin | Naya category banao |
| `PATCH` | `/:categoryId` | Admin | Category update karo |
| `DELETE` | `/:categoryId` | Admin | Category delete karo |

---

### Product Routes `/api/v1/products`

| Method | Path | Kaun | Kya karta hai |
|---|---|---|---|
| `GET` | `/` | Anyone | Products list — filter by category, size, price, search, sort |
| `GET` | `/:slugOrId` | Anyone | Ek product dekho |
| `GET` | `/seller/my-products` | Seller | Apne products dekho |
| `POST` | `/` | Seller | Naya product banao (max 10 images) |
| `PATCH` | `/:productId` | Seller/Admin | Product update karo |
| `DELETE` | `/:productId` | Seller/Admin | Product delete karo |

---

### Order Routes `/api/v1/orders`

**Buyer:**

| Method | Path | Kaun | Kya karta hai |
|---|---|---|---|
| `POST` | `/` | Buyer | Order place karo |
| `GET` | `/my` | Buyer | Apne orders dekho |
| `GET` | `/my/:orderId` | Buyer | Specific order dekho |
| `PATCH` | `/my/:orderId/cancel` | Buyer | Order cancel karo (reason bhi dena) |

**Seller:**

| Method | Path | Kaun | Kya karta hai |
|---|---|---|---|
| `GET` | `/seller` | Seller | Apne products ke orders dekho |
| `GET` | `/seller/:orderId` | Seller | Specific order dekho |
| `PATCH` | `/seller/:orderId/status` | Seller | Order status update karo |

**Admin:**

| Method | Path | Kaun | Kya karta hai |
|---|---|---|---|
| `GET` | `/admin` | Admin | Sab orders dekho |
| `GET` | `/admin/:orderId` | Admin | Koi bhi order dekho |
| `DELETE` | `/admin/:orderId` | Admin | Order delete karo |

---

### Review Routes `/api/v1/reviews`

| Method | Path | Kaun | Kya karta hai |
|---|---|---|---|
| `GET` | `/my` | Buyer | Apni reviews dekho |
| `GET` | `/product/:productId` | Anyone | Product ki reviews dekho |
| `POST` | `/product/:productId` | Buyer | Review do (ek product pe ek hi baar) |
| `PATCH` | `/:reviewId` | Buyer | Apni review edit karo |
| `DELETE` | `/:reviewId` | Buyer/Admin | Review delete karo |

---

### Chatbot Routes `/api/v1/chatbot`

| Method | Path | Kaun | Kya karta hai |
|---|---|---|---|
| `POST` | `/message` | Anyone (guest bhi) | ShoeBot se baat karo |
| `POST` | `/clear-session` | Anyone | Session clear karo |

---

### Image Routes `/api/v1/image`

| Method | Path | Kya karta hai |
|---|---|---|
| `GET` | `/:imageId` | Image ka binary data serve karta hai — products aur avatars yahan se load hote hain |

---

## 7. Chatbot — Deep Dive (Ye wali cheez serious hai)

Bhai, ye section thoda lamba hai — kyunki chatbot hi is project ka sabse interesting aur complex hissa hai. Ek cup chai lo aur padho.

---

### 7.1 ShoeBot — Kya concept hai?

Normal chatbots kya karte hain? User ne pucha "mera order kahan hai" — bot ne hardcoded reply diya "please check your email." Done. Boring.

ShoeBot aisa nahi karta. Ye ek **ReAct agent** hai — "Reasoning + Acting." Concept simple hai:

```
Sochta hai → Action leta hai → Result dekhta hai → Phir sochta hai → Final answer deta hai
```

Ye loop max **3 steps** chalti hai. Har step pe LLM decide karta hai — "abhi tool use karna chahiye ya seedha reply dun?" Agar tool use kiya, toh result dekh ke next step mein again decide karta hai.

**Kyun ReAct?**

Kyunki user ke questions kabhi simple nahi hote. "Mujhe ek affordable Nike recommend karo jo size 9 mein available ho aur iska review bhi acha ho" — is ek line ke liye bot ko:
1. `search_products` call karna padega (Nike, size 9, sort by price)
2. Phir shayad `get_product_reviews` call karna padega ek specific product ke liye
3. Tab final answer dena padega

Ek single LLM call se ye nahi hoga. ReAct mein hoga.

---

### 7.2 Ek Request Ka Poora Safar — Step by Step

```
POST /api/v1/chatbot/message
{ message: "Nike running shoes dikha size 9 mein", sessionId: "abc123" }
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  1. TOKEN RESOLVE                                   │
│  Authorization header ya cookie se JWT lo           │
│  jwt.verify() → User.findById() → user object       │
│  Token invalid/missing? → guest mode (no panic)     │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  2. PARALLEL CALLS (Promise.all — teeno saath)      │
│                                                     │
│  A) detectSentiment(message)                        │
│     → Groq classify() call                          │
│     → "angry" / "frustrated" / "neutral" / "happy" │
│                                                     │
│  B) ragSearch(message)                              │
│     → embed(message) → 384-dim float vector         │
│     → FAISS similaritySearch(query, 3)              │
│     → Top 3 relevant knowledge chunks               │
│                                                     │
│  C) detectLanguage(message)                         │
│     → Devanagari char count                         │
│     → Hinglish word dictionary check (824 words)   │
│     → "English" / "Hindi" / "Hinglish"              │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  3. SESSION HISTORY                                 │
│  getHistory(sessionId)                              │
│  → In-memory Map se last 12 messages fetch          │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  4. SYSTEM PROMPT BUILD                             │
│  buildPrompt() → template mein sab inject karo:    │
│  - user name, role, _id, address boolean           │
│  - saved shoe sizes (Map → JSON string)            │
│  - sentiment, language, current IST time           │
│  - RAG chunks (retrieved_context)                  │
│  - user message                                    │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  5. ReAct AGENT LOOP (MAX_STEPS = 3)                         │
│                                                              │
│  agentMessages = [system_prompt, ...history, user_message]   │
│                                                              │
│  Step 0 → Groq chat() call                                   │
│           temperature: 0.3, maxTokens: 350 (precise raho)    │
│           LLM responds with ReAct format:                    │
│                                                              │
│           Thought: User Nike running shoes size 9 chahta hai │
│           Action: search_products                            │
│           Action Input: {"search":"Nike running","size":9,   │
│                          "sort":"newest"}                    │
│                                                              │
│           parseAgentStep(raw) → extract fields via regex     │
│           extractJSON(inputBlock) → Action Input parse karo  │
│                                                              │
│           Action != "none" → executeTool() call              │
│                                                              │
│           toolExecutor returns:                              │
│           { success: true, data: { items: [...5 products] }} │
│                                                              │
│           agentMessages.push(assistant: raw_response)        │
│           agentMessages.push(user: "Observation: {result}")  │
│                                                              │
│  Step 1 → Groq chat() call again (with observation)         │
│           LLM reads result, decides → Final Answer deta hai  │
│                                                              │
│           Action: none                                       │
│           Final Answer: "Yaar Jiveetesh, yeh dekh..."        │
│                                                              │
│           Loop breaks. finalReply = Final Answer.            │
│                                                              │
│  Step 2 (Last Step — agar pehle answer nahi mila):           │
│           Force message inject: "provide Final Answer now"   │
│           temperature: 0.7, maxTokens: 500 (thoda creative)  │
│           Bot forced answer deta hai                         │
└──────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  6. PRODUCT CARDS EXTRACT                           │
│  Agar tool_used = "search_products" ya "get_product"│
│  → apiResult se minimal fields nikalo:              │
│    { _id, name, slug, basePrice, images,            │
│      averageRating, reviewCount }                   │
│  → Frontend pe product cards render honge           │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  7. SESSION UPDATE + RESPONSE                       │
│  appendMessage(sessionId, "user", message)          │
│  appendMessage(sessionId, "assistant", finalReply)  │
│  → slice(-12) — only last 12 messages rakhta hai    │
│                                                     │
│  Response:                                          │
│  { reply, sentiment, language, tool_used,           │
│    api_data, suggested_products, sources }          │
└─────────────────────────────────────────────────────┘
```

---

### 7.3 System Prompt — Iske Andar Kya Hai?

Ye woh cheez hai jo LLM ko batata hai ki wo kaun hai, kya karna hai, kaise karna hai. Har request pe naya prompt build hota hai — template mein variables inject hote hain.

**Template ke sections:**

**USER block:**
```
Name: Jiveetesh | Role: buyer | ID: 507f1f77 | Address: true
Lang: Hinglish | Sentiment: neutral | Time: 02:30 PM
Saved shoe sizes: {"nike": 9, "adidas": 8}
```
Bot ko pata hota hai ki tumhara naam kya hai, tumne pehle konsi sizes save ki hain, aur abhi kaisa mood hai. Personalized response ke liye.

**STYLE block:**
- Warm sneakerhead tone — "heat", "cop", "colourway", "grails", "DS" use karo naturally
- 2-4 lines max, naam naturally use karo (greeting pe nahi, mid-sentence)
- Language rule: **user Hinglish mein likhe → bot Hinglish mein reply kare**, Hindi mein likhe → Devanagari mein reply kare
- Angry user → empathy se shuru karo: "Yaar, that's genuinely frustrating..."
- Happy user → match the energy

**FACTS block:**
Store ke baare mein hardcoded truths:
- Currency ₹, shipping timelines, return policy (7 days, unworn)
- Payment: UPI, cards, EMI — lekin **chatbot se order karo toh Cash on Delivery only** (interesting design choice)
- Order status ka human-readable mapping (pending = "waiting for seller confirmation")

**CRITICAL RULES block (ye sabse important hai):**
```
- Never invent data
- search karo pehle, phir pucho — never pucho pehle search baad mein
- Default sort: "newest"
- Confirm before: place_order, cancel_order, submit_review
- place_order se pehle: product name, size, quantity, total price dikhao
- Saved shoe size hai category ke liye → automatically use karo, poochna mat
- Off-topic (cricket, movies) → "Haha I'm strictly a sneaker guy!"
```

**TOOLS block:**
```
- search_products  {"search": "", "category": "", "size": 0, "sort": "newest"}
- place_order      {"product_id": "", "size": 9, "quantity": 1}
- get_my_orders    {"status": ""}
- cancel_order     {"order_id": "", "cancel_reason": ""}
- submit_review    {"product_id": "", "rating": 4, "comment": ""}
- set_shoe_size    {"category": "nike", "size": 9}
... (12 tools total)
```

**FORMAT block:**
```
Thought:
Action:
Action Input:

If Action = none:
Final Answer:
```
Ye format LLM ko strictly follow karna padta hai — tabhi `parseAgentStep()` regex se extract kar paata hai.

---

### 7.4 ReAct Loop — Code Level Mein Kya Hota Hai

**parseAgentStep(raw)** — LLM ka raw text in fields mein convert karta hai:
```js
// Regex se extract karta hai
thought  = text.match(/Thought:\s*(.*)/)?.[1]
action   = text.match(/Action:\s*(\S+)/)?.[1].toLowerCase()
inputBlock = text.match(/Action Input:\s*([\s\S]*?)(?=\n(?:Observation|Final Answer|Thought)|$)/)?.[1]
finalAnswer = text.match(/Final Answer:\s*([\s\S]*)$/)?.[1]
```

**extractJSON(inputBlock)** — Action Input se JSON safely nikalta hai:
```js
const match = text.match(/\{[\s\S]*\}/)  // first { to last }
JSON.parse(match[0])  // agar fail → null return
```
Ye isliye alag hai kyunki LLM kabhi kabhi JSON ke aage-peeche extra text likh deta hai.

**Temperature strategy:**
- Steps 0, 1 → `temperature: 0.3` — precise, deterministic, JSON sahi aaye
- Last step (step 2) → `temperature: 0.7` — creative, natural reply
- maxTokens bhi alag: 350 intermediate steps ke liye, 500 last step ke liye

**Loop exit conditions:**
- `parsed.action === "none"` → Final Answer ready hai, loop break
- `parsed.finalAnswer` truthy hai → same, loop break
- Loop exhaust (3 steps complete) → `stripReActMarkers()` se cleaned text use karo

**stripReActMarkers(text):**
```js
text
  .replace(/^Thought:.*$/gm, "")
  .replace(/^Action:.*$/gm, "")
  .replace(/^Action Input:.*$/gm, "")
  .replace(/^Observation:.*$/gm, "")
  .replace(/^Final Answer:\s*/m, "")
  .trim()
```
Agar Final Answer missing raha (edge case), toh raw text se ReAct markers hata ke clean text bhejo.

**Safety fallback:**
```js
if (!finalReply) {
  finalReply = "Yaar, something went sideways on my end — could you try again?"
}
```
Ye tab trigger hota hai jab loop exhaust hua aur phir bhi kuch nahi mila. Rarely hota hai.

---

### 7.5 Tool Executor — 12 Tools, Har Ek Ka Kaam

Sab tools `executeTool(toolName, args, user)` function se aate hain. Ye `switch` statement hai. Har tool ke guards hain.

**Role guards:**
```js
const requireUser = (user) => { if (!user) throw ServerError(401) }
const requireBuyer = (user) => { requireUser(user); if (user.role !== "buyer") throw ServerError(403) }
```
Guest user order nahi de sakta, seller apne orders nahi dekh sakta buyer wale routes pe — ye sab yahan enforce hota hai.

**Error mapping:**
```
ServerError 401 → { error: "SESSION_EXPIRED" }   → Bot: "please login"
ServerError 403 → { error: "FORBIDDEN" }          → Bot: role issue
ServerError 404 → { error: "NOT_FOUND" }          → Bot: "verify details"
ServerError 409 → { error: "CONFLICT" }           → Bot: duplicate (e.g., review already submitted)
```
Bot ko raw HTTP status codes nahi dikhate — human-readable error codes dete hain.

**Har tool kya karta hai:**

| Tool | Guard | Kya call karta hai | Special logic |
|---|---|---|---|
| `search_products` | None (public) | `listProducts()` | Limit hardcoded to 5 results |
| `get_product` | None | `getProduct(slug_or_id)` | Slug ya ID dono accept |
| `get_product_reviews` | None | `getProductReviews()` | Limit 5 |
| `get_categories` | None | `listCategories()` | Sab categories |
| `get_my_orders` | requireBuyer | `listMyOrders()` | Status filter pass karo |
| `get_order_detail` | requireBuyer | `getMyOrder()` | order_id required check |
| `cancel_order` | requireBuyer | `cancelOrder()` | cancel_reason optional |
| `place_order` | requireBuyer | `placeOrder()` | product_id + size + quantity sab required |
| `submit_review` | requireBuyer | `createReview()` | rating 1-5 validate + Math.round() |
| `get_my_reviews` | requireBuyer | `getMyReviews()` | No filters needed |
| `get_my_profile` | requireUser | Return user object directly | No DB call |
| `set_shoe_size` | requireBuyer | `User.findByIdAndUpdate()` | `$set: { shoeSizes.category: size }` |

**`set_shoe_size` ka magic:**
```js
await User.findByIdAndUpdate(user._id, {
  $set: { [`shoeSizes.${args.category}`]: Math.round(args.size) }
})
```
`shoeSizes` ek MongoDB Map hai. `shoeSizes.nike = 9` type update hota hai. Next conversation mein system prompt mein ye size automatically inject hoga — aur bot poochega nahi.

---

### 7.6 Groq Service — LLM Se Baat Kaise Hoti Hai

```js
// groq.service.js
const MODEL = "llama-3.3-70b-versatile"

// Lazy init — dotenv pehle load ho, phir client bane
let _groq = null
const groq = () => {
  if (!_groq) _groq = new OpenAI({ 
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"  // Groq ka OpenAI-compatible endpoint
  })
  return _groq
}

export const chat = async (messages, maxTokens=400, temperature=0.7) => {
  const response = await groq().chat.completions.create({
    model: MODEL, messages, temperature, max_tokens: maxTokens, top_p: 0.9
  })
  return response.choices[0].message.content.trim()
}

export const classify = async (prompt) => {
  // Low temperature (0.1) for deterministic classification
  // maxTokens: 10 — sirf ek word chahiye
  ...
}
```

`chat()` → conversational responses (ReAct loop mein)  
`classify()` → sentiment detection mein — just ek word return karna hai, kreativiti nahi chahiye

`top_p: 0.9` matlab LLM apni top 90% probable tokens mein se select karta hai — thoda diversity, zyada nahi.

---

### 7.7 Sentiment Detection — Kaisa Kaam Karta Hai

```js
// sentiment.service.js
const prompt = `Classify the sentiment of this customer service message in ONE word only.
Choose from: angry, frustrated, neutral, happy.
Reply with ONLY the single word, nothing else.
Message: "${message}"`

const result = await classify(prompt)  // temperature: 0.1, maxTokens: 10
const valid = ["angry", "frustrated", "neutral", "happy"]
return valid.includes(result) ? result : "neutral"  // fallback always "neutral"
```

Simple prompt engineering. Agar LLM ne allowed words ke bahar kuch diya → `"neutral"` force karo. Kabhi crash nahi hoga.

Sentiment system prompt mein inject hota hai — bot ka tone accordingly change hota hai:
- `angry` → "Yaar, that's genuinely frustrating and I'm really sorry about this."
- `happy` → match energy, enthusiastic reply

---

### 7.8 Language Detection — Hinglish Algorithm

```js
const detectLanguage = (text) => {
  // Step 1: Devanagari character count
  const hindiChars = (text.match(/[ऀ-ॿ]/g) || []).length
  const totalChars = text.replace(/\s/g, "").length
  
  if (totalChars === 0) return "English"
  if (hindiChars / totalChars > 0.5) return "Hindi"     // 50%+ Devanagari → pure Hindi
  if (hindiChars > 0) return "Hinglish"                 // kuch Devanagari → Hinglish
  
  // Step 2: Roman script Hinglish detection
  const words = text.toLowerCase().match(/[a-z]+/g) || []
  const hinglishCount = words.filter(w => HINGLISH_WORDS.has(w)).length
  if (words.length > 0 && hinglishCount / words.length >= 0.2) return "Hinglish"
  // 20% ya zyada words Hinglish dictionary mein → Hinglish
  
  return "English"
}
```

**HINGLISH_WORDS Set — 824+ words, categories:**
- Pronouns: main, mera, mujhe, aap, tum, hum, wo, yeh...
- Auxiliary verbs: hai, hain, tha, hoga, hota, raha, chuka...
- Common verbs: karo, jana, aana, lena, dena, batao, dekho, samjho...
- Question words: kya, kahan, kab, kyun, kaise, kitna, kaun...
- Postpositions: mein, se, ko, ka, ki, ke, pe, par, tak...
- Conjunctions: aur, ya, toh, lekin, agar, phir, isliye...
- Adjectives: accha, bura, bada, naya, sahi, bahut, zyada, kaafi...
- Informal: yaar, bhai, arre, oye, waise, bilkul...

Threshold 20% isliye — agar tumne 10 words mein se 2 Hinglish hain (`"yaar can you show me shoes"`) → detected Hinglish. Smart.

---

### 7.9 RAG Pipeline — Knowledge Base Ka Pura System

**Embedding Model: `all-MiniLM-L6-v2`**

Ye ek sentence transformer hai. Text mein se **384-dimensional float vector** nikalta hai — basically text ka numerical representation jo semantic meaning capture karta hai.

"Nike Air Max size guide" aur "Air Max sizing chart" — dono semantically similar hain, toh unke vectors bhi close honge. "Cricket match" ka vector far away hoga.

Local model hai — Xenova ne browser/Node.js ke liye ONNX format mein port kiya. Koi external API call nahi, koi rate limit nahi.

```js
// embedding.service.js
async function getPipeline() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  }
  return extractor
}

export async function embed(text) {
  const pipe = await getPipeline()
  const output = await pipe(text, { pooling: "mean", normalize: true })
  return Array.from(output.data)
}
```

`pooling: "mean"` → sabhi token embeddings ka average lelo (sentence-level representation)  
`normalize: true` → L2 normalization → unit vector banta hai (cosine similarity ke liye ready)

**FAISS Vector Store:**

```js
// rag.service.js — startup pe chalti hai
async function init() {
  if (fs.existsSync(VS_DIR)) {
    // Disk pe stored index load karo → fast startup
    vectorStore = await FaissStore.load(VS_DIR, embeddings)
    return
  }
  // First time: .txt files padho, chunk karo, embed karo, save karo
  const docs = readDocuments()
  vectorStore = await FaissStore.fromDocuments(docs, embeddings)
  await vectorStore.save(VS_DIR)
}
```

**Chunking strategy:**
```js
const chunks = content.split("\n\n").filter(c => c.trim().length > 20)
```
Double newline pe split — ek paragraph = ek chunk. 20 chars se chote chunks ignore (headings, empty lines). Simple but effective.

**Search:**
```js
const results = await vectorStore.similaritySearch(query, 3)
// Returns top 3 chunks by cosine similarity
return results.map(doc => `[Source: ${doc.metadata.source}]\n${doc.pageContent}`).join("\n\n---\n\n")
```

Result format mein source filename bhi hota hai — bot samajh sakta hai ki info kahaan se aayi.

**First run pe kya hota hai:**
```
[RAG] Loaded 42 chunks from 4 files
[RAG] Built and saved vector store to .../vector-store
```

**Second run pe:**
```
[RAG] Loaded vector store from disk
```
Dobara embed nahi karta — FAISS index disk pe persist rehta hai.

---

### 7.10 Session Management — Memory Ka System

```js
// session.service.js
const sessions = new Map()  // sessionId → [{role, content}, ...]

export const appendMessage = (sessionId, role, content) => {
  const history = sessions.get(sessionId) || []
  history.push({ role, content })
  sessions.set(sessionId, history.slice(-12))  // last 12 only
}
```

**12 messages kyun?** LLM ke context window mein fit karna padta hai. 12 messages (6 turns) — enough context hai conversation ke liye bina system cost badhaaye.

**In-memory kyun?** Simple project hai — Redis ya DB session store overkill hoga. Downside: server restart pe sab sessions clear. Production mein Redis lagana padega.

**Sirf final replies store hote hain:**
```js
appendMessage(sessionId, "user", message)       // user ka original message
appendMessage(sessionId, "assistant", finalReply) // bot ka Final Answer only
```
Thought/Action/Observation lines store nahi hote — user ko ye sab nahi dikhna chahiye, aur context waste kyun karo.

---

### 7.11 Guest Mode vs Authenticated Mode

**Token aaya → user fetch karo:**
```js
const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
const found = await User.findById(decoded._id)
if (found && found.isUserVerified && !found.isBlocked) user = found
```

**Token nahi aaya ya invalid → guest:**
```js
userInfo = {
  firstName: "there",
  role: "buyer",
  _id: null,
  address: null,
  shoeSizes: {}
}
```

Guest mode mein bot browse kar sakta hai, FAQ pooch sakta hai — lekin `requireBuyer` wale tools (orders, reviews, place_order) throw karenge `401` → bot bata dega "please login first."

**`isBlocked` check isliye:** blocked user ka token valid ho sakta hai (JWT expiry nahi aayi) lekin wo use nahi kar sakta. Yahan check karte hain toh middleware pe depend nahi karna padta.

---

### 7.12 Response — Frontend Ko Kya Milta Hai

```json
{
  "success": true,
  "data": {
    "reply": "Yaar Jiveetesh, ye dekh — Nike Air Max 270 size 9 mein available hai...",
    "sentiment": "neutral",
    "language": "Hinglish",
    "tool_used": "search_products",
    "api_data": { "success": true, "data": { "items": [...] } },
    "suggested_products": [
      {
        "_id": "507f1f77",
        "name": "Nike Air Max 270",
        "slug": "nike-air-max-270",
        "basePrice": 12999,
        "images": ["img_id_1"],
        "averageRating": 4.3,
        "reviewCount": 28
      }
    ],
    "sources": "[Source: size_guide.txt]\nNike sizing: US 9 = EU 43..."
  }
}
```

`suggested_products` → frontend isko product cards render karne ke liye use karta hai. Bot ki text reply ke saath visual cards bhi dikhte hain.

`sources` → RAG se kahan se info aayi — debugging ke liye useful, first 150 chars only.

`tool_used` → frontend jaanta hai ki kaunsa action hua — analytics ke liye.

---

### 7.13 Interesting Edge Cases Aur Design Decisions

**"Mujhe shoes recommend karo" — bot seedha search karta hai, poochta nahi:**
```
CRITICAL RULE: User asks to suggest/find/show/browse shoes → 
call search_products IMMEDIATELY with whatever filters available
```
Old version mein bot pehle "konsa size? konsa brand?" puchta tha — irritating tha. Ab seedha search karta hai, baad mein ek follow-up question.

**Shoe size memory:**
```
User: "mera nike size 9 hai"
Bot: set_shoe_size({category: "nike", size: 9}) → DB mein save
Next conversation: system prompt mein "Saved shoe sizes: {nike: 9}" inject hoga
place_order flow: size automatically fill, user se poochna nahi
```

**Cash on Delivery only chatbot pe:**
Web UI pe multiple payment options hain. Chatbot se order karo toh sirf CoD — kyunki payment gateway integration chatbot mein nahi kari. Honest limitation.

**"mera order kab aayega" → exact date:**
```
RULE: Use exact estimatedDelivery from order object — never compute yourself
```
Bot ne khud se "3-5 business days" nahi kehna — actual order fetch karo aur real date batao.

**Off-topic handle:**
```
User: "IPL match ka score kya hai?"
Bot: "Haha I'm strictly a sneaker guy!"
```
Hardcoded rule. LLM hallucinate karke fake cricket scores nahi dega.

---

## 8. Request ka Safar — Middleware Chain

Ek request aane pe kya kya hota hai sequence mein:

```
Request aaya
    ↓
Morgan (HTTP log — dev mode mein)
    ↓
CORS (allowed origin check karo)
    ↓
express.json() + urlencoded() (body parse karo)
    ↓
cookie-parser (cookies parse karo)
    ↓
Static files (/public serve karo)
    ↓
Route match karo (/api/v1/...)
    ↓
[Optional] verifyAccessJWT — token verify, user fetch, blocked check
    ↓
[Optional] authorizeRoles("buyer") — role check
    ↓
[Optional] validateRequest(schema) — Joi se body validate
    ↓
[Optional] multer upload — file parse karo
    ↓
Controller (wrapAsync wrapped)
    ↓
Service (heavy logic yahan)
    ↓
Mongoose → MongoDB
    ↓
new ServerResponse(statusCode, data, message)
    ↓
res.status(code).json(response)

--- Agar kuch galat hua ---
    ↓
next(error) → errorHandler middleware
    ↓
ServerError? → statusCode + message extract karo
    ↓
JSON error response bhejo
```

---

## 9. Common Utils — Chhote chhote Helpers

### `ServerError.js`
```js
throw new ServerError(404, "Product nahi mila yaar")
```
Error handler catch karta hai aur sahi status code ke saath respond karta hai.

### `ServerResponse.js`
```js
res.status(200).json(new ServerResponse(200, data, "Product mil gaya"))
// → { statusCode: 200, success: true, message: "Product mil gaya", data: {...} }
```
Consistent response shape — har route ka same format.

### `wrapAsync.js`
```js
export default (fn) => (req, res, next) => fn(req, res, next).catch(next)
```
Har controller `wrapAsync` se wrap hota hai. No try-catch everywhere.

### `authHelper.js`
- `hashPassword(plain)` — bcrypt hash (10 salt rounds)
- `comparePassword(plain, hashed)` — match check

### `jwtHelper.js`
- `generateAccessToken()` — 1 day expiry, payload: `{ _id, email, firstName }`
- `generateRefreshToken()` — 10 day expiry, payload: `{ _id }`

### `imgCompress.js` + `saveImageToDb.js`
Upload aata hai → temp disk pe save → compress (max 1600×1200, 75% quality, Sharp se) → MongoDB Image doc mein Buffer save → temp file delete. Clean pipeline.

---

## 10. Dev Setup + Scripts

### Environment Variables (`.env`)

```env
PORT=6969
MONGODB_URL=mongodb+srv://...
CORS_ORIGIN=*
NODE_ENV=development
ACCESS_TOKEN_SECRET=...
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=...
REFRESH_TOKEN_EXPIRY=10d
GROQ_API_KEY=gsk_...
API_BASE_URL=http://localhost:6969/api/v1
PEXELS_API_KEY=...        # seedProductImages.js ke liye
```

### Commands

```bash
npm run dev     # nodemon se start (auto-restart on file change)
npm start       # production start
npm run format  # prettier se sab format karo
```

### Scripts

**`scripts/seedData.js`** — Sample data inject karo MongoDB mein:
- 3 users (admin, seller, buyer) — password: `Password123`
- Categories, products, orders, reviews
- Idempotent hai — dobara chalao toh duplicate nahi banega

**`scripts/seedProductImages.js`** — Pexels API se real shoe photos fetch karo:
- `node scripts/seedProductImages.js` — sirf jo products mein 2 se kam images hain unhe fill karo
- `node scripts/seedProductImages.js --force` — sab ki images replace karo
- Sharp se compress (800×600, 75% JPEG) → MongoDB mein save

---

## 11. Order Status — State Machine

Seller ye transitions kar sakta hai only:

```
pending → confirmed → processing → shipped → out_for_delivery → delivered
   ↓            ↓           ↓          ↓              ↓
cancelled   cancelled   cancelled  cancelled       (no cancel)
```

Buyer sirf `pending` status mein cancel kar sakta hai. Baad mein nahi. Fair hai.

Cancel hone pe stock automatically restore hota hai (`$inc` se). Matlab overselling nahi hoga.

---

## 12. Quick Summary — TL;DR

| Cheez | Detail |
|---|---|
| Language | Node.js (ESM) |
| Framework | Express 5 |
| Database | MongoDB Atlas + Mongoose 9 |
| Auth | JWT (access: 1d, refresh: 10d) + bcrypt |
| Validation | Joi |
| File Uploads | Multer + Sharp (compress) → MongoDB Buffer |
| AI/LLM | Groq — llama-3.3-70b-versatile |
| Embeddings | @xenova/transformers (local, all-MiniLM-L6-v2) |
| Vector DB | FAISS (faiss-node) |
| RAG | LangChain + FAISS |
| Logging | Winston + Morgan |
| Roles | buyer / seller / admin |
| API Routes | 48+ endpoints across 8 routers |
| Chatbot Tools | 14 tools (orders, products, reviews, profile, shoe sizes) |
| Port | 6969 (chose this yourself, respect) |

---

> _Yahi hai poora project bhai. Ab toh samajh gaye na? Agar nahi samjha toh code padho, main kya karoon._
