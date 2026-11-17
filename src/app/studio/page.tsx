import type { Metadata } from "next";
import { th } from "@/lib/i18n/th";
import { StudioLoader } from "./StudioLoader";

export const metadata: Metadata = { title: `${th.nav.studio} · ${th.app.name}` };

export default function StudioPage() {
  return <StudioLoader />;
}
