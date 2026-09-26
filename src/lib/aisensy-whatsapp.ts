import { getAisensySettings } from "@/lib/aisensy-config";
import {
  sendAisensyCampaign,
  type SendCampaignResult,
} from "@/lib/aisensy-campaign";

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
    source: "Atlanta Telecables shift reminder",
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
    source: "Atlanta Telecables forms complete",
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

/**
 * Price sheet share — sends WhatsApp template with attached PDF media.
 * Campaign must use a DOCUMENT (file) header template for the PDF to appear
 * as an attachment. TEXT-only templates ignore media and only send body text.
 * Body params: {{1}} name, {{2}} item count, {{3}} date, {{4}} PDF link.
 */
export async function sendPriceSheetWhatsApp(params: {
  destination: string;
  userName: string;
  itemCount: number;
  dateLabel: string;
  mediaUrl: string;
  mediaFilename: string;
}): Promise<SendCampaignResult> {
  const settings = await getAisensySettings();
  const campaignName = settings.priceSheetCampaignName;
  if (!settings.apiKey || !campaignName) {
    return {
      ok: false,
      message: "Price sheet share campaign is not configured in Integrations",
    };
  }

  return sendAisensyCampaign({
    campaignName,
    destination: params.destination,
    userName: params.userName,
    templateParams: [
      params.userName,
      String(params.itemCount),
      params.dateLabel,
      // Fallback when campaign is TEXT-only: link still opens the PDF
      params.mediaUrl,
    ],
    media: {
      url: params.mediaUrl,
      filename: params.mediaFilename,
    },
    source: "Atlanta Telecables price sheet share",
  });
}

export async function isAisensyPriceSheetConfigured(): Promise<boolean> {
  const settings = await getAisensySettings();
  return Boolean(settings.apiKey && settings.priceSheetCampaignName);
}
