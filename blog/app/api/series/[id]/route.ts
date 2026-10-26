import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { saveSeries } from "@/lib/github";
import { postsCacheTag } from "@/lib/post-cache";
import { getSeries } from "@/lib/series";

const validId = /^[a-z0-9-]{1,64}$/;

/** Updates one collection without asking the client to resubmit every series. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { name, description, coverImage = "" } = body ?? {};
  if (!validId.test(id) || typeof name !== "string" || !name.trim() || name.length > 80 || typeof description !== "string" || description.length > 300 || typeof coverImage !== "string" || coverImage.length > 2000) {
    return NextResponse.json({ error: "시리즈 정보를 확인해 주세요." }, { status: 400 });
  }

  const series = getSeries();
  const current = series.find((item) => item.id === id);
  if (!current) return NextResponse.json({ error: "시리즈를 찾을 수 없습니다." }, { status: 404 });
  if (series.some((item) => item.id !== id && item.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) return NextResponse.json({ error: "같은 이름의 시리즈가 이미 있습니다." }, { status: 400 });

  const next = series.map((item) => item.id === id ? { id, name: name.trim(), description: description.trim(), ...(coverImage.trim() ? { coverImage: coverImage.trim() } : {}) } : item);
  try {
    await saveSeries(next);
    revalidateTag(postsCacheTag, "max");
    revalidatePath("/");
    revalidatePath("/series");
    revalidatePath(`/series/${id}`);
    return NextResponse.json({ ok: true, series: next.find((item) => item.id === id) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "시리즈 정보를 저장하지 못했습니다." }, { status: 502 });
  }
}
