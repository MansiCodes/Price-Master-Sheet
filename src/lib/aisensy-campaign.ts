import {
  getAisensySettings,
  isAisensyOtpConfigured,
} from "@/lib/aisensy-config";

const AISENSY_API_URL = "https://backend.aisensy.com/campaign/t1/api/v2";

export type SendCampaignParams = {
  campaignName: string;
  destination: string;
  userName: string;
  templateParams: string[];
  source: string;
  /** Public media URL for document/image template headers (AiSensy media object). */
  media?: { url: string; filename: string };
  /** Required for Authentication OTP templates with Copy code button. */
  buttons?: Array<{
    type: string;
    sub_type: string;
    index: number;
    parameters: Array<{ type: string; text: string }>;
  }>;
};

export type SendCampaignResult = {
  ok: boolean;
  message?: string;
  providerResponse?: unknown;
};

function providerErrorMessage(
  providerResponse: unknown,
  fallback: string,
): string {
  if (typeof providerResponse === "object" && providerResponse !== null) {
    const resp = providerResponse as Record<string, unknown>;
    if (typeof resp.message === "string" && resp.message.trim()) return resp.message;
    if (typeof resp.error === "string" && resp.error.trim()) return resp.error;
    if (typeof resp.msg === "string" && resp.msg.trim()) return resp.msg;
    if (Array.isArray(resp.errors) && resp.errors.length > 0) {
      return String(resp.errors[0]);
    }
  }
  return fallback;
}

/** Send any AiSensy WhatsApp campaign with template params. */
export async function sendAisensyCampaign(
  params: SendCampaignParams,
): Promise<SendCampaignResult> {
  const settings = await getAisensySettings();
  const apiKey = settings.apiKey;

  if (!apiKey) {
    return { ok: false, message: "AiSensy API key is not configured" };
  }
  if (!params.campaignName.trim()) {
    return { ok: false, message: "AiSensy campaign name is missing" };
  }

  // AiSensy expects digits with country code (e.g. 91XXXXXXXXXX), not +91…
  const destination = params.destination.replace(/\D/g, "");
  if (destination.length < 10) {
    return { ok: false, message: "Invalid WhatsApp destination number" };
  }

  const body: Record<string, unknown> = {
    apiKey,
    campaignName: params.campaignName.trim(),
    destination,
    userName: params.userName,
    templateParams: params.templateParams,
    source: params.source,
  };
  if (params.buttons?.length) {
    body.buttons = params.buttons;
  }
  if (params.media?.url) {
    body.media = {
      url: params.media.url,
      filename: params.media.filename || "document.pdf",
    };
  }

  try {
    const res = await fetch(AISENSY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let providerResponse: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        providerResponse = JSON.parse(text);
      } catch {
        providerResponse = text;
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        message: providerErrorMessage(
          providerResponse,
          "AiSensy rejected the campaign request",
        ),
        providerResponse,
      };
    }

    const isSuccessFalse =
      typeof providerResponse === "object" &&
      providerResponse !== null &&
      "success" in providerResponse &&
      (
        (providerResponse as { success: unknown }).success === false ||
        (providerResponse as { success: unknown }).success === "false" ||
        String((providerResponse as { success: unknown }).success).toLowerCase() === "false"
      );

    if (isSuccessFalse) {
      return {
        ok: false,
        message: providerErrorMessage(
          providerResponse,
          "AiSensy could not send the message",
        ),
        providerResponse,
      };
    }

    console.log("[AiSensy] campaign accepted", {
      campaignName: params.campaignName,
      destination,
      hasMedia: Boolean(params.media?.url),
      providerResponse,
    });

    return { ok: true, providerResponse };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to reach AiSensy API",
    };
  }
}

type SendOtpParams = {
  destination: string;
  userName: string;
  otp: string;
};

/** Send OTP via AiSensy WhatsApp Authentication campaign (Copy code). */
export async function sendAisensyOtp(
  params: SendOtpParams,
): Promise<SendCampaignResult> {
  const settings = await getAisensySettings();
  const campaignName = settings.otpCampaignName;
  if (!campaignName) {
    return {
      ok: false,
      message: "AiSensy is not configured (API key or OTP campaign missing)",
    };
  }

  // Auth / Copy-code templates need OTP in body params AND button params.
  return sendAisensyCampaign({
    campaignName,
    destination: params.destination,
    userName: params.userName,
    templateParams: [params.otp],
    source: "Atlanta Telecables login",
    buttons: [
      {
        type: "button",
        sub_type: "url",
        index: 0,
        parameters: [{ type: "text", text: params.otp }],
      },
    ],
  });
}

export { isAisensyOtpConfigured };
