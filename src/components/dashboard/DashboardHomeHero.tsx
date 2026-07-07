import Image from "next/image";
import { Dancing_Script } from "next/font/google";

import { CardLinkButton } from "@/components/ui/CardButton";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { DashboardHomeHeroLoginButton } from "@/components/dashboard/DashboardHomeHeroLoginButton";
import { RAFA_CALL_CHECKOUT_PATH } from "@/lib/auth-ui-events";
import {
  BRAND_HERO_BG_DESKTOP,
  BRAND_HERO_BG_MOBILE,
  BRAND_HERO_FOUNDERS_IMAGE,
  BRAND_LOGO_HORIZONTAL,
  SITE_FOUNDERS,
  SITE_NAME_FULL,
} from "@/lib/site-branding";

const heroScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

const HERO_SERVICES = [
  {
    label: "Vistos",
    icon: (
      <path
        d="M5 4.5h10a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17V6A1.5 1.5 0 0 1 5 4.5Z"
        strokeWidth="1.2"
      />
    ),
  },
  {
    label: "NIF e Documentos",
    icon: (
      <>
        <path d="M6 3.5h8l3 3v11.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" strokeWidth="1.2" />
        <path d="M14 3.5v3.5h3.5" strokeWidth="1.2" />
        <path d="M7.5 12h7M7.5 15h5" strokeWidth="1.2" />
      </>
    ),
  },
  {
    label: "Alojamento",
    icon: (
      <path
        d="M4 10.5 10 5.5l6 5v7.5a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1V10.5Z"
        strokeWidth="1.2"
      />
    ),
  },
  {
    label: "Conta Bancária",
    icon: (
      <>
        <path d="M4 8.5 10 5.5l6 3" strokeWidth="1.2" />
        <path d="M5.5 9.5v7h9v-7" strokeWidth="1.2" />
        <path d="M7.5 12.5h5M7.5 14.5h5" strokeWidth="1.2" />
      </>
    ),
  },
  {
    label: "Apoio na Chegada",
    icon: (
      <>
        <circle cx="7" cy="8.5" r="2" strokeWidth="1.2" />
        <circle cx="13" cy="8.5" r="2" strokeWidth="1.2" />
        <path d="M5.5 15.5c.8-1.6 2-2.5 4.5-2.5s3.7.9 4.5 2.5" strokeWidth="1.2" />
      </>
    ),
  },
] as const;

type Props = {
  className?: string;
};

export function DashboardHomeHero({ className = "" }: Props) {
  return (
    <section
      className={`relative isolate mx-auto w-full overflow-hidden rounded-none shadow-sm max-md:-mx-4 max-md:-mt-16 max-md:w-[calc(100%+2rem)] md:max-w-[1600px] md:rounded-[18px] ${className}`.trim()}
      aria-label={`${SITE_NAME_FULL} — apresentação`}
    >
      <div className="@container relative aspect-[941/1672] w-full md:aspect-[1672/941] lg:max-h-[900px] lg:[container-type:size]">
        <Image
          src={BRAND_HERO_BG_DESKTOP}
          alt=""
          fill
          priority
          sizes="(max-width: 1600px) 100vw, 1600px"
          className="hidden object-cover object-center md:block"
          aria-hidden
        />
        <Image
          src={BRAND_HERO_BG_MOBILE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center md:hidden"
          aria-hidden
        />

        <div className="absolute inset-0 z-10 flex flex-col">
          <div className="animate-dashboard-hero-fade-up flex items-start justify-between gap-4 px-[5%] pt-[4.5%] md:px-[4.5%] md:pt-[5.5%] lg:pt-[4cqh]">
            <Image
              src={BRAND_LOGO_HORIZONTAL}
              alt={SITE_NAME_FULL}
              width={360}
              height={96}
              className="h-auto max-w-full w-[clamp(8.5rem,46vw,11.5rem)] md:w-[clamp(14rem,30vw,24rem)] lg:w-[clamp(18rem,36cqh,32rem)]"
              priority
            />
            <DashboardHomeHeroLoginButton />
          </div>

          <div className="relative z-20 flex min-h-0 flex-1 flex-col justify-end md:h-full md:px-[4.5%]">
            <div className="flex w-full flex-col px-[5%] pb-[5%] md:h-full md:max-w-[60%] md:px-0 md:pb-0">
              <div className="flex flex-col gap-6 md:flex-1 md:justify-center md:gap-5 lg:gap-[clamp(0.75rem,2cqh,2.5rem)]">
                <div className="animate-dashboard-hero-fade-up w-full [animation-delay:120ms]">
                  <h1 className="max-w-[20ch] text-[clamp(1.85rem,6.8vw,3.35rem)] font-semibold leading-[1.08] tracking-tight md:max-w-none md:text-[clamp(1.5rem,1.85vw,2.35rem)] lg:text-[clamp(1.75rem,5.5cqh,2.75rem)]">
                    <span className="block text-brand-accent">Mude para Portugal</span>
                    <span className="block text-white">com ajuda de quem</span>
                    <span className="block text-white">já viveu esse processo.</span>
                  </h1>

                  <p className="mt-4 max-w-[34ch] text-[clamp(0.8rem,2.6vw,1.02rem)] leading-relaxed text-white/95 md:mt-4 md:max-w-none md:text-[clamp(0.75rem,0.85vw,0.92rem)] lg:mt-[clamp(0.75rem,1.5cqh,1.75rem)] lg:text-[clamp(0.85rem,2cqh,1.15rem)]">
                    <span className="mr-2 inline-block align-[-0.15em] text-brand-accent" aria-hidden>
                      <svg viewBox="0 0 24 24" className="h-[1.1em] w-[1.1em]" fill="none">
                        <path
                          d="M12 20.5s-6.5-4.2-6.5-9.2a3.7 3.7 0 0 1 6.5-2.4 3.7 3.7 0 0 1 6.5 2.4c0 5-6.5 9.2-6.5 9.2Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </span>
                    Acompanhamento completo para brasileiros
                    <br className="hidden md:block" />
                    que querem imigrar para Portugal{" "}
                    <span className="text-brand-accent">com tranquilidade.</span>
                  </p>
                </div>

                <div className="animate-dashboard-hero-fade-up w-full [animation-delay:180ms]">
                  <CardLinkButton
                    href={RAFA_CALL_CHECKOUT_PATH}
                    variant="secondary"
                    className="w-full sm:w-auto md:min-h-[42px] md:px-4 md:text-sm lg:min-h-[clamp(42px,6cqh,52px)] lg:px-6 lg:text-[clamp(0.875rem,2cqh,1.125rem)]"
                  >
                    <WhatsappIcon className="h-5 w-5 shrink-0 text-current md:h-4 md:w-4 lg:h-[clamp(1rem,2.5cqh,1.5rem)] lg:w-[clamp(1rem,2.5cqh,1.5rem)]" />
                    Quero falar com as meninas
                  </CardLinkButton>
                </div>
              </div>

              <div className="mt-6 w-full md:mt-0 md:pb-[5%] lg:pb-[4cqh]">
                <ul
                  className="animate-dashboard-hero-fade-up flex w-full max-w-full gap-2 overflow-x-auto pb-1 [animation-delay:220ms] [-ms-overflow-style:none] [scrollbar-width:none] md:gap-0 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden"
                  aria-label="Serviços de relocation"
                >
                  {HERO_SERVICES.map((service, index) => (
                    <li
                      key={service.label}
                      className={`flex min-w-[4.6rem] shrink-0 flex-col items-center gap-1.5 text-center md:min-w-0 md:flex-1 ${
                        index > 0 ? "md:border-l md:border-white/20" : ""
                      } ${service.label === "Apoio na Chegada" ? "max-md:hidden" : ""}`}
                    >
                      <svg
                        viewBox="0 0 20 20"
                        className="h-5 w-5 text-brand-accent md:h-[clamp(1.25rem,1.6vw,1.75rem)] md:w-[clamp(1.25rem,1.6vw,1.75rem)]"
                        fill="none"
                        stroke="currentColor"
                        aria-hidden
                      >
                        {service.icon}
                      </svg>
                      <span className="text-[0.48rem] font-medium uppercase leading-tight tracking-[0.12em] text-white/95 sm:text-[0.55rem] md:text-[clamp(0.55rem,0.7vw,0.75rem)]">
                        {service.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div
          className="animate-dashboard-hero-fade-up pointer-events-none absolute bottom-[5%] right-[4.5%] z-[15] hidden text-white [animation-delay:320ms] md:block lg:bottom-[4cqh]"
        >
          <p className="text-[clamp(0.78rem,2.2vw,0.95rem)] leading-none text-white md:text-[clamp(0.8rem,1vw,1rem)] lg:text-[clamp(0.8rem,1.8cqh,1.1rem)]">
            <span
              className={`${heroScript.className} text-[1.35em] md:text-[clamp(1.15rem,1.35vw,1.65rem)] lg:text-[clamp(1.1rem,2.8cqh,1.75rem)]`}
            >
              {SITE_FOUNDERS}
            </span>
            <span className="mx-2 text-white/70" aria-hidden>
              |
            </span>
            <span className="text-[0.72em] font-medium uppercase tracking-[0.18em]">
              Fundadoras
            </span>
          </p>
        </div>

        <div
          className="pointer-events-none absolute bottom-0 right-[4.5%] z-[5] hidden h-[118%] w-[min(36%,680px)] md:block lg:h-[115%] lg:w-[min(34%,min(36cqw,680px))]"
          aria-hidden
        >
          <div className="animate-dashboard-hero-fade-up absolute inset-x-0 -bottom-[3%] h-full w-full [animation-delay:180ms]">
            <div className="animate-dashboard-hero-float relative mx-auto h-full w-full max-w-[1200px] [animation-delay:1.1s]">
              <Image
                src={BRAND_HERO_FOUNDERS_IMAGE}
                alt=""
                fill
                priority
                sizes="(max-width: 1200px) 36vw, 680px"
                className="object-contain object-bottom"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
