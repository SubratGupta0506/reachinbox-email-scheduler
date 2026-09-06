import IORedis from "ioredis";

const redis = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export const canSendEmail = async (
  userId: string,
  hourlyLimit: number
): Promise<RateLimitResult> => {
  const key = `email-rate:${userId}`;

  const currentCount = await redis.incr(key);

  if (currentCount === 1) {
    await redis.expire(key, 3600);
  }

  if (currentCount <= hourlyLimit) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  await redis.decr(key);

  const ttl = await redis.ttl(key);

  return {
    allowed: false,
    retryAfterSeconds: ttl > 0 ? ttl : 3600,
  };
};