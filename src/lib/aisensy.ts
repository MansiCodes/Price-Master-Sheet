import {
  getAisensySettings,
  isAisensyOtpConfigured,
} from "@/lib/aisensy-config";

const AISENSY_API_URL = "https://backend.aisensy.com/campaign/t1/api/v2";

export { isAisensyOtpConfigured as isAisensyConfigured };

export type SendCampaignParams = {
  campaignName: string;
  destination: string;
  userName: string;
  templateParams: string[];
  source: string;
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
  if (
    typeof providerResponse === "object" &&
    providerResponse !== null &&
    "message" in providerResponse &&
    typeof (providerResponse as { message: unknown }).message === "string"
  ) {
    return (providerResponse as { message: string }).message;
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

  const body: Record<string, unknown> = {
    apiKey,
    campaignName: params.campaignName,
    destination: params.destination,
    userName: params.userName,
    templateParams: params.templateParams,
    source: params.source,
  };
  if (params.buttons?.length) {
    body.buttons = params.buttons;
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

    if (
      typeof providerResponse === "object" &&
      providerResponse !== null &&
      "success" in providerResponse &&
      (providerResponse as { success: unknown }).success === false
    ) {
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
      destination: params.destination,
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
    source: "Cable Junction login",
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

/**
 * Shift reminder template:
 * Hi {{1}}, Your {{2}} shift at {{3}} starts in 10 minutes.
 * Please submit today's plant forms for {{4}}: … Date: {{5}}
 */
export async function sendShiftReminderWhatsApp(params: {
  destination: string;
  userName: string;
  shiftLabel: string;
  plantName: string;
  dateLabel: string;
}): Promise<SendCampaignResult> {
  const settings = await getAisensySettings();
  const campaignName = settings.reminderCampaignName;
  if (!settings.apiKey || !campaignName) {
    return {
      ok: false,
      message: "Shift reminder campaign is not configured",
    };
  }

  return sendAisensyCampaign({
    campaignName,
    destination: params.destination,
    userName: params.userName,
    templateParams: [
      params.userName,
      params.shiftLabel,
      params.plantName,
      params.plantName,
      params.dateLabel,
    ],
    source: "Cable Junction shift reminder",
  });
}

/**
 * Forms complete template:
 * Congratulations {{1}}! … forms for {{2}} on {{3}}: …
 * Your credit score is now {{4}} points.
 */
export async function sendFormsCompleteWhatsApp(params: {
  destination: string;
  userName: string;
  plantName: string;
  dateLabel: string;
  creditScore: number | string;
}): Promise<SendCampaignResult> {
  const settings = await getAisensySettings();
  const campaignName = settings.completeCampaignName;
  if (!settings.apiKey || !campaignName) {
    return {
      ok: false,
      message: "Forms complete campaign is not configured",
    };
  }

  return sendAisensyCampaign({
    campaignName,
    destination: params.destination,
    userName: params.userName,
    templateParams: [
      params.userName,
      params.plantName,
      params.dateLabel,
      String(params.creditScore),
    ],
    source: "Cable Junction forms complete",
  });
}

export async function isAisensyReminderConfigured(): Promise<boolean> {
  const settings = await getAisensySettings();
  return Boolean(settings.apiKey && settings.reminderCampaignName);
}

export async function isAisensyCompleteConfigured(): Promise<boolean> {
  const settings = await getAisensySettings();
  return Boolean(settings.apiKey && settings.completeCampaignName);
}
