"use client";

import { useState } from "react";

import { JobOfferWhatsappInviteModal } from "@/components/job-offers/JobOfferWhatsappInviteModal";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { COMMUNITY_WHATSAPP_NAV_GROUPS } from "@/lib/community-whatsapp-groups";

const linkClassName =
  "brand-sidebar-link mt-0.5 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm";

/** Links dos grupos WhatsApp da comunidade — visíveis para todos os utilizadores. */
export function SidebarWhatsAppGroupLinks() {
  const [jobOffersModalOpen, setJobOffersModalOpen] = useState(false);

  return (
    <>
      <div className="brand-sidebar-divider mt-2 border-t pt-2">
        <p className="brand-sidebar-label px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide">
          Grupos WhatsApp
        </p>
        {COMMUNITY_WHATSAPP_NAV_GROUPS.map((group) =>
          group.opensJobOfferModal ? (
            <button
              key={group.id}
              type="button"
              onClick={() => setJobOffersModalOpen(true)}
              className={linkClassName}
              aria-label={`Escolher grupo WhatsApp: ${group.label}`}
            >
              <WhatsappIcon className="h-5 w-5 shrink-0 text-whatsapp" />
              <span>{group.label}</span>
            </button>
          ) : (
            <a
              key={group.id}
              href={group.href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
              aria-label={`Entrar no grupo WhatsApp: ${group.label}`}
            >
              <WhatsappIcon className="h-5 w-5 shrink-0 text-whatsapp" />
              <span>{group.label}</span>
            </a>
          ),
        )}
      </div>

      <JobOfferWhatsappInviteModal
        open={jobOffersModalOpen}
        onClose={() => setJobOffersModalOpen(false)}
      />
    </>
  );
}
