const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

/** Ensures every yt-dlp invocation can use the Node runtime required for YouTube extraction. */
test("Docker image enables the bundled Node runtime for yt-dlp", () => {
  const dockerfile = fs.readFileSync(path.join(projectRoot, "Dockerfile"), "utf8");
  const configPath = path.join(projectRoot, "yt-dlp.conf");

  assert.match(dockerfile, /^FROM node:(2[2-9]|[3-9]\d)(?:[.:-]|$)/m);
  assert.match(dockerfile, /^COPY yt-dlp\.conf \/etc\/yt-dlp\.conf$/m);
  assert.equal(fs.readFileSync(configPath, "utf8").trim(), "--js-runtimes node");
});

/** Keeps YouTube extractor fixes newer than the latest stable release in the built image. */
test("Docker image updates yt-dlp to the nightly channel", () => {
  const dockerfile = fs.readFileSync(path.join(projectRoot, "Dockerfile"), "utf8");

  assert.match(dockerfile, /^RUN yt-dlp --update-to nightly$/m);
});

/** Prevents local bot secrets and generated dependencies from entering the Docker image. */
test("Docker build context excludes local secrets and generated files", () => {
  const dockerignore = fs.readFileSync(path.join(projectRoot, ".dockerignore"), "utf8");
  const ignoredPaths = new Set(dockerignore.split(/\r?\n/).filter(Boolean));

  assert.ok(ignoredPaths.has(".env"));
  assert.ok(ignoredPaths.has("node_modules"));
  assert.ok(ignoredPaths.has("dist"));
});
