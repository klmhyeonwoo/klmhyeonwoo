import type { ComponentType, SVGProps } from "react";
import CheckMarkButton from "@fluentui-emoji/react/flat/check-mark-button";
import Fire from "@fluentui-emoji/react/flat/fire";
import HundredPoints from "@fluentui-emoji/react/flat/hundred-points";
import LightBulb from "@fluentui-emoji/react/flat/light-bulb";
import LockedWithKey from "@fluentui-emoji/react/flat/locked-with-key";
import Memo from "@fluentui-emoji/react/flat/memo";
import Paperclip from "@fluentui-emoji/react/flat/paperclip";
import PartyPopper from "@fluentui-emoji/react/flat/party-popper";
import PuzzlePiece from "@fluentui-emoji/react/flat/puzzle-piece";
import Pushpin from "@fluentui-emoji/react/flat/pushpin";
import RedHeart from "@fluentui-emoji/react/flat/red-heart";
import Rocket from "@fluentui-emoji/react/flat/rocket";
import Seedling from "@fluentui-emoji/react/flat/seedling";
import Sparkles from "@fluentui-emoji/react/flat/sparkles";
import SpeechBalloon from "@fluentui-emoji/react/flat/speech-balloon";
import TestTube from "@fluentui-emoji/react/flat/test-tube";
import ThumbsUp from "@fluentui-emoji/react/flat/thumbs-up-default";
import Warning from "@fluentui-emoji/react/flat/warning";

type FluentIcon = ComponentType<SVGProps<SVGSVGElement>>;

const icons: Record<string, FluentIcon> = {
  CheckMarkButton,
  Fire,
  HundredPoints,
  LightBulb,
  LockedWithKey,
  Memo,
  Paperclip,
  PartyPopper,
  PuzzlePiece,
  Pushpin,
  RedHeart,
  Rocket,
  Seedling,
  Sparkles,
  SpeechBalloon,
  TestTube,
  ThumbsUp,
  Warning,
};

export const fluentEmojiOptions = [
  { id: "LightBulb", label: "아이디어" },
  { id: "Pushpin", label: "중요" },
  { id: "Sparkles", label: "새로운 내용" },
  { id: "CheckMarkButton", label: "완료" },
  { id: "Warning", label: "주의" },
  { id: "PuzzlePiece", label: "구성 요소" },
  { id: "Paperclip", label: "참고" },
  { id: "SpeechBalloon", label: "대화" },
  { id: "Rocket", label: "시작" },
  { id: "RedHeart", label: "좋아요" },
  { id: "ThumbsUp", label: "동의" },
  { id: "PartyPopper", label: "축하" },
  { id: "Fire", label: "핵심" },
  { id: "HundredPoints", label: "강조" },
  { id: "Memo", label: "메모" },
  { id: "LockedWithKey", label: "보안" },
  { id: "TestTube", label: "실험" },
  { id: "Seedling", label: "성장" },
] as const;

export function FluentEmoji({ className, name, title }: { className?: string; name?: string; title?: string }) {
  const Icon = icons[name ?? ""];
  if (!Icon) return null;
  return <Icon aria-hidden={title ? undefined : true} aria-label={title} className={className} focusable="false" height="1em" role={title ? "img" : undefined} width="1em" />;
}
