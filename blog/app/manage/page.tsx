import { redirect } from "next/navigation";
import { BlogSettingsEditor } from "@/components/blog-settings-editor";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  if (!(await isAdmin())) redirect("/");
  return <><SiteHeader /><BlogSettingsEditor initialSettings={getSiteSettings()} /></>;
}
