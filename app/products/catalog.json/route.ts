import { getCatalog } from "@/lib/products/productsStore";

// 빌드 타임 콘텐츠 — 정적으로 생성한다 (재배포 시점에만 바뀜).
export const dynamic = "force-static";

export function GET() {
  return Response.json(getCatalog());
}
