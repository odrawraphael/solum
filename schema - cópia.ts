export const SHAPES = [
  "Esfera",
  "Elipsoide",
  "Cubo",
  "Caixa",
  "Cilindro",
  "Cone",
  "Cápsula",
  "Toro",
  "Disco",
  "Pirâmide",
  "Prisma triangular",
  "Prisma hexagonal",
  "Tetraedro",
  "Octaedro",
  "Dodecaedro",
  "Icosaedro",
  "Cruz 3D",
] as const;

export const FIELD_NAMES = [
  "density",
  "temperature",
  "emission",
  "absorption",
  "scattering",
  "velocity",
  "pressure",
] as const;

export type FieldName = (typeof FIELD_NAMES)[number];

export const VIEW_MODES = [
  "structure",
  "cutaway",
  "slice",
  "density",
  "temperature",
  "emission",
  "absorption",
  "light",
] as const;

export type ViewMode = (typeof VIEW_MODES)[number];

export const VIEW_LABELS: Record<ViewMode, string> = {
  structure: "Estrutura",
  cutaway: "Cutaway",
  slice: "Slice",
  density: "Density",
  temperature: "Temperatura",
  emission: "Emission",
  absorption: "Absorção",
  light: "Caminho da luz",
};

export const LAYER_ROLES = ["shell", "membrane", "volume", "cavity", "interior"] as const;
export type LayerRole = (typeof LAYER_ROLES)[number];

export const LAYER_ROLE_LABELS: Record<LayerRole, string> = {
  shell: "casca",
  membrane: "membrana",
  volume: "volume",
  cavity: "cavidade",
  interior: "interior",
};

export type Layer = {
  id: string;
  name: string;
  shape: number;
  role: LayerRole;
  radius: number;
  thickness: number;
  density: number;
  temperature: number;
  emission: number;
  absorption: number;
  scattering: number;
  roughness: number;
  noise: number;
  transmission: number;
  tint: string;
};

export type SourceKind = "core" | "subcore" | "localized" | "external";

export type Source = {
  id: string;
  name: string;
  kind: SourceKind;
  x: number;
  y: number;
  z: number;
  radius: number;
  temperature: number;
  emission: number;
  absorption: number;
  scattering: number;
  falloff: number;
  reach: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  pulse: number;
  color: string;
  cone: number;
};

export type ModifierType =
  | "noise"
  | "erosion"
  | "turbulence"
  | "displacement"
  | "flow"
  | "growth";

export type Modifier = {
  id: string;
  name: string;
  type: ModifierType;
  target: string;
  amount: number;
  frequency: number;
  seed: number;
  enabled: boolean;
};

export type MotionOpType =
  | "flow"
  | "expansion"
  | "explosion"
  | "collision"
  | "fragmentation"
  | "growth";

export type MotionOp = {
  id: string;
  name: string;
  type: MotionOpType;
  enabled: boolean;
  sourceId: string;
  pressure: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  expansion: number;
  temperatureDelta: number;
  erosion: number;
  fragmentation: number;
  particles: number;
  start: number;
  length: number;
};

export type Selection =
  | { kind: "object"; id: "" }
  | { kind: "layer"; id: string }
  | { kind: "source"; id: string }
  | { kind: "modifier"; id: string }
  | { kind: "operator"; id: string };

export type SolumState = {
  meta: { version: 4; name: string; seed: number };
  materialPath: string;
  object: {
    shape: number;
    scale: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    rotX: number;
    rotY: number;
    rotZ: number;
  };
  surface: {
    irregularity: number;
    macroNoise: number;
    macroFreq: number;
    edge: number;
    shellWidth: number;
    detail: number;
    detailFreq: number;
    detailSharp: number;
    cavities: number;
    cavityFreq: number;
    cavityDepth: number;
    porosity: number;
    erosion: number;
    filaments: number;
    filamentScale: number;
    masses: number;
    massScale: number;
    wrinkles: number;
  };
  volume: {
    density: number;
    densityContrast: number;
    radialFalloff: number;
    temperatureGain: number;
    emissionGain: number;
    absorptionGain: number;
    scatteringGain: number;
    velocityScale: number;
    pressureGain: number;
  };
  atmosphere: {
    halo: number;
    haloSize: number;
    dust: number;
    dustSize: number;
    particulate: number;
    smoke: number;
    fragments: number;
  };
  motion: {
    duration: number;
    fps: number;
    loop: number;
    speed: number;
    flow: number;
    pulse: number;
    spin: number;
    expansion: number;
    turbulence: number;
  };
  light: {
    keyStrength: number;
    backgroundTransmission: number;
    raySteps: number;
  };
  colors: {
    background: string;
    foreground: string;
    core: string;
    absorption: string;
    scatter: string;
  };
  layers: Layer[];
  sources: Source[];
  modifiers: Modifier[];
  operators: MotionOp[];
  selected: Selection;
  view: {
    mode: ViewMode;
    sliceAxis: "X" | "Y" | "Z";
    cutAxis: "cam" | "X" | "Y" | "Z";
    cut: number;
    fieldFloor: number;
    fieldCeil: number;
  };
};

export const DEFAULT_LAYER = (partial?: Partial<Layer>): Layer => ({
  id: "l1",
  name: "L1 · exterior",
  shape: 0,
  role: "volume",
  radius: 1,
  thickness: 0.3,
  density: 1,
  temperature: 0.4,
  emission: 0,
  absorption: 0.7,
  scattering: 0.35,
  roughness: 1,
  noise: 0.3,
  transmission: 1,
  tint: "",
  ...partial,
});

export const DEFAULT_SOURCE = (partial?: Partial<Source>): Source => ({
  id: "c1",
  name: "CORE 1",
  kind: "core",
  x: 0,
  y: 0,
  z: 0,
  radius: 0.35,
  temperature: 3,
  emission: 1,
  absorption: 0,
  scattering: 0.1,
  falloff: 2,
  reach: 1.4,
  dirX: 0,
  dirY: 0,
  dirZ: 0,
  pulse: 0,
  color: "#ff5c14",
  cone: 0,
  ...partial,
});

export const DEFAULT_STATE: SolumState = {
  meta: { version: 4, name: "Solum object", seed: 17 },
  materialPath: "/stage/materiallibrary1/karmamaterial",
  object: {
    shape: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
  },
  surface: {
    irregularity: 0.5,
    macroNoise: 0.38,
    macroFreq: 2.2,
    edge: 0.08,
    shellWidth: 0.35,
    detail: 0.7,
    detailFreq: 6,
    detailSharp: 3,
    cavities: 0.15,
    cavityFreq: 3.2,
    cavityDepth: 0.3,
    porosity: 0.2,
    erosion: 0.12,
    filaments: 0.18,
    filamentScale: 4.5,
    masses: 0.22,
    massScale: 2.4,
    wrinkles: 0.35,
  },
  volume: {
    density: 8,
    densityContrast: 1,
    radialFalloff: 0.18,
    temperatureGain: 1,
    emissionGain: 1,
    absorptionGain: 1,
    scatteringGain: 1,
    velocityScale: 1,
    pressureGain: 1,
  },
  atmosphere: {
    halo: 0.15,
    haloSize: 1.2,
    dust: 12000,
    dustSize: 0.012,
    particulate: 0.35,
    smoke: 0.08,
    fragments: 0,
  },
  motion: {
    duration: 4,
    fps: 24,
    loop: 1,
    speed: 1,
    flow: 0.6,
    pulse: 0.3,
    spin: 0,
    expansion: 0,
    turbulence: 0.8,
  },
  light: { keyStrength: 1, backgroundTransmission: 1, raySteps: 96 },
  colors: {
    background: "#ff8c59",
    foreground: "#590a05",
    core: "#ff5c14",
    absorption: "#3387ff",
    scatter: "#d6b98a",
  },
  layers: [
    DEFAULT_LAYER({
      id: "l1",
      name: "L1 · casca",
      role: "shell",
      radius: 1,
      thickness: 0.28,
      density: 1.15,
      temperature: 0.35,
      emission: 0,
      absorption: 0.85,
      scattering: 0.32,
      tint: "#3a140c",
    }),
    DEFAULT_LAYER({
      id: "l2",
      name: "L2 · massa",
      role: "volume",
      radius: 0.65,
      thickness: 0.24,
      density: 0.85,
      temperature: 0.9,
      emission: 0.05,
      absorption: 0.7,
      scattering: 0.28,
      roughness: 0.9,
      noise: 0.5,
      tint: "#c45a28",
    }),
    DEFAULT_LAYER({
      id: "l3",
      name: "L3 · interior",
      role: "interior",
      radius: 0.32,
      thickness: 0.2,
      density: 0.55,
      temperature: 1.5,
      emission: 0.18,
      absorption: 0.35,
      scattering: 0.4,
      roughness: 0.7,
      noise: 0.7,
      tint: "#ff5c14",
    }),
  ],
  sources: [DEFAULT_SOURCE()],
  modifiers: [
    {
      id: "m1",
      name: "Warp macro",
      type: "displacement",
      target: "surface",
      amount: 0.45,
      frequency: 2.2,
      seed: 17,
      enabled: true,
    },
    {
      id: "m2",
      name: "Erosão da casca",
      type: "erosion",
      target: "surface",
      amount: 0.2,
      frequency: 3.4,
      seed: 41,
      enabled: true,
    },
  ],
  operators: [],
  selected: { kind: "object", id: "" },
  view: {
    mode: "cutaway",
    sliceAxis: "Y",
    cutAxis: "X",
    cut: 0.5,
    fieldFloor: 0,
    fieldCeil: 1,
  },
};

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function cloneState(s: SolumState): SolumState {
  return deepClone(s);
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export const PRESETS: Record<string, Partial<SolumState>> = {
  "Casca ígnea": {
    surface: {
      ...DEFAULT_STATE.surface,
      irregularity: 0.85,
      macroNoise: 0.55,
      macroFreq: 2.6,
      edge: 0.05,
      shellWidth: 0.22,
      detail: 1.4,
      detailFreq: 10,
      detailSharp: 3.4,
      cavities: 0.42,
      cavityFreq: 5.2,
      cavityDepth: 0.58,
      porosity: 0.16,
      erosion: 0.38,
      filaments: 0.08,
      filamentScale: 6,
      masses: 0.4,
      massScale: 2.1,
      wrinkles: 0.7,
    },
    volume: {
      density: 14,
      densityContrast: 1.9,
      radialFalloff: 0.14,
      temperatureGain: 5.4,
      emissionGain: 3.2,
      absorptionGain: 1.5,
      scatteringGain: 0.7,
      velocityScale: 0.8,
      pressureGain: 1.4,
    },
    atmosphere: {
      halo: 0.22,
      haloSize: 1.15,
      dust: 9000,
      dustSize: 0.01,
      particulate: 0.22,
      smoke: 0.18,
      fragments: 0.12,
    },
    colors: {
      background: "#ff7a28",
      foreground: "#1c0702",
      core: "#ff3a00",
      absorption: "#2a6fb8",
      scatter: "#ffb36b",
    },
    layers: [
      DEFAULT_LAYER({
        id: "l1",
        name: "L1 · crosta",
        radius: 1.02,
        thickness: 0.18,
        density: 1.6,
        temperature: 0.25,
        absorption: 1.35,
        scattering: 0.22,
        roughness: 1.2,
        noise: 0.55,
        transmission: 0.55,
      }),
      DEFAULT_LAYER({
        id: "l2",
        name: "L2 · magma",
        radius: 0.72,
        thickness: 0.28,
        density: 0.95,
        temperature: 2.2,
        emission: 0.45,
        absorption: 0.55,
        scattering: 0.4,
        noise: 0.7,
      }),
      DEFAULT_LAYER({
        id: "l3",
        name: "L3 · câmara",
        radius: 0.34,
        thickness: 0.22,
        density: 0.45,
        temperature: 3.4,
        emission: 0.8,
        absorption: 0.18,
        scattering: 0.5,
      }),
    ],
    sources: [
      DEFAULT_SOURCE({
        radius: 0.38,
        temperature: 6.2,
        emission: 1.6,
        falloff: 1.8,
      }),
    ],
  },
  "Cosmos em fusão": {
    surface: {
      ...DEFAULT_STATE.surface,
      irregularity: 0.7,
      macroNoise: 0.72,
      macroFreq: 2.4,
      edge: 0.07,
      detail: 1.5,
      detailFreq: 12,
      detailSharp: 5,
      cavities: 0.48,
      cavityFreq: 3.6,
      cavityDepth: 0.5,
      porosity: 0.3,
      erosion: 0.22,
      filaments: 0.85,
      filamentScale: 5.4,
      masses: 0.55,
      massScale: 2.8,
      wrinkles: 0.4,
    },
    volume: {
      density: 7.5,
      densityContrast: 1.6,
      radialFalloff: 0.3,
      temperatureGain: 3.4,
      emissionGain: 2.6,
      absorptionGain: 1.05,
      scatteringGain: 1.7,
      velocityScale: 1.4,
      pressureGain: 1.1,
    },
    atmosphere: {
      halo: 0.72,
      haloSize: 1.7,
      dust: 26000,
      dustSize: 0.011,
      particulate: 0.58,
      smoke: 0.12,
      fragments: 0.05,
    },
    colors: {
      background: "#ff6a32",
      foreground: "#14061c",
      core: "#7fd0ff",
      absorption: "#88ff66",
      scatter: "#c78bff",
    },
    layers: [
      DEFAULT_LAYER({
        id: "l1",
        name: "L1 · envelope",
        radius: 1.08,
        thickness: 0.26,
        density: 0.7,
        temperature: 0.8,
        emission: 0.12,
        absorption: 0.45,
        scattering: 0.7,
        transmission: 0.85,
      }),
      DEFAULT_LAYER({
        id: "l2",
        name: "L2 · plasma",
        radius: 0.68,
        thickness: 0.22,
        density: 0.9,
        temperature: 1.8,
        emission: 0.35,
        absorption: 0.55,
        scattering: 0.5,
      }),
      DEFAULT_LAYER({
        id: "l3",
        name: "L3 · núcleo quente",
        radius: 0.3,
        thickness: 0.2,
        density: 0.5,
        temperature: 3.2,
        emission: 0.7,
        absorption: 0.2,
        scattering: 0.4,
      }),
    ],
    sources: [
      DEFAULT_SOURCE({
        radius: 0.42,
        temperature: 5,
        emission: 1.4,
        scattering: 0.18,
      }),
      DEFAULT_SOURCE({
        id: "c2",
        name: "CORE 2",
        kind: "subcore",
        x: 0.32,
        y: 0.18,
        z: -0.16,
        radius: 0.16,
        temperature: 3.2,
        emission: 0.9,
        falloff: 3,
      }),
    ],
    modifiers: [
      {
        id: "m1",
        name: "Filamentos",
        type: "flow",
        target: "field:emission",
        amount: 0.7,
        frequency: 5.2,
        seed: 9,
        enabled: true,
      },
      {
        id: "m2",
        name: "Turbulência",
        type: "turbulence",
        target: "volume",
        amount: 0.55,
        frequency: 3.1,
        seed: 22,
        enabled: true,
      },
    ],
  },
  "Núcleo velado": {
    surface: {
      ...DEFAULT_STATE.surface,
      irregularity: 0.28,
      edge: 0.1,
      cavities: 0.04,
      cavityDepth: 0.1,
      porosity: 0.05,
      erosion: 0.04,
      filaments: 0.02,
      masses: 0.1,
    },
    volume: {
      density: 16,
      densityContrast: 0.6,
      radialFalloff: 0.08,
      temperatureGain: 4,
      emissionGain: 3.5,
      absorptionGain: 2.4,
      scatteringGain: 0.4,
      velocityScale: 0.4,
      pressureGain: 0.8,
    },
    atmosphere: { ...DEFAULT_STATE.atmosphere, halo: 0.04, dust: 4000, particulate: 0.08 },
    colors: {
      background: "#3a2218",
      foreground: "#120804",
      core: "#ff4a10",
      absorption: "#1c4a88",
      scatter: "#8a6a48",
    },
    layers: [
      DEFAULT_LAYER({
        id: "l1",
        name: "L1 · casca opaca",
        radius: 1,
        thickness: 0.22,
        density: 1.8,
        absorption: 2.2,
        scattering: 0.15,
        transmission: 0.12,
        temperature: 0.15,
      }),
      DEFAULT_LAYER({
        id: "l2",
        name: "L2 · gás denso",
        radius: 0.7,
        thickness: 0.26,
        density: 1.4,
        absorption: 1.6,
        scattering: 0.35,
        temperature: 0.8,
        transmission: 0.3,
      }),
      DEFAULT_LAYER({
        id: "l3",
        name: "L3 · fornalha",
        radius: 0.34,
        thickness: 0.22,
        density: 0.7,
        temperature: 5,
        emission: 1.2,
        absorption: 0.2,
        scattering: 0.4,
      }),
    ],
    sources: [
      DEFAULT_SOURCE({
        radius: 0.3,
        temperature: 8,
        emission: 2.2,
        falloff: 2.4,
      }),
    ],
  },
  "Núcleo exposto": {
    surface: {
      ...DEFAULT_STATE.surface,
      irregularity: 0.35,
      cavities: 0.22,
      porosity: 0.18,
      filaments: 0.3,
    },
    volume: {
      density: 4.5,
      densityContrast: 0.9,
      radialFalloff: 0.22,
      temperatureGain: 3.2,
      emissionGain: 2.4,
      absorptionGain: 0.28,
      scatteringGain: 1.1,
      velocityScale: 0.7,
      pressureGain: 0.6,
    },
    atmosphere: {
      halo: 0.55,
      haloSize: 1.45,
      dust: 16000,
      dustSize: 0.013,
      particulate: 0.4,
      smoke: 0.05,
      fragments: 0,
    },
    colors: {
      background: "#ffb078",
      foreground: "#3a140c",
      core: "#fff1c2",
      absorption: "#5aa0ff",
      scatter: "#ffd9a0",
    },
    layers: [
      DEFAULT_LAYER({
        id: "l1",
        name: "L1 · película",
        radius: 1.05,
        thickness: 0.14,
        density: 0.35,
        absorption: 0.18,
        scattering: 0.55,
        emission: 0.08,
        transmission: 0.92,
        temperature: 0.9,
      }),
      DEFAULT_LAYER({
        id: "l2",
        name: "L2 · gás fino",
        radius: 0.62,
        thickness: 0.2,
        density: 0.28,
        absorption: 0.12,
        scattering: 0.6,
        emission: 0.2,
        temperature: 1.6,
        transmission: 0.88,
      }),
    ],
    sources: [
      DEFAULT_SOURCE({
        radius: 0.46,
        temperature: 5.5,
        emission: 1.8,
        falloff: 1.6,
      }),
    ],
  },
  "Casca oca": {
    surface: {
      ...DEFAULT_STATE.surface,
      irregularity: 0.35,
      macroNoise: 0.28,
      edge: 0.05,
      cavities: 0.18,
      porosity: 0.05,
      filaments: 0.12,
      masses: 0.08,
    },
    volume: {
      density: 5,
      densityContrast: 0.8,
      radialFalloff: 0.1,
      temperatureGain: 1.5,
      emissionGain: 0.8,
      absorptionGain: 0.35,
      scatteringGain: 1.1,
      velocityScale: 0.6,
      pressureGain: 0.5,
    },
    layers: [
      DEFAULT_LAYER({
        id: "l1",
        name: "L1 · casca",
        radius: 1.05,
        thickness: 0.17,
        density: 1.3,
        temperature: 0.8,
        absorption: 0.9,
        scattering: 0.4,
      }),
      DEFAULT_LAYER({
        id: "l2",
        name: "L2 · película",
        radius: 0.62,
        thickness: 0.12,
        density: 0.35,
        temperature: 1.2,
        emission: 0.2,
        absorption: 0.25,
        scattering: 0.6,
        roughness: 0.7,
        noise: 0.8,
      }),
    ],
    sources: [
      DEFAULT_SOURCE({
        x: 0.08,
        radius: 0.27,
        temperature: 5.5,
        emission: 1.8,
        falloff: 2.2,
      }),
    ],
  },
  "Terra quente": {
    surface: {
      ...DEFAULT_STATE.surface,
      irregularity: 1.15,
      macroNoise: 0.42,
      macroFreq: 2,
      edge: 0.04,
      detail: 1.8,
      detailFreq: 10,
      detailSharp: 2.2,
      cavities: 0.55,
      cavityFreq: 4.5,
      cavityDepth: 0.6,
      porosity: 0.34,
      erosion: 0.45,
      masses: 0.6,
      wrinkles: 0.8,
      filaments: 0.1,
    },
    volume: {
      density: 18,
      densityContrast: 2.2,
      radialFalloff: 0.16,
      temperatureGain: 2.3,
      emissionGain: 0.5,
      absorptionGain: 2,
      scatteringGain: 0.35,
      velocityScale: 0.5,
      pressureGain: 1.6,
    },
    atmosphere: {
      halo: 0.08,
      haloSize: 1.1,
      dust: 18000,
      dustSize: 0.009,
      particulate: 0.2,
      smoke: 0.25,
      fragments: 0.08,
    },
    colors: {
      background: "#c9a46a",
      foreground: "#2b1a0e",
      core: "#ff6a1a",
      absorption: "#4090ff",
      scatter: "#a37f55",
    },
  },
  "Dois brilhos": {
    surface: {
      ...DEFAULT_STATE.surface,
      irregularity: 0.4,
      cavities: 0.28,
      cavityDepth: 0.4,
      filaments: 0.35,
      porosity: 0.16,
    },
    volume: {
      density: 6.5,
      densityContrast: 1.1,
      radialFalloff: 0.2,
      temperatureGain: 2.8,
      emissionGain: 2.2,
      absorptionGain: 0.7,
      scatteringGain: 1.2,
      velocityScale: 0.9,
      pressureGain: 0.9,
    },
    colors: {
      background: "#ff8a4a",
      foreground: "#1a0c08",
      core: "#ff5c14",
      absorption: "#3a78c8",
      scatter: "#d6b98a",
    },
    layers: [
      DEFAULT_LAYER({
        id: "l1",
        name: "L1 · casca",
        role: "shell",
        radius: 1.02,
        thickness: 0.2,
        density: 1.1,
        absorption: 0.85,
        scattering: 0.3,
        transmission: 0.55,
      }),
      DEFAULT_LAYER({
        id: "l2",
        name: "L2 · membrana",
        role: "membrane",
        radius: 0.58,
        thickness: 0.1,
        density: 0.5,
        absorption: 0.4,
        scattering: 0.55,
        emission: 0.1,
        transmission: 0.75,
      }),
    ],
    sources: [
      DEFAULT_SOURCE({
        radius: 0.28,
        temperature: 5.5,
        emission: 1.5,
        color: "#ff4a12",
      }),
      DEFAULT_SOURCE({
        id: "c2",
        name: "CORE frio",
        kind: "subcore",
        x: 0.38,
        y: -0.12,
        z: 0.1,
        radius: 0.16,
        temperature: 1.4,
        emission: 1.2,
        color: "#7fd0ff",
        falloff: 2.6,
      }),
    ],
  },
};

export function applyPreset(name: string): SolumState {
  const p = PRESETS[name];
  const b = cloneState(DEFAULT_STATE);
  if (!p) return b;
  return {
    ...b,
    ...p,
    meta: { ...b.meta, ...(p.meta ?? {}) },
    object: { ...b.object, ...(p.object ?? {}) },
    surface: { ...b.surface, ...(p.surface ?? {}) },
    volume: { ...b.volume, ...(p.volume ?? {}) },
    atmosphere: { ...b.atmosphere, ...(p.atmosphere ?? {}) },
    motion: { ...b.motion, ...(p.motion ?? {}) },
    light: { ...b.light, ...(p.light ?? {}) },
    colors: { ...b.colors, ...(p.colors ?? {}) },
    layers: (p.layers ?? b.layers).map((x, i, arr) => ({
      ...DEFAULT_LAYER(),
      ...x,
      role: x.role ?? inferRole(x.name, i, arr.length),
    })),
    sources: (p.sources ?? b.sources).map((x) => ({ ...DEFAULT_SOURCE(), ...x })),
    modifiers: (p.modifiers ?? b.modifiers).map((x) => ({ ...x })),
    operators: (p.operators ?? b.operators).map((x) => ({ ...x })),
    selected: { kind: "object", id: "" },
    view: { ...b.view, ...(p.view ?? {}) },
  };
}

export function migrateIncoming(raw: unknown): SolumState {
  if (!raw || typeof raw !== "object") throw new Error("JSON vazio");
  const x = raw as Record<string, unknown>;
  const meta = (x.meta ?? {}) as Record<string, unknown>;
  const version = Number(meta.version ?? 0);
  if (version !== 3 && version !== 4) throw new Error("versão incompatível (use v3 ou v4)");
  const base = cloneState(DEFAULT_STATE);
  const merged: SolumState = {
    ...base,
    ...(x as Partial<SolumState>),
    meta: { version: 4, name: String(meta.name ?? base.meta.name), seed: Number(meta.seed ?? base.meta.seed) },
    object: { ...base.object, ...((x.object as object) ?? {}) },
    surface: { ...base.surface, ...((x.surface as object) ?? {}) },
    volume: { ...base.volume, ...((x.volume as object) ?? {}) },
    atmosphere: { ...base.atmosphere, ...((x.atmosphere as object) ?? {}) },
    motion: { ...base.motion, ...((x.motion as object) ?? {}) },
    light: { ...base.light, ...((x.light as object) ?? {}) },
    colors: { ...base.colors, ...((x.colors as object) ?? {}) },
    view: { ...base.view, ...((x.view as SolumState["view"]) ?? {}), cutAxis: ((x.view as SolumState["view"]) ?? base.view).cutAxis ?? "cam" },
    selected: { kind: "object", id: "" },
    layers: Array.isArray(x.layers)
      ? (x.layers as Layer[]).map((l, i) => ({
          ...DEFAULT_LAYER(),
          ...l,
          id: l.id ?? `l${i + 1}`,
          role: l.role ?? inferRole(l.name, i, Array.isArray(x.layers) ? x.layers.length : 3),
          tint: l.tint ?? "",
          shape: l.shape ?? 0,
        }))
      : base.layers,
    sources: Array.isArray(x.sources)
      ? (x.sources as Source[]).map((s, i) => ({
          ...DEFAULT_SOURCE(),
          ...s,
          id: s.id ?? `c${i + 1}`,
          color: s.color ?? base.colors.core,
          cone: s.cone ?? 0,
        }))
      : Array.isArray(x.cores)
        ? (x.cores as Source[]).map((s, i) => ({
            ...DEFAULT_SOURCE(),
            ...s,
            id: s.id ?? `c${i + 1}`,
            kind: s.kind ?? "core",
            color: s.color ?? base.colors.core,
            cone: s.cone ?? 0,
          }))
        : base.sources,
    modifiers: Array.isArray(x.modifiers) ? (x.modifiers as Modifier[]) : base.modifiers,
    operators: Array.isArray(x.operators) ? (x.operators as MotionOp[]) : [],
  };
  return merged;
}

function inferRole(name: string, i: number, n: number): LayerRole {
  const t = String(name).toLowerCase();
  if (t.includes("casca") || t.includes("crosta") || t.includes("envelope") || t.includes("película") || t.includes("pelicula")) return "shell";
  if (t.includes("membrana")) return "membrane";
  if (t.includes("cavidade") || t.includes("câmara") || t.includes("camara") || t.includes("oca")) return "cavity";
  if (t.includes("interior") || t.includes("núcleo") || t.includes("nucleo") || t.includes("fornalha")) return "interior";
  if (i === 0) return "shell";
  if (i === n - 1) return "interior";
  return "volume";
}

export function hexToRgb(h: string): [number, number, number] {
  const s = h.replace("#", "");
  if (s.length < 6) return [1, 0.4, 0.15];
  return [1, 3, 5].map((i) => parseInt(s.slice(i - 1, i + 1), 16) / 255) as [number, number, number];
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function fmt(v: number, n = 2) {
  return Number(v).toFixed(n);
}

export function norm(s: string) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function setNested(obj: Record<string, unknown>, path: string, val: unknown) {
  const p = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < p.length - 1; i++) {
    const k = p[i]!;
    if (!(k in cur) || typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[p[p.length - 1]!] = val;
}
