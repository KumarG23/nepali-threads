"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

export function AccountContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/customers/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors — cookie will still clear on the server
    }
    window.dispatchEvent(new Event("nt:auth"));
    router.refresh();
    router.push("/");
  }

  return (
    <Button
      variant="secondary"
      onClick={handleSignOut}
      loading={loading}
      className="w-full sm:w-auto"
    >
      Sign out
    </Button>
  );
}
