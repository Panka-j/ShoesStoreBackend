# ShoesStoreBackend — Quick Gist

Shoes ka e-commerce backend hai. Node.js + Express 5 + MongoDB. Teen roles: buyer, seller, admin. Standard CRUD — products, orders, reviews, categories. Auth JWT se, images MongoDB ke Buffer mein directly. Itna toh sab samajh jaate hain.

Jo actually interesting hai woh hai **ShoeBot** — ek AI chatbot jo real database se connected hai aur actually kaam karta hai.

---

## ShoeBot — Ye Normal Chatbot Nahi Hai

Ye sirf FAQ bot nahi hai. Ye ek **ReAct agent** hai.

Matlab — bot pehle _sochta_ hai, phir ek _tool use_ karta hai, tool ka result dekh ke _phir sochta_ hai, aur tab _jawab_ deta hai. Max 3 steps. Groq ka **llama-3.3-70b-versatile** model hai under the hood — fast, free tier available, OpenAI-compatible API.

Ek real example:

> User: "mujhe affordable Nike size 9 recommend karo jiska review bhi acha ho"

Bot ka internal process:

```
Thought: user Nike chahta hai size 9 mein, budget conscious lagta hai
Action: search_products
Action Input: {"search": "Nike", "size": 9, "sort": "price_asc"}
Observation: {"success": true, "data": {"items": [5 products...]}}

Thought: top result ka review bhi check karna chahiye pehle
Action: get_product_reviews
Action Input: {"product_id": "507f1f77..."}
Observation: {"success": true, "data": {"items": [reviews...]}}

Action: none
Final Answer: "Yaar Jiveetesh, ye dekh — Nike Air Max 270 ₹8999 mein,
              4.4 stars, 32 reviews. Size 9 mein available hai. Ekdum heat piece."
```

Ye sab user ko nahi dikhta — sirf Final Answer dikhti hai. Thought, Action, Observation sab internal hain.

**Temperature bhi change hoti hai per step:** intermediate steps pe `0.3` (precise JSON chahiye), last step pe `0.7` (natural reply chahiye). Max tokens bhi — 350 intermediate, 500 final. Agar 3 steps mein answer nahi mila toh last step pe forcefully bolte hain "Final Answer do abhi" — bot kabhi silent nahi rehta.

---

## Ek Message Aane Pe Kya Kya Hota Hai

Teen cheezein **ek saath (parallel)** chalti hain — `Promise.all` — taaki latency ek ke baad ek nahi lage:

**1. Sentiment Detection**
Groq pe classify call — prompt sirf itna hai: "ONE word only. Choose from: angry, frustrated, neutral, happy." Temperature `0.1` — deterministic chahiye, creativity nahi. Max tokens `10` — ek word se zyada kuch return hi nahi ho sakta. Agar Groq ne allowed list ke bahar kuch diya → hardcoded `"neutral"` fallback. Ye result system prompt mein inject hota hai aur bot ka opening tone set karta hai — angry user ke liye empathy, happy ke liye energy match.

**2. RAG Search**
User ka message → local embedding model (`all-MiniLM-L6-v2`) se 384-dimensional float vector banta hai → FAISS vector store mein cosine similarity search → top 3 most relevant chunks return. Ye chunks — with their source filename — system prompt mein `{retrieved_context}` slot mein inject hote hain. Isliye bot "Nike Air Max half size bada hota hai" type specific answers deta hai bina hallucinate kiye.

**3. Language Detection**
Do-step algorithm: pehle Devanagari characters count (`[ऀ-ॿ]` regex) — 50%+ hai toh pure Hindi, kuch bhi hai toh Hinglish. Devanagari nahi? Toh Roman script mein 824 Hinglish words ka dictionary check — 20%+ words match kare toh Hinglish. Warna English. Bot reply usi language mein karta hai — Hinglish input → Hinglish reply, Hindi → Devanagari reply.

Teeno ke baad — session history fetch karo, system prompt build karo, LLM ko bhejo.

---

## RAG — Bot Padha-Likha Kyun Hai

4 `.txt` files hain `knowledge-base/` mein:

- **faq.txt** — return policy (7 days, unworn), shipping (3-5d standard, 1-2d express +₹199, free >₹3000), payment methods, support hours
- **size_guide.txt** — Nike, Adidas, Jordan, New Balance, Puma ka US/EU/UK/cm conversion chart, brand-specific tips (Air Max half size bada, Samba true to size)
- **care_guide.txt** — mesh, leather, suede cleaning; sole yellowing fix; storage tips
- **streetwear_guide.txt** — Air Force 1, Dunk, Jordan 1, Samba ke saath kya pehno

Chunking strategy seedhi hai — double newline (`\n\n`) pe split karo, 20 chars se chote chunks ignore. Ek paragraph = ek chunk. Simple but enough.

Server start hone pe ye sab load hote hain → `all-MiniLM-L6-v2` locally embed karta hai → FAISS index banta hai → `vector-store/` folder mein disk pe save hota hai. Next restart pe disk se directly load — dobara embed nahi karta. First run pe time lagta hai, baad mein instant.

Koi external embedding API nahi. `@xenova/transformers` ka local ONNX model hai — mean pooling + L2 normalization karta hai output pe. No rate limits, no cost, no API key.

---

## 12 Tools — Bot Actually Kaam Karta Hai

Bot ke paas 12 tools hain jo real database se connected hain — koi mock data nahi, real Mongoose queries hain andar:

`search_products`, `get_product`, `get_product_reviews`, `get_categories` — ye sab public hain, bina login ke.

`place_order`, `get_my_orders`, `cancel_order`, `get_order_detail`, `submit_review`, `get_my_reviews`, `get_my_profile`, `set_shoe_size` — in sab pe `requireBuyer` guard hai. Token invalid ya role seller/admin → `ServerError(401/403)` → toolExecutor isko map karta hai clean error codes mein: `SESSION_EXPIRED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`. Bot ko raw HTTP status nahi milta — human-readable string milta hai jis pe wo react kar sake.

**`set_shoe_size` sabse smart hai** — user ek baar bolta hai "mera Nike size 9 hai" → bot `set_shoe_size({category: "nike", size: 9})` call karta hai → MongoDB Map mein `$set: { "shoeSizes.nike": 9 }` → save. Agli conversation mein system prompt mein `"Saved shoe sizes: {nike: 9}"` inject hoga. `place_order` flow mein bot automatically wahi size use karta hai — dobara poochta nahi. Ye ek conversation ki memory nahi, permanent DB mein hai.

**Tools chain bhi karte hain.** Agar user bolta hai "place order for Air Force 1" lekin product_id nahi hai → bot pehle `search_products` ya `get_product` call karta hai product fetch karne ke liye, phir `place_order`. 3 steps mein multi-tool chaining possible hai.

Guest mode mein bot browse kar sakta hai, FAQ bata sakta hai — lekin orders/reviews ke liye "please login" bol deta hai.

---

## System Prompt — Bot Ko Kaise Control Kiya

Har request pe ek fresh system prompt build hota hai — string template mein variables replace hote hain runtime pe. Static nahi hai.

Isme inject hota hai:

- User ka naam, role, `_id`, address hai ya nahi (boolean)
- Saved shoe sizes (`{"nike": 9, "adidas": 8}` ya `"none saved"`)
- Detected sentiment + language + current IST time (live, har request pe)
- RAG se mila context — exact knowledge base chunks source filename ke saath
- Available tools ki list with exact JSON input format (taaki LLM galat field name nahi likhe)

**Personality rules:**

- Sneakerhead tone — "heat", "cop", "colourway", "grails", "DS" naturally use karo
- 2-4 lines max, user ka naam mid-sentence use karo — greeting pe nahi, har message pe nahi
- Sirf tab question poochho jab genuinely zaroori ho — questions chain mat karo across turns

**Behavior rules jo prompt mein hardcoded hain:**

- "shoes dikhao / recommend karo / browse karo" → `search_products` **immediately** call karo, koi pre-question nahi. Default sort: `"newest"`. Baad mein ek follow-up pooch sakte ho.
- `place_order` se pehle — product name, size, quantity, total price, aur "Payment: Cash on Delivery" clearly confirm karo user se. Tab call karo.
- Saved shoe size mil gayi category ke liye → automatically use karo, size poochna mat
- Order ka delivery date poochha → order fetch karo, exact `estimatedDelivery` field batao — "3-5 business days" kabhi mat bolna jab real data available ho
- Off-topic (cricket, politics, movies) → "Haha I'm strictly a sneaker guy!"
- Error codes: `SESSION_EXPIRED` → login karo, `NOT_FOUND` → details verify karo, `API_ERROR` → maafi maango aur team ko flag karo

Chatbot se orders Cash on Delivery only — payment gateway chatbot mein integrate nahi ki. Honest limitation, prompt mein clearly mention hai.

---

## Session Memory

In-memory `Map` hai. `sessionId → [{role, content}]`. Max **12 messages** sliding window — `history.slice(-12)` se enforce hota hai har append pe.

Sirf user message aur bot ka **Final Answer** store hote hain. Thought, Action, Observation — ye sab agentMessages mein hain ReAct loop ke dauran, lekin session mein kabhi nahi jaate. Do reasons: user ko internal reasoning nahi dikhni, aur context waste kyun karo unse jo sirf ek turn ke liye relevant hain.

Session history agentMessages mein inject hoti hai `[system, ...history, current_user_message]` format mein — taaki bot pichli conversation yaad rakhe. Server restart pe sab gone — production mein Redis chahiye hoga, ye in-memory implementation deliberately simple rakhi hai.

---

## TL;DR

Backend standard hai. ShoeBot interesting hai — ReAct agent, 12 live tools, RAG knowledge base, local embeddings, sentiment-aware, language-aware, shoe size memory. Groq pe llama-3.3-70b. Sab parallel jahan ho sake. Seedha simple.
