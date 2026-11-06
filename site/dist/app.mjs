import { buildComparison, calculateAudiobook, PRESET_SPEEDS, REFERENCE_SPEEDS } from "./calculator.mjs";

const form = document.querySelector("#calculator-form");
const speedInput = document.querySelector("#playback-speed");
const lengthModeInput = document.querySelector("#length-mode");
const lengthTabs = [...document.querySelectorAll(".length-tab")];
const readingSpeedField = document.querySelector("#reading-speed-field");
const presetButtons = [...document.querySelectorAll(".preset-button")];
const resultCard = document.querySelector("#result-card");
const comparisonCard = document.querySelector("#comparison-card");

function inputValue(name) {
  const field = form.elements.namedItem(name);
  return field.validity.badInput ? "invalid-number" : field.value;
}

function readForm() {
  return {
    mode: inputValue("mode"),
    hours: inputValue("hours"),
    minutes: inputValue("minutes"),
    seconds: inputValue("seconds"),
    words: inputValue("words"),
    pages: inputValue("pages"),
    wordsPerPage: inputValue("wordsPerPage"),
    readingSpeed: inputValue("readingSpeed"),
    speed: inputValue("speed"),
    progressHours: inputValue("progressHours"),
    progressMinutes: inputValue("progressMinutes"),
    progressSeconds: inputValue("progressSeconds"),
    dailyHours: inputValue("dailyHours"),
    dailyMinutes: inputValue("dailyMinutes"),
    dailySeconds: inputValue("dailySeconds"),
  };
}

function formatDuration(value, compact = false) {
  let seconds = Math.max(0, Math.ceil(value));
  if (seconds === 0) return compact ? "0s" : "0 sec";

  const hours = Math.floor(seconds / 3_600);
  seconds %= 3_600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;
  const parts = [];
  if (hours) parts.push(compact ? `${hours}h` : `${hours} hr`);
  if (minutes) parts.push(compact ? `${minutes}m` : `${minutes} min`);
  if (seconds) parts.push(compact ? `${seconds}s` : `${seconds} sec`);
  return parts.join(compact ? " " : " ");
}

function formatSpeed(speed) {
  return `${speed}×`;
}

function formatDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function showResult(element, shouldShow) {
  if (!shouldShow) {
    element.hidden = true;
    element.classList.remove("is-entering");
    return;
  }

  const wasHidden = element.hidden;
  element.hidden = false;
  if (wasHidden) {
    element.classList.add("is-entering");
    requestAnimationFrame(() => element.classList.remove("is-entering"));
  }
}

function updatePresetSelection(speed) {
  const isPreset = speedInput.value !== "" && Number.isFinite(speed) && PRESET_SPEEDS.includes(speed);
  const selected = isPreset ? String(speed) : "custom";

  for (const button of presetButtons) {
    const isSelected = button.dataset.speed === selected;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

function coreMessage(values, result) {
  if (result) return "";
  if (values.mode === "words") {
    return "Enter a positive whole word count and a reading speed of at least 1 word per minute.";
  }
  if (values.mode === "pages") {
    return "Enter positive whole numbers for pages and words per page, and a reading speed of at least 1 word per minute.";
  }
  const hasTotal = [values.hours, values.minutes, values.seconds].some((value) => value !== "");
  if (!hasTotal) return "";
  return "Check the length, progress, and playback speed. Durations must be whole numbers of zero or more.";
}

function setLengthMode(mode) {
  lengthModeInput.value = mode;
  readingSpeedField.hidden = mode === "duration";
  for (const tab of lengthTabs) {
    const selected = tab.dataset.mode === mode;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    tab.classList.toggle("is-selected", selected);
    document.querySelector(`#${tab.dataset.mode}-panel`).hidden = !selected;
  }
  update();
}

function renderTimeBars(result) {
  const segments = result?.barSegments;
  const scale = segments?.scaleSeconds ?? 0;
  const widths = segments && scale > 0
    ? [segments.heardSeconds, segments.remainingSeconds, segments.savedSeconds]
      .map((seconds) => `${(seconds / scale) * 100}%`)
    : ["0%", "0%", "0%"];

  for (const visual of document.querySelectorAll(".js-time-bar")) {
    const [heard, remaining, saved] = visual.children;
    [heard, remaining, saved].forEach((part, index) => {
      part.style.flexBasis = widths[index];
    });

    const hasDays = Boolean(result?.schedule?.segments.length);
    remaining.classList.toggle("has-days", hasDays);
    if (hasDays && result.remainingSeconds > 0) {
      const dayStep = (result.schedule.dailySeconds / result.remainingSeconds) * 100;
      remaining.style.setProperty("--day-step", `${dayStep}%`);
    } else {
      remaining.style.removeProperty("--day-step");
    }

    if (!result) {
      visual.setAttribute("aria-label", "Time composition is empty");
      continue;
    }

    const description = [
      `Already listened ${formatDuration(segments.heardSeconds)}`,
      `Listening time left ${formatDuration(segments.remainingSeconds)}`,
    ];
    if (segments.savedSeconds > 0) {
      description.push(`Time saved ${formatDuration(segments.savedSeconds)}`);
    } else if (result.speed < 1 && result.remainingOriginalSeconds > 0) {
      description.push("No time saved at this speed");
    }
    if (result.schedule) {
      description.push(`${result.schedule.days} listening ${result.schedule.days === 1 ? "day" : "days"}`);
    }
    visual.setAttribute("aria-label", description.join(". "));
  }

  for (const label of document.querySelectorAll(".js-progress-percent")) {
    label.textContent = result ? `${Math.round(result.progressPercent)}% heard` : "";
  }
}

function renderComparison(rows, currentSpeed) {
  const body = document.querySelector("#comparison-rows");
  const fragment = document.createDocumentFragment();

  for (const row of rows) {
    const tr = document.createElement("tr");
    if (row.speed === currentSpeed) tr.className = "is-current";

    const speedCell = document.createElement("th");
    speedCell.scope = "row";
    speedCell.textContent = formatSpeed(row.speed);
    if (row.custom) {
      const note = document.createElement("span");
      note.className = "custom-note";
      note.textContent = "Custom";
      speedCell.append(" ", note);
    }

    const timeCell = document.createElement("td");
    timeCell.textContent = formatDuration(row.listeningSeconds);
    const savedCell = document.createElement("td");
    savedCell.textContent = row.savedSeconds < 0
      ? `${formatDuration(-row.savedSeconds)} extra time`
      : formatDuration(row.savedSeconds);
    tr.append(speedCell, timeCell, savedCell);
    fragment.append(tr);
  }

  body.replaceChildren(fragment);
}

function renderReferenceTables() {
  for (const speed of REFERENCE_SPEEDS) {
    const table = document.querySelector(`[data-reference-speed="${speed}"]`);
    const body = table.querySelector("[data-reference-rows]");
    const fragment = document.createDocumentFragment();

    for (let originalSeconds = 30 * 60; originalSeconds <= 40 * 3_600; originalSeconds += 30 * 60) {
      const row = buildComparison(originalSeconds, [speed])[0];
      const tr = document.createElement("tr");
      const originalCell = document.createElement("th");
      originalCell.scope = "row";
      originalCell.textContent = formatDuration(originalSeconds, true);
      const listeningCell = document.createElement("td");
      listeningCell.textContent = formatDuration(row.listeningSeconds, true);
      const savedCell = document.createElement("td");
      savedCell.textContent = row.savedSeconds < 0
        ? `${formatDuration(-row.savedSeconds, true)} extra time`
        : formatDuration(row.savedSeconds, true);
      tr.append(originalCell, listeningCell, savedCell);
      fragment.append(tr);
    }

    body.replaceChildren(fragment);
  }
}

function renderSchedule(result) {
  const message = document.querySelector("#daily-message");
  const finishDate = document.querySelector("#finish-date");
  const finishDateLabel = document.querySelector("#finish-date-label");
  const finishDateValue = document.querySelector("#finish-date-value");
  if (result.dailyStatus === "invalid") {
    message.textContent = "Use non-negative whole numbers for daily listening time.";
  } else if (result.dailyStatus === "insufficient") {
    message.textContent = "Enter a daily listening time greater than zero.";
  } else {
    message.textContent = "";
  }

  finishDate.hidden = !result.schedule;
  if (result.schedule) {
    finishDateLabel.textContent = result.schedule.days === 0 ? "Finished today" : "Estimated finish date";
    finishDateValue.textContent = formatDate(result.schedule.estimatedDate);
  } else {
    finishDateLabel.textContent = "";
    finishDateValue.textContent = "";
  }
}

function update() {
  const values = readForm();
  const speed = Number(values.speed);
  updatePresetSelection(speed);
  const result = calculateAudiobook(values);
  resultCard.classList.toggle("has-finish-date", Boolean(result?.schedule));
  document.querySelector("#time-left-formula").hidden = !result || result.elapsedSeconds <= 0;
  document.querySelector("#core-message").textContent = coreMessage(values, result);

  showResult(resultCard, Boolean(result));
  showResult(comparisonCard, Boolean(result));
  if (!result) {
    document.querySelector("#sticky-time-left").textContent = "0 min";
    document.querySelector("#sticky-days").hidden = true;
    document.querySelector("#sticky-days").textContent = "";
    renderTimeBars(null);
    return;
  }

  document.querySelector("#sticky-time-left").textContent = formatDuration(result.remainingSeconds, true);
  const stickyDays = document.querySelector("#sticky-days");
  stickyDays.hidden = !result.schedule;
  stickyDays.textContent = result.schedule
    ? `/ ${result.schedule.days} ${result.schedule.days === 1 ? "day" : "days"}`
    : "";
  document.querySelector("#result-time-left").textContent = formatDuration(result.remainingSeconds);
  const isSlower = result.extraSeconds > 0;
  document.querySelector("#time-change-label").textContent = isSlower ? "Extra time" : "Time saved";
  document.querySelector("#result-time-change").textContent = formatDuration(
    isSlower ? result.extraSeconds : result.savedSeconds,
  );
  const changePercent = document.querySelector("#time-change-percent");
  changePercent.classList.toggle("is-extra", isSlower);
  changePercent.textContent = isSlower
    ? `${result.extraPercent}% longer`
    : `${result.savedPercent}% time saved`;
  renderTimeBars(result);
  renderSchedule(result);
  renderComparison(result.comparisonRows, result.speed);
}

function connectDisclosure(buttonId, panelId) {
  const button = document.querySelector(buttonId);
  const panel = document.querySelector(panelId);
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    panel.inert = !open;
    panel.classList.toggle("is-open", open);
  });
}

form.addEventListener("input", update);
form.addEventListener("submit", (event) => event.preventDefault());
for (const [index, tab] of lengthTabs.entries()) {
  tab.addEventListener("click", () => setLengthMode(tab.dataset.mode));
  tab.addEventListener("keydown", (event) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % lengthTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + lengthTabs.length) % lengthTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = lengthTabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = lengthTabs[nextIndex];
    setLengthMode(nextTab.dataset.mode);
    nextTab.focus();
  });
}
for (const button of presetButtons) {
  button.addEventListener("click", () => {
    if (button.dataset.speed === "custom") {
      speedInput.value = "";
      update();
      speedInput.focus({ preventScroll: true });
      return;
    }

    speedInput.value = button.dataset.speed;
    update();
  });
}

connectDisclosure("#progress-toggle", "#progress-panel");
connectDisclosure("#daily-toggle", "#daily-panel");
renderReferenceTables();
update();
