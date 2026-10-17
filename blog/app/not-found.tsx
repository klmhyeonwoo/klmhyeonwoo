import { PageUnavailable } from "@/components/page-unavailable";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return <><SiteHeader /><PageUnavailable title="페이지를 찾을 수 없어요" description="주소가 변경되었거나 삭제되어 더 이상 볼 수 없는 페이지입니다." /></>;
}
