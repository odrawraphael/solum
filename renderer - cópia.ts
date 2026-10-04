import { hexToRgb, type SolumState, type ViewMode } from "@/lib/solum/schema";
import { derivedLight, hash3, samplePoint, type Sample } from "@/lib/solum/simulate";

export type Cam = { yaw: number; pitch: number; zoom: number; time: number };

let offscreen: HTMLCanvasElement | null = null;

export function rot(px: number, py: number, pz: number, yaw: number, pitch: number) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = px * cy + pz * sy;
  const z1 = -px * sy + pz * cy;
  const y1 = py * cp - z1 * sp;
  const z2 = py * sp + z1 * cp;
  return [x1, y1, z2] as const;
}

export function invRot(x1: number, y1: number, z2: number, yaw: number, pitch: number) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const py = y1 * cp + z2 * sp;
  const z1 = -y1 * sp + z2 * cp;
  const px = x1 * cy - z1 * sy;
  const pz = x1 * sy + z1 * cy;
  return [px, py, pz] as const;
}

function cmap(mode: ViewMode, t: number): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  if (mode === "density") return [0.04 + u * 0.92, 0.03 + u * 0.82, 0.04 + u * 0.62];
  if (mode === "temperature") return [0.05 + u * 0.95, 0.08 + u * 0.12, 0.16 * (1 - u)];
  if (mode === "emission") return [0.05 + u * 0.95, 0.02 + u * 0.42, 0.02 + u * 0.05];
  if (mode === "absorption") return [0.08 + u * 0.72, 0.16 * (1 - u) + u * 0.2, 0.32 + u * 0.05];
  if (mode === "light") return [0.08 + u * 0.92, 0.05 + u * 0.72, 0.02 + u * 0.22];
  return [u, u * 0.85, u * 0.7];
}

function shade(
  S: SolumState,
  mode: ViewMode,
  s: Sample,
  crust: [number, number, number],
  lava: [number, number, number],
  core: [number, number, number],
  absC: [number, number, number],
): [number, number, number, number] {
  if (s.density < 0.04 && s.sdf > 0.12) return [0, 0, 0, 0];
  if (mode === "density" || mode === "temperature" || mode === "emission" || mode === "absorption") {
    const maxv = mode === "density" ? Math.max(8, S.volume.density * 1.6) : mode === "temperature" ? 8 : 6;
    const t = Math.max(0, Math.min(1, s[mode] / maxv));
    const c = cmap(mode, t);
    const a = Math.min(1, 0.18 + s.density * 0.08 + t * 0.55);
    return [c[0], c[1], c[2], a];
  }
  const heat = Math.max(0, Math.min(1, s.temperature / 6));
  const em = Math.max(0, Math.min(2.2, s.emission * 0.55));
  const crack = Math.min(1, s.cavity * 2.2 + s.filament * 1.4);
  const crustAmt = Math.max(
    0,
    Math.min(1, 0.18 + s.sdf * 4.2 + (s.radial > 0.72 ? 0.42 : 0) - heat * 0.62 - crack * 1.9),
  );
  const glowR = s.emitR || core[0] * em;
  const glowG = s.emitG || core[1] * em;
  const glowB = s.emitB || core[2] * em;
  const r = crust[0] * crustAmt + lava[0] * (1 - crustAmt) * (0.4 + heat) + glowR * (1 - crustAmt * 0.55);
  const g = crust[1] * crustAmt + lava[1] * (1 - crustAmt) * (0.4 + heat) + glowG * (1 - crustAmt * 0.55);
  const b = crust[2] * crustAmt + lava[2] * (1 - crustAmt) * (0.3 + heat * 0.4) + glowB * 0.55;
  const absK = Math.min(1, s.absorption * 0.18);
  const rim = Math.max(0, 1 - Math.abs(s.sdf) * 8) * 0.18 * (1 - crustAmt * 0.4);
  return [
    r * (1 - absK) + absC[0] * absK * 0.22 + lava[0] * rim,
    g * (1 - absK) + absC[1] * absK * 0.22 + lava[1] * rim * 0.7,
    b * (1 - absK) + absC[2] * absK * 0.22 + lava[2] * rim * 0.4,
    Math.min(0.96, 0.1 + s.density * 0.05 + em * 0.24 + (1 - crustAmt) * 0.14 + crack * 0.12),
  ];
}

function raySphere(rox: number, roy: number, roz: number, dx: number, dy: number, dz: number, r: number) {
  const b = rox * dx + roy * dy + roz * dz;
  const c = rox * rox + roy * roy + roz * roz - r * r;
  const h = b * b - c;
  if (h < 0) return null;
  const s = Math.sqrt(h);
  return [-b - s, -b + s] as const;
}

function qualityParams(S: SolumState, quality: "drag" | "preview" | "idle") {
  const bonus = Math.round(S.light.raySteps / 32);
  if (quality === "idle") return { scale: 0.58, steps: 40 + bonus };
  if (quality === "preview") return { scale: 0.4, steps: 26 };
  return { scale: 0.26, steps: 14 };
}

function cutValue(
  px: number,
  py: number,
  pz: number,
  yaw: number,
  pitch: number,
  axis: SolumState["view"]["cutAxis"],
) {
  if (axis === "X") return px;
  if (axis === "Y") return py;
  if (axis === "Z") return pz;
  const [cx] = invRot(px, py, pz, yaw, pitch);
  return cx;
}


export function renderVolume(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  S: SolumState,
  cam: Cam,
  quality: "drag" | "preview" | "idle",
) {
  const { scale, steps } = qualityParams(S, quality);
  const w = Math.max(80, Math.floor(W * scale));
  const h = Math.max(50, Math.floor(H * scale));
  const img = ctx.createImageData(w, h);
  const data = img.data;
  const yaw = cam.yaw;
  const pitch = cam.pitch;
  const zoom = cam.zoom;
  const time = cam.time;
  const mode = S.view.mode;
  const crust = hexToRgb(S.colors.foreground);
  const lava = hexToRgb(S.colors.background);
  const core = hexToRgb(S.colors.core);
  const absC = hexToRgb(S.colors.absorption);
  const scatter = hexToRgb(S.colors.scatter);
  const aspect = w / h;
  const light = derivedLight(S);
  const glowBoost = 0.55 + light.out * 0.9;
  const bound = 1.65 + S.atmosphere.haloSize * 0.35;
  const cutX = (S.view.cut * 2 - 1) * 1.15;
  const cutAxis = S.view.cutAxis ?? "cam";
  const selectedLayer = S.selected.kind === "layer" ? S.layers.findIndex((l) => l.id === S.selected.id) : -1;


  for (let y = 0; y < h; y++) {
    const uy = (1 - (y + 0.5) / h) * 2 - 1;
    for (let x = 0; x < w; x++) {
      const ux = ((x + 0.5) / w) * 2 - 1;
      const rd0x = ux * aspect * 0.95;
      const rd0y = uy * 0.95;
      const rd0z = -1.35;
      const inv = 1 / Math.hypot(rd0x, rd0y, rd0z);
      const rdx = rd0x * inv;
      const rdy = rd0y * inv;
      const rdz = rd0z * inv;
      const [rox, roy, roz] = rot(0, 0, 2.55 / zoom, yaw, pitch);
      const [dx, dy, dz] = rot(rdx, rdy, rdz, yaw, pitch);

      let T = 1;
      let cr = 0.028;
      let cg = 0.026;
      let cb = 0.024;

      const hit = raySphere(rox, roy, roz, dx, dy, dz, bound);
      if (!hit) {
        if (S.atmosphere.halo > 0.02) {
          const hx = ux * aspect;
          const hy = uy;
          const hr = Math.hypot(hx, hy);
          const halo = Math.exp(-hr * hr * (2.2 / (S.atmosphere.haloSize + 0.2))) * S.atmosphere.halo * 0.22;
          cr += core[0] * halo;
          cg += core[1] * halo * 0.7;
          cb += core[2] * halo * 0.35;
        }
      } else if (mode === "slice") {
        const axis = S.view.sliceAxis;
        const t0 = Math.max(0.05, hit[0]);
        const t1 = hit[1];
        const dt = Math.max(0.03, (t1 - t0) / 18);
        for (let t = t0; t < t1 && T > 0.04; t += dt) {
          const px = rox + dx * t;
          const py = roy + dy * t;
          const pz = roz + dz * t;
          const slab = axis === "X" ? Math.abs(px) : axis === "Y" ? Math.abs(py) : Math.abs(pz);
          if (slab > 0.055) continue;
          const samp = samplePoint(S, px, py, pz, time, "fast");
          const [r, g, b, a] = shade(S, "density", samp, crust, lava, core, absC);
          cr = cr * (1 - a) + r * a;
          cg = cg * (1 - a) + g * a;
          cb = cb * (1 - a) + b * a;
        }
      } else {
        const t0 = Math.max(0.05, hit[0]);
        const t1 = hit[1];
        const dt = Math.max(0.024, (t1 - t0) / steps);
        let t = t0;
        for (let i = 0; i < steps && T > 0.03 && t < t1; i++) {
          const px = rox + dx * t;
          const py = roy + dy * t;
          const pz = roz + dz * t;
          t += dt;
          const cval = cutValue(px, py, pz, yaw, pitch, cutAxis);
          if (mode === "cutaway" && cval > cutX) continue;
          const onFace = mode === "cutaway" && cval > cutX - 0.07;
          const samp = samplePoint(S, px, py, pz, time, "fast");
          const shadeMode: ViewMode = mode === "light" ? "structure" : mode;
          const [r, g, b, a0] = shade(S, shadeMode, samp, crust, lava, core, absC);
          if (a0 <= 0 && !onFace) continue;
          if (onFace && samp.sdf > 0.14 && samp.density < 0.08) continue;
          const tau = (samp.absorption * 0.55 + samp.scattering * 0.18 + samp.density * 0.02) * dt * 1.8;
          const emit = mode === "light" ? samp.emission * glowBoost * 1.4 : samp.emission;
          let a = Math.min(0.85, a0);
          if (onFace) {
            a = Math.min(0.98, 0.62 + samp.density * 0.06 + samp.emission * 0.18 + (samp.sdf < 0 ? 0.2 : 0));
          }
          if (selectedLayer >= 0 && samp.layerIndex === selectedLayer) a = Math.min(0.95, a + 0.12);
          const layer = samp.layerIndex >= 0 ? S.layers[samp.layerIndex] : null;
          const tint = layer?.tint ? hexToRgb(layer.tint) : null;
          const glowR = samp.emitR || core[0] * emit;
          const glowG = samp.emitG || core[1] * emit;
          const glowB = samp.emitB || core[2] * emit;
          const tr = tint && onFace ? tint[0] * 0.62 + r * 0.38 : r;
          const tg = tint && onFace ? tint[1] * 0.62 + g * 0.38 : g;
          const tb = tint && onFace ? tint[2] * 0.62 + b * 0.38 : b;
          cr += T * (tr * 0.52 + glowR * 0.55) * a + T * scatter[0] * samp.scattering * 0.045;
          cg += T * (tg * 0.52 + glowG * 0.42) * a + T * scatter[1] * samp.scattering * 0.045;
          cb += T * (tb * 0.48 + glowB * 0.32) * a + T * scatter[2] * samp.scattering * 0.055;
          T *= Math.exp(-Math.max(0.02, onFace ? tau * 2.8 : tau));
        }
      }

      if (S.atmosphere.halo > 0.02) {
        const hx = ux * aspect;
        const hy = uy;
        const hr = Math.hypot(hx, hy);
        const halo = Math.exp(-hr * hr * (2.2 / (S.atmosphere.haloSize + 0.2))) * S.atmosphere.halo * 0.22 * (0.4 + light.out);
        cr += core[0] * halo;
        cg += core[1] * halo * 0.7;
        cb += core[2] * halo * 0.35;
      }

      const o = (y * w + x) * 4;
      data[o] = Math.max(0, Math.min(255, cr * 255));
      data[o + 1] = Math.max(0, Math.min(255, cg * 255));
      data[o + 2] = Math.max(0, Math.min(255, cb * 255));
      data[o + 3] = 255;
    }
  }

  if (!offscreen) offscreen = document.createElement("canvas");
  offscreen.width = w;
  offscreen.height = h;
  const octx = offscreen.getContext("2d");
  if (!octx) return;
  octx.putImageData(img, 0, 0);
  ctx.fillStyle = "#090909";
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(offscreen, 0, 0, W, H);

  drawDust(ctx, W, H, S, cam);
  if (mode === "structure" || mode === "light" || mode === "cutaway") drawGuides(ctx, W, H, S, cam);
  drawAxes(ctx, W, H, S);
}

export type PickHit = {
  x: number;
  y: number;
  z: number;
  sample: Sample;
  layerId: string | null;
  sourceId: string | null;
};

export function pickVolume(
  mx: number,
  my: number,
  W: number,
  H: number,
  S: SolumState,
  cam: Cam,
): PickHit | null {
  const ux = (mx / W) * 2 - 1;
  const uy = (1 - my / H) * 2 - 1;
  const aspect = W / H;
  const rd0x = ux * aspect * 0.95;
  const rd0y = uy * 0.95;
  const rd0z = -1.35;
  const inv = 1 / Math.hypot(rd0x, rd0y, rd0z);
  const [rox, roy, roz] = rot(0, 0, 2.55 / cam.zoom, cam.yaw, cam.pitch);
  const [dx, dy, dz] = rot(rd0x * inv, rd0y * inv, rd0z * inv, cam.yaw, cam.pitch);
  const hit = raySphere(rox, roy, roz, dx, dy, dz, 1.7);
  if (!hit) return null;
  const t0 = Math.max(0.05, hit[0]);
  const t1 = hit[1];
  const dt = 0.04;
  const cutX = (S.view.cut * 2 - 1) * 1.15;
  const cutAxis = S.view.cutAxis ?? "cam";
  for (let t = t0; t < t1; t += dt) {
    const px = rox + dx * t;
    const py = roy + dy * t;
    const pz = roz + dz * t;
    if (S.view.mode === "cutaway" && cutValue(px, py, pz, cam.yaw, cam.pitch, cutAxis) > cutX) continue;
    const samp = samplePoint(S, px, py, pz, cam.time, "fast");
    if (samp.density < 0.12 && samp.emission < 0.08) continue;
    const layer = samp.layerIndex >= 0 ? S.layers[samp.layerIndex] : null;
    const source = samp.nearestSource >= 0 ? S.sources[samp.nearestSource] : null;
    const sourceHit = source && Math.hypot(px - source.x, py - source.y, pz - source.z) < source.radius * 1.15;
    return {
      x: px,
      y: py,
      z: pz,
      sample: samp,
      layerId: layer?.id ?? null,
      sourceId: sourceHit ? source!.id : null,
    };
  }
  return null;
}

function drawDust(ctx: CanvasRenderingContext2D, W: number, H: number, S: SolumState, cam: Cam) {
  const n = Math.min(220, Math.floor(S.atmosphere.dust / 90) + Math.floor(S.atmosphere.fragments * 90));
  if (n <= 0) return;
  const cx = W * 0.5;
  const cy = H * 0.52;
  const k = 170 * cam.zoom;
  const core = hexToRgb(S.colors.core);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = hash3(i, 2.1, S.meta.seed);
    const b = hash3(i, 5.7, S.meta.seed + 3);
    const c = hash3(i, 9.2, S.meta.seed + 7);
    const x = (a - 0.5) * 2.4;
    const y = (b - 0.5) * 2.2;
    const z = (c - 0.5) * 2.4;
    const [rx, ry, rz] = rot(x, y, z, cam.yaw, cam.pitch);
    if (rz > 0.9) continue;
    const size = (0.6 + hash3(i, 1.1, 4) * 2.2) * (0.7 + S.atmosphere.dustSize * 40);
    const spark = hash3(i, 8.2, S.meta.seed) * S.atmosphere.particulate;
    const alpha = 0.08 + S.atmosphere.particulate * 0.18 + spark * 0.15;
    ctx.fillStyle = spark > 0.72
      ? `rgba(${Math.round(core[0] * 255)},${Math.round(core[1] * 180)},${Math.round(core[2] * 80)},${alpha + 0.15})`
      : `rgba(255, 210, 160, ${alpha})`;
    ctx.beginPath();
    ctx.arc(cx + rx * k, cy - ry * k, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGuides(ctx: CanvasRenderingContext2D, W: number, H: number, S: SolumState, cam: Cam) {
  const cx = W * 0.5;
  const cy = H * 0.52;
  const k = 170 * cam.zoom;
  ctx.save();
  const sorted = [...S.layers].sort((a, b) => b.radius - a.radius);
  sorted.forEach((l, i) => {
    const sel = S.selected.kind === "layer" && S.selected.id === l.id;
    const [rx] = rot(l.radius, 0, 0, cam.yaw, cam.pitch);
    const ry = l.radius * 0.72;
    ctx.strokeStyle = sel ? "rgba(217,107,67,0.85)" : `rgba(236,231,222,${0.12 + i * 0.04})`;
    ctx.lineWidth = sel ? 2 : 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.abs(rx) * k + 8, ry * k + 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  for (const src of S.sources) {
    const [sx, sy] = rot(src.x, src.y, src.z, cam.yaw, cam.pitch);
    const col = hexToRgb(src.color || S.colors.core);
    const sel = S.selected.kind === "source" && S.selected.id === src.id;
    ctx.fillStyle = `rgba(${Math.round(col[0] * 255)},${Math.round(col[1] * 255)},${Math.round(col[2] * 255)},${sel ? 0.95 : 0.7})`;
    ctx.beginPath();
    ctx.arc(cx + sx * k, cy - sy * k, Math.max(4, src.radius * k * 0.22), 0, Math.PI * 2);
    ctx.fill();
    const dirLen = Math.hypot(src.dirX, src.dirY, src.dirZ);
    if (src.cone > 0.02 && dirLen > 0.04) {
      const nx = src.dirX / dirLen;
      const ny = src.dirY / dirLen;
      const nz = src.dirZ / dirLen;
      const reach = src.radius * src.reach * 1.6;
      const [ex, ey] = rot(src.x + nx * reach, src.y + ny * reach, src.z + nz * reach, cam.yaw, cam.pitch);
      ctx.strokeStyle = `rgba(${Math.round(col[0] * 255)},${Math.round(col[1] * 255)},${Math.round(col[2] * 255)},0.55)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + sx * k, cy - sy * k);
      ctx.lineTo(cx + ex * k, cy - ey * k);
      ctx.stroke();
    }
    if (sel) {
      ctx.strokeStyle = "rgba(236,231,222,0.7)";
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawAxes(ctx: CanvasRenderingContext2D, W: number, H: number, S: SolumState) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(W * 0.5, 18);
  ctx.lineTo(W * 0.5, H - 18);
  ctx.moveTo(40, H * 0.52);
  ctx.lineTo(W - 40, H * 0.52);
  ctx.stroke();
  ctx.fillStyle = "#8f897e";
  ctx.font = "11px IBM Plex Sans, system-ui, sans-serif";
  ctx.fillText("Y", W * 0.5 + 6, 28);
  ctx.fillText("X", W - 48, H * 0.52 - 8);
  ctx.fillText("modo: " + S.view.mode, 16, H - 16);
  if (S.view.mode === "cutaway") {
    const x = 40 + S.view.cut * (W - 80);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x, H - 24);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
