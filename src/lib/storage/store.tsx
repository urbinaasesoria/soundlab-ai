import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AnalysisResult } from "../audio/analyzer";
import { encodeWav, type CoverStyle, type HumanizeParams } from "../audio/wav";
import {
  clearDatabase,
  dbDelete,
  dbPut,
  deleteAudio,
  loadAll,
  loadPrefs,
  markSeeded,
  putAudio,
  savePrefs,
  wasSeeded,
} from "./db";
import { buildDemoSeed, DEFAULT_PREFS } from "./seed";
import {
  pickAccent,
  type Certificate,
  type Prefs,
  type Project,
  type RenderRecord,
  type ScanRecord,
  type ToastMessage,
} from "./types";

interface StudioContextValue {
  ready: boolean;
  bootError: string | null;
  projects: Project[];
  scans: ScanRecord[];
  renders: RenderRecord[];
  certs: Certificate[];
  prefs: Prefs;
  toasts: ToastMessage[];
  toast: (text: string, kind?: ToastMessage["kind"]) => void;
  dismissToast: (id: string) => void;
  refresh: () => Promise<void>;
  createProject: (trackName: string, artistName?: string) => Promise<Project>;
  renameProject: (id: string, trackName: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addScan: (input: {
    projectId: string;
    result: AnalysisResult;
    source: ScanRecord["source"];
    tier: ScanRecord["tier"];
    audio?: Blob;
    label?: string;
  }) => Promise<ScanRecord>;
  addScanToNewProject: (input: {
    trackName: string;
    artistName: string;
    result: AnalysisResult;
    source: ScanRecord["source"];
    tier: ScanRecord["tier"];
    audio?: Blob;
    label?: string;
  }) => Promise<{ project: Project; scan: ScanRecord }>;
  deleteScan: (id: string) => Promise<void>;
  saveRender: (input: {
    projectId?: string;
    scanId?: string;
    kind: RenderRecord["kind"];
    style?: CoverStyle;
    label: string;
    channels: Float32Array[];
    sampleRate: number;
    duration: number;
    params?: HumanizeParams;
    before?: AnalysisResult;
    after?: AnalysisResult;
    blob?: Blob;
  }) => Promise<RenderRecord>;
  saveCertificate: (input: {
    projectId?: string;
    scanId?: string;
    trackName: string;
    artistName: string;
    hash: string;
    size: number;
    mime: string;
    network: string;
    note?: string;
  }) => Promise<Certificate>;
  spend: (amount: number, concept: string) => boolean;
  addCredits: (amount: number, concept?: string) => void;
  setPlan: (plan: Prefs["plan"]) => void;
  updatePrefs: (patch: Partial<Prefs>) => void;
  toggleTheme: () => void;
  resetAll: () => Promise<void>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function StudioProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [renders, setRenders] = useState<RenderRecord[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(DEFAULT_PREFS));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Record<string, number>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const toast = useCallback(
    (text: string, kind: ToastMessage["kind"] = "ok") => {
      const id = makeId();
      setToasts((prev) => [...prev.slice(-2), { id, text, kind }]);
      timers.current[id] = window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timers.current[id];
      }, 4400);
    },
    [],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    savePrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await loadAll();
        if (!alive) return;
        if (data.projects.length === 0 && !wasSeeded()) {
          const seed = buildDemoSeed(prefs.artistName);
          await dbPut("projects", seed.project);
          await dbPut("scans", seed.scan);
          markSeeded();
          if (!alive) return;
          setProjects([seed.project]);
          setScans([seed.scan]);
        } else {
          setProjects(data.projects);
          setScans(data.scans);
          setRenders(data.renders);
          setCerts(data.certs);
        }
        setReady(true);
      } catch (err) {
        if (!alive) return;
        setBootError(err instanceof Error ? err.message : "No se pudo cargar el almacenamiento local.");
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
    // la semilla solo debe ejecutarse una vez
  }, []);

  const refresh = useCallback(async () => {
    const data = await loadAll();
    setProjects(data.projects);
    setScans(data.scans);
    setRenders(data.renders);
    setCerts(data.certs);
  }, []);

  const createProject = useCallback(
    async (trackName: string, artistName?: string) => {
      const project: Project = {
        id: makeId(),
        trackName: trackName.trim() || "Sin título",
        artistName: (artistName ?? prefs.artistName).trim() || "Artista",
        createdAt: Date.now(),
        accent: pickAccent(trackName + Date.now()),
      };
      await dbPut("projects", project);
      setProjects((prev) => [project, ...prev]);
      return project;
    },
    [prefs.artistName],
  );

  const renameProject = useCallback(async (id: string, trackName: string) => {
    const trimmed = trackName.trim() || "Sin título";
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const next = { ...project, trackName: trimmed };
    await dbPut("projects", next);
    setProjects((prev) => prev.map((p) => (p.id === id ? next : p)));
  }, [projects]);

  const deleteProject = useCallback(
    async (id: string) => {
      const relatedScans = scans.filter((s) => s.projectId === id);
      const relatedRenders = renders.filter((r) => r.projectId === id);
      const relatedCerts = certs.filter(
        (c) => c.projectId === id || (c.scanId ? relatedScans.some((s) => s.id === c.scanId) : false),
      );
      for (const s of relatedScans) {
        if (s.audioId) await deleteAudio(s.audioId);
        await dbDelete("scans", s.id);
      }
      for (const r of relatedRenders) {
        await deleteAudio(r.audioId);
        await dbDelete("renders", r.id);
      }
      for (const c of relatedCerts) {
        await dbDelete("certs", c.id);
      }
      await dbDelete("projects", id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setScans((prev) => prev.filter((s) => s.projectId !== id));
      setRenders((prev) => prev.filter((r) => r.projectId !== id));
      setCerts((prev) => prev.filter((c) => !relatedCerts.some((x) => x.id === c.id)));
    },
    [scans, renders, certs],
  );

  const addScan = useCallback<StudioContextValue["addScan"]>(
    async ({ projectId, result, source, tier, audio, label }) => {
      const id = makeId();
      let audioId: string | undefined;
      if (audio) {
        audioId = makeId();
        await putAudio({
          id: audioId,
          blob: audio,
          name: result.file.name,
          mime: audio.type || result.file.mime,
          createdAt: Date.now(),
        });
      }
      const scan: ScanRecord = {
        id,
        projectId,
        createdAt: Date.now(),
        source,
        tier,
        result,
        audioId,
        label,
      };
      await dbPut("scans", scan);
      setScans((prev) => [scan, ...prev]);
      return scan;
    },
    [],
  );

  const addScanToNewProject = useCallback<StudioContextValue["addScanToNewProject"]>(
    async ({ trackName, artistName, result, source, tier, audio, label }) => {
      const project = await createProject(trackName, artistName);
      const scan = await addScan({ projectId: project.id, result, source, tier, audio, label });
      return { project, scan };
    },
    [addScan, createProject],
  );

  const deleteScan = useCallback(
    async (id: string) => {
      const scan = scans.find((s) => s.id === id);
      if (scan?.audioId) await deleteAudio(scan.audioId);
      await dbDelete("scans", id);
      setScans((prev) => prev.filter((s) => s.id !== id));
    },
    [scans],
  );

  const saveRender = useCallback<StudioContextValue["saveRender"]>(
    async ({ projectId, scanId, kind, style, label, channels, sampleRate, duration, params, before, after, blob }) => {
      const id = makeId();
      const audioId = makeId();
      const wav = blob ?? encodeWav(channels, sampleRate);
      await putAudio({ id: audioId, blob: wav, name: `${label}.wav`, mime: "audio/wav", createdAt: Date.now() });
      const record: RenderRecord = {
        id,
        projectId,
        scanId,
        kind,
        style,
        label,
        createdAt: Date.now(),
        audioId,
        sampleRate,
        duration,
        params,
        before,
        after,
      };
      await dbPut("renders", record);
      setRenders((prev) => [record, ...prev]);
      return record;
    },
    [],
  );

  const saveCertificate = useCallback<StudioContextValue["saveCertificate"]>(
    async ({ projectId, scanId, trackName, artistName, hash, size, mime, network, note }) => {
      const cert: Certificate = {
        id: makeId(),
        projectId,
        scanId,
        trackName,
        artistName,
        hash,
        createdAt: Date.now(),
        size,
        mime,
        method: "SHA-256 · Web Crypto",
        network,
        note,
      };
      await dbPut("certs", cert);
      setCerts((prev) => [cert, ...prev]);
      return cert;
    },
    [],
  );

  const updatePrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch, socials: { ...prev.socials, ...(patch.socials ?? {}) } }));
  }, []);

  const spend = useCallback(
    (amount: number, concept: string) => {
      if (prefs.credits < amount) {
        toast(`Créditos insuficientes para ${concept}. Te faltan ${amount - prefs.credits}.`, "err");
        return false;
      }
      setPrefs((prev) => ({ ...prev, credits: Math.max(0, prev.credits - amount) }));
      return true;
    },
    [prefs.credits, toast],
  );

  const addCredits = useCallback(
    (amount: number, concept = "Créditos añadidos") => {
      setPrefs((prev) => ({ ...prev, credits: prev.credits + amount }));
      toast(`${concept} · +${amount.toLocaleString("es-ES")} créditos`, "ok");
    },
    [toast],
  );

  const setPlan = useCallback((plan: Prefs["plan"]) => {
    setPrefs((prev) => ({ ...prev, plan }));
  }, []);

  const toggleTheme = useCallback(() => {
    setPrefs((prev) => ({ ...prev, theme: prev.theme === "dark" ? "light" : "dark" }));
  }, []);

  const resetAll = useCallback(async () => {
    await clearDatabase();
    window.location.reload();
  }, []);

  const value = useMemo<StudioContextValue>(
    () => ({
      ready,
      bootError,
      projects,
      scans,
      renders,
      certs,
      prefs,
      toasts,
      toast,
      dismissToast,
      refresh,
      createProject,
      renameProject,
      deleteProject,
      addScan,
      addScanToNewProject,
      deleteScan,
      saveRender,
      saveCertificate,
      spend,
      addCredits,
      setPlan,
      updatePrefs,
      toggleTheme,
      resetAll,
    }),
    [
      ready,
      bootError,
      projects,
      scans,
      renders,
      certs,
      prefs,
      toasts,
      toast,
      dismissToast,
      refresh,
      createProject,
      renameProject,
      deleteProject,
      addScan,
      addScanToNewProject,
      deleteScan,
      saveRender,
      saveCertificate,
      spend,
      addCredits,
      setPlan,
      updatePrefs,
      toggleTheme,
      resetAll,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio debe usarse dentro de StudioProvider");
  return ctx;
}
