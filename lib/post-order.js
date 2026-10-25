export function postOrderTime(publishedAt, dateMs, source = "blog post") {
  if (publishedAt == null) return dateMs;

  const raw =
    publishedAt instanceof Date
      ? publishedAt.toISOString()
      : String(publishedAt);
  const instant = Date.parse(raw);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(
      raw
    ) ||
    !Number.isFinite(instant)
  ) {
    throw new Error(
      `Invalid publishedAt in ${source}. Use an ISO 8601 datetime with a timezone.`
    );
  }
  return instant;
}
