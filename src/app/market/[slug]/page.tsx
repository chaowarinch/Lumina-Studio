import { Suspense } from "react";
import { ProductDetail } from "./ProductDetail";

export default function Page() {
  return (
    <main className="mx-auto max-w-[1100px] px-[max(4vw,16px)] pt-6 pb-16">
      <Suspense>
        <ProductDetail />
      </Suspense>
    </main>
  );
}
