const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

require("ts-node/register/transpile-only");

let runProcess;
let sanitizePathSegment;

try {
  ({ runProcess } = require("../src/services/process/process-runner"));
  ({ sanitizePathSegment } = require("../src/utils/filename-utils"));
} catch {
  // RED: production boundaries are added after these behavior assertions fail.
}

/** Keeps shell metacharacters literal when invoking an external executable. */
test("passes backticks and shell metacharacters without executing them", async () => {
  assert.equal(typeof runProcess, "function", "runProcess must use an argument-array boundary");

  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ytdl-special-"));
  const markerPath = path.join(tempDirectory, "executed");
  const literalArgument = `title \`touch ${markerPath}\` $(touch ${markerPath}) \"quote\" 'quote' ; & |\nnext`;

  try {
    const { stdout } = await runProcess(process.execPath, [
      "-e",
      "process.stdout.write(process.argv[1])",
      literalArgument
    ]);

    assert.equal(stdout, literalArgument);
    assert.equal(fs.existsSync(markerPath), false);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

/** Keeps readable title characters while normalizing unsafe path separators and controls. */
test("creates readable titles and playlist folders from special characters", () => {
  assert.equal(typeof sanitizePathSegment, "function", "a shared path sanitizer must exist");
  assert.equal(
    sanitizePathSegment("  AC/DC `Live` $(rm) \"quote\";\n  ", "unknown_title"),
    "AC - DC `Live` $(rm) 'quote';"
  );
  assert.equal(sanitizePathSegment("..", "unknown_title"), "unknown_title");
  assert.equal(sanitizePathSegment("../..", "unknown_title"), "unknown_title");
  assert.equal(sanitizePathSegment("\u0000\n\t", "unknown_title"), "unknown_title");
});

/** Wires downloader, file-size, playlist, and file-search commands through the safe runner. */
test("uses the argument-array runner at every dynamic command boundary", () => {
  const ytDlpService = fs.readFileSync(
    path.join(__dirname, "../src/services/yt-dlp/yt-dlp-service.ts"),
    "utf8"
  );
  const botService = fs.readFileSync(
    path.join(__dirname, "../src/services/telegram/bot-service.ts"),
    "utf8"
  );

  assert.doesNotMatch(ytDlpService, /\bexec(?:Async)?\s*\(/);
  assert.doesNotMatch(botService, /require\(["']child_process["']\)/);
  assert.match(ytDlpService, /runProcess\("yt-dlp",/);
  assert.match(ytDlpService, /runProcess\("du",/);
  assert.match(botService, /runProcess\(file, args\)/);
});
