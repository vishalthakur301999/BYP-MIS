// Lightweight native IndexedDB helpers (no extra deps)
const DB_NAME = "pwa-offline-db";
const DB_VERSION = 2;
export const COLLECTION = "households";
export const PENDING = "pending_households";

export type IDBRecord = Record<string, any> & { id: string };

let _db: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
    if (_db) return _db;
    _db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(COLLECTION))
                db.createObjectStore(COLLECTION, { keyPath: "id" });
            if (!db.objectStoreNames.contains(PENDING))
                db.createObjectStore(PENDING, { keyPath: "id" });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return _db!;
}

function tx(store: string, mode: IDBTransactionMode) {
    if (!_db) throw new Error("DB not opened");
    const t = _db.transaction(store, mode);
    return { store: t.objectStore(store), t };
}

export async function put(store: string, data: IDBRecord) {
    const { store: s, t } = tx(store, "readwrite");
    await new Promise<void>((res, rej) => {
        s.put(data);
        t.oncomplete = () => res();
        t.onerror = () => rej(t.error);
    });
}

export async function bulkReplace(store: string, rows: IDBRecord[]) {
    const { store: s, t } = tx(store, "readwrite");
    s.clear();
    rows.forEach(r => s.put(r));
    return new Promise<void>((res, rej) => {
        t.oncomplete = () => res();
        t.onerror = () => rej(t.error);
    });
}

export async function all<T = IDBRecord>(store: string): Promise<T[]> {
    const { store: s } = tx(store, "readonly");
    return new Promise((res) => {
        const req = s.getAll();
        req.onsuccess = () => res(req.result as T[]);
    });
}

export async function clear(store: string) {
    const { store: s, t } = tx(store, "readwrite");
    s.clear();
    return new Promise<void>((res, rej) => {
        t.oncomplete = () => res();
        t.onerror = () => rej(t.error);
    });
}