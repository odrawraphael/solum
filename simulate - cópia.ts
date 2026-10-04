import {
  hexToRgb,
  type FieldName,
  type Layer,
  type LayerRole,
  type SolumState,
  type Source,
  clamp,
  cloneState,
} from "./schema";

export function hash3(x: number, y: number, z: number, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453;
  return n - Math.floor(n);
}

function fade(t: number) {
  return t * t * (3 - 2 * t);
}

export function vnoise(x: number, y: number, z: number, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const fz = fade(z - iz);
  const n000 = hash3(ix, iy, iz, seed);
  const n100 = hash3(ix + 1, iy, iz, seed);
  const n010 = hash3(ix, iy + 1, iz, seed);
  const n110 = hash3(ix + 1, iy + 1, iz, seed);
  const n001 = hash3(ix, iy, iz + 1, seed);
  const n101 = hash3(ix + 1, iy, iz + 1, seed);
  const n011 = hash3(ix, iy + 1, iz + 1, seed);
  const n111 = hash3(ix + 1, iy + 1, iz + 1, seed);
  const nx00 = n000 + (n100 - n000) * fx;
  const nx10 = n010 + (n110 - n010) * fx;
  const nx01 = n001 + (n101 - n001) * fx;
  const nx11 = n011 + (n111 - n011) * fx;
  const nxy0 = nx00 + (nx10 - nx00) * fy;
  const nxy1 = nx01 + (nx11 - nx01) * fy;
  return nxy0 + (nxy1 - nxy0) * fz;
}

export function fbm(x: number, y: number, z: number, oct = 4, seed = 0) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x * f, y * f, z * f, seed + i * 13);
    a *= 0.5;
    f *= 2;
  }
  return s;
}

function boxSDF(x: number, y: number, z: number, hx: number, hy: number, hz: number) {
  const dx = Math.abs(x) - hx;
  const dy = Math.abs(y) - hy;
  const dz = Math.abs(z) - hz;
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  const oz = Math.max(dz, 0);
  return Math.hypot(ox, oy, oz) + Math.min(Math.max(dx, dy, dz), 0);
}

function hexPrism(x: number, y: number, z: number) {
  const kx = Math.abs(x);
  const kz = Math.abs(z);
  const hex = Math.max(kx * 0.866 + kz * 0.5, kz) - 0.78;
  return Math.max(hex, Math.abs(y) - 1);
}

export function shapeSDF(
  x: number,
  y: number,
  z: number,
  shape: number,
  sx: number,
  sy: number,
  sz: number,
) {
  x /= Math.max(0.15, sx);
  y /= Math.max(0.15, sy);
  z /= Math.max(0.15, sz);
  const r = Math.hypot(x, y, z);
  switch (shape) {
    case 1:
      return Math.hypot(x / 1.12, y / 0.78, z / 0.95) - 1;
    case 2:
      return boxSDF(x, y, z, 0.82, 0.82, 0.82);
    case 3:
      return boxSDF(x, y, z, 1.05, 0.62, 0.78);
    case 4:
      return Math.max(Math.hypot(x, z) - 0.72, Math.abs(y) - 1.05);
    case 5: {
      const q = Math.hypot(x, z);
      return Math.max(q * 0.7 + y * 0.55 - 0.55, -y - 1, y - 0.9);
    }
    case 6: {
      const h = 0.9;
      const k = clamp(y / (2 * h) + 0.5, 0, 1);
      return Math.hypot(x, z) - mix(0.55, 0.38, k) + Math.abs(y) * 0.02;
    }
    case 7: {
      const q = Math.hypot(x, z) - 0.78;
      return Math.hypot(q, y) - 0.28;
    }
    case 8:
      return Math.max(Math.hypot(x, z) - 1.15, Math.abs(y) - 0.12);
    case 9: {
      const q = Math.hypot(x, z);
      return Math.max(q + y * 0.65 - 0.55, y - 0.85, -y - 0.95);
    }
    case 10:
      return Math.max(Math.abs(y) - 1, Math.max(Math.abs(x) * 0.866 + z * 0.5, -z) - 0.72);
    case 11:
      return hexPrism(x, y, z);
    case 12:
      return Math.max(x + y + z, x - y - z, -x + y - z, -x - y + z) / 1.732 - 0.55;
    case 13:
      return Math.abs(x) + Math.abs(y) + Math.abs(z) - 1;
    case 14:
      return Math.max(Math.abs(x) + Math.abs(y) * 0.618, Math.abs(y) + Math.abs(z) * 0.618, Math.abs(z) + Math.abs(x) * 0.618) - 0.92;
    case 15:
      return Math.max(Math.abs(x) * 0.577 + Math.abs(y) * 0.577 + Math.abs(z) * 0.577, Math.abs(x), Math.abs(y), Math.abs(z)) - 0.82;
    case 16:
      return Math.min(
        boxSDF(x, y, z, 1.05, 0.22, 0.22),
        boxSDF(x, y, z, 0.22, 1.05, 0.22),
        boxSDF(x, y, z, 0.22, 0.22, 1.05),
      );
    default:
      return r - 1;
  }
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function gauss(x: number, w: number) {
  const d = w + 0.0008;
  return Math.exp(-(x * x) / (d * d));
}

function rotatePoint(x: number, y: number, z: number, rx: number, ry: number, rz: number) {
  const ax = (rx * Math.PI) / 180;
  const ay = (ry * Math.PI) / 180;
  const az = (rz * Math.PI) / 180;
  let y1 = y * Math.cos(ax) - z * Math.sin(ax);
  let z1 = y * Math.sin(ax) + z * Math.cos(ax);
  let x2 = x * Math.cos(ay) + z1 * Math.sin(ay);
  let z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
  const x3 = x2 * Math.cos(az) - y1 * Math.sin(az);
  const y3 = x2 * Math.sin(az) + y1 * Math.cos(az);
  return [x3, y3, z2] as const;
}

export type Sample = {
  density: number;
  temperature: number;
  emission: number;
  absorption: number;
  scattering: number;
  velocity: number;
  pressure: number;
  sdf: number;
  radial: number;
  layerIndex: number;
  cavity: number;
  filament: number;
  emitR: number;
  emitG: number;
  emitB: number;
  nearestSource: number;
};

const EMPTY: Sample = {
  density: 0,
  temperature: 0,
  emission: 0,
  absorption: 0,
  scattering: 0,
  velocity: 0,
  pressure: 0,
  sdf: 9,
  radial: 1,
  layerIndex: -1,
  cavity: 0,
  filament: 0,
  emitR: 0,
  emitG: 0,
  emitB: 0,
  nearestSource: -1,
};

function opEnvelope(S: SolumState, t01: number) {
  let blast = 0;
  let expand = 0;
  let heat = 0;
  let erode = 0;
  let frag = 0;
  for (const op of S.operators) {
    if (!op.enabled) continue;
    const a = op.start;
    const b = Math.min(1, op.start + Math.max(0.02, op.length));
    const u = clamp((t01 - a) / (b - a), 0, 1);
    if (u <= 0) continue;
    const w = u * u * (3 - 2 * u);
    if (op.type === "explosion" || op.type === "fragmentation") {
      blast += op.pressure * w;
      expand += op.expansion * w;
      heat += op.temperatureDelta * w;
      erode += op.erosion * w;
      frag += op.fragmentation * w;
    } else if (op.type === "expansion" || op.type === "growth") {
      expand += op.expansion * w;
    } else if (op.type === "collision") {
      blast += op.pressure * w * 0.6;
      erode += op.erosion * w;
    } else if (op.type === "flow") {
      expand += op.expansion * w * 0.2;
    }
  }
  return { blast, expand, heat, erode, frag };
}

function roleWeight(role: LayerRole, g: number, sdf: number) {
  if (role === "cavity") return -g * 0.85;
  if (role === "membrane") return g * (sdf > -0.08 ? 1.15 : 0.25);
  if (role === "shell") return g * (sdf > -0.18 ? 1.2 : 0.35);
  if (role === "interior") return g * (sdf < 0.05 ? 1.1 : 0.4);
  return g;
}

export function samplePoint(
  S: SolumState,
  x: number,
  y: number,
  z: number,
  time = 0,
  quality: "full" | "fast" = "full",
): Sample {
  const seed = S.meta.seed;
  const sc = S.object.scale;
  const t01 = S.motion.duration > 0 ? (time % S.motion.duration) / S.motion.duration : 0;
  const phase = t01 * Math.PI * 2;
  const env = opEnvelope(S, t01);
  const pulse = 1 + S.motion.pulse * 0.12 * Math.sin(phase);
  const spin = S.motion.spin * phase;
  const cs = Math.cos(spin);
  const sn = Math.sin(spin);
  let px = (x * cs - z * sn) / Math.max(0.12, sc * S.object.scaleX);
  let py = y / Math.max(0.12, sc * S.object.scaleY);
  let pz = (x * sn + z * cs) / Math.max(0.12, sc * S.object.scaleZ);
  [px, py, pz] = rotatePoint(px, py, pz, S.object.rotX, S.object.rotY, S.object.rotZ);

  const grow = 1 + S.motion.expansion * 0.12 * Math.sin(phase) + env.expand * 0.18;
  px /= grow;
  py /= grow;
  pz /= grow;

  const flow = S.motion.flow * 0.08;
  if (flow > 0.001) {
    px += (fbm(px + phase, py, pz, 1, seed) - 0.5) * flow;
    pz += (fbm(px, py, pz + phase, 1, seed + 4) - 0.5) * flow;
  }

  const sf = S.surface;
  const warp = sf.irregularity * 0.28;
  const oct = quality === "fast" ? 1 : 3;
  const wnx = (fbm(px * sf.macroFreq + seed, py * sf.macroFreq, pz * sf.macroFreq, oct, seed) - 0.5) * warp;
  const wny = (fbm(px * sf.macroFreq, py * sf.macroFreq + 4.2, pz * sf.macroFreq, oct, seed + 3) - 0.5) * warp;
  const wnz = (fbm(px * sf.macroFreq, py * sf.macroFreq, pz * sf.macroFreq + 7.1, oct, seed + 7) - 0.5) * warp;
  px += wnx;
  py += wny;
  pz += wnz;

  let sdf = shapeSDF(px, py, pz, S.object.shape, 1, 1, 1);
  const detailN = fbm(px * sf.detailFreq, py * sf.detailFreq, pz * sf.detailFreq, oct, seed + 11);
  sdf += (detailN - 0.5) * sf.detail * 0.12;
  sdf += (vnoise(px * 3.1, py * 1.4, pz * 3.1, seed + 2) - 0.5) * sf.wrinkles * 0.08;

  const cavityN = vnoise(px * sf.cavityFreq, py * sf.cavityFreq, pz * sf.cavityFreq, seed + 21);
  const cavity = Math.max(0, cavityN - (1 - sf.cavities * 0.72)) * sf.cavityDepth;
  sdf -= cavity * 0.35;

  for (const m of S.modifiers) {
    if (!m.enabled) continue;
    const n = vnoise(px * m.frequency, py * m.frequency, pz * m.frequency, m.seed);
    if (m.type === "erosion" || m.type === "displacement") sdf -= (n - 0.35) * m.amount * 0.22;
    if (m.type === "noise") sdf += (n - 0.5) * m.amount * 0.16;
  }
  sdf -= (sf.erosion + env.erode) * 0.12 * (vnoise(px * 4.2, py * 4.2, pz * 4.2, seed + 5) - 0.3);

  const radial = Math.hypot(px, py, pz);
  const out: Sample = { ...EMPTY, sdf, radial, cavity };

  const haloR = 1.05 + S.atmosphere.haloSize * 0.55;
  if (sdf > sf.edge * 2.4 && radial > haloR) return out;

  const V = S.volume;
  const nMacro = vnoise(px * sf.macroFreq * 0.8, py * sf.macroFreq * 0.8, pz * sf.macroFreq * 0.8, seed);
  const base = clamp((1 - radial) * V.radialFalloff + (1 - V.radialFalloff) * 0.5, 0, 1);
  let density = V.density * (0.22 + base * 0.78) * (1 + sf.macroNoise * (nMacro - 0.5) * V.densityContrast);
  density *= clamp(1 - cavity * 1.4, 0.05, 1);
  density *= 1 / (1 + radial * radial * V.radialFalloff * 2.4);

  const shell = Math.exp(-Math.pow(Math.max(radial - (1 - sf.shellWidth), 0) / (sf.shellWidth + 0.001), 2));
  density *= 0.45 + 0.7 * shell;

  let temperature = V.temperatureGain * (0.18 + Math.pow(detailN, Math.max(1, sf.detailSharp * 0.45)) * 0.5);
  let emission = V.emissionGain * (0.08 + (1 - radial) * 0.18);
  let absorption = V.absorptionGain * (0.12 + density * 0.045) + sf.porosity * 0.25;
  let scattering = V.scatteringGain * (0.16 + density * 0.03);
  let pressure = V.pressureGain * density * 0.08;
  let velocity = S.motion.speed * (0.25 + radial * 0.7) + S.motion.expansion * radial + S.motion.turbulence * (nMacro - 0.5);
  let emitR = 0;
  let emitG = 0;
  let emitB = 0;

  let layerIndex = -1;
  let best = 0;
  for (let i = 0; i < S.layers.length; i++) {
    const l = S.layers[i]!;
    const ls = shapeSDF(px, py, pz, l.shape, 1, 1, 1);
    const g0 = gauss(ls - (l.radius - 1), l.thickness);
    const g = Math.abs(roleWeight(l.role, g0, ls));
    const signed = roleWeight(l.role, g0, ls);
    if (g > best) {
      best = g;
      layerIndex = i;
    }
    if (l.role === "cavity") {
      density *= clamp(1 - g0 * 0.85, 0.08, 1);
      absorption -= g0 * l.absorption * 0.2;
    } else {
      const block = 1.15 - l.transmission * 0.55;
      density += signed * l.density * V.density * 0.12;
      temperature += g * l.temperature;
      emission += g * l.emission;
      absorption += g * l.absorption * 0.55 * block;
      scattering += g * l.scattering * 0.45;
      if (l.tint) {
        const col = hexToRgb(l.tint);
        const k = g * 0.35;
        emitR += k * col[0] * (0.2 + l.emission);
        emitG += k * col[1] * (0.2 + l.emission);
        emitB += k * col[2] * (0.2 + l.emission);
      }
    }
  }
  out.layerIndex = layerIndex;

  const filament =
    Math.pow(1 - Math.abs(vnoise(px * sf.filamentScale, py * sf.filamentScale * 0.4, pz * sf.filamentScale, seed + 30) - 0.5) * 2, 4) *
    sf.filaments;
  emission += filament * 1.6;
  density += filament * 0.35;
  out.filament = filament;

  const mass = Math.max(0, vnoise(px * sf.massScale, py * sf.massScale, pz * sf.massScale, seed + 40) - 0.55) * sf.masses;
  density += mass * 4;
  absorption += mass * 0.4;

  let nearest = -1;
  let nearestD = 9;
  for (let si = 0; si < S.sources.length; si++) {
    const src = S.sources[si]!;
    const dx = px - src.x;
    const dy = py - src.y;
    const dz = pz - src.z;
    const d = Math.hypot(dx, dy, dz);
    if (d < nearestD) {
      nearestD = d;
      nearest = si;
    }
    let kd = Math.exp(-Math.pow(d / (src.radius * src.reach + 0.0001), src.falloff));
    const dirLen = Math.hypot(src.dirX, src.dirY, src.dirZ);
    if (src.cone > 0.01 && dirLen > 0.01 && d > 1e-4) {
      const align = (dx * src.dirX + dy * src.dirY + dz * src.dirZ) / (d * dirLen);
      kd *= Math.pow(Math.max(0, align), 1 + src.cone * 6);
    }
    if (src.kind === "external") kd *= 0.65;
    const pulseS = 1 + src.pulse * 0.2 * Math.sin(phase + src.radius);
    const power = kd * src.emission * src.temperature * 0.35 * pulseS;
    emission += power;
    temperature += kd * src.temperature * 0.45 * pulseS;
    absorption += kd * src.absorption;
    scattering += kd * src.scattering;
    pressure += kd * src.temperature * 0.2;
    const col = hexToRgb(src.color || S.colors.core);
    emitR += power * col[0];
    emitG += power * col[1];
    emitB += power * col[2];
  }
  out.nearestSource = nearest;

  for (const m of S.modifiers) {
    if (!m.enabled) continue;
    const n = vnoise(px * m.frequency, py * m.frequency, pz * m.frequency, m.seed);
    if (m.type === "turbulence" || m.type === "flow") {
      velocity += (n - 0.5) * m.amount;
      if (m.target.startsWith("field:emission") || m.target === "volume") emission += n * m.amount * 0.4;
    }
    if (m.type === "growth") density += n * m.amount * 0.6;
  }

  temperature += env.heat * (1 - radial) * 0.6;
  emission += env.blast * (1 - radial) * 0.25;
  density *= clamp(1 - env.erode * shell * 0.7, 0.15, 1);
  density *= clamp(1 - env.frag * cavity * 0.8, 0.2, 1);
  pressure += env.blast * (1 - radial);
  velocity += env.expand * radial + env.blast * radial * 0.6;

  if (sdf > sf.edge) {
    const fall = Math.exp(-sdf * (3.2 + (1 - S.atmosphere.halo) * 4));
    density *= fall * (0.15 + S.atmosphere.halo * 0.5 + S.atmosphere.smoke * 0.4);
    emission *= fall * 0.55;
    emitR *= fall;
    emitG *= fall;
    emitB *= fall;
    absorption *= fall;
  }

  density = Math.max(0, density * pulse);
  if (density < 0.02 && sdf > 0.2) return { ...EMPTY, sdf, radial, cavity };

  const fallback = hexToRgb(S.colors.core);
  if (emitR + emitG + emitB < 0.02) {
    emitR = fallback[0] * emission * 0.35;
    emitG = fallback[1] * emission * 0.35;
    emitB = fallback[2] * emission * 0.35;
  }

  out.density = density;
  out.temperature = Math.max(0, temperature);
  out.emission = Math.max(0, emission);
  out.absorption = Math.max(0, absorption);
  out.scattering = Math.max(0, scattering);
  out.velocity = velocity;
  out.pressure = Math.max(0, pressure);
  out.emitR = emitR;
  out.emitG = emitG;
  out.emitB = emitB;
  return out;
}

export type LightStep = {
  layer: Layer;
  rho: number;
  absorb: number;
  scatter: number;
  tau: number;
  pass: number;
  cum: number;
};

export type LightModel = {
  coreI: number;
  layers: LightStep[];
  out: number;
  sourcePower: { source: Source; power: number }[];
};

export function derivedLight(S: SolumState): LightModel {
  const sourcePower = S.sources.map((c) => ({
    source: c,
    power: Math.max(0.001, c.emission * c.temperature),
  }));
  const coreI =
    sourcePower.reduce((a, x) => a + x.power, 0) * S.volume.emissionGain * S.light.keyStrength;
  const layers = [...S.layers].sort((a, b) => a.radius - b.radius);
  let T = 1;
  const acc: LightStep[] = [];
  for (const l of layers) {
    const rho = l.density * (0.35 + Math.min(12, S.volume.density) * 0.04);
    const absorb = l.absorption * (0.45 + S.volume.absorptionGain * 0.35);
    const scatter = l.scattering * (0.4 + S.volume.scatteringGain * 0.3);
    const cavityMul = l.role === "cavity" ? 0.35 : 1;
    const tau = (absorb + scatter * 0.35) * rho * l.thickness * (1.35 - l.transmission * 0.5) * cavityMul;
    const pass = Math.exp(-tau);
    T *= pass;
    acc.push({ layer: l, rho, absorb, scatter, tau, pass, cum: T });
  }
  return { coreI, layers: acc, out: T, sourcePower };
}

export function fieldAtRadius(S: SolumState, mode: FieldName, r: number) {
  const p = samplePoint(S, r, 0, 0, 0, "fast");
  return p[mode];
}

export function layerInfluence(S: SolumState, layerId: string) {
  const M = derivedLight(S);
  const step = M.layers.find((x) => x.layer.id === layerId);
  const layer = S.layers.find((l) => l.id === layerId);
  if (!layer || !step) return null;
  const influences = S.sources.map((src) => {
    const d = Math.hypot(src.x, src.y, src.z);
    const reach = Math.exp(-Math.pow(Math.abs(layer.radius - d) / (src.radius * src.reach + 0.001), src.falloff));
    return {
      name: src.name,
      kind: src.kind,
      contribution: src.emission * src.temperature * reach * step.pass,
    };
  });
  return { layer, step, influences };
}

export function sourceThroughLayers(S: SolumState, sourceId: string) {
  const src = S.sources.find((s) => s.id === sourceId);
  if (!src) return null;
  const M = derivedLight(S);
  return {
    source: src,
    power: src.emission * src.temperature,
    remaining: M.out * src.emission * src.temperature,
    steps: M.layers,
  };
}

export function whatIfLayer(S: SolumState, layerId: string, patch: Partial<Layer>) {
  const next = cloneState(S);
  const l = next.layers.find((x) => x.id === layerId);
  if (!l) return null;
  Object.assign(l, patch);
  const now = derivedLight(S);
  const then = derivedLight(next);
  return { now: now.out, next: then.out, delta: then.out - now.out };
}

export function describeCause(S: SolumState): string[] {
  const M = derivedLight(S);
  const lines: string[] = [];
  const outer = M.layers.at(-1);
  if (outer && outer.pass < 0.35) {
    lines.push(`${outer.layer.name} bloqueia ${(100 - outer.pass * 100).toFixed(0)}% da luz que chega nela (τ ${outer.tau.toFixed(2)}).`);
  }
  if (M.out < 0.08) lines.push("O núcleo está velado: quase nada da emissão atravessa até a superfície.");
  else if (M.out > 0.55) lines.push("O núcleo está exposto: a maior parte da emissão chega à superfície.");
  else lines.push(`Transmissão acumulada ${(M.out * 100).toFixed(0)}% — o brilho interno ainda vaza, mas filtrado.`);
  const cavities = S.surface.cavities;
  if (cavities > 0.25) lines.push("Cavidades abrem caminhos na casca: a luz encontra frestas mesmo com absorção alta.");
  if (S.surface.filaments > 0.3) lines.push("Filamentos carregam emissão até a superfície, independentes da casca.");
  return lines;
}
