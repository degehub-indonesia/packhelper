const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function nanoid(len: number): string {
  return Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}
