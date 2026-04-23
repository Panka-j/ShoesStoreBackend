import jwt from "jsonwebtoken";
import { chat } from "../services/groq.service.js";
import { detectSentiment } from "../services/sentiment.service.js";
import { search as ragSearch } from "../services/rag.service.js";
import { executeTool } from "../services/toolExecutor.service.js";
import {
  getHistory,
  appendMessage,
  clearSession,
} from "../services/session.service.js";
import User from "../models/userModel.js";

const MAX_STEPS = 3;

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT_TEMPLATE = `You are ShoeBot — AI customer support for ShoesStore, a premium sneaker and streetwear store. You are embedded in the website and have access to the user's real data through tools.

USER CONTEXT
Name: {user_first_name} | Role: {user_role} | ID: {user_id} | Has address: {has_address}
Language: {detected_language} | Sentiment: {sentiment} | Time: {current_time}

PERSONALITY
- Warm sneakerhead voice — use "heat", "cop", "colourway", "grails", "DS", "deadstock" naturally
- 2–4 lines max. Always use the user's first name. End with a follow-up question.
- angry/frustrated → lead with "Yaar, that's genuinely frustrating and I'm really sorry about this."
- happy → match their energy and enthusiasm

STORE FACTS
- Currency: ₹ (Indian Rupees) always
- Returns: 7 days from delivery, unworn, original packaging
- Shipping: 3–5 business days standard | 1–2 days express (+₹199) | Free above ₹3000
- Delivery date: every order object has an estimatedDelivery field — quote it exactly, never compute it yourself
- Auth: Every shoe 100% verified before dispatch
- Payment: UPI, cards, net banking, EMI 0% for 3 months on orders above ₹5000
- Support: 10 AM–8 PM IST Mon–Sat | support@shoesstore.in
- Order status: pending→"waiting for seller confirmation" | confirmed→"seller is getting it ready!" | processing→"being packed" | shipped→"on its way!" | out_for_delivery→"out for delivery today!" | delivered→"delivered. Hope you love them!" | cancelled→"cancelled"

KNOWLEDGE BASE (use for policy, sizing, care questions)
{retrieved_context}

AVAILABLE TOOLS
- get_my_orders       {{"status": ""|"pending"|"confirmed"|"processing"|"shipped"|"out_for_delivery"|"delivered"|"cancelled"}}
- get_order_detail    {{"order_id": "<id>"}}
- cancel_order        {{"order_id": "<id>", "cancel_reason": "<reason>"}}
- search_products     {{"search": "", "category": "", "minPrice": 0, "maxPrice": 0, "size": 0, "sort": "newest"}}
- get_product         {{"slug_or_id": "<slug or id>"}}
- get_product_reviews {{"product_id": "<id>"}}
- submit_review       {{"product_id": "<id>", "rating": 1, "comment": ""}}
- get_my_reviews      {{}}
- get_categories      {{}}
- get_my_profile      {{}}

REASONING FORMAT — follow this exactly for every response:

Thought: [your reasoning about what the user needs and how to help]
Action: [exact tool name from the list above, or "none" if no tool is needed]
Action Input: {{"key": "value"}}

When Action is "none", also add:
Final Answer: [your warm reply to the user — no raw JSON, no MongoDB IDs, no technical field names]

RULES
- Always confirm before cancel_order or submit_review: ask "Shall I go ahead?"
- Need order ID but don't have it → call get_my_orders first
- Need product ID but don't have it → call search_products first
- Never show Thought/Action/Action Input lines in the Final Answer
- Never make up prices, stock, policies, or delivery dates
- Never share another user's data
- Off-topic (cricket, politics, movies) → "Haha I'm strictly a sneaker guy!"
- SESSION_EXPIRED → ask to log in | NOT_FOUND → ask to verify details | API_ERROR → apologize and flag to team
- delivery date question → fetch the order, then quote estimatedDelivery exactly — never say "3-5 business days" when you have real order data
- buyer role: orders, reviews, browse | seller role: direct to seller dashboard | admin: full access

User message: {user_message}`;

// ─── Build Prompt ─────────────────────────────────────────────────────────────
const buildPrompt = ({
  userInfo,
  sentiment,
  detectedLanguage,
  retrievedContext,
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
function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// ─── parseAgentStep ───────────────────────────────────────────────────────────
// Extracts ReAct fields from a raw LLM response
function parseAgentStep(text) {
  const thought = text.match(/Thought:\s*(.*)/)?.[1]?.trim() ?? "";
  const action =
    text
      .match(/Action:\s*(\S+)/)?.[1]
      ?.trim()
      .toLowerCase() ?? "none";
  const inputBlock =
    text
      .match(
        /Action Input:\s*([\s\S]*?)(?=\n(?:Observation|Final Answer|Thought)|$)/
      )?.[1]
      ?.trim() ?? "";
  const finalAnswer =
    text.match(/Final Answer:\s*([\s\S]*)$/)?.[1]?.trim() ?? "";
  return { thought, action, actionInput: extractJSON(inputBlock), finalAnswer };
}

// ─── stripReActMarkers ────────────────────────────────────────────────────────
// Removes internal ReAct scaffolding lines so fallback text stays clean
function stripReActMarkers(text) {
  return text
    .replace(/^Thought:.*$/gm, "")
    .replace(/^Action:.*$/gm, "")
    .replace(/^Action Input:.*$/gm, "")
    .replace(/^Observation:.*$/gm, "")
    .replace(/^Final Answer:\s*/m, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

    // Resolve user directly — no HTTP round-trip
    let user = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const found = await User.findById(decoded._id);
        if (found && found.isUserVerified && !found.isBlocked) user = found;
      } catch {
        // Invalid or expired token — continue as guest
      }
    }

    const userInfo = user
      ? {
          firstName: user.firstName,
          role: user.role,
          _id: user._id,
          address: user.address,
        }
      : { firstName: "there", role: "buyer", _id: null, address: null };

    // Parallel: sentiment, RAG, language detection
    const history = getHistory(sessionId);
    const [sentiment, retrievedContext, detectedLanguage] = await Promise.all([
      detectSentiment(message),
      ragSearch(message),
      Promise.resolve(detectLanguage(message)),
    ]);

    const systemPrompt = buildPrompt({
      userInfo,
      sentiment,
      detectedLanguage,
      retrievedContext,
      userMessage: message,
    });

    // Seed agent messages: system + conversation history + current user message
    const agentMessages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    let finalReply = null;
    let toolUsed = null;
    let apiResult = null;

    // ── ReAct Agent Loop ──────────────────────────────────────────────────────
    for (let step = 0; step < MAX_STEPS; step++) {
      const isLastStep = step === MAX_STEPS - 1;

      if (isLastStep) {
        agentMessages.push({
          role: "user",
          content:
            "You have reached the maximum reasoning steps. Based on all information gathered, provide your Final Answer now.",
        });
      }

      const raw = await chat(
        agentMessages,
        isLastStep ? 500 : 350,
        isLastStep ? 0.7 : 0.3
      );

      const parsed = parseAgentStep(raw);

      // Exit if LLM signals no tool needed or produced a Final Answer
      if (parsed.action === "none" || parsed.finalAnswer) {
        finalReply = parsed.finalAnswer || stripReActMarkers(raw);
        break;
      }

      // Execute the tool
      const result = await executeTool(
        parsed.action,
        parsed.actionInput || {},
        user
      );
      toolUsed = parsed.action;
      apiResult = result;

      // Append step to agent context for next iteration
      agentMessages.push({ role: "assistant", content: raw });
      agentMessages.push({
        role: "user",
        content: `Observation: ${JSON.stringify(result)}`,
      });
    }

    // Safety fallback — should only trigger if loop exhausted without Final Answer
    if (!finalReply) {
      finalReply =
        "Yaar, something went sideways on my end — could you try again? I'm on it!";
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
