import type { Metadata } from "next";
import { th } from "@/lib/i18n/th";
import { LibraryApp } from "./LibraryApp";

export const metadata: Metadata = { title: `${th.library.title} · ${th.app.name}` };

export default function Page() {
  return (
    <main className="mx-auto max-w-[1240px] px-[max(4vw,16px)] pt-6 pb-16">
      <LibraryApp />
    </main>
  );
}
