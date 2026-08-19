import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requirePlantAccess,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

type RouteContext = { params: Promise<{ plantId: string }> };

const contactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize")) || 10));
  const skip = (page - 1) * pageSize;

  const where = { plantId };
  const [contacts, total] = await Promise.all([
    prisma.plantContact.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.plantContact.count({ where }),
  ]);

  return NextResponse.json({ rows: contacts, total, page, pageSize });
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const contact = await prisma.plantContact.create({
    data: {
      plantId,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      category: parsed.data.category ?? null,
      designation: parsed.data.designation ?? null,
    },
  });

  await writeAuditLog({
    entityType: "PlantContact",
    entityId: contact.id,
    field: "create",
    newValue: { name: contact.name, phone: contact.phone, category: contact.category, designation: contact.designation },
    actorId: session.user.id,
    plantId,
  });

  return NextResponse.json({ contact }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = contactSchema
    .partial()
    .extend({ id: z.string().min(1) })
    .safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.plantContact.findFirst({
    where: { id: parsed.data.id, plantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const contact = await prisma.plantContact.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      category: parsed.data.category,
      designation: parsed.data.designation,
    },
  });

  await writeAuditLog({
    entityType: "PlantContact",
    entityId: contact.id,
    field: "update",
    oldValue: { name: existing.name, phone: existing.phone, category: existing.category, designation: existing.designation },
    newValue: { name: contact.name, phone: contact.phone, category: contact.category, designation: contact.designation },
    actorId: session.user.id,
    plantId,
  });

  return NextResponse.json({ contact });
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.plantContact.findFirst({
    where: { id, plantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await prisma.plantContact.delete({ where: { id } });

  await writeAuditLog({
    entityType: "PlantContact",
    entityId: id,
    field: "delete",
    oldValue: { name: existing.name, phone: existing.phone, category: existing.category },
    actorId: session.user.id,
    plantId,
  });

  return NextResponse.json({ ok: true });
}
