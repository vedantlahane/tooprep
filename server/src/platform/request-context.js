import { randomUUID } from 'node:crypto';

/**
 * Adds a correlation id to every request. Clients may provide a UUID in
 * X-Request-Id; malformed values are ignored so logs cannot be poisoned with
 * arbitrary strings.
 */
export function requestContext(req, res, next) {
  const requestedId = req.get('X-Request-Id');
  const requestId = requestedId && /^[a-zA-Z0-9_-]{8,128}$/.test(requestedId)
    ? requestedId
    : randomUUID();

  req.requestId = requestId;
  const startedAt = process.hrtime.bigint();
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    // Lazy import is intentionally avoided here; request context stays usable
    // in isolated middleware tests and the main error handler owns logging.
    if (process.env.LOG_HTTP_REQUESTS === 'true') {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'request.completed',
        request_id: requestId,
        method: req.method,
        path: req.originalUrl,
        status_code: res.statusCode,
        duration_ms: Math.round(durationMs)
      }));
    }
  });
  next();
}
