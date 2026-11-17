/// <reference lib="deno.ns" />
import { getDeps } from "../_shared/deps.ts";
import { handleOrderSync } from "../_shared/handlers.ts";

Deno.serve(async (req) => handleOrderSync(req, await getDeps()));
