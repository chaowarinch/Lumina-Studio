"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FunctionError, listLicenses, listOrders, type License, type Order } from "@/lib/market/api";
import { downloadLicense, prepareStudioImport } from "@/lib/market/downloads";
import { formatBaht } from "@/lib/market/money";
import { th } from "@/lib/i18n/th";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { dateStyle: "medium" });

/** My Downloads: License + ดาวน์โหลด (ลิงก์หมดอายุ 10 นาที) + ใช้ใน Studio และประวัติคำสั่งซื้อ */
export function DownloadsSection() {
  const router = useRouter();
  const [licenses, setLicenses] = useState<License[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listLicenses(), listOrders()])
      .then(([l, o]) => {
        if (!alive) return;
        setLicenses(l);
        setOrders(o);
      })
      .catch(() => alive && setLicenses([]));
    return () => {
      alive = false;
    };
  }, []);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof FunctionError && e.code === "rate_limited" ? th.downloads.rateLimited : th.downloads.linkFail);
    } finally {
      setBusy(null);
    }
  };

  const copy = (key: string) =>
    navigator.clipboard.writeText(key).then(
      () => setMsg(th.downloads.copied),
      () => {},
    );

  return (
    <>
      <h3 id="downloads" className="mt-8 scroll-mt-20">
        {th.library.downloads}
      </h3>
      {msg && (
        <p role="status" className="mb-3 text-ac2">
          {msg}
        </p>
      )}
      {licenses === null ? (
        <Box>{th.library.loading}</Box>
      ) : licenses.length === 0 ? (
        <Box>
          <p className="mb-3">{th.downloads.empty}</p>
          <Link href="/market" className="btn pri inline-flex items-center">
            {th.downloads.browse}
          </Link>
        </Box>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ln bg-pn px-3 py-1.5">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="text-left text-mu">
                <th className="border-b border-ln px-1.5 py-2 font-medium">{th.downloads.product}</th>
                <th className="border-b border-ln px-1.5 py-2 font-medium">{th.downloads.purchased}</th>
                <th className="border-b border-ln px-1.5 py-2 font-medium">{th.downloads.license}</th>
                <th className="border-b border-ln px-1.5 py-2" />
              </tr>
            </thead>
            <tbody>
              {licenses.map((l) => {
                const active = l.status === "active";
                return (
                  <tr key={l.id} className={active ? "" : "opacity-60"}>
                    <td className="border-b border-[#22262c] px-1.5 py-2 font-semibold">{l.title}</td>
                    <td className="border-b border-[#22262c] px-1.5 py-2 whitespace-nowrap">{fmt(l.created_at)}</td>
                    <td className="border-b border-[#22262c] px-1.5 py-2">
                      {active ? (
                        <button
                          className="font-mono text-[13px] text-ok hover:underline"
                          title={th.downloads.copy}
                          onClick={() => void copy(l.license_key)}
                        >
                          {l.license_key}
                        </button>
                      ) : (
                        <span className="text-[13px] text-mu">{th.downloads.revoked}</span>
                      )}
                    </td>
                    <td className="border-b border-[#22262c] px-1.5 py-2 text-right whitespace-nowrap">
                      {active && (
                        <>
                          <button
                            className="btn sm"
                            disabled={busy !== null}
                            onClick={() =>
                              void run(l.id + ":studio", async () => {
                                await prepareStudioImport(l.id, l.title);
                                router.push("/studio");
                              })
                            }
                          >
                            {th.market.useInStudio}
                          </button>{" "}
                          <button
                            className="btn sm"
                            disabled={busy !== null}
                            onClick={() => void run(l.id + ":dl", () => downloadLicense(l.id))}
                          >
                            {th.market.download}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mt-8">{th.downloads.orders}</h3>
      {orders.length === 0 ? (
        <Box>{th.downloads.noOrders}</Box>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ln bg-pn px-3 py-1.5">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="text-left text-mu">
                <th className="border-b border-ln px-1.5 py-2 font-medium">{th.downloads.orderDate}</th>
                <th className="border-b border-ln px-1.5 py-2 font-medium">{th.downloads.orderStatus}</th>
                <th className="border-b border-ln px-1.5 py-2 text-right font-medium">{th.downloads.orderTotal}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="border-b border-[#22262c] px-1.5 py-2">
                    <Link href={`/market/orders/${o.id}`} className="hover:underline">
                      {fmt(o.created_at)}
                    </Link>
                  </td>
                  <td className="border-b border-[#22262c] px-1.5 py-2">{th.checkout.status[o.status]}</td>
                  <td className="border-b border-[#22262c] px-1.5 py-2 text-right tabular-nums">{formatBaht(o.total_satang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-ln p-6 text-center text-mu">{children}</div>;
}
