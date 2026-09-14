"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error?.digest, error?.message, error);
  }, [error]);

  return (
    <div style={{ padding: "2rem", maxWidth: "36rem" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
        Something went wrong
      </h1>
      <p style={{ color: "var(--fg-muted)", marginBottom: "1rem" }}>
        The page failed to load. Try again. If it keeps happening, redeploy or
        check Amplify server logs for this digest.
      </p>
      {error?.digest ? (
        <p
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          Digest: {error.digest}
        </p>
      ) : null}
      <Button type="button" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
