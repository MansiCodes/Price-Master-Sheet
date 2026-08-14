"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import "./integrations.css";

type ConfigView = {
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  otpCampaignName: string | null;
  reminderCampaignName: string | null;
  completeCampaignName: string | null;
  otpReady: boolean;
  reminderReady: boolean;
  completeReady: boolean;
};

export default function AdminIntegrationsPage() {
  const [config, setConfig] = useState<ConfigView | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [otpCampaignName, setOtpCampaignName] = useState("");
  const [reminderCampaignName, setReminderCampaignName] = useState("");
  const [completeCampaignName, setCompleteCampaignName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/integrations/aisensy");
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        config?: ConfigView;
      };
      if (!res.ok || !data.ok || !data.config) {
        throw new Error(data.message || "Failed to load settings");
      }
      setConfig(data.config);
      setOtpCampaignName(data.config.otpCampaignName ?? "");
      setReminderCampaignName(data.config.reminderCampaignName ?? "");
      setCompleteCampaignName(data.config.completeCampaignName ?? "");
      setApiKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const body: Record<string, string | null> = {
        otpCampaignName: otpCampaignName.trim() || null,
        reminderCampaignName: reminderCampaignName.trim() || null,
        completeCampaignName: completeCampaignName.trim() || null,
      };
  if (apiKey.trim()) {
        // Ignore accidental paste of masked display (••••ALrY)
        if (!/^•+$/.test(apiKey.trim()) && !apiKey.includes("•")) {
          body.apiKey = apiKey.trim();
        }
      }

      const res = await fetch("/api/admin/integrations/aisensy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        config?: ConfigView;
      };
      if (!res.ok || !data.ok || !data.config) {
        throw new Error(data.message || "Save failed");
      }
      setConfig(data.config);
      setApiKey("");
      setOk("AiSensy settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="integrations-page">
      <header className="integrations-page__head">
        <h1 className="page-title">Integrations</h1>
        <p className="page-sub">
          WhatsApp / AiSensy credentials are stored securely in the database.
          Campaign names must match the live AiSensy templates exactly.
        </p>
      </header>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {ok ? <div className="alert alert--ok">{ok}</div> : null}

      {loading ? (
        <p className="page-sub">Loading…</p>
      ) : (
        <form className="integrations-card" onSubmit={onSubmit}>
          <h2>AiSensy WhatsApp</h2>
          <p className="integrations-card__hint">
            Leave API key blank to keep the current value. Template variables are
            filled automatically when messages are sent.
          </p>

          <ul className="integrations-status-list">
            <li
              className={
                config?.otpReady
                  ? "integrations-status integrations-status--ok"
                  : "integrations-status integrations-status--warn"
              }
            >
              {config?.otpReady
                ? "Login OTP ready"
                : "Login OTP needs API key + OTP campaign"}
            </li>
            <li
              className={
                config?.reminderReady
                  ? "integrations-status integrations-status--ok"
                  : "integrations-status integrations-status--warn"
              }
            >
              {config?.reminderReady
                ? "Shift reminder ready"
                : "Shift reminder needs API key + reminder campaign"}
            </li>
            <li
              className={
                config?.completeReady
                  ? "integrations-status integrations-status--ok"
                  : "integrations-status integrations-status--warn"
              }
            >
              {config?.completeReady
                ? "Forms complete ready"
                : "Forms complete needs API key + complete campaign"}
            </li>
          </ul>

          <div className="field">
            <label htmlFor="aisensy-api-key">API key</label>
            {config?.hasApiKey ? (
              <p className="integrations-masked">
                Current: <code>{config.apiKeyMasked}</code>
              </p>
            ) : null}
            <input
              id="aisensy-api-key"
              type="password"
              autoComplete="new-password"
              placeholder={
                config?.hasApiKey
                  ? "Leave blank to keep current key"
                  : "Paste AiSensy API key"
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="integrations-card__hint">
              Only paste a new key if you are replacing it. Leave blank to keep the
              current key.
            </p>
          </div>

          <div className="field">
            <label htmlFor="aisensy-otp-campaign">Login OTP campaign name</label>
            <input
              id="aisensy-otp-campaign"
              value={otpCampaignName}
              onChange={(e) => setOtpCampaignName(e.target.value)}
              placeholder="Cable Junction Login OTP"
            />
            <p className="integrations-card__hint">Params: {"{{1}}"} = OTP code</p>
          </div>

          <div className="field">
            <label htmlFor="aisensy-reminder-campaign">Shift reminder campaign name</label>
            <input
              id="aisensy-reminder-campaign"
              value={reminderCampaignName}
              onChange={(e) => setReminderCampaignName(e.target.value)}
              placeholder="Cable Junction Shift Reminder"
            />
            <p className="integrations-card__hint">
              Params: {"{{1}}"} name, {"{{2}}"} Day/Night, {"{{3}}"} plant,{" "}
              {"{{4}}"} plant, {"{{5}}"} date
            </p>
          </div>

          <div className="field">
            <label htmlFor="aisensy-complete-campaign">Forms complete campaign name</label>
            <input
              id="aisensy-complete-campaign"
              value={completeCampaignName}
              onChange={(e) => setCompleteCampaignName(e.target.value)}
              placeholder="Cable Junction Forms Complete"
            />
            <p className="integrations-card__hint">
              Params: {"{{1}}"} name, {"{{2}}"} plant, {"{{3}}"} date, {"{{4}}"}{" "}
              credit score
            </p>
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </form>
      )}
    </div>
  );
}
