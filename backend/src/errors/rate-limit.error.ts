export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Hourly rate limit reached");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}