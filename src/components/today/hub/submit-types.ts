export type SubmitResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export type SubmitOutcome =
  | { status: "failed" }
  | { status: "ok"; result: SubmitResult };

export type FailFn = (message: string) => void;
