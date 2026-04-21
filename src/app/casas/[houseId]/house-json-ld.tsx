import type { PublicHousePageData } from "@/lib/house-public-server";

type Props = {
  house: PublicHousePageData;
  pageUrl: string;
};

export function HouseJsonLd({ house, pageUrl }: Props) {
  const cityLabel =
    {
      INTERIOR: "Portugal",
      LISBOA: "Lisboa, Portugal",
      PORTO: "Porto, Portugal",
      BRAGA: "Braga, Portugal",
      COIMBRA: "Coimbra, Portugal",
      AVEIRO: "Aveiro, Portugal",
      FARO: "Faro, Portugal",
      ALGARVE: "Algarve, Portugal",
      EVORA: "Évora, Portugal",
      VISEU: "Viseu, Portugal",
    }[house.city] ?? "Portugal";

  const tMatch = /^T([1-5])$/.exec(house.typology);
  const roomCount = tMatch ? Number(tMatch[1]) : undefined;

  const payload = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: house.title,
    description: house.description.slice(0, 8000),
    url: pageUrl,
    ...(roomCount != null ? { numberOfRooms: roomCount } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: cityLabel,
      addressCountry: "PT",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      availability:
        house.status === "AVAILABLE"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: pageUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
