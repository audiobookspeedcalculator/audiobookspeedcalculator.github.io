import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../dist/", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const css = readFileSync(new URL("styles.css", root), "utf8");
const app = readFileSync(new URL("app.mjs", root), "utf8");
const resultCard = html.match(/<section class="card result-card"[^>]*>([\s\S]*?)<\/section>/)?.[1];

test("promotes the finish date and moves undated estimates above the progress bar", () => {
  assert.ok(resultCard, "result card exists");
  assert.match(resultCard, /<h2[^>]*id="result-title"[^>]*>Your listening estimate<\/h2>/);
  assert.match(resultCard, /class="result-topline"[\s\S]*?id="finish-date"/);
  assert.doesNotMatch(resultCard, /<h2[^>]*>Time left<\/h2>/);
  assert.ok(resultCard.indexOf('class="estimate-row"') < resultCard.indexOf('class="progress-block result-progress"'));
  assert.match(css, /\.result-card\.has-finish-date \.result-progress\s*\{[^}]*order:/);
  assert.match(app, /classList\.toggle\("has-finish-date"/);
});

test("aligns the heard percentage left when no finish date is available", () => {
  assert.match(resultCard, /class="progress-context"/);
  assert.match(css, /\.result-card:not\(\.has-finish-date\) \.progress-context\s*\{\s*display:\s*none;/);
  assert.match(css, /\.result-card:not\(\.has-finish-date\) \.result-progress \.progress-heading\s*\{[^}]*justify-content:\s*flex-start;/);
});
