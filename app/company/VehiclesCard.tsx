"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil, Plus, Trash2, Truck } from "lucide-react";
import type { CompanyVehicle } from "@/lib/vehicles/vehiclesStore";
import { createVehicleAction, deleteVehicleAction, updateVehicleAction } from "./actions";

const INPUT_CLASS =
  "min-w-0 rounded-md border border-border bg-bg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

/** 회사 차량(트럭 등): 차종 + 차량번호. 차량번호를 누르면 복사된다. */
export function VehiclesCard({ vehicles }: { vehicles: CompanyVehicle[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copy(vehicle: CompanyVehicle) {
    try {
      await navigator.clipboard.writeText(vehicle.plateNumber);
    } catch {
      return;
    }
    setCopiedId(vehicle.id);
    setTimeout(() => setCopiedId((id) => (id === vehicle.id ? null : id)), 1500);
  }

  async function handleDelete(vehicle: CompanyVehicle) {
    if (!window.confirm(`"${vehicle.plateNumber}" 차량을 삭제할까요?`)) return;
    setError(null);
    try {
      await deleteVehicleAction(vehicle.id);
      router.refresh();
    } catch {
      setError("삭제에 실패했습니다.");
    }
  }

  return (
    <section aria-label="회사 차량" className="flex flex-col rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
          <Truck size={17} className="text-muted" />
          회사 차량
          <span className="text-sm font-normal text-muted">{vehicles.length}</span>
        </h2>
        {!isAdding ? (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
            }}
            aria-label="회사 차량 추가"
            title="차량 추가"
            className="rounded-md p-1 text-muted hover:bg-surface-hover hover:text-accent"
          >
            <Plus size={18} />
          </button>
        ) : null}
      </div>

      <ul className="mt-2 flex flex-col divide-y divide-border">
        {vehicles.map((vehicle) =>
          editingId === vehicle.id ? (
            <li key={vehicle.id} className="py-2">
              <VehicleForm
                initial={vehicle}
                submitLabel="저장"
                onCancel={() => setEditingId(null)}
                onSubmit={async (v) => {
                  await updateVehicleAction({ id: vehicle.id, ...v });
                  setEditingId(null);
                  router.refresh();
                }}
              />
            </li>
          ) : (
            <li key={vehicle.id} className="group flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => copy(vehicle)}
                  title="차량번호 복사"
                  className="flex items-center gap-1.5 rounded px-1 text-left text-[0.795rem] font-semibold text-foreground hover:bg-bg"
                >
                  {vehicle.plateNumber}
                  {copiedId === vehicle.id ? (
                    <Check size={14} className="text-accent" />
                  ) : (
                    <Copy size={13} className="text-muted opacity-60" />
                  )}
                </button>
                {vehicle.model ? <p className="px-1 text-sm text-muted">{vehicle.model}</p> : null}
              </div>
              <span className="flex shrink-0 items-center sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(vehicle.id);
                    setIsAdding(false);
                  }}
                  aria-label={`${vehicle.plateNumber} 수정`}
                  title="수정"
                  className="rounded p-1 text-muted hover:bg-bg hover:text-foreground"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(vehicle)}
                  aria-label={`${vehicle.plateNumber} 삭제`}
                  title="삭제"
                  className="rounded p-1 text-danger hover:bg-bg"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          )
        )}
      </ul>

      {vehicles.length === 0 && !isAdding ? (
        <p className="py-3 text-sm text-muted">등록된 차량이 없습니다. + 로 추가하세요.</p>
      ) : null}

      {isAdding ? (
        <div className="mt-2">
          <VehicleForm
            initial={null}
            submitLabel="등록"
            onCancel={() => setIsAdding(false)}
            onSubmit={async (v) => {
              await createVehicleAction(v);
              setIsAdding(false);
              router.refresh();
            }}
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function VehicleForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: CompanyVehicle | null;
  submitLabel: string;
  onSubmit: (values: { model: string; plateNumber: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [model, setModel] = useState(initial?.model ?? "");
  const [plateNumber, setPlateNumber] = useState(initial?.plateNumber ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plateNumber.trim()) return;
    setError(null);
    setIsSaving(true);
    try {
      await onSubmit({ model, plateNumber });
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 rounded-lg border border-accent p-2">
      <div className="grid grid-cols-2 gap-1.5">
        <input
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value)}
          placeholder="차량번호 (예: 12가 3456)"
          aria-label="차량번호"
          autoFocus
          className={INPUT_CLASS}
        />
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="차종 (예: 1톤 포터)"
          aria-label="차종"
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="submit"
          disabled={isSaving || !plateNumber.trim()}
          className="rounded-md bg-accent px-2.5 py-1 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-2.5 py-1 text-sm text-muted">
          취소
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
