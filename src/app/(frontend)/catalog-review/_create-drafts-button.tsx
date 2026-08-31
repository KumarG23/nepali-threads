"use client";

import Link from "next/link";
import { useState } from "react";

import Button from "@/components/ui/Button";

type ImportResult = {
  created: number;
  preserved: number;
  drafts: number;
  reviewUrl: string;
};

export default function CreateDraftsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createDrafts() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/catalog-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const body = (await response.json()) as Partial<ImportResult> & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "The draft import failed.");
      }
      setResult(body as ImportResult);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The draft import failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button type="button" size="lg" loading={loading} onClick={createDrafts}>
        Create missing review drafts
      </Button>
      <p className="max-w-2xl text-small text-neutral-ink/65">
        This is replay-safe. It only creates missing records whose slugs begin
        with <code>catalog-review-</code>, forces new records to draft with a $0
        placeholder price, and never creates variants or publishes anything.
        Existing review drafts and your edits are preserved.
      </p>
      {error ? (
        <p role="alert" className="text-small font-medium text-brand-red-700">
          {error}
        </p>
      ) : null}
      {result ? (
        <p role="status" className="text-small font-medium text-emerald-800">
          Verified {result.drafts} drafts ({result.created} created, {result.preserved}{" "}
          existing drafts preserved).{" "}
          <Link className="underline" href={result.reviewUrl}>
            Open them in Payload
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
