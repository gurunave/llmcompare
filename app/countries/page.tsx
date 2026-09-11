import type { Metadata } from "next";
import { CountryJourney } from "@/components/CountryJourney";
import { PageHeader } from "@/components/PageHeader";
import { countryOf, journeyOf, standingsOf } from "@/lib/geography";
import { formatMonth } from "@/lib/format";
import { MODELS, catalog } from "@/lib/models";

export const metadata: Metadata = {
  title: "Country journey — LLM Compare",
  description:
    "How each country's hold on the model frontier changed month by month: seats on the running top ten, best published capability index, catalog share, and the releases that moved each country's own record.",
};

const STANDINGS = standingsOf(MODELS, 10);
const JOURNEY = journeyOf(MODELS, 10);
const COUNTRY_COUNT = new Set(MODELS.map((m) => countryOf(m.provider).code)).size;
const FIRST = JOURNEY[0];
const LAST = JOURNEY[JOURNEY.length - 1];

export default function CountriesPage() {
  const leader = STANDINGS[0];

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title="Country journey"
        lead={`${MODELS.length} models from ${COUNTRY_COUNT} countries, replayed from ${
          FIRST ? formatMonth(FIRST.month) : "the first release"
        } to ${
          LAST ? formatMonth(LAST.month) : "now"
        }. Each month re-ranks the catalog as it stood then, so the standings read the way they did at the time rather than in hindsight. ${
          leader
            ? `${leader.country.name} holds ${leader.frontier.length} of the current top ten.`
            : ""
        } A country here is the headquarters of the lab that published the weights — see the notes on the attributions that are arguable. Last reviewed ${formatMonth(
          catalog.meta.lastReviewed.slice(0, 7)
        )}.`}
      />
      <CountryJourney />
    </main>
  );
}
