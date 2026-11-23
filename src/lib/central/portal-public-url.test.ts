import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPortalLoginDelegated,
  portalPublicUrl,
} from "./portal-public-url";

describe("portalPublicUrl / Amplify vs centralisation", () => {
  it("does not delegate login when portal env is unset (Amplify P&L)", () => {
    delete process.env.PORTAL_PUBLIC_URL;
    delete process.env.WORKSPACE_PUBLIC_URL;
    assert.equal(isPortalLoginDelegated(), false);
    assert.equal(portalPublicUrl(), "http://localhost:5173");
  });

  it("ignores localhost portal env so Amplify cannot loop to Vite", () => {
    process.env.PORTAL_PUBLIC_URL = "http://localhost:5173";
    assert.equal(isPortalLoginDelegated(), false);
    delete process.env.PORTAL_PUBLIC_URL;
  });

  it("delegates only when a real https portal URL is set", () => {
    process.env.PORTAL_PUBLIC_URL = "https://portal.example.com/";
    assert.equal(isPortalLoginDelegated(), true);
    assert.equal(portalPublicUrl(), "https://portal.example.com");
    delete process.env.PORTAL_PUBLIC_URL;
  });
});
