// Shared job queue + pub/sub bus. Backed by Redis lists/pubsub when a URL is
// provided, otherwise an in-process implementation for tests and local runs.
import { Redis } from "ioredis";

export interface JobQueue {
  push(queue: string, payload: unknown): Promise<void>;
  pop(queue: string, timeoutSeconds: number): Promise<unknown | null>;
  publish(channel: string, payload: unknown): Promise<void>;
  subscribe(channel: string, handler: (payload: unknown) => void): Promise<() => void>;
}

class MemoryQueue implements JobQueue {
  private queues = new Map<string, unknown[]>();
  private subs = new Map<string, Array<(payload: unknown) => void>>();

  async push(queue: string, payload: unknown): Promise<void> {
    const list = this.queues.get(queue) ?? [];
    list.push(payload);
    this.queues.set(queue, list);
  }

  async pop(queue: string, _timeoutSeconds: number): Promise<unknown | null> {
    const list = this.queues.get(queue) ?? [];
    const item = list.shift();
    return item ?? null;
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    for (const handler of this.subs.get(channel) ?? []) handler(payload);
  }

  async subscribe(channel: string, handler: (payload: unknown) => void): Promise<() => void> {
    const list = this.subs.get(channel) ?? [];
    list.push(handler);
    this.subs.set(channel, list);
    return () => {
      this.subs.set(channel, (this.subs.get(channel) ?? []).filter((h) => h !== handler));
    };
  }
}

class RedisQueue implements JobQueue {
  private client: Redis;
  private subscriber: Redis;

  constructor(url: string) {
    const options = { lazyConnect: true, maxRetriesPerRequest: 2 };
    this.client = new Redis(url, options);
    this.subscriber = new Redis(url, options);
  }

  async push(queue: string, payload: unknown): Promise<void> {
    await this.client.rpush(queue, JSON.stringify(payload));
  }

  async pop(queue: string, timeoutSeconds: number): Promise<unknown | null> {
    const result = await this.client.blpop(queue, timeoutSeconds);
    if (!result) return null;
    return JSON.parse(result[1]) as unknown;
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    await this.client.publish(channel, JSON.stringify(payload));
  }

  async subscribe(channel: string, handler: (payload: unknown) => void): Promise<() => void> {
    await this.subscriber.subscribe(channel);
    const listener = (_ch: string, raw: string): void => {
      handler(JSON.parse(raw) as unknown);
    };
    this.subscriber.on("message", listener);
    return () => {
      this.subscriber.off("message", listener);
      void this.subscriber.unsubscribe(channel);
    };
  }
}

export const QUEUES = {
  ledgers: "stellariq:ledgers",
  swaps: "stellariq:swaps",
  poolUpdates: "stellariq:pool-updates",
  priceTicks: "stellariq:price-ticks",
  signals: "stellariq:signals",
} as const;

export const CHANNELS = {
  prices: "stellariq:prices",
  swapsLive: "stellariq:swaps-live",
  signalsLive: "stellariq:signals-live",
} as const;

export function createQueue(redisUrl: string | undefined): JobQueue {
  if (!redisUrl) return new MemoryQueue();
  return new RedisQueue(redisUrl);
}
