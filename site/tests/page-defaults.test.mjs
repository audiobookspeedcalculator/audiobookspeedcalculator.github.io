import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

function inputTag(id) {
  const match = html.match(new RegExp(`<input\\b[^>]*\\bid="${id}"[^>]*>`));
  assert.ok(match, `input #${id} exists`);
  return match[0];
}

function visibleText(fragment) {
  return fragment
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&times;/g, "×")
    .replace(/&nbsp;/g, " ");
}

test("prefills required audiobook fields and leaves optional fields blank", () => {
  for (const [id, value] of [
    ["total-hours", "10"],
    ["total-minutes", "0"],
    ["total-seconds", "0"],
    ["total-words", "10000"],
    ["total-pages", "100"],
    ["words-per-page", "300"],
    ["reading-speed", "150"],
    ["playback-speed", "1"],
  ]) {
    assert.match(inputTag(id), new RegExp(`\\bvalue="${value}"`), `#${id}`);
  }

  for (const id of [
    "progress-hours", "progress-minutes", "progress-seconds",
    "daily-hours", "daily-minutes", "daily-seconds",
  ]) {
    assert.doesNotMatch(inputTag(id), /\bvalue=/, `#${id} stays empty`);
  }

  assert.doesNotMatch(html, /\bplaceholder=/, "fields have no example placeholders");
});

test("does not render separate daily day cards in the estimate", () => {
  assert.doesNotMatch(html, /id="day-strip"/);
});

test("adds the English page explanation and formula example inside the result card", () => {
  assert.match(html, /<h1[^>]*>Audiobook Speed Calculator<\/h1>/);
  assert.match(html, /Enter the original length and playback speed to instantly see your listening time and time saved\./);
  assert.match(html, /Listening time = Original duration ÷ Playback speed/);
  assert.match(html, /8 hours ÷ 1\.5 = 5 hours 20 minutes/);
  assert.match(html, /Time left = \(Original duration − Original progress\) ÷ Playback speed/);
});

test("ships ten collapsed FAQ entries with 40 to 80 English words per answer", () => {
  const entries = [...html.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)];
  assert.equal(entries.length, 10);
  for (const [index, [, attributes, content]] of entries.entries()) {
    assert.doesNotMatch(attributes, /\bopen(?:\s|=|>)/i, `FAQ ${index + 1} starts closed`);
    const answer = content.match(/<p\b[^>]*>([\s\S]*?)<\/p>/);
    assert.ok(answer, `FAQ ${index + 1} has a static answer`);
    const words = visibleText(answer[1]).match(/\b[A-Za-z]+(?:['’-][A-Za-z]+)*\b/g) ?? [];
    assert.ok(words.length >= 40 && words.length <= 80, `FAQ ${index + 1} has ${words.length} words`);
  }
});

test("replaces the old guide, FAQ, and footer with FAQ as the final content section", () => {
  assert.doesNotMatch(html, /class="guide-card"|class="site-footer"/);
  assert.match(html, /podcasts, YouTube, and courses/i);
  assert.match(html, /<section class="faq"[\s\S]*?<\/section>\s*<\/div>\s*<\/main>/);
});
