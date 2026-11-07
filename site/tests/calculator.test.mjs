import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComparison,
  calculateAudiobook,
  PRESET_SPEEDS,
  REFERENCE_SPEEDS,
} from "../../calculator.mjs";

const today = new Date(2026, 10, 30);

test("exposes the exact playback speed presets", () => {
  assert.deepEqual(PRESET_SPEEDS, [1, 1.25, 1.35, 1.5, 1.75, 2, 3]);
});

test("builds the eight reference speed tables from the shared comparison calculation", () => {
  assert.deepEqual(REFERENCE_SPEEDS, [0.75, 1, 1.25, 1.35, 1.5, 1.75, 2, 2.5]);

  for (const speed of REFERENCE_SPEEDS) {
    const rows = Array.from({ length: 80 }, (_, index) => {
      const originalSeconds = (index + 1) * 30 * 60;
      return [originalSeconds, buildComparison(originalSeconds, [speed])[0]];
    });

    assert.equal(rows.length, 80);
    assert.equal(rows[0][0], 1_800);
    assert.equal(rows.at(-1)[0], 144_000);
    for (const [originalSeconds, row] of rows) {
      assert.equal(row.speed, speed);
      assert.equal(row.listeningSeconds, Math.ceil(originalSeconds / speed));
      assert.equal(row.savedSeconds, originalSeconds - row.listeningSeconds);
    }
  }

  const slowerHalfHour = buildComparison(1_800, [0.75])[0];
  assert.deepEqual([slowerHalfHour.listeningSeconds, slowerHalfHour.savedSeconds], [2_400, -600]);

  const fasterFortyHours = buildComparison(144_000, [2.5])[0];
  assert.deepEqual([fasterFortyHours.listeningSeconds, fasterFortyHours.savedSeconds], [57_600, 86_400]);
});

function input(overrides = {}) {
  return {
    hours: "10",
    minutes: "",
    seconds: "",
    speed: "2",
    progressHours: "2",
    progressMinutes: "",
    progressSeconds: "",
    dailyHours: "",
    dailyMinutes: "",
    dailySeconds: "",
    today,
    ...overrides,
  };
}

test("calculates time left from remaining original content and playback speed", () => {
  const result = calculateAudiobook(input());
  assert.equal(result.totalSeconds, 36_000);
  assert.equal(result.elapsedSeconds, 7_200);
  assert.equal(result.remainingOriginalSeconds, 28_800);
  assert.equal(result.remainingSeconds, 14_400);
  assert.equal(result.progressPercent, 20);
});

test("estimates audiobook duration from total word count and reading speed", () => {
  const result = calculateAudiobook(input({
    mode: "words",
    words: "10000",
    readingSpeed: "150",
    progressHours: "",
    progressMinutes: "",
    progressSeconds: "",
    speed: "1",
  }));

  assert.equal(result.totalSeconds, 4_000);
  assert.equal(result.remainingSeconds, 4_000);
});

test("estimates audiobook duration from pages, words per page, and reading speed", () => {
  const result = calculateAudiobook(input({
    mode: "pages",
    pages: "100",
    wordsPerPage: "300",
    readingSpeed: "150",
    progressHours: "",
    progressMinutes: "",
    progressSeconds: "",
    speed: "1",
  }));

  assert.equal(result.totalSeconds, 12_000);
  assert.equal(result.remainingSeconds, 12_000);
});

test("rejects empty and invalid values in the selected word or page mode", () => {
  for (const overrides of [
    { mode: "words", words: "", readingSpeed: "150" },
    { mode: "words", words: "10000", readingSpeed: "0" },
    { mode: "words", words: "10000", readingSpeed: "0.5" },
    { mode: "words", words: "1.5", readingSpeed: "150" },
    { mode: "pages", pages: "100", wordsPerPage: "0", readingSpeed: "150" },
    { mode: "pages", pages: "-1", wordsPerPage: "300", readingSpeed: "150" },
  ]) {
    assert.equal(calculateAudiobook(input({
      progressHours: "",
      progressMinutes: "",
      progressSeconds: "",
      ...overrides,
    })), null, JSON.stringify(overrides));
  }
});

test("composes time left and savings as proportional bar segments", () => {
  const result = calculateAudiobook(input({
    hours: "1",
    minutes: "",
    progressHours: "",
    progressMinutes: "",
    progressSeconds: "",
    speed: "1.5",
  }));

  assert.deepEqual(result.barSegments, {
    heardSeconds: 0,
    remainingSeconds: 2_400,
    savedSeconds: 1_200,
    scaleSeconds: 3_600,
  });
});

test("composes heard, remaining, and saved time independently", () => {
  const result = calculateAudiobook(input({
    hours: "1",
    minutes: "",
    progressHours: "",
    progressMinutes: "10",
    progressSeconds: "",
    speed: "1.5",
  }));

  assert.deepEqual(result.barSegments, {
    heardSeconds: 600,
    remainingSeconds: 2_000,
    savedSeconds: 1_000,
    scaleSeconds: 3_600,
  });
  assert.equal(result.savedPercent, 33);
});

test("shows no savings for slower speeds and scales the bar to actual time", () => {
  const result = calculateAudiobook(input({
    hours: "1",
    minutes: "",
    progressHours: "",
    progressMinutes: "10",
    progressSeconds: "",
    speed: "0.5",
  }));

  assert.deepEqual(result.barSegments, {
    heardSeconds: 600,
    remainingSeconds: 6_000,
    savedSeconds: 0,
    scaleSeconds: 6_600,
  });
  assert.equal(result.extraPercent, 100);
});

test("progress percentage does not change when playback speed changes", () => {
  const first = calculateAudiobook(input({ speed: "1" }));
  const second = calculateAudiobook(input({ speed: "3" }));
  assert.equal(first.progressPercent, 20);
  assert.equal(second.progressPercent, 20);
  assert.notEqual(first.remainingSeconds, second.remainingSeconds);
});

test("combines blank duration parts as zero and rounds remaining time up to a second", () => {
  const result = calculateAudiobook(input({
    hours: "2",
    minutes: "30",
    seconds: "15",
    progressHours: "",
    progressMinutes: "",
    progressSeconds: "",
    speed: "1.35",
  }));
  assert.equal(result.totalSeconds, 9_015);
  assert.equal(result.elapsedSeconds, 0);
  assert.equal(result.remainingSeconds, 6_677.777777777777);
  assert.equal(Math.ceil(result.remainingSeconds), 6_678);
});

test("supports an empty progress as zero and a fully listened book", () => {
  const emptyProgress = calculateAudiobook(input({ progressHours: "" }));
  assert.equal(emptyProgress.elapsedSeconds, 0);
  assert.equal(emptyProgress.progressPercent, 0);

  const finished = calculateAudiobook(input({ progressHours: "10", dailyHours: "1" }));
  assert.equal(finished.remainingSeconds, 0);
  assert.equal(finished.progressPercent, 100);
  assert.deepEqual(finished.schedule.segments, []);
  assert.equal(finished.schedule.estimatedDate, "2026-11-30");
});

test("builds daily segments and crosses month and year boundaries by local calendar date", () => {
  const result = calculateAudiobook(input({
    progressHours: "6",
    speed: "1",
    dailyHours: "1",
  }));
  assert.equal(result.schedule.days, 4);
  assert.equal(result.schedule.estimatedDate, "2026-12-03");
  assert.deepEqual(result.schedule.segments.map(({ day, seconds }) => [day, seconds]), [
    [1, 3_600], [2, 3_600], [3, 3_600], [4, 3_600],
  ]);

  const newYear = calculateAudiobook(input({
    hours: "2",
    progressHours: "1",
    speed: "1",
    dailyMinutes: "30",
    today: new Date(2026, 11, 31),
  }));
  assert.equal(newYear.schedule.estimatedDate, "2027-01-01");
});

test("splits actual listening time into daily segments and retains the bar composition", () => {
  const result = calculateAudiobook(input({
    hours: "1",
    minutes: "",
    progressHours: "",
    progressMinutes: "10",
    progressSeconds: "",
    speed: "1.5",
    dailyMinutes: "10",
  }));

  assert.equal(result.schedule.days, 4);
  assert.deepEqual(result.schedule.segments.map(({ day, seconds }) => [day, seconds]), [
    [1, 600], [2, 600], [3, 600], [4, 200],
  ]);
  assert.deepEqual(result.barSegments, {
    heardSeconds: 600,
    remainingSeconds: 2_000,
    savedSeconds: 1_000,
    scaleSeconds: 3_600,
  });
});

test("rounds the last daily segment up for display without adding another day", () => {
  const result = calculateAudiobook(input({
    hours: "4",
    progressHours: "0",
    speed: "1.35",
    dailyHours: "1",
    dailyMinutes: "30",
  }));
  assert.equal(result.schedule.days, 2);
  assert.equal(result.schedule.segments.length, 2);
  assert.equal(result.schedule.segments[0].seconds, 5_400);
  assert.equal(result.schedule.segments[1].seconds, 5_266.666666666666);
});

test("compares all presets and adds a nonduplicate custom speed", () => {
  const result = calculateAudiobook(input({
    hours: "10",
    progressHours: "2",
    speed: "0.5",
  }));
  const oneX = result.comparisonRows.find(({ speed }) => speed === 1);
  const twoX = result.comparisonRows.find(({ speed }) => speed === 2);
  const custom = result.comparisonRows.find(({ speed }) => speed === 0.5);
  assert.equal(result.comparisonRows.length, 9);
  assert.deepEqual(result.comparisonRows.map(({ speed }) => speed), [...REFERENCE_SPEEDS, 0.5]);
  assert.deepEqual([oneX.listeningSeconds, oneX.savedSeconds], [28_800, 0]);
  assert.deepEqual([twoX.listeningSeconds, twoX.savedSeconds], [14_400, 14_400]);
  assert.deepEqual([custom.listeningSeconds, custom.savedSeconds], [57_600, -28_800]);

  const preset = calculateAudiobook(input({ speed: "1.25" }));
  assert.equal(preset.comparisonRows.length, REFERENCE_SPEEDS.length);
});

test("rejects invalid core values and progress beyond the original duration", () => {
  for (const overrides of [
    { hours: "", minutes: "", seconds: "" },
    { hours: "0" },
    { speed: "0" },
    { speed: "Infinity" },
    { speed: "1e-320" },
    { hours: "-1" },
    { hours: "1e308" },
    { minutes: "1.5" },
    { progressHours: "11" },
    { progressMinutes: "-1" },
  ]) {
    assert.equal(calculateAudiobook(input(overrides)), null, JSON.stringify(overrides));
  }
});

test("invalid or insufficient daily time hides only the schedule", () => {
  const invalid = calculateAudiobook(input({ dailyHours: "-1" }));
  assert.equal(invalid.remainingSeconds, 14_400);
  assert.equal(invalid.progressPercent, 20);
  assert.equal(invalid.schedule, null);
  assert.equal(invalid.dailyStatus, "invalid");

  const insufficient = calculateAudiobook(input({ dailyHours: "0" }));
  assert.equal(insufficient.schedule, null);
  assert.equal(insufficient.dailyStatus, "insufficient");

  const blank = calculateAudiobook(input());
  assert.equal(blank.schedule, null);
  assert.equal(blank.dailyStatus, "empty");
});
