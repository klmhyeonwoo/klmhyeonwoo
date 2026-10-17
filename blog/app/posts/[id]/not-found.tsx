import { PageUnavailable } from "@/components/page-unavailable";
import { SiteHeader } from "@/components/site-header";

export default function PostNotFound() {
  return <><SiteHeader /><PageUnavailable title="글을 찾을 수 없어요" description="삭제되었거나 더 이상 공개되지 않은 글입니다." action="모든 글 보기" href="/#all" /></>;
}
