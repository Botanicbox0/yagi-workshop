// YouTube URL validator mirror-test
// Usage: node src/lib/validation/youtube.spec.mjs
// Tests both the reference regex patterns and expected behavior

const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_PATTERNS = [
  {
    kind: "watch",
    regex: /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})(?:[&?].*)?$/,
  },
  {
    kind: "watch",
    regex: /^https?:\/\/m\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})(?:[&?].*)?$/,
  },
  {
    kind: "youtu.be",
    regex: /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:\?.*)?$/,
  },
  {
    kind: "shorts",
    regex: /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})$/,
  },
  {
    kind: "embed",
    regex: /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{11})$/,
  },
];

function parseYouTubeUrl(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }

  const trimmed = raw.trim();

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const videoId = match[1];
      if (VIDEO_ID_REGEX.test(videoId)) {
        return {
          kind: pattern.kind,
          videoId,
        };
      }
    }
  }

  return null;
}

function isValidYouTubeUrl(raw) {
  return parseYouTubeUrl(raw) !== null;
}

// Test cases: valid URLs
const validCases = [
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxxx",
  "https://youtu.be/dQw4w9WgXcQ",
  "https://youtu.be/dQw4w9WgXcQ?t=42",
  "https://www.youtube.com/shorts/dQw4w9WgXcQ",
  "https://youtube.com/shorts/dQw4w9WgXcQ",
  "https://www.youtube.com/embed/dQw4w9WgXcQ",
];

// Test cases: invalid URLs
const invalidCases = [
  "https://www.youtube.com/",
  "https://www.youtube.com/watch",
  "https://www.youtube.com/watch?t=42",
  "https://www.youtube.com/results?search_query=foo",
  "https://www.youtube.com/channel/UCxxx",
  "https://www.youtube.com/playlist?list=PLxxx",
  "https://www.youtube.com/user/someone",
  "https://vimeo.com/12345",
  "https://fakeyoutube.com/watch?v=dQw4w9WgXcQ",
  "",
  null,
  undefined,
];

let passed = 0;
let failed = 0;

console.log("Testing YouTube URL validator...\n");

// Test valid cases
console.log("Valid cases:");
for (const url of validCases) {
  const result = isValidYouTubeUrl(url);
  if (result) {
    console.log(`✓ ${url}`);
    passed++;
  } else {
    console.log(`✗ ${url}: expected true, got false`);
    failed++;
  }
}

// Test invalid cases
console.log("\nInvalid cases:");
for (const url of invalidCases) {
  const result = isValidYouTubeUrl(url);
  if (!result) {
    console.log(
      `✓ ${url === "" ? '""' : url === null ? "null" : url === undefined ? "undefined" : url}`
    );
    passed++;
  } else {
    console.log(
      `✗ ${url === "" ? '""' : url === null ? "null" : url === undefined ? "undefined" : url}: expected false, got true`
    );
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
