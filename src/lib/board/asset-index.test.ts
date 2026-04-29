/**
 * asset-index.test.ts
 * Unit tests for extractAssetIndex — the unified asset index normalizer.
 * Uses node:test (no vitest installed in this repo).
 *
 * Run: node --test src/lib/board/asset-index.test.ts
 * (or: node --loader ts-node/esm --test ... if TS compilation required)
 *
 * Phase 3.1 hotfix-3 — 6 required test cases.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractAssetIndex,
  type PdfAttachment,
  type UrlAttachment,
} from "./asset-index.ts";

// ============================================================
// Helpers
// ============================================================

function makeDoc(shapes: Record<string, unknown>): Record<string, unknown> {
  return { store: shapes };
}

function makeImageShape(
  id: string,
  src: string,
  addedAt = "2026-04-29T10:00:00Z"
): Record<string, unknown> {
  return {
    type: "yagi-image",
    id,
    props: { src, alt: "test-image" },
    meta: { createdAt: addedAt },
  };
}

function makeUrlShape(
  id: string,
  url: string,
  title: string,
  addedAt = "2026-04-29T10:00:00Z"
): Record<string, unknown> {
  return {
    type: "yagi-url-card",
    id,
    props: { url, title, domain: new URL(url).hostname },
    meta: { createdAt: addedAt },
  };
}

function makePdfAttachment(overrides: Partial<PdfAttachment> = {}): PdfAttachment {
  return {
    id: "pdf-attach-1",
    storage_key: "project-wizard/abc.pdf",
    filename: "brief.pdf",
    size_bytes: 1024 * 1024,
    uploaded_at: "2026-04-29T09:00:00Z",
    uploaded_by: "user-1",
    ...overrides,
  };
}

function makeUrlAttachment(overrides: Partial<UrlAttachment> = {}): UrlAttachment {
  return {
    id: "url-attach-1",
    url: "https://youtube.com/watch?v=abc123",
    title: "A Reference Video",
    thumbnail_url: "https://img.youtube.com/vi/abc123/hqdefault.jpg",
    provider: "youtube",
    note: "Check out this reference",
    added_at: "2026-04-29T09:30:00Z",
    added_by: "user-1",
    ...overrides,
  };
}

// ============================================================
// Test case 1: Empty document + empty attachments → []
// ============================================================
describe("extractAssetIndex", () => {
  it("returns empty array for null document and empty attachments", () => {
    const result = extractAssetIndex(null, [], []);
    assert.deepEqual(result, []);
  });

  it("returns empty array for undefined document and no attachments (backward compat)", () => {
    const result = extractAssetIndex(undefined);
    assert.deepEqual(result, []);
  });

  it("returns empty array for empty document store and empty attachments", () => {
    const result = extractAssetIndex({ store: {} }, [], []);
    assert.deepEqual(result, []);
  });

  // ============================================================
  // Test case 2: Canvas shapes only (no attachments)
  // ============================================================
  it("returns canvas-only entries when no attachments provided", () => {
    const doc = makeDoc({
      "shape:img1": makeImageShape("shape:img1", "https://r2.example.com/img1.jpg"),
      "shape:url1": makeUrlShape("shape:url1", "https://youtube.com/watch?v=x", "Test"),
    });

    const result = extractAssetIndex(doc, [], []);

    assert.equal(result.length, 2);
    assert.ok(result.every((e) => e.source === "canvas"));
    const imgEntry = result.find((e) => e.kind === "image");
    assert.ok(imgEntry);
    assert.equal(imgEntry!.url, "https://r2.example.com/img1.jpg");
    assert.equal(imgEntry!.source, "canvas");
    const urlEntry = result.find((e) => e.kind === "url");
    assert.ok(urlEntry);
    assert.equal(urlEntry!.url, "https://youtube.com/watch?v=x");
    assert.equal(urlEntry!.source, "canvas");
  });

  // ============================================================
  // Test case 3: Attachments only (empty document)
  // ============================================================
  it("returns attached-only entries when document is empty", () => {
    const pdfs = [makePdfAttachment()];
    const urls = [makeUrlAttachment()];

    const result = extractAssetIndex({ store: {} }, pdfs, urls);

    assert.equal(result.length, 2);
    assert.ok(result.every((e) => e.source !== "canvas"));

    const pdfEntry = result.find((e) => e.kind === "pdf");
    assert.ok(pdfEntry);
    assert.equal(pdfEntry!.source, "attached_pdf");
    assert.equal(pdfEntry!.filename, "brief.pdf");

    const urlEntry = result.find((e) => e.kind === "url");
    assert.ok(urlEntry);
    assert.equal(urlEntry!.source, "attached_url");
    assert.equal(urlEntry!.url, "https://youtube.com/watch?v=abc123");
    assert.equal(urlEntry!.note, "Check out this reference");
  });

  // ============================================================
  // Test case 4: Mixed → attached items before canvas items
  // ============================================================
  it("returns merged result with attached items before canvas items", () => {
    const doc = makeDoc({
      "shape:img1": makeImageShape("shape:img1", "https://r2.example.com/img1.jpg", "2026-04-29T10:00:00Z"),
    });
    const pdfs = [makePdfAttachment({ uploaded_at: "2026-04-29T09:00:00Z" })];
    const urls = [makeUrlAttachment({ added_at: "2026-04-29T09:30:00Z" })];

    const result = extractAssetIndex(doc, pdfs, urls);

    assert.equal(result.length, 3);

    // First two should be attached
    assert.equal(result[0].source, "attached_pdf");
    assert.equal(result[1].source, "attached_url");
    // Last should be canvas
    assert.equal(result[2].source, "canvas");
  });

  // ============================================================
  // Test case 5: Duplicate URL → both kept, canvas entry has duplicate:true
  // ============================================================
  it("keeps both entries when same URL in canvas + attached_urls, canvas entry gets duplicate:true", () => {
    const sharedUrl = "https://youtube.com/watch?v=SHARED";
    const doc = makeDoc({
      "shape:url1": makeUrlShape("shape:url1", sharedUrl, "Shared Video"),
    });
    const urls = [
      makeUrlAttachment({ url: sharedUrl, title: "Shared Video (with note)", note: "My note" }),
    ];

    const result = extractAssetIndex(doc, [], urls);

    // Both kept
    assert.equal(result.length, 2);

    const canvasEntry = result.find((e) => e.source === "canvas");
    const attachedEntry = result.find((e) => e.source === "attached_url");

    assert.ok(canvasEntry, "canvas entry missing");
    assert.ok(attachedEntry, "attached entry missing");

    // Canvas entry marked as duplicate
    assert.equal(canvasEntry!.duplicate, true);
    // Attached entry NOT marked as duplicate
    assert.equal(attachedEntry!.duplicate, undefined);

    // Attached entry has the note
    assert.equal(attachedEntry!.note, "My note");
  });

  // ============================================================
  // Test case 6: Sort order verification
  // ============================================================
  it("sorts attached items before canvas, within each group ascending by added_at", () => {
    const doc = makeDoc({
      "shape:img2": makeImageShape("shape:img2", "https://r2.example.com/img2.jpg", "2026-04-29T12:00:00Z"),
      "shape:img1": makeImageShape("shape:img1", "https://r2.example.com/img1.jpg", "2026-04-29T10:00:00Z"),
    });
    const pdfs = [
      makePdfAttachment({ id: "pdf-2", uploaded_at: "2026-04-29T08:00:00Z", filename: "second.pdf", storage_key: "project-wizard/b.pdf" }),
      makePdfAttachment({ id: "pdf-1", uploaded_at: "2026-04-29T07:00:00Z", filename: "first.pdf", storage_key: "project-wizard/a.pdf" }),
    ];
    const urls = [
      makeUrlAttachment({ id: "url-1", added_at: "2026-04-29T09:00:00Z", url: "https://example.com/a" }),
    ];

    const result = extractAssetIndex(doc, pdfs, urls);

    assert.equal(result.length, 5);

    // First 3: attached items sorted by added_at ascending
    assert.equal(result[0].id, "pdf-1"); // earliest 07:00
    assert.equal(result[1].id, "pdf-2"); // 08:00
    assert.equal(result[2].id, "url-1"); // 09:00

    // Last 2: canvas items sorted by added_at ascending
    assert.equal(result[3].url, "https://r2.example.com/img1.jpg"); // 10:00
    assert.equal(result[4].url, "https://r2.example.com/img2.jpg"); // 12:00
  });
});
