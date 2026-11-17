/// <reference lib="deno.ns" />
import { getDeps } from "../_shared/deps.ts";
import { handleWebhook } from "../_shared/handlers.ts";

Deno.serve(async (req) => handleWebhook(req, await getDeps()));
