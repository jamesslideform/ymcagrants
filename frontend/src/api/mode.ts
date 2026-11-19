/**
 * Which API the app talks to, decided once at startup.
 *
 * The stub is the default and the fallback. Live mode is opt-in and needs an
 * explicit `VITE_API_MODE=live`, which in practice means someone has a local
 * env file (`frontend/.env.local`) holding their own backend configuration and
 * AWS credentials. No env file, a commented-out line, a typo, an empty value —
 * all of it lands on the stub.
 *
 * That direction matters. Falling back to the stub leaves a working app full of
 * sample data; falling forward to live would leave a dead app pointed at
 * nothing, and the person seeing it usually can't tell the difference between
 * "misconfigured" and "broken".
 *
 * Vite inlines `import.meta.env` at BUILD time, so this is settled when the
 * bundle is produced, not when the browser loads it. A build made on a machine
 * that has a live env file is a live bundle — see the `build:demo` script,
 * which forces the stub for the deployed prototype.
 */

export type ApiMode = "stub" | "live";

interface ModeDecision {
  mode: ApiMode;
  /** Why, in a few words — logged so nobody has to guess. */
  reason: string;
  /** True when live was clearly intended but the value didn't qualify. */
  misconfigured: boolean;
}

function decide(): ModeDecision {
  const raw: unknown = import.meta.env.VITE_API_MODE;

  if (raw === undefined || raw === "") {
    return {
      mode: "stub",
      reason: "VITE_API_MODE is not set (no env file, or the line is commented out)",
      misconfigured: false,
    };
  }
  if (raw === "live") {
    return { mode: "live", reason: "VITE_API_MODE=live", misconfigured: false };
  }
  if (raw === "stub") {
    return { mode: "stub", reason: "VITE_API_MODE=stub", misconfigured: false };
  }

  // Set to something unrecognised — "Live", "true", "aws". Someone meant to go
  // live and the app would otherwise fall back without saying so.
  return {
    mode: "stub",
    reason: `VITE_API_MODE="${String(raw)}" is not a recognised value`,
    misconfigured: true,
  };
}

const decision: ModeDecision = decide();

export const apiMode: ApiMode = decision.mode;
export const apiModeReason: string = decision.reason;
export const apiModeMisconfigured: boolean = decision.misconfigured;

/** Where live requests go, for the startup log. */
export const apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * Say which API is in use, once, on startup. Both branches announce
 * themselves — silence about the live path is how someone ends up debugging
 * the stub for ten minutes.
 */
export function announceApiMode(): void {
  if (apiModeMisconfigured) {
    console.warn(
      `[api] ${apiModeReason} — expected "live" or "stub". Falling back to the stub API.`,
    );
  }

  if (apiMode === "stub") {
    console.info(
      "%c[stub API]%c sample data, in memory, resets on reload — %s",
      "color:#5c2e91;font-weight:bold",
      "color:inherit",
      apiModeReason,
    );
  } else {
    console.info(
      "%c[live API]%c requests go to %s — %s",
      "color:#01a490;font-weight:bold",
      "color:inherit",
      apiBaseUrl,
      apiModeReason,
    );
  }
}
