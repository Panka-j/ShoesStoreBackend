import { pipeline } from "@xenova/transformers";
import { Embeddings } from "@langchain/core/embeddings";

let extractor = null;

async function getPipeline() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractor;
}

export async function embed(text) {
  const pipe = await getPipeline();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

export class XenovaEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  async embedDocuments(texts) {
    return Promise.all(texts.map((t) => embed(t)));
  }

  async embedQuery(text) {
    return embed(text);
  }
}
