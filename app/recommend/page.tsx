"use client";

import { PageHeader } from "@/components/PageHeader";
import { Recommender } from "@/components/Recommender";
import { useSelection } from "@/lib/selection";

export default function RecommendPage() {
  const { ids, toggle } = useSelection();

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:py-8">
      <PageHeader
        title="Find a model"
        lead="Four questions about the work, the budget and where it has to run. Hard constraints filter the catalog; cost and speed preferences shape the ranking."
      />
      <Recommender selected={ids} onToggle={toggle} alwaysOpen />
    </main>
  );
}
