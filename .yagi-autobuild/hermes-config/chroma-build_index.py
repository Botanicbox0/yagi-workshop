#!/usr/bin/env python3
"""YAGI Chroma RAG — 핵심 문서 색인 (build-time 임베딩 저장).
TASK 33 — replaces LEANN (recompute design unsuitable for CPU + 54K chunk).
"""
import os, glob, hashlib
import chromadb
from chromadb.utils import embedding_functions

# CPU 강제 (ComfyUI GPU 공존)
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")

CHROMA_PATH = "/mnt/d/AI/chroma"
COLLECTION = "yagi-docs"
MODEL = "Qwen/Qwen3-Embedding-0.6B"

# Core sources (minimum scope per TASK 33)
SOURCES = [
    "/mnt/d/AI/projects/yagi-workshop/.yagi-autobuild/PRODUCT-MASTER.md",
    "/mnt/d/AI/projects/yagi-workshop/AGENTS.md",
    "/mnt/d/AI/projects/yagi-workshop/src/AGENTS.md",
    "/mnt/d/AI/projects/yagi-workshop/.yagi-autobuild/AGENTS.md",
    "/mnt/d/AI/projects/yagi-workshop/supabase/AGENTS.md",
    "/mnt/d/AI/projects/yagi-workshop/.claude/skills/yagi-design-system/SKILL.md",
]
# Design-system corpus (PRINCIPLES, TYPOGRAPHY, INTERACTION, COMPONENT_CONTRACTS, …)
SOURCES += sorted(glob.glob("/mnt/d/AI/projects/yagi-workshop/.yagi-autobuild/design-system/*.md"))
# Also include the legacy /mnt/skills path if it exists (no harm if absent)
SOURCES += sorted(glob.glob("/mnt/skills/user/yagi-design-system/SKILL.md"))


def chunk_md(text: str, size: int = 800, overlap: int = 3):
    """Heading-aware + size-bounded hybrid chunking.

    - Flush at every `#` heading (so a chunk is a section, not split across).
    - Within a section, also flush when buffer exceeds ``size`` chars; keep
      ``overlap`` trailing lines to preserve cross-chunk context.
    - Drop chunks shorter than 30 chars.
    """
    chunks = []
    cur_heading = ""
    buf: list[str] = []

    def flush():
        content = "\n".join(buf).strip()
        if len(content) > 30:
            chunks.append({"text": content, "heading": cur_heading})

    for ln in text.split("\n"):
        if ln.lstrip().startswith("#"):
            flush()
            buf = []
            cur_heading = ln.strip("# ").strip()
        buf.append(ln)
        if sum(len(l) + 1 for l in buf) > size:
            flush()
            buf = buf[-overlap:] if len(buf) > overlap else []
    flush()
    return chunks


def main() -> int:
    print(f"Loading embedding model on CPU: {MODEL}")
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=MODEL, device="cpu"
    )
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    # Recreate collection
    try:
        client.delete_collection(COLLECTION)
        print(f"Deleted existing collection '{COLLECTION}'")
    except Exception:
        pass
    col = client.create_collection(name=COLLECTION, embedding_function=ef)

    total = 0
    seen = set()
    for src in SOURCES:
        if src in seen or not os.path.exists(src):
            if not os.path.exists(src):
                print(f"  skip (missing): {src}")
            continue
        seen.add(src)
        with open(src, encoding="utf-8") as f:
            text = f.read()
        chunks = chunk_md(text)
        ids, docs, metas = [], [], []
        for i, c in enumerate(chunks):
            cid = hashlib.md5(f"{src}:{i}".encode()).hexdigest()
            ids.append(cid)
            docs.append(c["text"])
            metas.append(
                {
                    "source": os.path.basename(src),
                    "path": src,
                    "heading": c["heading"],
                }
            )
        if ids:
            col.add(ids=ids, documents=docs, metadatas=metas)
            total += len(ids)
            print(f"  {os.path.basename(src):<32} {len(ids):>4} chunks  ({len(text)//1024} KB)")

    print(f"\nTotal: {total} chunks indexed → {CHROMA_PATH} (collection '{COLLECTION}')")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
