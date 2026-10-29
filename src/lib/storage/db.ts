import type { Certificate, Prefs, Project, RenderRecord, ScanRecord } from "./types";
import { BRAND } from "../brand";

const DB_NAME = BRAND.storage.db;
const DB_VERSION = BRAND.storage.dbVersion;

type StoreName = "projects" | "scans" | "audio" | "renders" | "certs";

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("IndexedDB no está disponible en este navegador."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("scans")) {
        const scans = db.createObjectStore("scans", { keyPath: "id" });
        scans.createIndex("projectId", "projectId", { unique: false });
        scans.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("audio")) {
        db.createObjectStore("audio", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("renders")) {
        const renders = db.createObjectStore("renders", { keyPath: "id" });
        renders.createIndex("projectId", "projectId", { unique: false });
      }
      if (!db.objectStoreNames.contains("certs")) {
        const certs = db.createObjectStore("certs", { keyPath: "id" });
        certs.createIndex("projectId", "projectId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir IndexedDB"));
  });
  return dbPromise;
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  name: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const store = tx.objectStore(name);
    let result: T;
    const req = fn(store);
    req.onsuccess = () => {
      result = req.result;
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function dbGetAll<T>(name: Exclude<StoreName, "audio">): Promise<T[]> {
  return withStore(name, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export async function dbPut<T>(name: Exclude<StoreName, "audio">, value: T): Promise<void> {
  await withStore(name, "readwrite", (s) => s.put(value as unknown) as IDBRequest<IDBValidKey>);
}

export async function dbDelete(name: Exclude<StoreName, "audio">, id: string): Promise<void> {
  await withStore(name, "readwrite", (s) => s.delete(id));
}

export async function dbClear(name: StoreName): Promise<void> {
  await withStore(name, "readwrite", (s) => s.clear());
}

export interface AudioEntry {
  id: string;
  blob: Blob;
  name: string;
  mime: string;
  createdAt: number;
}

export async function putAudio(entry: AudioEntry): Promise<void> {
  await withStore("audio", "readwrite", (s) => s.put(entry) as unknown as IDBRequest<IDBValidKey>);
}

export async function getAudio(id: string): Promise<AudioEntry | undefined> {
  return withStore("audio", "readonly", (s) => s.get(id) as IDBRequest<AudioEntry | undefined>);
}

export async function deleteAudio(id: string): Promise<void> {
  await withStore("audio", "readwrite", (s) => s.delete(id));
}

export async function loadAll(): Promise<{
  projects: Project[];
  scans: ScanRecord[];
  renders: RenderRecord[];
  certs: Certificate[];
}> {
  const [projects, scans, renders, certs] = await Promise.all([
    dbGetAll<Project>("projects"),
    dbGetAll<ScanRecord>("scans"),
    dbGetAll<RenderRecord>("renders"),
    dbGetAll<Certificate>("certs"),
  ]);
  return { projects, scans, renders, certs };
}

const PREFS_KEY = BRAND.storage.prefs;

export function loadPrefs(fallback: Prefs): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...fallback, ...parsed, socials: { ...fallback.socials, ...(parsed.socials ?? {}) } };
  } catch {
    return fallback;
  }
}

export function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

const SEED_FLAG = BRAND.storage.seeded;

export function wasSeeded(): boolean {
  try {
    return localStorage.getItem(SEED_FLAG) === "1";
  } catch {
    return false;
  }
}

export function markSeeded() {
  try {
    localStorage.setItem(SEED_FLAG, "1");
  } catch {
    /* noop */
  }
}

export async function clearDatabase() {
  await Promise.all([
    dbClear("projects"),
    dbClear("scans"),
    dbClear("renders"),
    dbClear("certs"),
    dbClear("audio"),
  ]);
  try {
    localStorage.removeItem(SEED_FLAG);
    localStorage.removeItem(PREFS_KEY);
  } catch {
    /* noop */
  }
}
