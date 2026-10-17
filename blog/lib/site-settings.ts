import fs from "fs";
import path from "path";

export type SiteAction = { label: string; href: string };

export type BannerSettings = {
  enabled: boolean;
  title: string;
  action: SiteAction;
  backgroundColor: string;
  textColor: string;
};

export type PopupSettings = {
  enabled: boolean;
  image: string;
  title: string;
  description: string;
  primaryAction: SiteAction;
  secondaryAction: SiteAction;
};

export type SiteSettings = { banner: BannerSettings; popup: PopupSettings };

const settingsFile = path.join(process.cwd(), "content", "site-settings.json");

export const defaultSiteSettings: SiteSettings = {
  banner: { enabled: false, title: "", action: { label: "", href: "" }, backgroundColor: "#171717", textColor: "#ffffff" },
  popup: { enabled: false, image: "", title: "", description: "", primaryAction: { label: "", href: "" }, secondaryAction: { label: "", href: "" } },
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function action(value: unknown): SiteAction {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { label: text(source.label), href: text(source.href) };
}

export function getSiteSettings(): SiteSettings {
  if (!fs.existsSync(settingsFile)) return defaultSiteSettings;
  try {
    const settings = JSON.parse(fs.readFileSync(settingsFile, "utf8")) as Partial<SiteSettings>;
    const banner = settings.banner ?? defaultSiteSettings.banner;
    const popup = settings.popup ?? defaultSiteSettings.popup;
    return {
      banner: {
        enabled: banner.enabled === true,
        title: text(banner.title),
        action: action(banner.action),
        backgroundColor: /^#[0-9a-f]{6}$/i.test(text(banner.backgroundColor)) ? text(banner.backgroundColor) : defaultSiteSettings.banner.backgroundColor,
        textColor: /^#[0-9a-f]{6}$/i.test(text(banner.textColor)) ? text(banner.textColor) : defaultSiteSettings.banner.textColor,
      },
      popup: {
        enabled: popup.enabled === true,
        image: text(popup.image),
        title: text(popup.title),
        description: text(popup.description),
        primaryAction: action(popup.primaryAction),
        secondaryAction: action(popup.secondaryAction),
      },
    };
  } catch {
    return defaultSiteSettings;
  }
}
