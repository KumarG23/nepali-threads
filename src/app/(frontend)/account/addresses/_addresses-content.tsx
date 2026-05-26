"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

import type { Customer } from "@/payload-types";

type Address = NonNullable<Customer["addresses"]>[number];

interface AddressesContentProps {
  customerId: number;
  initialAddresses: Address[];
}

export function AddressesContent({
  customerId,
  initialAddresses,
}: AddressesContentProps) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveAddresses(updated: Address[]) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addresses: updated }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(data?.message ?? "Couldn't save your changes.");
      }
      const data = (await response.json()) as {
        doc?: { addresses?: Address[] };
      };
      // Sync to server-returned array so Payload-assigned ids on new
      // entries are reflected locally.
      setAddresses(data.doc?.addresses ?? updated);
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save your changes."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleAdd(newAddress: Address) {
    const updated = [...addresses, newAddress];
    saveAddresses(updated);
  }

  function handleEdit(index: number, updatedAddress: Address) {
    const updated = addresses.map((addr, i) =>
      i === index ? updatedAddress : addr
    );
    saveAddresses(updated);
  }

  function handleDelete(index: number) {
    const updated = addresses.filter((_, i) => i !== index);
    saveAddresses(updated);
  }

  function handleMakeDefault(index: number) {
    const updated = addresses.map((addr, i) => ({
      ...addr,
      isDefault: i === index,
    }));
    saveAddresses(updated);
  }

  return (
    <div className="space-y-6">
      {addresses.length === 0 && !editingId ? (
        <p className="font-sans text-body text-neutral-ink/60">
          No saved addresses yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {addresses.map((addr, i) => (
            <li key={addr.id ?? `idx-${i}`}>
              {editingId === (addr.id ?? `idx-${i}`) ? (
                <AddressForm
                  initial={addr}
                  onSave={(updated) => handleEdit(i, updated)}
                  onCancel={() => setEditingId(null)}
                  loading={loading}
                />
              ) : (
                <AddressCard
                  address={addr}
                  onEdit={() => setEditingId(addr.id ?? `idx-${i}`)}
                  onDelete={() => handleDelete(i)}
                  onMakeDefault={() => handleMakeDefault(i)}
                  loading={loading}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {editingId === "new" ? (
        <AddressForm
          initial={null}
          onSave={(newAddress) => handleAdd(newAddress)}
          onCancel={() => setEditingId(null)}
          loading={loading}
        />
      ) : (
        <Button
          variant="secondary"
          onClick={() => setEditingId("new")}
          disabled={loading}
        >
          + Add address
        </Button>
      )}

      {error && (
        <p className="font-sans text-small text-brand-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  onMakeDefault,
  loading,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onMakeDefault: () => void;
  loading: boolean;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleDeleteClick() {
    if (confirmingDelete) {
      onDelete();
    } else {
      setConfirmingDelete(true);
      setTimeout(() => setConfirmingDelete(false), 3000);
    }
  }

  const typeLabel =
    address.type === "shipping"
      ? "Shipping"
      : address.type === "billing"
        ? "Billing"
        : "Both";

  return (
    <Card variant="bordered" padding="md">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {address.label && (
            <p className="font-sans text-body font-bold text-neutral-ink">
              {address.label}
            </p>
          )}
          <p className="font-sans text-body text-neutral-ink">
            {address.recipientName}
          </p>
          <p className="font-sans text-body text-neutral-ink">
            {address.line1}
          </p>
          {address.line2 && (
            <p className="font-sans text-body text-neutral-ink">
              {address.line2}
            </p>
          )}
          <p className="font-sans text-body text-neutral-ink">
            {address.city}, {address.region} {address.postalCode}
          </p>
          {address.country !== "US" && (
            <p className="font-sans text-body text-neutral-ink">
              {address.country}
            </p>
          )}
          {address.phone && (
            <p className="font-sans text-small text-neutral-ink/70">
              {address.phone}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="neutral" size="sm">
              {typeLabel}
            </Badge>
            {address.isDefault && (
              <Badge variant="accent" size="sm">
                Default
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
            disabled={loading}
          >
            Edit
          </Button>
          {!address.isDefault && (
            <button
              type="button"
              onClick={onMakeDefault}
              disabled={loading}
              className="font-sans text-small text-neutral-ink/60 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded disabled:opacity-50"
            >
              Make default
            </button>
          )}
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={loading}
            className="font-sans text-small text-neutral-ink/60 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded disabled:opacity-50"
          >
            {confirmingDelete ? "Tap again to confirm" : "Delete"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function AddressForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial: Address | null;
  onSave: (address: Address) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<Address>({
    label: initial?.label ?? "",
    recipientName: initial?.recipientName ?? "",
    line1: initial?.line1 ?? "",
    line2: initial?.line2 ?? "",
    city: initial?.city ?? "",
    region: initial?.region ?? "",
    postalCode: initial?.postalCode ?? "",
    country: initial?.country ?? "US",
    phone: initial?.phone ?? "",
    type: initial?.type ?? "both",
    isDefault: initial?.isDefault ?? false,
    id: initial?.id,
  });

  function updateField<K extends keyof Address>(
    field: K,
    value: Address[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  const typeOptions: { value: "shipping" | "billing" | "both"; label: string }[] = [
    { value: "shipping", label: "Shipping" },
    { value: "billing", label: "Billing" },
    { value: "both", label: "Both" },
  ];

  return (
    <Card variant="bordered" padding="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Label"
          type="text"
          value={form.label ?? ""}
          onChange={(e) => updateField("label", e.target.value || undefined)}
          hint="e.g. Home, Office"
        />
        <Input
          label="Recipient name"
          type="text"
          value={form.recipientName}
          onChange={(e) => updateField("recipientName", e.target.value)}
          required
        />
        <Input
          label="Address line 1"
          type="text"
          value={form.line1}
          onChange={(e) => updateField("line1", e.target.value)}
          required
        />
        <Input
          label="Address line 2"
          type="text"
          value={form.line2 ?? ""}
          onChange={(e) => updateField("line2", e.target.value || undefined)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="City"
            type="text"
            value={form.city}
            onChange={(e) => updateField("city", e.target.value)}
            required
          />
          <Input
            label="State / Region"
            type="text"
            value={form.region}
            onChange={(e) => updateField("region", e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="ZIP / Postal code"
            type="text"
            value={form.postalCode}
            onChange={(e) => updateField("postalCode", e.target.value)}
            required
          />
          <Input
            label="Country"
            type="text"
            value={form.country}
            onChange={(e) => updateField("country", e.target.value)}
            required
          />
        </div>
        <Input
          label="Phone"
          type="tel"
          value={form.phone ?? ""}
          onChange={(e) => updateField("phone", e.target.value || undefined)}
        />

        <fieldset className="space-y-2">
          <legend className="font-sans text-small font-medium text-neutral-ink mb-1.5">
            Address type
          </legend>
          <div className="flex flex-wrap gap-4">
            {typeOptions.map((opt) => (
              <label
                key={opt.value}
                className="inline-flex items-center gap-2 font-sans text-body text-neutral-ink cursor-pointer"
              >
                <input
                  type="radio"
                  name="address-type"
                  value={opt.value}
                  checked={form.type === opt.value}
                  onChange={() => updateField("type", opt.value)}
                  className="h-4 w-4 accent-brand-red-600"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="inline-flex items-center gap-2 font-sans text-body text-neutral-ink cursor-pointer">
          <input
            type="checkbox"
            checked={form.isDefault ?? false}
            onChange={(e) => updateField("isDefault", e.target.checked)}
            className="h-4 w-4 accent-brand-red-600"
          />
          Make this my default address
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" loading={loading}>
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
