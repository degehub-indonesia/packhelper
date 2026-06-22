import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const KEYS = {
  codes: "ph:codes",
  code: (c: string) => `ph:code:${c}`,
};

export interface CodeMeta {
  label: string;
  createdAt: string;
  firstUsedBy?: string;
  firstUsedAt?: string;
}
