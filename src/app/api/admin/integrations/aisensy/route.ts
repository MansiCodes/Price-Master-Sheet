import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  getAisensySettings,
  maskSecret,
  updateAisensySettings,
} from "@/lib/aisensy-config";
import { isSuperAdmin } from "@/lib/rbac";

function requireSuperAdmin(
  session: { user?: { globalRole?: unknown; id?: string } } | null | undefined,
): NextResponse | null {
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdmin(session.user.globalRole as Parameters<typeof isSuperAdmin>[0])) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const session = await auth();
  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  const settings = await getAisensySettings();

  return NextResponse.json({
    ok: true,
    config: {
      hasApiKey: Boolean(settings.apiKey),
      apiKeyMasked: maskSecret(settings.apiKey),
      otpCampaignName: settings.otpCampaignName,
      reminderCampaignName: settings.reminderCampaignName,
      completeCampaignName: settings.completeCampaignName,
      otpReady: Boolean(settings.apiKey && settings.otpCampaignName),
      reminderReady: Boolean(settings.apiKey && settings.reminderCampaignName),
      completeReady: Boolean(settings.apiKey && settings.completeCampaignName),
    },
  });
}

const patchSchema = z.object({
  apiKey: z.string().max(2048).optional().nullable(),
  otpCampaignName: z.string().max(200).optional().nullable(),
  reminderCampaignName: z.string().max(200).optional().nullable(),
  completeCampaignName: z.string().max(200).optional().nullable(),
});

export async function PATCH(request: Request) {
  const session = await auth();
  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const before = await getAisensySettings();
  const data = parsed.data;

  const patch: Parameters<typeof updateAisensySettings>[0] = {};
  if (data.otpCampaignName !== undefined) {
    patch.otpCampaignName = data.otpCampaignName;
  }
  if (data.reminderCampaignName !== undefined) {
    patch.reminderCampaignName = data.reminderCampaignName;
  }
  if (data.completeCampaignName !== undefined) {
    patch.completeCampaignName = data.completeCampaignName;
  }
  if (data.apiKey !== undefined && data.apiKey !== null && data.apiKey.trim()) {
    patch.apiKey = data.apiKey.trim();
  }

  const after = await updateAisensySettings(patch);

  await writeAuditLog({
    entityType: "AisensyConfig",
    entityId: "default",
    field: "update",
    oldValue: {
      hasApiKey: Boolean(before.apiKey),
      otpCampaignName: before.otpCampaignName,
      reminderCampaignName: before.reminderCampaignName,
      completeCampaignName: before.completeCampaignName,
    },
    newValue: {
      hasApiKey: Boolean(after.apiKey),
      otpCampaignName: after.otpCampaignName,
      reminderCampaignName: after.reminderCampaignName,
      completeCampaignName: after.completeCampaignName,
      apiKeyChanged: Boolean(patch.apiKey),
    },
    actorId: session!.user!.id,
  });

  return NextResponse.json({
    ok: true,
    config: {
      hasApiKey: Boolean(after.apiKey),
      apiKeyMasked: maskSecret(after.apiKey),
      otpCampaignName: after.otpCampaignName,
      reminderCampaignName: after.reminderCampaignName,
      completeCampaignName: after.completeCampaignName,
      otpReady: Boolean(after.apiKey && after.otpCampaignName),
      reminderReady: Boolean(after.apiKey && after.reminderCampaignName),
      completeReady: Boolean(after.apiKey && after.completeCampaignName),
    },
  });
}
