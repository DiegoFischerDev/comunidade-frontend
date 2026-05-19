import type { PublicHousePageData } from "@/lib/house-public-server";
import { absoluteMediaUrlForOg } from "@/lib/house-public-server";
import { relocationCitySchemaLocality } from "@/lib/relocation-portugal-cities";

type Props = {
  house: PublicHousePageData;
  pageUrl: string;
};

export function HouseJsonLd({ house, pageUrl }: Props) {
  const cityLabel = relocationCitySchemaLocality(house.city);

  const tMatch = /^T([0-5])$/.exec(house.typology);
  const roomCount = tMatch ? Number(tMatch[1]) : undefined;

  const primaryImage = absoluteMediaUrlForOg(house.coverImageUrl ?? house.imageUrls?.[0]);

  const isActive =
    house.publicationStatus === "PUBLISHED" &&
    house.publishedUntil &&
    new Date(house.publishedUntil) > new Date();

  const payload = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: house.title,
    description: house.description.slice(0, 8000),
    url: pageUrl,
    ...(primaryImage ? { image: primaryImage } : {}),
    ...(roomCount != null ? { numberOfRooms: roomCount } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: cityLabel,
      addressCountry: "PT",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      availability: isActive
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
