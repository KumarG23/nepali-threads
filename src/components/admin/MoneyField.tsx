"use client";
// LOCAL-LLM: DO NOT EDIT
//
// MoneyField is a Payload admin field component that displays and edits a
// number stored as INTEGER CENTS but rendered as USD dollars. Conversion
// happens only in the admin UI — the database value, all API responses,
// and webhook writes work with cents directly (matches Stripe).
//
// Two exports:
//   - default (MoneyField): form input, dollars in / cents out
//   - MoneyCell: list-view cell, renders cents as "$X.XX"

import { FieldLabel, useField } from "@payloadcms/ui";
import type {
  DefaultServerCellComponentProps,
  NumberFieldClientComponent,
} from "payload";
import React, { useEffect, useState } from "react";

const centsToDollarsString = (cents: number | null | undefined): string => {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return "";
  return (cents / 100).toFixed(2);
};

const dollarsStringToCents = (raw: string): number | undefined => {
  if (raw.trim() === "") return undefined;
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) return undefined;
  // Round so 25.555 becomes 2556 cents, not 2555.5.
  return Math.round(parsed * 100);
};

export const MoneyField: NumberFieldClientComponent = (props) => {
  const { path, field, readOnly } = props;
  const { value, setValue, showError, errorMessage } = useField<number>({ path });

  // Local draft string so the user can type "10." without us interpreting
  // it as a complete value and reformatting on every keystroke.
  const [draft, setDraft] = useState<string>(centsToDollarsString(value));

  useEffect(() => {
    // Resync if the upstream value changes (e.g. another field's hook
    // recalculated this one).
    setDraft(centsToDollarsString(value));
  }, [value]);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setDraft(raw);
    setValue(dollarsStringToCents(raw));
  };

  const description = field.admin?.description;

  return (
    <div className={`field-type number${showError ? " error" : ""}`}>
      <FieldLabel label={field.label} required={field.required} />

      <div className="input-wrapper">
        <input
          id={`field-${path}`}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          placeholder="0.00"
          value={draft}
          onChange={onChange}
          disabled={readOnly}
          aria-invalid={showError}
        />
      </div>
      {description && typeof description === "string" && (
        <div className="field-description">{description}</div>
      )}
      {showError && errorMessage && (
        <div className="field-error">{errorMessage}</div>
      )}
    </div>
  );
};

export const MoneyCell: React.FC<DefaultServerCellComponentProps> = ({
  cellData,
}) => {
  if (
    cellData === null ||
    cellData === undefined ||
    typeof cellData !== "number" ||
    Number.isNaN(cellData)
  ) {
    return null;
  }
  return <span>${(cellData / 100).toFixed(2)}</span>;
};

export default MoneyField;
