import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { embed } from "./embedding.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.join(__dirname, "../../knowledge-base");

let chunks = []; // { source, text, vector }
let initialized = false;
let initPromise = null;

function cosineSimilarity(a, b) {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function init() {
  const files = fs.readdirSync(KB_DIR).filter((f) => f.endsWith(".txt"));
  const rawChunks = files.flatMap((file) => {
    const content = fs.readFileSync(path.join(KB_DIR, file), "utf-8");
    return content
      .split("\n\n")
      .filter((chunk) => chunk.trim().length > 20)
      .map((chunk) => ({ source: file, text: chunk.trim() }));
  });

  chunks = await Promise.all(
    rawChunks.map(async (chunk) => ({
      ...chunk,
      vector: await embed(chunk.text),
    }))
  );

  console.log(
    `[RAG] Indexed ${chunks.length} chunks from ${files.length} files`
  );
  initialized = true;
}

export const loadKnowledgeBase = () => {
  if (!initPromise) {
    initPromise = init();
  }
  return initPromise;
};

// Kick off indexing at module load (same as before)
loadKnowledgeBase();

export const search = async (query) => {
  if (!query) return "";

  if (!initialized) await initPromise;
  if (chunks.length === 0) return "";

  const queryVector = await embed(query);

  const topChunks = chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryVector, chunk.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return topChunks
    .map((c) => `[Source: ${c.source}]\n${c.text}`)
    .join("\n\n---\n\n");
};
