import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.join(__dirname, "../../knowledge-base");

let knowledgeBase = [];

export const loadKnowledgeBase = () => {
  const files = fs.readdirSync(KB_DIR).filter((f) => f.endsWith(".txt"));
  knowledgeBase = files.flatMap((file) => {
    const content = fs.readFileSync(path.join(KB_DIR, file), "utf-8");
    return content
      .split("\n\n")
      .filter((chunk) => chunk.trim().length > 20)
      .map((chunk) => ({ source: file, text: chunk.trim() }));
  });

  console.log(
    `[RAG] Loaded ${knowledgeBase.length} chunks from ${files.length} files`
  );
};

loadKnowledgeBase();

export const search = (query) => {
  if (!query || knowledgeBase.length === 0) return "";

  const queryWords = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);

  const scored = knowledgeBase.map((chunk) => {
    const text = chunk.text.toLowerCase();
    const score = queryWords.reduce(
      (acc, word) => acc + (text.includes(word) ? 1 : 0),
      0
    );
    return { ...chunk, score };
  });

  const topChunks = scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (topChunks.length === 0) return "";

  return topChunks
    .map((c) => `[Source: ${c.source}]\n${c.text}`)
    .join("\n\n---\n\n");
};
