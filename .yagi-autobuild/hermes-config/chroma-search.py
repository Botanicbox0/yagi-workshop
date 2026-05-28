#!/usr/bin/env python3
"""YAGI Chroma 검색 CLI — query 1개만 임베딩 (저장형 인덱스 활용).
TASK 33. Usage:  search.py "<query>" [top_k=5]
"""
import os, sys, json

os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")

import chromadb
from chromadb.utils import embedding_functions

CHROMA_PATH = "/mnt/d/AI/chroma"
COLLECTION = "yagi-docs"
MODEL = "Qwen/Qwen3-Embedding-0.6B"


def main() -> int:
    query = sys.argv[1] if len(sys.argv) > 1 else "design system"
    top_k = int(sys.argv[2]) if len(sys.argv) > 2 else 5

    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=MODEL, device="cpu"
    )
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    col = client.get_collection(name=COLLECTION, embedding_function=ef)

    res = col.query(query_texts=[query], n_results=top_k)
    out = []
    for i in range(len(res["ids"][0])):
        out.append(
            {
                "source": res["metadatas"][0][i]["source"],
                "heading": res["metadatas"][0][i].get("heading", ""),
                "score": round(1 - res["distances"][0][i], 3),
                "snippet": res["documents"][0][i][:300],
            }
        )
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
