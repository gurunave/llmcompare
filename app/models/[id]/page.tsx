import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModelProfile } from "@/components/ModelProfile";
import { MODELS, MODELS_BY_ID } from "@/lib/models";
import { similarModels } from "@/lib/similar";

interface Params {
  params: { id: string };
}

/** One static page per catalog entry — required by the static export. */
export function generateStaticParams() {
  return MODELS.map((m) => ({ id: m.id }));
}

export function generateMetadata({ params }: Params): Metadata {
  const model = MODELS_BY_ID.get(params.id);
  if (!model) return { title: "Model not found — LLM Compare" };

  return {
    title: `${model.name} — LLM Compare`,
    description: `${model.name} from ${model.provider}: context window, pricing, benchmark scores and the closest alternatives by cost and capability.`,
  };
}

export default function ModelPage({ params }: Params) {
  const model = MODELS_BY_ID.get(params.id);
  if (!model) notFound();

  return <ModelProfile model={model} peers={similarModels(model)} />;
}
