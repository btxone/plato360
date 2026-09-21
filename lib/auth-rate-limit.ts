const windowMs = 15 * 60 * 1000;
const maxFailures = 5;

type LoginBucket = { firstFailureAt: number; failures: number; blockedUntil: number };
const buckets = new Map<string, LoginBucket>();

export class LoginRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Demasiados intentos de inicio de sesión.");
    this.name = "LoginRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function assertLoginAllowed(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) return;
  if (bucket.blockedUntil > now) throw new LoginRateLimitError(Math.ceil((bucket.blockedUntil - now) / 1000));
  if (now - bucket.firstFailureAt > windowMs) buckets.delete(key);
}

export function registerLoginFailure(key: string) {
  const now = Date.now();
  const current = buckets.get(key);
  const bucket = !current || now - current.firstFailureAt > windowMs
    ? { firstFailureAt: now, failures: 0, blockedUntil: 0 }
    : current;
  bucket.failures += 1;
  if (bucket.failures >= maxFailures) bucket.blockedUntil = now + windowMs;
  buckets.set(key, bucket);
}

export function registerLoginSuccess(key: string) {
  buckets.delete(key);
}
