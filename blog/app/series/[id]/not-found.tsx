import { PageUnavailable } from "@/components/page-unavailable";
import { SiteHeader } from "@/components/site-header";

export default function SeriesNotFound() {
  return <><SiteHeader /><PageUnavailable title="시리즈를 찾을 수 없어요" description="삭제되었거나 더 이상 공개되지 않은 아티클 시리즈입니다." action="아티클 시리즈 보기" href="/series" /></>;
}
