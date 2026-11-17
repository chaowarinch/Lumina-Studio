"use client";

import { useEffect } from "react";
import { startMarketSync } from "@/lib/market/store";

export function MarketBootstrap() {
  useEffect(() => startMarketSync(), []);
  return null;
}
