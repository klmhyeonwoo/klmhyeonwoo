"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { SiteSettings } from "@/lib/site-settings";
import { AnnouncementIcon } from "./announcement-icon";
import { IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { ToastMessage } from "./toast-message";

type ActionKey = "action" | "primaryAction" | "secondaryAction";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="settings-toggle"><span>{label}</span><input checked={checked} type="checkbox" onChange={(event) => onChange(event.currentTarget.checked)} /><i aria-hidden="true" /></label>;
}

function ActionFields({ title, action, onChange }: { title: string; action: { label: string; href: string }; onChange: (next: { label: string; href: string }) => void }) {
  return <div className="settings-action-fields"><p>{title}</p><input value={action.label} onChange={(event) => onChange({ ...action, label: event.currentTarget.value })} placeholder="버튼명 (선택)" aria-label={`${title} 버튼명`} /><input value={action.href} onChange={(event) => onChange({ ...action, href: event.currentTarget.value })} placeholder="URL (선택)" aria-label={`${title} 연결 주소`} /></div>;
}

export function BlogSettingsEditor({ initialSettings }: { initialSettings: SiteSettings }) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [popupFile, setPopupFile] = useState<File | null>(null);
  const [popupPreview, setPopupPreview] = useState(initialSettings.popup.image);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!popupFile) {
      setPopupPreview(settings.popup.image);
      return;
    }
    const url = URL.createObjectURL(popupFile);
    setPopupPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [popupFile, settings.popup.image]);

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setMessage("5MB 이하의 이미지 파일만 선택할 수 있습니다.");
      return;
    }
    setPopupFile(file);
    setMessage("이미지를 선택했습니다. 저장하기를 누르면 GitHub에 업로드됩니다.");
  }

  function updateAction(section: "banner" | "popup", key: ActionKey, action: { label: string; href: string }) {
    setSettings((current) => ({ ...current, [section]: { ...current[section], [key]: action } }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      let next = settings;
      if (popupFile) {
        const form = new FormData();
        form.append("file", popupFile);
        const upload = await fetch("/api/upload", { method: "POST", body: form });
        const payload = await upload.json() as { url?: string; error?: string };
        if (!upload.ok || !payload.url) throw new Error(payload.error ?? "이미지 업로드에 실패했습니다.");
        next = { ...next, popup: { ...next.popup, image: payload.url } };
      }
      const response = await fetch("/api/site-settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "블로그 설정을 저장하지 못했습니다.");
      setSettings(next);
      setPopupFile(null);
      setMessage("GitHub에 저장했습니다. 배포 후 공개 화면에 반영됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장 중 연결 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="settings-page">
    <header className="settings-page-header"><div><h1>블로그 관리</h1><p>공개 화면에 표시할 알림을 설정합니다.</p></div><button onClick={save} disabled={saving}>{saving ? "저장 중…" : "저장하기"}</button></header>

    <section className="settings-panel">
      <header><h2>상단 배너</h2><Toggle label={settings.banner.enabled ? "켜짐" : "꺼짐"} checked={settings.banner.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, banner: { ...current.banner, enabled } }))} /></header>
      <div className="settings-panel-content">
        <div className="settings-fields"><label>제목<input value={settings.banner.title} maxLength={100} onChange={(event) => { const title = event.currentTarget.value; setSettings((current) => ({ ...current, banner: { ...current.banner, title } })); }} placeholder="방문자에게 전할 한 줄" /></label><ActionFields title="버튼" action={settings.banner.action} onChange={(action) => updateAction("banner", "action", action)} /><div className="settings-colors"><label>배경색<input type="color" value={settings.banner.backgroundColor} onChange={(event) => { const backgroundColor = event.currentTarget.value; setSettings((current) => ({ ...current, banner: { ...current.banner, backgroundColor } })); }} /></label><label>글자색<input type="color" value={settings.banner.textColor} onChange={(event) => { const textColor = event.currentTarget.value; setSettings((current) => ({ ...current, banner: { ...current.banner, textColor } })); }} /></label></div></div>
        <div className="settings-preview"><div className="browser-preview"><div className="browser-preview-bar"><i /><i /><i /></div><div className="banner-preview" style={{ background: settings.banner.backgroundColor, color: settings.banner.textColor }}><span>{settings.banner.title || "배너 제목"}</span>{settings.banner.action.label && <b>{settings.banner.action.label}</b>}<em><IconXmarkLine size={20} /></em></div><div className="browser-preview-body" /></div></div>
      </div>
    </section>

    <section className="settings-panel">
      <header><h2>팝업</h2><Toggle label={settings.popup.enabled ? "켜짐" : "꺼짐"} checked={settings.popup.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, popup: { ...current.popup, enabled } }))} /></header>
      <div className="settings-panel-content">
        <div className="settings-fields"><label>이미지 URL<input value={popupFile ? "" : settings.popup.image} onChange={(event) => { const image = event.currentTarget.value; setPopupFile(null); setSettings((current) => ({ ...current, popup: { ...current.popup, image } })); }} placeholder="https://…" /></label><label className="settings-upload">GitHub에 이미지 업로드<input type="file" accept="image/*" onChange={selectImage} /><span>{popupFile ? popupFile.name : "파일 선택"}</span></label><label>제목<input value={settings.popup.title} maxLength={130} onChange={(event) => { const title = event.currentTarget.value; setSettings((current) => ({ ...current, popup: { ...current.popup, title } })); }} placeholder="팝업 제목" /></label><label>설명<textarea value={settings.popup.description} maxLength={400} onChange={(event) => { const description = event.currentTarget.value; setSettings((current) => ({ ...current, popup: { ...current.popup, description } })); }} placeholder="방문자에게 전달할 내용" /></label><ActionFields title="기본 버튼" action={settings.popup.primaryAction} onChange={(action) => updateAction("popup", "primaryAction", action)} /><ActionFields title="보조 버튼" action={settings.popup.secondaryAction} onChange={(action) => updateAction("popup", "secondaryAction", action)} /></div>
        <div className="settings-preview popup-preview-area"><div className="popup-preview"><button aria-label="미리보기 닫기" type="button"><IconXmarkLine size={18} /></button>{popupPreview ? <img src={popupPreview} alt="" /> : <div className="popup-preview-placeholder"><AnnouncementIcon /></div>}<div><h3>{settings.popup.title || "팝업 제목"}</h3><p>{settings.popup.description || "팝업 설명"}</p>{settings.popup.primaryAction.label && <b>{settings.popup.primaryAction.label}</b>}</div></div></div>
      </div>
    </section>
    <ToastMessage message={message} tone={message.includes("선택했습니다") || message.includes("저장했습니다") ? "success" : "error"} />
  </main>;
}
