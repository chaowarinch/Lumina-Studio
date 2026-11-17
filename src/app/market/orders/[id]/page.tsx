import { Suspense } from "react";
import { OrderStatus } from "./OrderStatus";

export default function Page() {
  return (
    <main className="mx-auto max-w-[640px] px-[max(4vw,16px)] pt-10 pb-16">
      <Suspense>
        <OrderStatus />
      </Suspense>
    </main>
  );
}
