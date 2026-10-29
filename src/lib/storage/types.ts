import type { AnalysisResult, Section } from "../audio/analyzer";
import type { HumanizeParams, CoverStyle } from "../audio/wav";

export type ThemeMode = "dark" | "light";

export interface Project {
  id: string;
  trackName: string;
  artistName: string;
  createdAt: number;
  isDemo?: boolean;
  accent: string;
}

export interface ScanRecord {
  id: string;
  projectId: string;
  createdAt: number;
  source: "scan" | "forensic";
  tier: "rapido" | "profundo";
  result: AnalysisResult;
  audioId?: string;
  label?: string;
}

export interface RenderRecord {
  id: string;
  projectId?: string;
  scanId?: string;
  kind: "humanizer" | "cover";
  style?: CoverStyle;
  label: string;
  createdAt: number;
  audioId: string;
  sampleRate: number;
  duration: number;
  params?: HumanizeParams;
  before?: AnalysisResult;
  after?: AnalysisResult;
}

export interface Certificate {
  id: string;
  projectId?: string;
  scanId?: string;
  trackName: string;
  artistName: string;
  hash: string;
  createdAt: number;
  size: number;
  mime: string;
  method: string;
  network: string;
  note?: string;
}

export interface Socials {
  instagram: string;
  tiktok: string;
  spotify: string;
}

export interface Prefs {
  theme: ThemeMode;
  credits: number;
  plan: "free" | "pro";
  fullName: string;
  artistName: string;
  email: string;
  country: string;
  phone: string;
  birthDate: string;
  memberSince: string;
  socials: Socials;
  notifications: boolean;
  tutorialScan: boolean;
  reduceMotion: boolean;
}

export interface ProjectSummary {
  project: Project;
  scans: ScanRecord[];
  best: number | null;
  lastScanAt: number | null;
  humanizations: number;
  certificates: number;
}

export interface ToastMessage {
  id: string;
  text: string;
  kind: "ok" | "err" | "info";
}

/* ---- auxiliares de dominio ---- */

export const DEMO_ACCENTS = ["#00ce59", "#f2ca50", "#4d9fe5", "#c084fc", "#f36356", "#2dd4bf"];

export function pickAccent(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return DEMO_ACCENTS[h % DEMO_ACCENTS.length];
}

export function summarize(project: Project, scans: ScanRecord[], renders: RenderRecord[], certs: Certificate[]): ProjectSummary {
  const items = scans.filter((s) => s.projectId === project.id).sort((a, b) => b.createdAt - a.createdAt);
  const probs = items.map((s) => s.result.ai.probability).filter((n) => Number.isFinite(n));
  return {
    project,
    scans: items,
    best: probs.length ? Math.min(...probs) : null,
    lastScanAt: items[0]?.createdAt ?? null,
    humanizations: renders.filter((r) => r.projectId === project.id && r.kind === "humanizer").length,
    certificates: certs.filter((c) => c.projectId === project.id).length,
  };
}

export const COST = {
  scan: 40,
  forensic: 90,
  humanizer: 120,
  cover: 150,
  shield: 60,
} as const;

export const EMPTY_SECTION: Section = { start: 0, end: 0, label: "—", energy: 0 };
