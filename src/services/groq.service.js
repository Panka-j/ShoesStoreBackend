import OpenAI from "openai";

const MODEL = "llama-3.3-70b-versatile";

// Lazily created so dotenv has already run by the time the first call is made
let _groq = null;
const groq = () => {
  if (!_groq) {
    _groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _groq;
};

export const chat = async (messages, maxTokens = 400) => {
  const response = await groq().chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens,
    top_p: 0.9,
  });
  return response.choices[0].message.content.trim();
};

export const classify = async (prompt) => {
  const response = await groq().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 10,
  });
  return response.choices[0].message.content.trim().toLowerCase();
};
