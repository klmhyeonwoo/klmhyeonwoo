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

export function formatPostDate(value: unknown) {
  const date = normalizedDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${date}T00:00:00+09:00`));
}
