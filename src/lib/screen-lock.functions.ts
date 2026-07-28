import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

/** Valida o PIN de bloqueio de tela no servidor (comparação em tempo constante). */
export const verifyScreenPin = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string }) => ({ pin: String(data?.pin ?? "").slice(0, 64) }))
  .handler(async ({ data }) => {
    const expected = process.env.SCREEN_LOCK_PIN ?? "";
    if (!expected) return { ok: false as const, configured: false };

    const a = createHash("sha256").update(data.pin, "utf8").digest();
    const b = createHash("sha256").update(expected, "utf8").digest();
    const ok = timingSafeEqual(a, b);

    if (!ok) await new Promise((r) => setTimeout(r, 600));
    return { ok, configured: true as const };
  });