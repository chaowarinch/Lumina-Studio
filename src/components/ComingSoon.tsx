import Link from "next/link";
import { th } from "@/lib/i18n/th";

export function ComingSoon({ title, body, phase }: { title: string; body: string; phase: string }) {
  return (
    <main className="mx-auto max-w-[1240px] px-[max(4vw,16px)] pt-6 pb-16">
      <div className="mb-4">
        <h2 className="mb-1">{title}</h2>
        <p className="text-mu">{body}</p>
      </div>
      <div className="rounded-xl border border-dashed border-ln p-8 text-center">
        <span className="mb-3 inline-block rounded-full border border-ac px-3 text-sm text-ac2">{th.soon.badge}</span>
        <p className="text-mu">{phase}</p>
        <Link href="/studio" className="btn pri mt-4 inline-flex items-center">
          {th.soon.back}
        </Link>
      </div>
    </main>
  );
}
