import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { locales } from "@/lib/i18n/locales";
import { getInstanceLocales } from "@/lib/i18n/locale-policy";
import { isLocaleEnabledForOrganization } from "@/lib/i18n/locale-policy";
const schema = z.object({ locale: z.enum(locales) });

export async function GET() {
  return NextResponse.json({ locales: await getInstanceLocales() });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  const instanceLocales = await getInstanceLocales();
  if (!instanceLocales.includes(parsed.data.locale)) {
    return NextResponse.json({ error: "This locale is disabled for this instance" }, { status: 400 });
  }
  const organizationId = request.headers.get("x-organization-id");
  if (organizationId && !(await isLocaleEnabledForOrganization(organizationId, parsed.data.locale))) {
    return NextResponse.json({ error: "This locale is disabled for this organization" }, { status: 400 });
  }
  const response = NextResponse.json({ locale: parsed.data.locale });
  response.cookies.set("dubbl_locale", parsed.data.locale, { sameSite: "lax", maxAge: 31536000, path: "/" });
  const session = await auth();
  if (session?.user?.id) await db.update(users).set({ locale: parsed.data.locale }).where(eq(users.id, session.user.id));
  return response;
}
