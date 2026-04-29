import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Document } from "@langchain/core/documents";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { XenovaEmbeddings } from "./embedding.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.join(__dirname, "../../knowledge-base");
const VS_DIR = path.join(__dirname, "../../vector-store");

const embeddings = new XenovaEmbeddings();
let vectorStore = null;
let initPromise = null;

function readDocuments() {
  const files = fs.readdirSync(KB_DIR).filter((f) => f.endsWith(".txt"));
  const docs = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(KB_DIR, file), "utf-8");
    const chunks = content.split("\n\n").filter((c) => c.trim().length > 20);
    for (const chunk of chunks) {
      docs.push(
        new Document({ pageContent: chunk.trim(), metadata: { source: file } })
      );
    }
  }
  console.log(`[RAG] Loaded ${docs.length} chunks from ${files.length} files`);
  return docs;
}

async function init() {
  if (fs.existsSync(VS_DIR)) {
    try {
      vectorStore = await FaissStore.load(VS_DIR, embeddings);
      console.log("[RAG] Loaded vector store from disk");
      return;
    } catch (err) {
      console.warn("[RAG] Could not load store, rebuilding:", err.message);
    }
  }
  const docs = readDocuments();
  vectorStore = await FaissStore.fromDocuments(docs, embeddings);
  await vectorStore.save(VS_DIR);
  console.log(`[RAG] Built and saved vector store to ${VS_DIR}`);
}

export const loadKnowledgeBase = () => {
  if (!initPromise) initPromise = init();
  return initPromise;
};

loadKnowledgeBase();

export const search = async (query) => {
  if (!query) return "";
  if (!vectorStore) await initPromise;
  if (!vectorStore) return "";

  const results = await vectorStore.similaritySearch(query, 3);
  if (results.length === 0) return "";
  return results
    .map((doc) => `[Source: ${doc.metadata.source}]\n${doc.pageContent}`)
    .join("\n\n---\n\n");
};
