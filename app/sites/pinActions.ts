"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { setAccountPinned, setAccountPinOrder } from "@/lib/accounts/accountsStore";
import { setFavoritePinned, setFavoritePinOrder } from "@/lib/favorites/favoritesStore";

type Source = "account" | "favorite";

function assertEntry(source: unknown, id: unknown): asserts source is Source {
  if (source !== "account" && source !== "favorite") throw new Error("잘못된 항목입니다.");
  if (typeof id !== "string" || !id) throw new Error("잘못된 항목입니다.");
}

/** 어카운트 화면의 계정·즐겨찾기를 맨 위 "고정"에 올리거나 내린다. */
export async function setSitePinnedAction(source: Source, id: string, pinned: boolean): Promise<void> {
  await requireAdmin();
  assertEntry(source, id);
  if (source === "account") await setAccountPinned(id, pinned === true);
  else await setFavoritePinned(id, pinned === true);
  // 내리면 순서도 지운다 (다시 올리면 맨 뒤). 0027 전이면 순서 열이 없으니 넘어간다.
  if (pinned !== true) {
    try {
      if (source === "account") await setAccountPinOrder(id, null);
      else await setFavoritePinOrder(id, null);
    } catch {}
  }
  revalidatePath("/sites");
}

/** "고정" 영역의 순서를 저장한다 (계정·즐겨찾기가 섞여 있어 항목마다 출처를 받는다). */
export async function reorderPinnedAction(entries: { source: Source; id: string }[]): Promise<void> {
  await requireAdmin();
  if (!Array.isArray(entries) || entries.length > 200) throw new Error("잘못된 순서입니다.");
  entries.forEach((e) => assertEntry(e?.source, e?.id));
  await Promise.all(
    entries.map(({ source, id }, index) =>
      source === "account" ? setAccountPinOrder(id, index) : setFavoritePinOrder(id, index),
    ),
  );
  revalidatePath("/sites");
}
