"use client";

import { useEffect, useRef, useState } from "react";
import type { CategoryWithAccounts } from "@/lib/accounts/accountsStore";
import { CategoryRowActions } from "./CategoryRowActions";
import { CreateAccountForm } from "./CreateAccountForm";
import { AccountCard } from "./AccountCard";

export function AccountsBoard({ categories }: { categories: CategoryWithAccounts[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(categories.map((category) => category.id))
  );
  const prevCategoryIdsRef = useRef<string[]>(categories.map((category) => category.id));

  useEffect(() => {
    const currentIds = categories.map((category) => category.id);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of currentIds) {
        if (!prevCategoryIdsRef.current.includes(id)) {
          next.add(id);
        }
      }
      for (const id of Array.from(next)) {
        if (!currentIds.includes(id)) {
          next.delete(id);
        }
      }
      return next;
    });

    prevCategoryIdsRef.current = currentIds;
  }, [categories]);

  const allSelected = selectedIds.size === categories.length;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(categories.map((category) => category.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name }));
  const visibleAccounts = categories
    .filter((category) => selectedIds.has(category.id))
    .flatMap((category) =>
      category.accounts.map((account) => ({
        account,
        categoryId: category.id,
        categoryName: category.name,
      }))
    );

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          전체
        </label>
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
          >
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={selectedIds.has(category.id)}
                onChange={() => toggleOne(category.id)}
              />
              {category.name}
            </label>
            <CategoryRowActions categoryId={category.id} currentName={category.name} />
          </div>
        ))}
      </div>

      <CreateAccountForm categories={categoryOptions} />

      {visibleAccounts.length === 0 ? (
        <p className="mt-6 text-sm text-muted">표시할 계정이 없습니다.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleAccounts.map(({ account, categoryId, categoryName }) => (
            <AccountCard
              key={account.id}
              account={account}
              categoryId={categoryId}
              categoryName={categoryName}
              categories={categoryOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
