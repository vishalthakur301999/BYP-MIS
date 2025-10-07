// src/App.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Household } from "@/types";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { collection, onSnapshot, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { openDB, all, put, bulkReplace, clear, COLLECTION, PENDING } from "@/lib/idb";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DataPage } from "@/pages/DataPage";
import { DashboardPage } from "@/pages/DashboardPage";
import RecommendationsPage from "@/pages/RecommendationsPage";
import type { SortState } from "@/components/data/DataTable";
import {BulkImportPage} from "@/pages/BulkImportPage";


const VILLAGES = ["Harebera","Baruniya","Janegora","Kantashol","Dighi","Jhari","Marasongha","Ghagda","Manoharpur","Kolabaria","Dasadih","Kasibera","Sonudur","Haldibani","Nunia","Sathbakhra","Pitamahli","Harda","Baredih","Katakati"];

type Page = "data" | "dashboard" | "recommendations" | "bulkImport";



function useOnline() {
    const [online, setOnline] = useState<boolean>(navigator.onLine);
    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener("online", on);
        window.addEventListener("offline", off);
        return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    }, []);
    return online;
}

export default function App() {
    const [page, setPage] = useState<Page>("data");
    const [records, setRecords] = useState<Household[]>([]);
    const [search, setSearch] = useState("");
    const [village, setVillage] = useState<string>("");
    const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
    const [syncState, setSyncState] = useState<"offline"|"syncing"|"synced"|"online">(navigator.onLine ? "online" : "offline");
    const [details, setDetails] = useState<Household | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [configNeeded, setConfigNeeded] = useState(false);

    const online = useOnline();
    const dbReady = useRef(false);

    // filter/sort derived list
    const filtered = useMemo(() => {
        let list = [...records];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(r => Object.values(r).some(v => String(v ?? "").toLowerCase().includes(q)));
        }
        if (village) list = list.filter(r => r.village === village);
        list.sort((a,b) => {
            const av = (a[sort.key] ?? "") as any;
            const bv = (b[sort.key] ?? "") as any;
            if (av < bv) return sort.dir === "asc" ? -1 : 1;
            if (av > bv) return sort.dir === "asc" ? 1 : -1;
            return 0;
        });
        return list;
    }, [records, search, village, sort]);

    // boot & sync
    useEffect(() => {
        let unsubAuth: (() => void) | null = null;

        (async () => {
            // 1) Open local DB and paint from cache immediately (offline-first)
            await openDB();
            dbReady.current = true;
            await hydrateFromIDB();               // <- paint cached items now

            // 2) Decide if config is missing (envs)
            const missingConfig =
                !import.meta.env.VITE_FIREBASE_API_KEY ||
                import.meta.env.VITE_FIREBASE_API_KEY === "YOUR_API_KEY";
            if (missingConfig) {
                setConfigNeeded(true);
                setSyncState(navigator.onLine ? "online" : "offline");
                return; // no Firebase; still keep local cache visible
            }

            // 3) Auth: try anonymous, but never block UI if it fails
            unsubAuth = onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    try {
                        await signInAnonymously(auth);
                    } catch (e) {
                        console.error("Anon sign-in failed:", e);
                        // Show local data regardless
                        setSyncState(navigator.onLine ? "online" : "offline");
                        return;
                    }
                }

                if (navigator.onLine) {
                    // Live snapshot
                    const c = collection(db, "households");
                    onSnapshot(
                        c,
                        async (snap) => {
                            const rows: Household[] = snap.docs.map((d) => ({
                                id: d.id,
                                ...(d.data() as any),
                            }));
                            await bulkReplace(COLLECTION, rows);
                            await hydrateFromIDB();       // reflect latest from server
                            setSyncState("synced");
                        },
                        (err) => console.error("onSnapshot error:", err)
                    );

                    // Initial sync (flush pending → refresh)
                    syncNow();
                } else {
                    setSyncState("offline");
                }
            });

            // 4) Online/offline listeners
            const onOnline = () => {
                setSyncState("online");
                syncNow();                          // auto sync when reconnected
            };
            const onOffline = () => setSyncState("offline");
            window.addEventListener("online", onOnline);
            window.addEventListener("offline", onOffline);

            // initial state already hydrated above

            // cleanup
            return () => {
                if (unsubAuth) unsubAuth();
                window.removeEventListener("online", onOnline);
                window.removeEventListener("offline", onOffline);
            };
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

// in App.tsx
    async function hydrateFromIDB() {
        if (!dbReady.current) return;
        const items = await all<Household>(COLLECTION);
        const pending = await all<Household>(PENDING);

        // dedupe by id; pending overrides collection
        const byId = new Map<string, Household>();
        for (const r of items) byId.set(String(r.id), r);
        for (const r of pending) byId.set(String(r.id), r);

        setRecords(Array.from(byId.values()));
    }

    // in App.tsx
    async function updateRecord(updated: Household) {
        const isPending = String(updated.id).startsWith("pending_");

        if (isPending) {
            // just update the local pending row
            await put(PENDING, updated as any);
        } else {
            // optimistic local cache update
            await put(COLLECTION, updated as any);
            // queue for server merge on next sync
            await put(PENDING, updated as any);
        }

        await hydrateFromIDB();
        syncNow();
    }

    async function importRecordsBulk(records: Household[]) {
        for (const rec of records) {
            await put(PENDING, rec as any);
        }
        await hydrateFromIDB();   // show immediately from local cache
        syncNow();                // your existing sync will flush when online
    }

    async function fetchFromFirestore() {
        if (!online || configNeeded) return;
        const snap = await getDocs(collection(db, "households"));
        const rows: Household[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        await bulkReplace(COLLECTION, rows);
    }

// in App.tsx
    async function syncNow() {
        if (!online || configNeeded) return;
        setSyncState("syncing");
        try {
            const pending = await all<Household>(PENDING);
            if (pending.length) {
                const batch = writeBatch(db);

                pending.forEach((it) => {
                    const { id, ...data } = it as any;
                    if (String(id).startsWith("pending_")) {
                        // CREATE new doc
                        const ref = doc(collection(db, "households"));
                        batch.set(ref, { ...data, syncedAt: serverTimestamp() });
                    } else {
                        // UPDATE existing doc (merge)
                        const ref = doc(collection(db, "households"), String(id));
                        batch.set(ref, { ...data, syncedAt: serverTimestamp() }, { merge: true });
                    }
                });

                await batch.commit();
                await clear(PENDING);
            }

            await fetchFromFirestore();
            await hydrateFromIDB();
            setSyncState("synced");
        } catch (e) {
            console.error("Sync error:", e);
            setSyncState(online ? "online" : "offline");
        }
    }

    async function addRecord(fd: FormData) {
        const newItem: Household = {
            id: `pending_${Date.now()}`,
            date: String(fd.get("date") || ""),
            name: String(fd.get("name") || ""),
            village: String(fd.get("village") || ""),
            livelihoodDescriptionandnregaWork: String(fd.get("nregaWork") || ""),
            familyNregaStatus: (fd.get("familyNregaStatus") as any) || undefined,
            landholding: fd.get("landholding") === "on",
            membersInHousehold: Number(fd.get("membersInHousehold") || 0),
            childrenInHousehold: Number(fd.get("childrenInHousehold") || 0),
            familyNotes: String(fd.get("familyNotes") || ""),
            kalamandirChicksAlive: Number(fd.get("kalamandirChicksAlive") || 0),
            femaleKalamandirChicksAlive: Number(fd.get("femaleKalamandirChicksAlive") || 0),
            mortalityCategory: fd.getAll("mortalityCategory") as string[],
            mortalityDescription: String(fd.get("mortalityDescription") || ""),
            ownPoultry: String(fd.get("ownPoultry") || ""),
            careDescription: String(fd.get("careDescription") || ""),
            azollaStatus: (fd.get("azollaStatus") as any) || undefined,
            azollaNotes: String(fd.get("azollaNotes") || ""),
            sellLocation: fd.getAll("sellLocation") as string[],
            sellingDescription: String(fd.get("sellingDescription") || ""),
            entrepreneurialTendencies: (fd.get("entrepreneurialTendencies") as any) || undefined,
            entrepreneurialAspirations: String(fd.get("entrepreneurialAspirations") || ""),
            fpoAcceptance: fd.get("fpoAcceptance") === "on",
            additionalNotes: String(fd.get("additionalNotes") || ""),
        };
        await put(PENDING, newItem as any);
        setShowForm(false);
        await hydrateFromIDB();
        syncNow();
    }

    return (
        <div className="h-screen flex bg-gray-100 text-gray-800">
            <Sidebar page={page} onChange={setPage} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Topbar title={page} online={online} syncState={syncState} onSync={syncNow} />

                <main className="flex-1 overflow-y-auto p-6">
                    {page === "data" && (
                        <DataPage
                            villages={VILLAGES}
                            filtered={filtered}
                            sort={sort}
                            setSort={setSort}
                            search={search} setSearch={setSearch}
                            village={village} setVillage={setVillage}
                            configNeeded={configNeeded}
                            onAddRecord={addRecord}
                            onDetails={setDetails}
                            details={details}
                            closeDetails={() => setDetails(null)}
                            showForm={showForm} setShowForm={setShowForm}
                            onUpdateRecord={updateRecord}
                        />
                    )}

                    {page === "dashboard" && <DashboardPage records={records} villages={VILLAGES} />}
                    {page === "recommendations" && <RecommendationsPage />}
                    {page === "bulkImport" && <BulkImportPage onImport={importRecordsBulk} />}
                </main>
            </div>
        </div>
    );
}