export const PRESET_SPEEDS = Object.freeze([1, 1.25, 1.35, 1.5, 1.75, 2, 3]);
export const REFERENCE_SPEEDS = Object.freeze([0.75, 1, 1.25, 1.35, 1.5, 1.75, 2, 2.5]);

function isEmpty(value) {
  return value === "" || value === null || value === undefined;
}

function readNonnegativeInteger(value) {
  if (isEmpty(value)) return 0;
  const number = Number(value);
  return Number.isFinite(number) && Number.isInteger(number) && number >= 0
    ? number
    : null;
}

function durationSeconds(hours, minutes, seconds) {
  const parts = [hours, minutes, seconds].map(readNonnegativeInteger);
  if (parts.includes(null)) return null;
  const totalSeconds = parts[0] * 3_600 + parts[1] * 60 + parts[2];
  return Number.isFinite(totalSeconds) ? totalSeconds : null;
}

function positiveInteger(value) {
  const number = readNonnegativeInteger(value);
  return number > 0 ? number : null;
}

function positiveNumber(value) {
  if (isEmpty(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 ? number : null;
}

function totalDurationSeconds(input) {
  const mode = input.mode ?? "duration";
  if (mode === "duration") {
    return durationSeconds(input.hours, input.minutes, input.seconds);
  }

  const readingSpeed = positiveNumber(input.readingSpeed);
  if (!readingSpeed) return null;

  let words;
  if (mode === "words") {
    words = positiveInteger(input.words);
  } else if (mode === "pages") {
    const pages = positiveInteger(input.pages);
    const wordsPerPage = positiveInteger(input.wordsPerPage);
    if (!pages || !wordsPerPage) return null;
    words = pages * wordsPerPage;
  } else {
    return null;
  }

  const seconds = (words * 60) / readingSpeed;
  return words && Number.isFinite(seconds) ? seconds : null;
}

function dateKey(date) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildSchedule(remainingSeconds, dailySeconds, today) {
  const days = Math.ceil(remainingSeconds / dailySeconds);
  const finishDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + Math.max(days - 1, 0),
  );
  const segments = Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    seconds: Math.min(
      dailySeconds,
      Math.max(0, remainingSeconds - index * dailySeconds),
    ),
  }));
  return { days, dailySeconds, estimatedDate: dateKey(finishDate), segments };
}

export function buildComparison(remainingOriginalSeconds, speeds, currentSpeed = null) {
  return [...new Set(speeds)].map((speed) => {
    const listeningSeconds = Math.ceil(remainingOriginalSeconds / speed);
    return {
      speed,
      listeningSeconds,
      savedSeconds: remainingOriginalSeconds - listeningSeconds,
      custom: speed === currentSpeed && !PRESET_SPEEDS.includes(speed),
    };
  });
}

export function calculateAudiobook(input) {
  const totalSeconds = totalDurationSeconds(input);
  const elapsedSeconds = durationSeconds(
    input.progressHours,
    input.progressMinutes,
    input.progressSeconds,
  );
  const speed = Number(input.speed);

  if (
    totalSeconds === null || totalSeconds <= 0 ||
    elapsedSeconds === null || elapsedSeconds > totalSeconds ||
    !Number.isFinite(speed) || speed <= 0
  ) {
    return null;
  }

  const remainingOriginalSeconds = totalSeconds - elapsedSeconds;
  const remainingSeconds = remainingOriginalSeconds / speed;
  if (!Number.isFinite(remainingSeconds)) return null;
  const differenceSeconds = remainingOriginalSeconds - remainingSeconds;
  const savedSeconds = Math.max(differenceSeconds, 0);
  const extraSeconds = Math.max(-differenceSeconds, 0);
  const savedPercent = remainingOriginalSeconds > 0
    ? Math.round((savedSeconds / remainingOriginalSeconds) * 100)
    : 0;
  const extraPercent = remainingOriginalSeconds > 0
    ? Math.round((extraSeconds / remainingOriginalSeconds) * 100)
    : 0;
  const scaleSeconds = elapsedSeconds + remainingSeconds + savedSeconds;
  const progressPercent = (elapsedSeconds / totalSeconds) * 100;
  const dailyFields = [input.dailyHours, input.dailyMinutes, input.dailySeconds];
  const dailyRequested = dailyFields.some((value) => !isEmpty(value));
  const dailySeconds = durationSeconds(...dailyFields);
  let dailyStatus = "empty";
  let schedule = null;

  if (dailyRequested) {
    if (dailySeconds === null) {
      dailyStatus = "invalid";
    } else if (dailySeconds <= 0) {
      dailyStatus = "insufficient";
    } else {
      dailyStatus = "valid";
      schedule = buildSchedule(remainingSeconds, dailySeconds, input.today ?? new Date());
    }
  }

  return {
    totalSeconds,
    elapsedSeconds,
    remainingOriginalSeconds,
    remainingSeconds,
    savedSeconds,
    extraSeconds,
    savedPercent,
    extraPercent,
    barSegments: {
      heardSeconds: elapsedSeconds,
      remainingSeconds,
      savedSeconds,
      scaleSeconds,
    },
    progressPercent,
    speed,
    dailyStatus,
    schedule,
    comparisonRows: buildComparison(remainingOriginalSeconds, [...REFERENCE_SPEEDS, speed], speed),
  };
}
