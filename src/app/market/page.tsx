import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { th } from "@/lib/i18n/th";

export const metadata: Metadata = { title: `${th.soon.market.title} · ${th.app.name}` };

export default function Page() {
  return <ComingSoon {...th.soon.market} />;
}
