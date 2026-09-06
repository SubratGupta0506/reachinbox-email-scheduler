import IORedis from "ioredis";

const redis = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

export const waitForMinimumDelay = async (
  userId: string,
  minimumDelaySeconds: number
) => {
  if (minimumDelaySeconds <= 0) {
    return;
  }

  const key = `email-delay:${userId}`;
  const delayMs = minimumDelaySeconds * 1000;
  const now = Date.now();

  const script = `
    local current = redis.call("GET", KEYS[1])
    local now = tonumber(ARGV[1])
    local delay = tonumber(ARGV[2])

    local nextAllowed

    if current and tonumber(current) > now then
      nextAllowed = tonumber(current) + delay
    else
      nextAllowed = now + delay
    end

    redis.call("SET", KEYS[1], nextAllowed)

    if current and tonumber(current) > now then
      return tonumber(current) - now
    end

    return 0
  `;

  const waitTime = await redis.eval(
    script,
    1,
    key,
    now,
    delayMs
  );

  const waitMilliseconds = Number(waitTime);

  if (waitMilliseconds > 0) {
    await new Promise((resolve) =>
      setTimeout(resolve, waitMilliseconds)
    );
  }
};