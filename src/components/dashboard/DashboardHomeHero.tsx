import Image from "next/image";
import { Dancing_Script } from "next/font/google";

import { FlagPt } from "@/components/CountryFlags";
import { DashboardHomeHeroCta } from "@/components/dashboard/DashboardHomeHeroCta";
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

function HeroFoundersImage({
  className = "",
  sizes,
}: {
  className?: string;
  sizes: string;
}) {
  return (
    <div className={`relative ${className}`.trim()}>
      <Image
        src={BRAND_HERO_FOUNDERS_IMAGE}
        alt=""
        fill
        priority
        sizes={sizes}
        className="object-contain object-bottom"
      />
    </div>
  );
}

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

        <div
          className="pointer-events-none absolute inset-x-0 bottom-[40%] z-[20] h-[52%] md:hidden"
          aria-hidden
        >
          <div className="animate-dashboard-hero-founders-enter absolute bottom-0 left-[20%] z-[10] [animation-delay:300ms]">
            <HeroFoundersImage
              className="h-[clamp(18rem,72vw,25rem)] w-[clamp(13.5rem,54vw,18.5rem)]"
              sizes="72vw"
            />
          </div>

          <div className="dashboard-hero-founders-fade absolute bottom-0 left-1/2 z-[20] h-[min(18rem,85%)] w-screen max-w-none -translate-x-1/2" />
        </div>

        <div className="animate-dashboard-hero-fade-up absolute inset-x-0 top-0 z-[40] px-[5%] pt-[4.5%] md:px-[4.5%] md:pt-[4%] lg:pt-[4cqh]">
            <Image
              src={BRAND_LOGO_HORIZONTAL}
              alt={SITE_NAME_FULL}
              width={360}
              height={96}
              className="h-auto max-w-full w-[clamp(8.5rem,46vw,11.5rem)] md:w-[clamp(14rem,28vw,22rem)] lg:w-[clamp(24rem,44cqh,40rem)]"
              priority
            />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[40] md:inset-0 md:flex md:flex-col md:justify-end md:px-[4.5%] lg:justify-center">
          <div
            className="hidden shrink-0 md:block md:h-[clamp(8rem,22%,12rem)] lg:h-[clamp(6rem,18cqh,11rem)]"
            aria-hidden
          />
          <div className="flex min-h-0 w-full flex-1 flex-col justify-end md:max-w-[60%]">
            <div className="flex w-full flex-col px-[5%] pb-[5%] md:h-full md:px-0 md:pb-0">
              <div className="flex flex-col gap-6 md:flex-1 md:justify-start md:gap-3 md:max-lg:pt-[4%] lg:justify-center lg:gap-[clamp(0.75rem,2cqh,2.5rem)] lg:pt-0 lg:-translate-y-[6%]">
                <div className="animate-dashboard-hero-fade-up relative w-full [animation-delay:120ms]">
                  <h1 className="relative z-10 max-w-[20ch] text-[clamp(1.85rem,6.8vw,3.35rem)] font-semibold leading-[1.08] tracking-tight md:max-w-none md:text-[clamp(1.35rem,1.65vw,1.85rem)] lg:text-[clamp(1.75rem,5.5cqh,2.75rem)]">
                    <span className="block text-brand-accent">
                      Mude para Portugal{" "}
                      <FlagPt
                        className="inline-block h-[0.85em] w-[0.85em] shrink-0 object-contain align-[-0.06em]"
                        alt=""
                        aria-hidden
                      />
                    </span>
                    <span className="block text-white">com ajuda de quem</span>
                    <span className="block text-white">já viveu esse processo.</span>
                  </h1>

                  <p className="mt-4 max-w-[34ch] text-[clamp(0.8rem,2.6vw,1.02rem)] leading-relaxed text-white/95 md:mt-2.5 md:max-w-none md:text-[clamp(0.75rem,0.85vw,0.92rem)] lg:mt-[clamp(0.75rem,1.5cqh,1.75rem)] lg:text-[clamp(0.85rem,2cqh,1.15rem)]">
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
                    {" "}que querem imigrar para Portugal{" "}
                    <span className="text-brand-accent">com tranquilidade.</span>
                  </p>
                </div>

                <div className="animate-dashboard-hero-fade-up w-full [animation-delay:180ms]">
                  <DashboardHomeHeroCta />
                </div>
              </div>

              <div className="mt-6 w-full md:mt-3 md:pb-[4%] lg:mt-0 lg:pb-[4cqh]">
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
          className="dashboard-hero-founders-fade pointer-events-none absolute bottom-0 left-1/2 z-[25] hidden h-[clamp(10rem,24vh,14rem)] w-screen max-w-none -translate-x-1/2 md:block"
          aria-hidden
        />

        <div
          className="animate-dashboard-hero-fade-up pointer-events-none absolute bottom-[5%] right-[4.5%] z-[35] hidden text-white [animation-delay:320ms] md:block lg:bottom-[4cqh]"
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
          className="pointer-events-none absolute bottom-0 right-[10%] z-[15] hidden h-[108%] w-[min(31%,600px)] md:block lg:h-[106%] lg:w-[min(29%,min(32cqw,600px))]"
          aria-hidden
        >
          <div className="animate-dashboard-hero-founders-enter absolute inset-x-0 -bottom-[7%] h-full w-full [animation-delay:420ms]">
            <HeroFoundersImage
              className="mx-auto h-full w-full max-w-[1080px]"
              sizes="(max-width: 1080px) 31vw, 600px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
