#!/usr/bin/env python3
"""YAGI Chroma 검색 daemon — 모델 1회 로드 후 상주 (HTTP).
TASK 33. Endpoint: GET http://127.0.0.1:8900/?q=<query>&k=<top_k>
"""
import os, json, signal, sys

os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")

from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import chromadb
from chromadb.utils import embedding_functions

CHROMA_PATH = "/mnt/d/AI/chroma"
COLLECTION = "yagi-docs"
MODEL = "Qwen/Qwen3-Embedding-0.6B"
PORT = 8900

print(f"[chroma-daemon] loading model on CPU: {MODEL}", flush=True)
ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name=MODEL, device="cpu"
)
client = chromadb.PersistentClient(path=CHROMA_PATH)
col = client.get_collection(name=COLLECTION, embedding_function=ef)
print(f"[chroma-daemon] ready on 127.0.0.1:{PORT}", flush=True)


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            q = parse_qs(urlparse(self.path).query)
            query = q.get("q", ["design system"])[0]
            k = int(q.get("k", ["5"])[0])
            res = col.query(query_texts=[query], n_results=k)
            out = [
                {
                    "source": res["metadatas"][0][i]["source"],
                    "heading": res["metadatas"][0][i].get("heading", ""),
                    "score": round(1 - res["distances"][0][i], 3),
                    "snippet": res["documents"][0][i][:300],
                }
                for i in range(len(res["ids"][0]))
            ]
            body = json.dumps(out, ensure_ascii=False).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            err = json.dumps({"error": str(e)}).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(err)

    def log_message(self, *_):
        pass


def graceful(*_):
    print("[chroma-daemon] shutting down", flush=True)
    sys.exit(0)


signal.signal(signal.SIGTERM, graceful)
signal.signal(signal.SIGINT, graceful)
HTTPServer(("127.0.0.1", PORT), H).serve_forever()
