import {
  DEFAULT_LAYER,
  DEFAULT_SOURCE,
  PRESETS,
  SHAPES,
  VIEW_LABELS,
  VIEW_MODES,
  type MotionOpType,
  type SolumState,
  type ViewMode,
  clamp,
  newId,
  norm,
  setNested,
} from "./schema";
import { applyPreset } from "./schema";

const OP_TYPES: MotionOpType[] = [
  "flow",
  "expansion",
  "explosion",
  "collision",
  "fragmentation",
  "growth",
];

export function runCommand(S: SolumState, raw: string): string {
  const t = norm(raw.trim());
  if (!t) return "";

  if (t === "layer add" || t === "camada+" || t === "camada add") {
    const last = S.layers.at(-1);
    S.layers.push(
      DEFAULT_LAYER({
        id: newId("l"),
        name: `L${S.layers.length + 1} · nova`,
        radius: Math.max(0.12, (last?.radius ?? 1) - 0.22),
        thickness: 0.2,
        density: 0.6,
      }),
    );
    S.selected = { kind: "layer", id: S.layers.at(-1)!.id };
    return "Camada adicionada.";
  }
  if (t === "layer remove" || t === "camada-") {
    S.layers.pop();
    S.selected = { kind: "object", id: "" };
    return "Última camada removida.";
  }
  if (t === "core add" || t === "nucleo+" || t === "fonte+") {
    S.sources.push(
      DEFAULT_SOURCE({
        id: newId("c"),
        name: `CORE ${S.sources.length + 1}`,
        kind: S.sources.length === 0 ? "core" : "subcore",
        radius: 0.22,
        x: 0.15 * S.sources.length,
      }),
    );
    S.selected = { kind: "source", id: S.sources.at(-1)!.id };
    return "Fonte adicionada.";
  }
  if (t === "core remove" || t === "nucleo-") {
    S.sources.pop();
    S.selected = { kind: "object", id: "" };
    return "Última fonte removida.";
  }

  let m = t.match(/^view\s+(.+)$/);
  if (m) {
    const v = m[1]!;
    const byLabel = (Object.entries(VIEW_LABELS) as [ViewMode, string][]).find(
      ([k, l]) => norm(l) === v || k === v,
    );
    if (byLabel && (VIEW_MODES as readonly string[]).includes(byLabel[0])) {
      S.view.mode = byLabel[0];
      return "View: " + VIEW_LABELS[byLabel[0]];
    }
  }

  m = t.match(/^forma\s+(.+)$/);
  if (m) {
    const i = SHAPES.findIndex((x) => norm(x) === m![1]);
    if (i >= 0) {
      S.object.shape = i;
      return "Forma: " + SHAPES[i];
    }
  }

  m = t.match(/^preset\s+(.+)$/);
  if (m) {
    const k = Object.keys(PRESETS).find((x) => norm(x) === m![1]);
    if (k) {
      const next = applyPreset(k);
      Object.assign(S, next);
      return "Preset: " + k;
    }
  }

  m = t.match(/^op add\s+(.+)$/);
  if (m) {
    const ty = OP_TYPES.find((x) => x === m![1] || norm(x) === m![1]);
    if (ty) {
      const id = newId("op");
      S.operators.push({
        id,
        name: ty,
        type: ty,
        enabled: true,
        sourceId: S.sources[0]?.id ?? "",
        pressure: ty === "explosion" ? 4.2 : 1.2,
        dirX: 0,
        dirY: 0,
        dirZ: 0,
        expansion: ty === "expansion" ? 2.4 : 1.4,
        temperatureDelta: 2.2,
        erosion: 0.45,
        fragmentation: ty === "fragmentation" ? 0.6 : 0.2,
        particles: 12000,
        start: 0,
        length: 1,
      });
      S.selected = { kind: "operator", id };
      return "Operador: " + ty;
    }
  }

  m = t.match(/^(?:set\s+)?([a-z0-9_.]+)\s+(-?[\d.]+)$/);
  if (m) {
    const path = m[1]!;
    const aliases: Record<string, string> = {
      density: "volume.density",
      temperature: "volume.temperatureGain",
      emission: "volume.emissionGain",
      absorption: "volume.absorptionGain",
      scale: "object.scale",
    };
    const p = aliases[path] ?? path;
    setNested(S as unknown as Record<string, unknown>, p, Number(m[2]));
    return `${p} = ${m[2]}`;
  }

  if (t === "play") return "__play__";
  if (t === "pause") return "__pause__";

  return "Comandos: set volume.density 12 | layer add | core add | view cutaway | preset casca ignea | op add explosion";
}

export function suggestFromPhrase(phrase: string): string[] {
  const t = norm(phrase);
  if (!t) return [];
  const out: string[] = [];
  if (t.includes("fogo") || t.includes("lava") || t.includes("quente")) {
    out.push("Emission", "Temperature", "Core radius", "Surface transmission");
  }
  if (t.includes("escuro") || t.includes("opaco") || t.includes("velado")) {
    out.push("Absorption (camada externa)", "Density da casca", "Transmission");
  }
  if (t.includes("poeira") || t.includes("particula")) {
    out.push("Atmosphere.dust", "Atmosphere.particulate");
  }
  if (t.includes("explod") || t.includes("estouro")) {
    out.push("op add explosion", "Pressure", "Erosion", "Fragmentation");
  }
  return out;
}

export function clampState(S: SolumState) {
  S.object.scale = clamp(S.object.scale, 0.2, 3);
  S.volume.density = clamp(S.volume.density, 0.1, 40);
  S.view.cut = clamp(S.view.cut, 0.05, 0.95);
}
