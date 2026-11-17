import { createRenderer } from "../../src/engine/renderer/renderer";
import { createSurface } from "../../src/engine/project/factory";
(window as unknown as { LUMINA: unknown }).LUMINA = { createRenderer, createSurface };
