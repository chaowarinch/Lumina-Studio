/// <reference lib="deno.ns" />
import { getDeps } from "../_shared/deps.ts";
import { handleCheckout } from "../_shared/handlers.ts";

Deno.serve(async (req) => handleCheckout(req, await getDeps()));
