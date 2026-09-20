"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button variant="outline" className="mt-8 w-full" onClick={() => signOut({ callbackUrl: "/" })}>
      Log out
    </Button>
  );
}
