import { create } from "zustand";
import {
  DEFAULT_STATE,
  applyPreset,
  cloneState,
  migrateIncoming,
  type Selection,
  type SolumState,
} from "@/lib/solum/schema";
import type { Sample } from "@/lib/solum/simulate";

const KEY = "solum4";
const HIST = 40;

export type DiagTab = "light" | "fields" | "structure" | "motion" | "python";

export type Probe = {
  x: number;
  y: number;
  z: number;
  sample: Sample;
  layerId: string | null;
  sourceId: string | null;
};

type Store = {
  doc: SolumState;
  hydrated: boolean;
  time: number;
  playing: boolean;
  status: string;
  statusKind: "" | "good" | "warn";
  yaw: number;
  pitch: number;
  zoom: number;
  quality: "drag" | "preview" | "idle";
  diagTab: DiagTab;
  history: SolumState[];
  future: SolumState[];
  lastPatchAt: number;
  probe: Probe | null;
  patch: (fn: (s: SolumState) => void, status?: string) => void;
  replace: (s: SolumState, status?: string) => void;
  reset: () => void;
  loadPreset: (name: string) => void;
  setStatus: (t: string, kind?: "" | "good" | "warn") => void;
  setView: (yaw?: number, pitch?: number, zoom?: number) => void;
  setTime: (t: number) => void;
  setPlaying: (p: boolean) => void;
  setQuality: (q: Store["quality"]) => void;
  setDiagTab: (t: DiagTab) => void;
  setProbe: (p: Probe | null) => void;
  select: (sel: Selection) => void;
  undo: () => void;
  redo: () => void;
  hydrate: () => void;
};

function persist(s: SolumState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}

function pushHist(get: () => Store, set: (p: Partial<Store>) => void) {
  const now = Date.now();
  if (now - get().lastPatchAt < 480 && get().history.length) {
    set({ lastPatchAt: now });
    return;
  }
  const hist = [...get().history, cloneState(get().doc)];
  if (hist.length > HIST) hist.shift();
  set({ history: hist, future: [], lastPatchAt: now });
}

export const useSolum = create<Store>((set, get) => ({
  doc: cloneState(DEFAULT_STATE),
  hydrated: false,
  time: 0,
  playing: false,
  status: "Pronto. Nada é enviado ao Houdini até você gerar o Python.",
  statusKind: "",
  yaw: -0.55,
  pitch: 0.42,
  zoom: 1,
  quality: "idle",
  diagTab: "light",
  history: [],
  future: [],
  lastPatchAt: 0,
  probe: null,
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const doc = migrateIncoming(JSON.parse(raw));
        set({ doc, hydrated: true, status: "Estado restaurado." });
        return;
      }
    } catch {
      /* keep default */
    }
    set({ hydrated: true });
  },
  patch: (fn, status) => {
    pushHist(get, set);
    const next = cloneState(get().doc);
    fn(next);
    persist(next);
    set({
      doc: next,
      status: status ?? get().status,
      statusKind: status ? "" : get().statusKind,
    });
  },
  replace: (s, status) => {
    pushHist(get, set);
    persist(s);
    set({ doc: s, status: status ?? get().status, statusKind: "", probe: null });
  },
  reset: () => {
    pushHist(get, set);
    const s = cloneState(DEFAULT_STATE);
    persist(s);
    set({ doc: s, time: 0, playing: false, status: "Novo objeto criado.", statusKind: "", probe: null });
  },
  loadPreset: (name) => {
    pushHist(get, set);
    const s = applyPreset(name);
    persist(s);
    set({ doc: s, time: 0, status: "Preset carregado: " + name, statusKind: "good", probe: null });
  },
  setStatus: (t, kind = "") => set({ status: t, statusKind: kind }),
  setView: (yaw, pitch, zoom) =>
    set({
      yaw: yaw ?? get().yaw,
      pitch: pitch ?? get().pitch,
      zoom: zoom ?? get().zoom,
    }),
  setTime: (t) => set({ time: t }),
  setPlaying: (p) => set({ playing: p }),
  setQuality: (q) => set({ quality: q }),
  setDiagTab: (t) => set({ diagTab: t }),
  setProbe: (p) => set({ probe: p }),
  select: (sel) => {
    const next = cloneState(get().doc);
    next.selected = sel;
    persist(next);
    set({ doc: next });
  },
  undo: () => {
    const hist = get().history;
    if (!hist.length) return;
    const prev = hist[hist.length - 1]!;
    const future = [cloneState(get().doc), ...get().future].slice(0, HIST);
    persist(prev);
    set({ doc: prev, history: hist.slice(0, -1), future, status: "Desfeito.", probe: null });
  },
  redo: () => {
    const future = get().future;
    if (!future.length) return;
    const next = future[0]!;
    const history = [...get().history, cloneState(get().doc)].slice(-HIST);
    persist(next);
    set({ doc: next, history, future: future.slice(1), status: "Refeito.", probe: null });
  },
}));
