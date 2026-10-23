const koreaCalendarFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
});

const koreanPostDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});
const koreanDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

function normalizedDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value ?? "").trim();
  const dateOnly = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (dateOnly) return dateOnly;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
}

export function postDateValue(value: unknown) {
  return normalizedDate(value);
}

export function postPublishedAtValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();

  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  const dateOnly = raw.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  return dateOnly ? `${dateOnly}T00:00:00.000Z` : undefined;
}

export function postWasUpdated(publishedAt: unknown, updatedAt: unknown) {
  const published = postPublishedAtValue(publishedAt);
  const updated = postPublishedAtValue(updatedAt);
  if (!published || !updated) return false;
  return new Date(updated).getTime() - new Date(published).getTime() > 1_000;
}

function koreaCalendarDay(value: Date) {
  const parts = koreaCalendarFormatter.formatToParts(value);
  const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(number("year"), number("month") - 1, number("day"));
}

/** Whether a post was first published today in the Korea time zone. */
export function postPublishedToday(value: unknown, now = new Date()) {
  const publishedAt = postPublishedAtValue(value);
  if (!publishedAt) return false;
  const published = new Date(publishedAt);
  return !Number.isNaN(published.getTime()) && koreaCalendarDay(published) === koreaCalendarDay(now);
}

export function formatPostUpdatedLabel(value: unknown, now = new Date()) {
  const normalized = postPublishedAtValue(value);
  if (!normalized) return "최근 수정";

  const updated = new Date(normalized);
  if (Number.isNaN(updated.getTime())) return "최근 수정";

  const days = Math.max(0, Math.round((koreaCalendarDay(now) - koreaCalendarDay(updated)) / 86_400_000));
  if (days === 0) return "오늘 수정";
  return `${days}일 전 수정`;
}

export function formatPostDate(value: unknown) {
  const date = normalizedDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

  return koreanPostDateFormatter.format(new Date(`${date}T00:00:00+09:00`));
}

export function formatDraftSavedAt(value: unknown) {
  const normalized = postPublishedAtValue(value);
  if (!normalized) return "저장 시각 없음";
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "저장 시각 없음" : koreanDateTimeFormatter.format(date);
}
