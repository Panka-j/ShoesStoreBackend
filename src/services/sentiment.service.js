import { classify } from "./groq.service.js";

export const detectSentiment = async (message) => {
  const prompt = `Classify the sentiment of this customer service message in ONE word only.
Choose from: angry, frustrated, neutral, happy.
Reply with ONLY the single word, nothing else.
Message: "${message}"`;

  try {
    const result = await classify(prompt);
    const valid = ["angry", "frustrated", "neutral", "happy"];
    return valid.includes(result) ? result : "neutral";
  } catch {
    return "neutral";
  }
};
