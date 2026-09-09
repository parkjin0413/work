/**
 * 파일 기반 제품 카탈로그 로더.
 *
 * content/products/{wall,floor,ceiling}/{slug}/product.md 를 gray-matter 로 읽어
 * 스키마 기본값을 백필한 Product[] 를 반환한다. Supabase 를 쓰지 않는 유일한
 * first-party 데이터 (편집은 파일에서, 대시보드는 읽기 전용).
 *
 * content/products/SCHEMA.md 가 필드 정의의 단일 진실.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  CATEGORY_ORDER,
  slugToLabel,
  type CategoryLabel,
  type CategorySlug,
} from "./categories";
import { deriveAttributesForType } from "./attributes";

export type ProductAttributeValue = string | boolean | null;

export type ProductType = {
  group: string | null;
  typeName: string;
  thickness: string;
  sizeWxhxt: string;
  weight: string;
  composition: string;
  surface: string;
  note: string;
};

/**
 * 인증 항목. 필드 구조는 **미확정** — 실제 시험성적서를 보고 정한다.
 * 지금은 어떤 key 든 받는 열린 형태. 총괄표 성능 컬럼과 잇는 데 쓰는 key 만
 * 관례로 둔다: `feeds`(컬럼 key), `result`(값), `scope`(국내/유럽), `name`(표시명).
 */
export type Certification = Record<string, string>;

export type InstallationStep = {
  step: number;
  title: string;
  description: string;
  image: string;
};

export type InstallationMethod = { methodName: string; steps: InstallationStep[] };

export type FinishingOption = { name: string; image: string };

export type HighlightFeature = { title: string; description: string };

export type Product = {
  category: CategoryLabel;
  categorySlug: CategorySlug;
  slug: string;
  name: string;
  productType: string;
  status: "active" | "discontinued";
  summary: string;
  features: string[];
  highlightFeatures: HighlightFeature[];
  material: string;
  structure: string;
  installationSummary: string;
  colors: string[];
  colorsNote: string;
  types: ProductType[];
  certifications: Certification[];
  certificationsNote: string;
  installationMethods: InstallationMethod[];
  installationNote: string;
  finishingOptions: FinishingOption[];
  images: string[];
  dataNote: string;
  body: string;
  /** 이미지 상대경로 해석용. 예: "content/products/wall/laminate-tile-hpl" */
  dir: string;
};

export type CatalogRow = {
  category: CategoryLabel;
  productName: string;
  slug: string;
  categorySlug: CategorySlug;
  typeName: string;
  group: string | null;
  size: string;
  attributes: Record<string, ProductAttributeValue>;
};

const DEFAULT_ROOT = path.join(process.cwd(), "content", "products");

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function normalizeType(raw: unknown): ProductType {
  const t = (raw ?? {}) as Record<string, unknown>;
  return {
    group: typeof t.group === "string" && t.group.length > 0 ? t.group : null,
    typeName: str(t.type_name),
    thickness: str(t.thickness),
    sizeWxhxt: str(t.size_wxhxt),
    weight: str(t.weight),
    composition: str(t.composition),
    surface: str(t.surface),
    note: str(t.note),
  };
}

function normalizeMethod(raw: unknown): InstallationMethod {
  const m = (raw ?? {}) as Record<string, unknown>;
  return {
    methodName: str(m.method_name),
    steps: arr<Record<string, unknown>>(m.steps).map((s, i) => ({
      step: typeof s.step === "number" ? s.step : i + 1,
      title: str(s.title),
      description: str(s.description),
      image: str(s.image),
    })),
  };
}

function toProduct(
  fm: Record<string, unknown>,
  body: string,
  categorySlug: CategorySlug,
  slug: string
): Product {
  const types = arr<unknown>(fm.types).map(normalizeType);
  return {
    category: slugToLabel(categorySlug),
    categorySlug,
    slug,
    name: str(fm.name) || slug,
    productType: str(fm.product_type),
    status: fm.status === "discontinued" ? "discontinued" : "active",
    summary: str(fm.summary),
    features: arr<string>(fm.features),
    highlightFeatures: arr<Record<string, unknown>>(fm.highlight_features).map((h) => ({
      title: str(h.title),
      description: str(h.description),
    })),
    material: str(fm.material),
    structure: str(fm.structure),
    installationSummary: str(fm.installation_summary),
    colors: arr<string>(fm.colors),
    colorsNote: str(fm.colors_note),
    // 항상 최소 1행 — 렌더러가 빈 types 를 만나지 않게 한다
    types: types.length > 0 ? types : [normalizeType({ type_name: "-" })],
    // 들어온 key 를 그대로(문자열화해서) 통과시킨다. YAML 리스트(applies_to 등)는
    // 쉼표로 이어 붙인다.
    certifications: arr<Record<string, unknown>>(fm.certifications).map((c) => {
      const out: Certification = {};
      for (const [k, v] of Object.entries(c ?? {})) {
        if (v == null || v === "") continue;
        out[k] = Array.isArray(v) ? v.map(String).join(", ") : String(v);
      }
      return out;
    }),
    certificationsNote: str(fm.certifications_note),
    installationMethods: arr<unknown>(fm.installation_methods).map(normalizeMethod),
    installationNote: str(fm.installation_note),
    finishingOptions: arr<Record<string, unknown>>(fm.finishing_options).map((f) => ({
      name: str(f.name),
      image: str(f.image),
    })),
    images: arr<string>(fm.images),
    dataNote: str(fm.data_note),
    body: body.trim(),
    dir: `content/products/${categorySlug}/${slug}`,
  };
}

function readProductFiles(rootDir: string): { slug: string; categorySlug: CategorySlug; raw: string }[] {
  const out: { slug: string; categorySlug: CategorySlug; raw: string }[] = [];
  for (const categorySlug of CATEGORY_ORDER) {
    const catDir = path.join(rootDir, categorySlug);
    if (!fs.existsSync(catDir)) continue;
    for (const slug of fs.readdirSync(catDir).sort()) {
      const file = path.join(catDir, slug, "product.md");
      if (!fs.existsSync(file)) continue;
      out.push({ slug, categorySlug, raw: fs.readFileSync(file, "utf-8") });
    }
  }
  return out;
}

/** rootDir 기본값 = content/products. 테스트에서 픽스처 경로를 주입할 때만 인자 사용. */
export function getAllProducts(rootDir: string = DEFAULT_ROOT): Product[] {
  return readProductFiles(rootDir).map(({ slug, categorySlug, raw }) => {
    const { data, content } = matter(raw);
    return toProduct((data ?? {}) as Record<string, unknown>, content, categorySlug, slug);
  });
}

export function getProductsByCategory(label: CategoryLabel, rootDir?: string): Product[] {
  return getAllProducts(rootDir).filter((p) => p.category === label);
}

export function getProductBySlug(
  categorySlug: string,
  slug: string,
  rootDir?: string
): Product | undefined {
  return getAllProducts(rootDir).find(
    (p) => p.categorySlug === categorySlug && p.slug === slug
  );
}

/** frontmatter + 본문을 포함한 product.md 원문 (복사 "마크다운 원문"용). */
export function getRawMarkdown(
  categorySlug: string,
  slug: string,
  rootDir: string = DEFAULT_ROOT
): string | undefined {
  const file = path.join(rootDir, categorySlug, slug, "product.md");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : undefined;
}

/** 총괄표용 flat 행 — 제품 × 타입. 성능값은 그 타입에 적용되는 certifications 에서 파생. */
export function getCatalogRows(rootDir?: string): CatalogRow[] {
  return getAllProducts(rootDir).flatMap((p) =>
    p.types.map((t) => ({
      category: p.category,
      productName: p.name,
      slug: p.slug,
      categorySlug: p.categorySlug,
      typeName: t.typeName,
      group: t.group,
      size: t.sizeWxhxt,
      attributes: deriveAttributesForType(p.category, p.certifications, t.typeName),
    }))
  );
}

/** /products/catalog.json 및 "catalog 복사"용 전체 덤프. */
export function getCatalog(rootDir?: string): { generatedAt: string; products: Product[] } {
  return { generatedAt: new Date().toISOString(), products: getAllProducts(rootDir) };
}
