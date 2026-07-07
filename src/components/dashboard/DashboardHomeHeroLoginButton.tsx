"use client";

import { useAuth } from "@/contexts/AuthContext";
import { openAuthLoginModal } from "@/lib/auth-ui-events";

export function DashboardHomeHeroLoginButton() {
  const { user } = useAuth();

  if (user) return null;

  return (
    <button
      type="button"
      onClick={() => openAuthLoginModal()}
      className="hidden shrink-0 cursor-pointer text-sm font-medium text-white transition-opacity hover:opacity-80 md:block md:text-base lg:text-[clamp(0.875rem,2cqh,1.125rem)]"
    >
      Login
    </button>
  );
}
