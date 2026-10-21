import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { saveSiteSettings } from "@/lib/github";
import type { SiteAction, SiteSettings } from "@/lib/site-settings";

function string(value: unknown, limit: number) {
  return typeof value === "string" && value.length <= limit ? value.trim() : null;
}

function action(value: unknown): SiteAction | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const label = string(source.label, 80);
  const href = string(source.href, 2_000);
  if (label === null || href === null) return null;
  if (href && !/^https?:\/\//i.test(href) && !href.startsWith("/")) return null;
  return { label, href };
}

function color(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : null;
}

function settings(value: unknown): SiteSettings | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const banner = source.banner as Record<string, unknown> | undefined;
  const popup = source.popup as Record<string, unknown> | undefined;
  if (!banner || !popup || typeof banner.enabled !== "boolean" || typeof popup.enabled !== "boolean") return null;
  const bannerTitle = string(banner.title, 100);
  const bannerAction = action(banner.action);
  const backgroundColor = color(banner.backgroundColor);
  const textColor = color(banner.textColor);
  const image = string(popup.image, 2_000);
  const title = string(popup.title, 130);
  const description = string(popup.description, 400);
  const primaryAction = action(popup.primaryAction);
  const secondaryAction = action(popup.secondaryAction);
  if (bannerTitle === null || !bannerAction || !backgroundColor || !textColor || image === null || title === null || description === null || !primaryAction || !secondaryAction) return null;
  if (image && !/^https?:\/\//i.test(image)) return null;
  return { banner: { enabled: banner.enabled, title: bannerTitle, action: bannerAction, backgroundColor, textColor }, popup: { enabled: popup.enabled, image, title, description, primaryAction, secondaryAction } };
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const nextSettings = settings(await request.json().catch(() => null));
  if (!nextSettings) return NextResponse.json({ error: "설정 내용을 확인해 주세요." }, { status: 400 });
  try {
    await saveSiteSettings(nextSettings);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "블로그 설정을 저장하지 못했습니다." }, { status: 502 });
  }
}
