import { SeriesLibrary } from "@/components/series-library";
import { SeriesCreate } from "@/components/series-create";
import { SiteHeader } from "@/components/site-header";
import { isAdmin } from "@/lib/auth";
import { getPosts } from "@/lib/posts";
import { getSeries } from "@/lib/series";

export const dynamic = "force-dynamic";

export default async function SeriesPage() {
  const posts = getPosts();
  const series = getSeries();
  const authenticated = await isAdmin();

  return <><SiteHeader /><main className="series-page"><header className="series-page-header"><h1>아티클 시리즈</h1></header>
    {series.length > 0 || authenticated ? <SeriesLibrary series={series} postCounts={Object.fromEntries(series.map((item) => [item.id, posts.filter((post) => post.seriesId === item.id).length]))}>{authenticated && <SeriesCreate series={series} />}</SeriesLibrary> : <p className="series-empty">아직 만든 아티클 시리즈가 없습니다.</p>}
  </main></>;
}
