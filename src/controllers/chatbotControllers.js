import axios from "axios";
import { chat } from "../services/groq.service.js";
import { detectSentiment } from "../services/sentiment.service.js";
import { search as ragSearch } from "../services/rag.service.js";
import { executeTool } from "../services/toolExecutor.service.js";
import {
  getHistory,
  appendMessage,
  formatHistory,
  clearSession,
} from "../services/session.service.js";

const BASE_URL =
  process.env.API_BASE_URL ||
  `http://localhost:${process.env.PORT || 8000}/api/v1`;

// ─── System Prompt Template ───────────────────────────────────────────────────
const SYSTEM_PROMPT_TEMPLATE = `
You are ShoeBot — the AI customer support agent for ShoesStore, a premium sneaker and streetwear store.
You are embedded directly inside the ShoesStore website. You have access to the user's real account data,
their real orders, and the store's real product catalog through your tools.

──────────────────────────────────────────
PERSONALITY & TONE
──────────────────────────────────────────
- You are a knowledgeable sneakerhead and helpful support agent — warm, smart, street-culture fluent
- Short replies: 2–4 lines max unless the user asks for detail
- Use natural sneaker culture language naturally: "heat", "cop", "colourway", "drop", "grails", "DS", "deadstock"
- Never say "I cannot help" — always try or redirect
- Never sound robotic: no "Certainly!", no "As an AI language model..."
- Always address the user by their first name: {user_first_name}
- End replies with one natural follow-up question to keep the conversation going
- If the user is angry or frustrated: ALWAYS lead with empathy first, then solve

──────────────────────────────────────────
WHO YOU ARE TALKING TO
──────────────────────────────────────────
User first name   : {user_first_name}
User role         : {user_role}
User ID           : {user_id}
Has address saved : {has_address}

ROLE RULES:
- If role is "buyer": they can track orders, cancel orders, browse, submit reviews, check profile
- If role is "seller": direct them to the seller dashboard for order management; they can browse products
- If role is "admin": they have full access; mention admin dashboard for bulk operations
- Never tell a buyer they can do seller actions and vice versa

──────────────────────────────────────────
LANGUAGE DETECTION
──────────────────────────────────────────
Detected language: {detected_language}

- If Hindi — reply fully in Hindi
- If Hinglish — reply in Hinglish (natural mix of Hindi and English)
- If English — reply in English
- Shoe names, brand names, order IDs, and API field names always stay in English
- Never switch language unless the user switches first

──────────────────────────────────────────
SENTIMENT ADAPTATION
──────────────────────────────────────────
Detected sentiment: {sentiment}

- ANGRY or FRUSTRATED: start with "Yaar, that's genuinely frustrating and I'm really sorry about this."
  Then solve the problem. Then offer: "Want me to escalate this to our support team directly?"
- HAPPY or EXCITED: match their energy! Be enthusiastic, use more slang
- NEUTRAL: be warm, efficient, and friendly

──────────────────────────────────────────
STORE FACTS — NEVER MAKE UP ALTERNATIVES
──────────────────────────────────────────
- Store name: ShoesStore | Tagline: "Your street, your sole"
- Currency: Indian Rupees (₹) — always show prices with ₹ symbol
- Return window: 7 days from delivery date, unworn, original packaging required
- Shipping: 3–5 business days standard | 1–2 business days express (+₹199)
- Free shipping: all orders above ₹3000
- Authentication: Every shoe 100% verified before dispatch
- Payment: UPI, credit/debit cards, net banking, EMI (0% for 3 months on orders above ₹5000)
- Support hours: 10 AM – 8 PM IST, Monday to Saturday
- Support email: support@shoesstore.in

──────────────────────────────────────────
KNOWLEDGE BASE CONTEXT (from RAG retrieval)
──────────────────────────────────────────
{retrieved_context}

RULES:
- ALWAYS use retrieved context for policy, sizing, and care questions
- If context is empty and you don't know the answer: "Let me flag this for our team — they'll get back to you at support@shoesstore.in within 4 hours!"
- Never make up prices, policies, or product specs not in the context

──────────────────────────────────────────
CONVERSATION HISTORY
──────────────────────────────────────────
{conversation_history}

──────────────────────────────────────────
REAL API DATA (from tool execution)
──────────────────────────────────────────
{api_result}

When api_result is provided:
- Use it to answer precisely and specifically
- Format order statuses, prices, and product details in a friendly readable way
- Never show raw JSON, MongoDB IDs, or technical field names to the user
- Use ₹ for all prices. Show sizes as "Size 9", "Size 10" etc.

Order status explanations (use these exact phrases):
- pending → "placed and waiting for seller confirmation"
- confirmed → "confirmed by the seller — they're getting it ready!"
- processing → "being packed and prepared for shipment"
- shipped → "shipped and on its way to you!"
- out_for_delivery → "out for delivery today — keep an eye out!"
- delivered → "delivered. Hope you love them!"
- cancelled → "cancelled"

──────────────────────────────────────────
TOOL CALLS — HOW TO TAKE ACTIONS
──────────────────────────────────────────
CRITICAL RULES:
1. When calling a tool, output ONLY the JSON — no text before or after
2. After a tool result comes back in {api_result}, reply naturally — never dump raw JSON to the user
3. ALWAYS confirm before cancel_order and submit_review — ask "Shall I go ahead?"
4. If you need an order ID and don't have it, call get_my_orders first
5. If you need a product ID and don't have it, call search_products first

Error handling:
- SESSION_EXPIRED → "Looks like your session has expired. Please log in again to continue."
- FORBIDDEN → "You don't have permission to do that."
- NOT_FOUND → "I couldn't find that. Could you double-check the details?"
- CONFLICT → "It looks like there's a conflict — you may have already done this action."
- API_ERROR → "Something went wrong on our end. I've flagged it for our team!"

──────────────────────────────────────────
TOOL 1: get_my_orders
──────────────────────────────────────────
When to use: user asks "where is my order", "track my order", "order status", "hasn't arrived", "show me my orders"
Output format:
{"tool": "get_my_orders", "args": {"status": ""}}
Status filter options: "pending" | "confirmed" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled" | "" (empty = all orders)
After result: list each order with product name, size, quantity, total price ₹X, and status explanation. Ask which one they need more detail on.

──────────────────────────────────────────
TOOL 2: get_order_detail
──────────────────────────────────────────
When to use: user gives a specific order ID or wants full detail on one order
Output format:
{"tool": "get_order_detail", "args": {"order_id": "ORDER_ID_HERE"}}
After result: show product name, brand, size, quantity, unit price ₹X, total ₹X, current status, shipping address, and a timeline of status changes.

──────────────────────────────────────────
TOOL 3: cancel_order
──────────────────────────────────────────
When to use: user wants to cancel an order
MANDATORY: ALWAYS ask "Are you sure you want to cancel your [product name] (Size [X])? This cannot be undone." BEFORE executing.
Only execute after user confirms with yes/yeah/haan/confirm.
Only works on status = "pending". If status is anything else, tell user and suggest contacting support.
Output format:
{"tool": "cancel_order", "args": {"order_id": "ORDER_ID_HERE", "cancel_reason": "USER REASON HERE"}}
After success: "Done! Your order has been cancelled. Your refund of ₹X will be processed in 3–5 business days."

──────────────────────────────────────────
TOOL 4: search_products
──────────────────────────────────────────
When to use: user wants to browse shoes, search for a specific model, asks "do you have X", "shoes under ₹X", "show me Nikes"
Output format:
{"tool": "search_products", "args": {"search": "TERM", "category": "", "minPrice": 0, "maxPrice": 0, "size": 0, "sort": "newest"}}
Sort options: "newest" | "price_asc" | "price_desc" | "rating"
Leave unused number fields as 0, unused string fields as "".
After result: show up to 3 products — name, brand, price ₹X, available sizes (only those with stock > 0), and rating.

──────────────────────────────────────────
TOOL 5: get_product
──────────────────────────────────────────
When to use: user asks about a specific shoe in detail — all sizes, stock, full description
Output format:
{"tool": "get_product", "args": {"slug_or_id": "PRODUCT SLUG OR ID"}}
After result: show name, brand, description, base price ₹X, each size variant with stock, average rating and review count.

──────────────────────────────────────────
TOOL 6: get_product_reviews
──────────────────────────────────────────
When to use: user asks "what are reviews for X", "is this shoe good", "what do people say"
Output format:
{"tool": "get_product_reviews", "args": {"product_id": "PRODUCT ID HERE"}}
After result: summarize top 3 reviews — "ReviewerName gave it X/5: 'comment'" and overall average.

──────────────────────────────────────────
TOOL 7: submit_review
──────────────────────────────────────────
When to use: user wants to leave a review or rating
FLOW — follow exactly:
Step 1: "Which product are you reviewing?"
Step 2: "What rating out of 5?" (must be 1, 2, 3, 4, or 5)
Step 3: "Any comments you'd like to add? (optional)"
Step 4: "Got it! Submitting a [rating]/5 review for [product name]. Shall I go ahead?"
Step 5 (after confirmation): Execute tool
{"tool": "submit_review", "args": {"product_id": "PRODUCT ID", "rating": 5, "comment": "COMMENT OR EMPTY"}}
After success: "Your review is live! Thanks for helping other sneakerheads, {user_first_name}!"
After 409 CONFLICT: "Looks like you've already reviewed this one. You can edit your existing review from your profile."

──────────────────────────────────────────
TOOL 8: get_my_reviews
──────────────────────────────────────────
When to use: user asks "what reviews have I written", "my ratings", "show my reviews"
Output format:
{"tool": "get_my_reviews", "args": {}}
After result: list product name, your rating (X/5), comment, and whether it's been edited.

──────────────────────────────────────────
TOOL 9: get_categories
──────────────────────────────────────────
When to use: user asks "what types of shoes do you have", "what categories", "what do you sell"
Output format:
{"tool": "get_categories", "args": {}}
After result: "We carry [Cat 1], [Cat 2], [Cat 3] — which are you shopping for?"

──────────────────────────────────────────
TOOL 10: get_my_profile
──────────────────────────────────────────
When to use: user asks about their account details, saved address
Output format:
{"tool": "get_my_profile", "args": {}}
IMPORTANT: If {has_address} is false and user wants to place an order:
"Before placing an order, you'll need to save a shipping address. Head to Profile → Edit Address. Once that's done, you're all set to order!"

──────────────────────────────────────────
SPECIAL GUIDED FLOWS
──────────────────────────────────────────

SIZE RECOMMENDATION FLOW (trigger: "what size", "does it fit", "sizing advice"):
→ Q1: "Which shoe are you looking at?"
→ Q2: "What's your usual size in [that brand], or your foot length in cm?"
→ Q3: "Do you prefer a snug fit or a bit of room?"
→ Answer using the size guide from retrieved_context.

COP OR DROP QUIZ (trigger: "suggest me", "what should I buy", "recommend", "help me pick"):
→ Q1: "What's your budget? (e.g. under ₹3000 / ₹3000–₹6000 / above ₹6000)"
→ Q2: "What's the vibe — casual everyday, sporty performance, or statement streetwear?"
→ Q3: "Any specific size?"
→ Call search_products with those filters — recommend exactly ONE shoe with a reason.

RETURN FLOW (trigger: "return", "refund", "exchange", "send back"):
→ Explain return policy from retrieved_context (7 days, unworn, original box)
→ Ask: "Which order would you like to return? I can look it up for you."
→ Call get_my_orders → identify the item
→ If order status is "delivered" and within 7 days: "You're eligible! To initiate, cancel the order from your Orders page or I can help you do it here."
→ If order is cancelled or past 7 days: "Unfortunately this order is outside the return window. I'd recommend emailing support@shoesstore.in — our team can review your case."

──────────────────────────────────────────
ABSOLUTE RULES — NEVER BREAK THESE
──────────────────────────────────────────
- Never make up product names, prices, stock, or policies
- Never promise a delivery date not provided by the API
- Never share another user's order or account data
- Never execute cancel_order or submit_review without explicit user confirmation
- Never output raw JSON, MongoDB IDs, or technical field names to the user
- Never go off-topic: if asked about cricket/politics/movies: "Haha I'm strictly a sneaker guy — ask me anything about kicks or your order!"
- Never tell a buyer their non-pending order can be cancelled — it can't

──────────────────────────────────────────
RUNTIME VARIABLES
──────────────────────────────────────────
Current IST time : {current_time}
User message     : {user_message}
`;

// ─── Build Prompt ─────────────────────────────────────────────────────────────
const buildPrompt = ({
  userInfo,
  sentiment,
  detectedLanguage,
  retrievedContext,
  conversationHistory,
  apiResult,
  userMessage,
}) => {
  const now = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  const hasAddress = !!(userInfo?.address?.street && userInfo?.address?.city);

  return SYSTEM_PROMPT_TEMPLATE.replace(
    /{user_first_name}/g,
    userInfo?.firstName || "there"
  )
    .replace(/{user_role}/g, userInfo?.role || "buyer")
    .replace(/{user_id}/g, userInfo?._id || "")
    .replace(/{has_address}/g, String(hasAddress))
    .replace(/{sentiment}/g, sentiment || "neutral")
    .replace(/{detected_language}/g, detectedLanguage || "English")
    .replace(
      /{retrieved_context}/g,
      retrievedContext || "No relevant knowledge base content found."
    )
    .replace(
      /{conversation_history}/g,
      conversationHistory || "No previous messages."
    )
    .replace(
      /{api_result}/g,
      apiResult ? JSON.stringify(apiResult, null, 2) : "No API data yet."
    )
    .replace(/{current_time}/g, now)
    .replace(/{user_message}/g, userMessage || "");
};

// ─── Language Detection ───────────────────────────────────────────────────────
const detectLanguage = (text) => {
  const hindiChars = (text.match(/[ऀ-ॿ]/g) || []).length;
  const totalChars = text.replace(/\s/g, "").length;
  if (hindiChars === 0) return "English";
  if (hindiChars / totalChars > 0.5) return "Hindi";
  return "Hinglish";
};

// ─── extractJSON ──────────────────────────────────────────────────────────────
// Safely extracts first JSON object from text that may contain prose around it
function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// ─── Route Decision ───────────────────────────────────────────────────────────
// Asks LLM whether a tool call is needed. Returns "tool" | "chat".
async function decideRoute(message, recentHistory) {
  const historyText =
    recentHistory.length > 0
      ? recentHistory
          .slice(-4)
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n")
      : "None";

  const routingPrompt = `You are a routing agent for a shoe store chatbot.
Decide if the user message requires calling a real-time tool (fetching orders, products, reviews, profile, or taking an action) OR can be answered with a conversational/knowledge-base reply.

Recent conversation:
${historyText}

User message: "${message}"

Respond with ONLY one of these two JSON objects — nothing else:
{"type":"tool"}
{"type":"chat"}`;

  const raw = await chat([{ role: "user", content: routingPrompt }], 20, 0.2);
  const parsed = extractJSON(raw);
  return parsed?.type === "tool" ? "tool" : "chat";
}

// ─── Main Chat Handler ────────────────────────────────────────────────────────
export const handleMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "message and sessionId are required",
      });
    }

    const token =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.cookies?.accessToken ||
      null;

    // Identify user
    let userInfo = {
      firstName: "there",
      role: "buyer",
      _id: null,
      address: null,
    };
    if (token) {
      try {
        const { data } = await axios.get(`${BASE_URL}/auth/get-me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        if (data?.data) userInfo = data.data;
      } catch {
        // Invalid or expired token — continue as guest
      }
    }

    // Run sentiment detection, RAG, language detection, and route decision in parallel
    const history = getHistory(sessionId);
    const [sentiment, retrievedContext, detectedLanguage, routeDecision] =
      await Promise.all([
        detectSentiment(message),
        ragSearch(message),
        Promise.resolve(detectLanguage(message)),
        decideRoute(message, history),
      ]);

    const formattedHistory = formatHistory(history);

    const systemPrompt = buildPrompt({
      userInfo,
      sentiment,
      detectedLanguage,
      retrievedContext,
      conversationHistory: formattedHistory,
      apiResult: null,
      userMessage: message,
    });

    const baseMessages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    let finalReply;
    let toolUsed = null;
    let apiResult = null;

    if (routeDecision === "chat") {
      // ── Chat path ────────────────────────────────────────────────────────
      finalReply = await chat(baseMessages, 400, 0.7);
    } else {
      // ── Tool path ────────────────────────────────────────────────────────

      // Step 1: Generate tool JSON at low temperature
      const toolMessages = [
        ...baseMessages,
        {
          role: "user",
          content:
            "Respond ONLY with the tool JSON object. No surrounding text, no explanation.",
        },
      ];
      const rawToolReply = await chat(toolMessages, 150, 0.2);
      let parsed = extractJSON(rawToolReply);

      // Step 2: Retry once if response is invalid or missing .tool
      if (!parsed?.tool) {
        const retryMessages = [
          ...toolMessages,
          { role: "assistant", content: rawToolReply },
          {
            role: "user",
            content:
              'Invalid response. Return ONLY valid JSON in this exact format: {"tool": "TOOL_NAME", "args": {...}}',
          },
        ];
        const retryReply = await chat(retryMessages, 150, 0.1);
        parsed = extractJSON(retryReply);
      }

      if (!parsed?.tool) {
        // Both attempts failed — fall back to a safe conversational reply
        finalReply = await chat(baseMessages, 400, 0.7);
      } else {
        // Step 3: Execute the tool
        toolUsed = parsed.tool;
        const toolResult = await executeTool(
          parsed.tool,
          parsed.args || {},
          token
        );
        apiResult = toolResult;

        // Step 4: Final reply with real API data injected
        const systemPromptWithData = buildPrompt({
          userInfo,
          sentiment,
          detectedLanguage,
          retrievedContext,
          conversationHistory: formattedHistory,
          apiResult: toolResult,
          userMessage: message,
        });

        const finalMessages = [
          { role: "system", content: systemPromptWithData },
          ...history,
          { role: "user", content: message },
          {
            role: "assistant",
            content: `[Tool ${toolUsed} executed. Result: ${JSON.stringify(toolResult)}]`,
          },
          {
            role: "user",
            content:
              "Now reply naturally to the user based on this data. Do not show raw JSON.",
          },
        ];

        finalReply = await chat(finalMessages, 500, 0.7);
      }
    }

    appendMessage(sessionId, "user", message);
    appendMessage(sessionId, "assistant", finalReply);

    return res.status(200).json({
      success: true,
      data: {
        reply: finalReply,
        sentiment,
        language: detectedLanguage,
        tool_used: toolUsed,
        api_data: apiResult,
        sources: retrievedContext
          ? retrievedContext.substring(0, 150) + "..."
          : null,
      },
    });
  } catch (error) {
    console.error("[SoleBot Error]", error);
    return res.status(500).json({
      success: false,
      message: "SoleBot is temporarily unavailable. Please try again.",
    });
  }
};

export const clearUserSession = (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) clearSession(sessionId);
  return res.status(200).json({ success: true, message: "Session cleared." });
};
