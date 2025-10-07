import { useMemo, useRef, useState, useEffect } from "react";
import type { Household } from "@/types";
import {
    PieChart, Pie, Cell,
    Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const COLORS = ["#10B981", "#EF4444", "#F59E0B", "#6B7280", "#3B82F6", "#8B5CF6"];
const INITIAL_PER_HOUSEHOLD = 7;

export function DashboardPage({
                                  records,
                                  villages,
                              }: {
    records: Household[];
    villages: string[];
}) {
    // ---------------- Multi-select villages ----------------
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (!boxRef.current) return;
            if (!boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, [open]);

    const filteredVillages = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return villages;
        return villages.filter(v => v.toLowerCase().includes(q));
    }, [query, villages]);

    const toggleVillage = (v: string) =>
        setSelected(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));
    const clearAll = () => setSelected([]);

    const filteredRecords = useMemo(() => {
        if (selected.length === 0) return records;
        const set = new Set(selected);
        return records.filter(r => set.has(r.village));
    }, [records, selected]);

    // ---------------- Aggregations ----------------

    // MNREGA status pie
    const nregaData = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const r of filteredRecords) {
            const key = r.familyNregaStatus ?? "Unknown";
            counts[key] = (counts[key] || 0) + 1;
        }
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredRecords]);

    // Entrepreneurial Tendencies bar
    const entrepreneurialData = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const r of filteredRecords) {
            const key = r.entrepreneurialTendencies ?? "Unknown";
            counts[key] = (counts[key] || 0) + 1;
        }
        // keep a friendly order
        const order = ["Low", "Medium", "High", "Unknown"];
        return order
            .filter(k => counts[k] !== undefined)
            .map(k => ({ name: k, value: counts[k] }));
    }, [filteredRecords]);

    // Azolla status pie
    const azollaPieData = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const r of filteredRecords) {
            const key = r.azollaStatus ?? "Unknown";
            counts[key] = (counts[key] || 0) + 1;
        }
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredRecords]);

    // Azolla by village stacked bar (span 2 columns)
    const azollaByVillageData = useMemo(() => {
        const statuses = ["Remaining", "Destroyed", "Data Unavailable", "Not Azolla Beneficiary", "Unknown"];
        const map: Record<string, Record<string, number>> = {};
        for (const r of filteredRecords) {
            const v = r.village || "Unknown";
            const status = r.azollaStatus ?? "Unknown";
            if (!map[v]) map[v] = {};
            map[v][status] = (map[v][status] || 0) + 1;
        }
        return Object.entries(map).map(([village, counts]) => {
            const row: any = { village };
            statuses.forEach(s => { row[s] = counts[s] || 0; });
            return row;
        });
    }, [filteredRecords]);

    // Female chicks frequency distribution (0..7; clamp others)
    const femaleFreqData = useMemo(() => {
        const buckets = Array.from({ length: 8 }, (_, i) => i); // 0..7
        const counts = new Array(8).fill(0);
        for (const r of filteredRecords) {
            const n = Math.max(0, Math.min(7, Number(r.femaleKalamandirChicksAlive ?? 0)));
            counts[n] += 1;
        }
        return buckets.map((b, i) => ({ count: b, households: counts[i] }));
    }, [filteredRecords]);

    // Mortality rate tile (based on total alive vs. initial per household)
    const mortality = useMemo(() => {
        const totalHH = filteredRecords.length;
        const totalInitial = totalHH * INITIAL_PER_HOUSEHOLD;
        const totalAlive = filteredRecords.reduce(
            (sum, r) => sum + Number(r.kalamandirChicksAlive ?? 0),
            0
        );
        const dead = Math.max(0, totalInitial - totalAlive);
        const rate = totalInitial > 0 ? (dead / totalInitial) * 100 : 0;
        return {
            totalHH,
            totalInitial,
            totalAlive,
            dead,
            rate: Number(rate.toFixed(1)),
        };
    }, [filteredRecords]);

    // ---------------- Sell Location Pie ----------------
    const sellLocationPieData = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const r of filteredRecords) {
            if (Array.isArray(r.sellLocation)) {
                for (const loc of r.sellLocation) {
                    const key = loc.trim();
                    if (key) counts[key] = (counts[key] || 0) + 1;
                }
            }
            else if (typeof r.sellLocation === "string") {
                // @ts-expect-error jjj
                r.sellLocation.split(",").map(s => s.trim()).filter(Boolean).forEach(key => {
                    counts[key] = (counts[key] || 0) + 1;
                });
            }
        }
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredRecords]);

    // ---------------- Mortality Category Bar ----------------
        const mortalityCategoryBarData = useMemo(() => {
            const counts: Record<string, number> = {};
            for (const r of filteredRecords) {
                if (Array.isArray(r.mortalityCategory)) {
                    for (const cat of r.mortalityCategory) {
                        const key = cat.trim();
                        if (key) counts[key] = (counts[key] || 0) + 1;
                    }
                } else if (typeof r.mortalityCategory === "string") {
                    // @ts-expect-error jjj
                    r.mortalityCategory.split(",").map(s => s.trim()).filter(Boolean).forEach(key => {
                        counts[key] = (counts[key] || 0) + 1;
                    });
                }
            }
            // turn into array and sort descending
            return Object.entries(counts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);
        }, [filteredRecords]);

    // ------------- Landholding pie -------------
    const landholdingPieData = useMemo(() => {
        const counts: Record<string, number> = { "Landholding": 0, "No Landholding": 0, "Unknown": 0 };
        for (const r of filteredRecords) {
            if (typeof r.landholding === "boolean") {
                counts[r.landholding ? "Landholding" : "No Landholding"] += 1;
            } else {
                counts["Unknown"] += 1;
            }
        }
        return Object.entries(counts)
            .filter(([,v]) => v > 0)
            .map(([name, value]) => ({ name, value }));
    }, [filteredRecords]);

// ------------- Household size distribution (bar) -------------
    const householdSizeBarData = useMemo(() => {
        const counts: Record<number, number> = {};
        for (const r of filteredRecords) {
            const n = Math.max(0, Number(r.membersInHousehold ?? 0));
            counts[n] = (counts[n] ?? 0) + 1;
        }
        return Object.keys(counts)
            .map(k => Number(k))
            .sort((a,b) => a - b)
            .map(k => ({ size: k, households: counts[k] }));
    }, [filteredRecords]);

// ------------- Children per household (bar) -------------
    const childrenBarData = useMemo(() => {
        const counts: Record<number, number> = {};
        for (const r of filteredRecords) {
            const n = Math.max(0, Number(r.childrenInHousehold ?? 0));
            counts[n] = (counts[n] ?? 0) + 1;
        }
        return Object.keys(counts)
            .map(k => Number(k))
            .sort((a,b) => a - b)
            .map(k => ({ children: k, households: counts[k] }));
    }, [filteredRecords]);

// ------------- Adults per household (bar) -------------
    const adultsBarData = useMemo(() => {
        const counts: Record<number, number> = {};
        for (const r of filteredRecords) {
            const members = Math.max(0, Number(r.membersInHousehold ?? 0));
            const kids = Math.max(0, Number(r.childrenInHousehold ?? 0));
            const adults = Math.max(0, members - kids);
            counts[adults] = (counts[adults] ?? 0) + 1;
        }
        return Object.keys(counts)
            .map(k => Number(k))
            .sort((a,b) => a - b)
            .map(k => ({ adults: k, households: counts[k] }));
    }, [filteredRecords]);

// ------------- Selling Location by Village (stacked bar) -------------
    const sellingByVillageData = useMemo(() => {
        // Normalize to a known order but include any unexpected labels too
        const known = ["Haat Market","Middlemen","Neighbors/intra-village","Others","NA","Unknown"];
        const allCats = new Set<string>(known);

        const splitLocs = (val: any): string[] => {
            if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
            if (typeof val === "string") {
                const arr = val.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
                return arr.length ? arr : ["Unknown"];
            }
            return ["Unknown"];
        };

        // village -> category -> count
        const map: Record<string, Record<string, number>> = {};
        for (const r of filteredRecords) {
            const v = r.village || "Unknown";
            const cats = splitLocs(r.sellLocation);
            if (!map[v]) map[v] = {};
            for (const c of cats) {
                allCats.add(c);
                map[v][c] = (map[v][c] || 0) + 1;
            }
        }

        const catList = Array.from(allCats);
        // build rows
        const rows = Object.entries(map).map(([village, counts]) => {
            const row: any = { village };
            for (const c of catList) row[c] = counts[c] || 0;
            return row;
        });

        return { rows, catList };
    }, [filteredRecords]);

    // --- Mortality Rate by Village ---
    const mortalityByVillage = Object.values(
        records.reduce((acc: any, r) => {
            if (!r.village) return acc;
            const dead = 7 - (r.kalamandirChicksAlive ?? 0);
            const mortalityRate = (dead / 7) * 100;
            if (!acc[r.village]) acc[r.village] = { village: r.village, total: 0, count: 0 };
            acc[r.village].total += mortalityRate;
            acc[r.village].count++;
            return acc;
        }, {})
    ).map((d: any) => ({
        village: d.village,
        mortalityRate: d.count > 0 ? d.total / d.count : 0,
    }));

    // --- Entrepreneurial Tendencies by Village (Stacked Bar) ---
    const entByVillage = Object.values(
        records.reduce((acc: any, r) => {
            if (!r.village) return acc;
            if (!acc[r.village]) acc[r.village] = { village: r.village, Low: 0, Medium: 0, High: 0 };
            if (r.entrepreneurialTendencies) {
                acc[r.village][r.entrepreneurialTendencies] =
                    (acc[r.village][r.entrepreneurialTendencies] || 0) + 1;
            }
            return acc;
        }, {})
    );

    // --- Egg FPO Acceptance Pie ---
    const fpoYes = records.filter(r => r.fpoAcceptance).length;
    const fpoNo = records.filter(r => !r.fpoAcceptance).length;
    const fpoData = [
        { name: "Accepted", value: fpoYes },
        { name: "Not Accepted", value: fpoNo },
    ];

    return (
        <div className="space-y-6">
            {/* Header + Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">Dashboard</h2>

                <div className="relative" ref={boxRef}>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setOpen(o => !o)}>
                            {selected.length === 0 ? "Filter by Villages" : `Villages (${selected.length})`}
                        </Button>
                        {selected.length > 0 && (
                            <Button variant="secondary" size="sm" onClick={clearAll}>Clear</Button>
                        )}
                    </div>

                    {open && (
                        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border bg-white p-3 shadow">
                            <Input
                                placeholder="Search villages…"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                className="mb-2"
                            />
                            <div className="max-h-64 overflow-auto pr-1">
                                {filteredVillages.map(v => {
                                    const checked = selected.includes(v);
                                    return (
                                        <label
                                            key={v}
                                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50"
                                            onClick={() => toggleVillage(v)}
                                        >
                                            <Checkbox checked={checked} onCheckedChange={() => toggleVillage(v)} />
                                            <span className="text-sm">{v}</span>
                                        </label>
                                    );
                                })}
                                {filteredVillages.length === 0 && (
                                    <div className="py-6 text-center text-sm text-zinc-500">No matches</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chips */}
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selected.map(v => (
                        <Badge key={v} variant="secondary" className="pr-1">
                            {v}
                            <button
                                aria-label={`Remove ${v}`}
                                className="ml-2 rounded px-1 text-xs text-zinc-600 hover:bg-zinc-200"
                                onClick={() => toggleVillage(v)}
                            >
                                ✕
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* KPI Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Tile title="Mortality Rate" value={`${mortality.rate}%`} sub={`${mortality.dead} / ${mortality.totalInitial} chicks lost`} />
                <Tile title="Total Households" value={mortality.totalHH.toString()} />
                <Tile title="Chicks Alive" value={mortality.totalAlive.toString()} />
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* MNREGA pie */}
                <ChartCard title="MNREGA Status Distribution">
                    <div className="w-full h-80">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={nregaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                                    {nregaData.map((_, i) => (
                                        <Cell key={`nrega-${i}`} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Entrepreneurial bar */}
                <ChartCard title="Entrepreneurial Tendencies">
                    <div className="w-full h-80">
                        <ResponsiveContainer>
                            <BarChart data={entrepreneurialData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Azolla pie */}
                <ChartCard title="Azolla Status Distribution">
                    <div className="w-full h-80">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={azollaPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                                    {azollaPieData.map((_, i) => (
                                        <Cell key={`azolla-${i}`} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Female chicks frequency */}
                <ChartCard title="Female Chicks Alive per Household (0–7)">
                    <div className="w-full h-96">
                        <ResponsiveContainer>
                            <BarChart data={femaleFreqData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="count" label={{ value: "Female chicks alive", position: "insideBottom", offset: -5 }} />
                                <YAxis allowDecimals={false} label={{ value: "Households", angle: -90, position: "insideLeft" }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="households" name="Households" fill="#10B981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Azolla by village stacked — make it 2 columns wide */}
                <ChartCard title="Azolla Status by Village (Stacked)" className="md:col-span-2 xl:col-span-2">
                    <div className="w-full h-[480px]">
                        <ResponsiveContainer>
                            <BarChart data={azollaByVillageData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="village" interval={0} angle={-30} textAnchor="end" height={80} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                {["Remaining", "Destroyed", "Data Unavailable", "Not Azolla Beneficiary", "Unknown"].map((status, i) => (
                                    <Bar key={status} dataKey={status} stackId="a" fill={COLORS[i % COLORS.length]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Sell Location Pie */}
                <ChartCard title="Where They Sell">
                    <div className="w-full h-96">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={sellLocationPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={120}
                                    label
                                >
                                    {sellLocationPieData.map((_, i) => (
                                        <Cell key={`sell-${i}`} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Mortality Category Bar */}
                <ChartCard title="Mortality Categories">
                    <div className="w-full h-96">
                        <ResponsiveContainer>
                            <BarChart data={mortalityCategoryBarData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={80} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" name="Households" fill="#F59E0B" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
                {/* Landholding vs Non-Landholding */}
                <ChartCard title="Landholding vs Non-Landholding">
                    <div className="w-full h-80">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={landholdingPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={110}
                                    label
                                >
                                    {landholdingPieData.map((_, i) => (
                                        <Cell key={`land-${i}`} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Household Size Distribution */}
                <ChartCard title="Household Size Distribution">
                    <div className="w-full h-96">
                        <ResponsiveContainer>
                            <BarChart data={householdSizeBarData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="size" label={{ value: "Members", position: "insideBottom", offset: -5 }} />
                                <YAxis allowDecimals={false} label={{ value: "Households", angle: -90, position: "insideLeft" }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="households" name="Households" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Children per Household */}
                <ChartCard title="Children per Household">
                    <div className="w-full h-96">
                        <ResponsiveContainer>
                            <BarChart data={childrenBarData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="children" label={{ value: "Children", position: "insideBottom", offset: -5 }} />
                                <YAxis allowDecimals={false} label={{ value: "Households", angle: -90, position: "insideLeft" }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="households" name="Households" fill="#10B981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Adults per Household (Members - Children) */}
                <ChartCard title="Adults per Household">
                    <div className="w-full h-96">
                        <ResponsiveContainer>
                            <BarChart data={adultsBarData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="adults" label={{ value: "Adults", position: "insideBottom", offset: -5 }} />
                                <YAxis allowDecimals={false} label={{ value: "Households", angle: -90, position: "insideLeft" }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="households" name="Households" fill="#F59E0B" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Selling Location by Village (Stacked, 2 wide) */}
                <ChartCard title="Selling Location by Village (Stacked)" className="md:col-span-2 xl:col-span-2">
                    <div className="w-full h-[480px]">
                        <ResponsiveContainer>
                            <BarChart data={sellingByVillageData.rows}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="village" interval={0} angle={-30} textAnchor="end" height={80} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                {sellingByVillageData.catList.map((cat, i) => (
                                    <Bar key={cat} dataKey={cat} stackId="sell" fill={COLORS[i % COLORS.length]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Egg FPO Acceptance */}
                <ChartCard title="Egg FPO Acceptance">
                    <div className="w-full h-80">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={fpoData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                >
                                    {fpoData.map((_, i) => (
                                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Mortality Rate by Village */}
                <ChartCard title="Mortality Rate by Village (%)" className="md:col-span-2 xl:col-span-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={mortalityByVillage}>
                            <XAxis dataKey="village" angle={-30} textAnchor="end" interval={0} height={80} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="mortalityRate" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Entrepreneurial Tendencies by Village */}
                <ChartCard title="Entrepreneurial Tendencies by Village" className="md:col-span-2 xl:col-span-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={entByVillage}>
                            <XAxis dataKey="village" angle={-30} textAnchor="end" interval={0} height={80} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Low" stackId="a" fill="#fbbf24" />
                            <Bar dataKey="Medium" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="High" stackId="a" fill="#22c55e" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>



            </div>
        </div>
    );
}

function Tile({ title, value, sub }: { title: string; value: string; sub?: string }) {
    return (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-zinc-500">{title}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
            {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
        </div>
    );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-xl border bg-white p-5 shadow-sm flex flex-col ${className ?? ""}`}>
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="flex-1">{children}</div>
        </div>
    );
}