/// <reference lib="deno.ns" />
import { getDeps } from "../_shared/deps.ts";
import { handleDownload } from "../_shared/handlers.ts";

Deno.serve(async (req) => handleDownload(req, await getDeps()));
