import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import type { Household } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

/** ==== Your fields ==== */
type RawRow = Record<string, any>;
type Mapping = Record<string, keyof Household | "SKIP">;

const FIELDS: (keyof Household)[] = [
    "date","name","village","livelihoodDescriptionandnregaWork","familyNregaStatus",
    "landholding","membersInHousehold","childrenInHousehold","familyNotes",
    "kalamandirChicksAlive","femaleKalamandirChicksAlive","mortalityCategory","mortalityDescription",
    "ownPoultry","careDescription","azollaStatus","azollaNotes","sellLocation","sellingDescription",
    "entrepreneurialTendencies","entrepreneurialAspirations","fpoAcceptance","additionalNotes"
];

const LABELS: Partial<Record<keyof Household,string>> = {
    date:"Date", name:"Name", village:"Village",
    livelihoodDescriptionandnregaWork:"Livelihood Description",
    familyNregaStatus:"MNREGA Status", landholding:"Landholding?",
    membersInHousehold:"Family Members", childrenInHousehold:"Children",
    kalamandirChicksAlive:"Chicks Alive", femaleKalamandirChicksAlive:"Female Chicks",
    mortalityCategory:"Mortality Category", mortalityDescription:"Mortality Description",
    ownPoultry:"Own Poultry", careDescription:"Care Description",
    azollaStatus:"Azolla Status", azollaNotes:"Azolla Notes",
    sellLocation:"Where They Sell", sellingDescription:"Selling Description",
    entrepreneurialTendencies:"Tendencies", entrepreneurialAspirations:"Aspirations",
    fpoAcceptance:"Egg FPO Acceptance", familyNotes:"Family Notes",
    additionalNotes:"Additional Notes",
};

/** ==== Exact header → field mapping for your sheet ==== */
const EXACT_MAP: Record<string, keyof Household | "SKIP"> = {
    "date": "date",
    "village": "village",
    "name": "name",
    "Livelihood description, NREGA work": "livelihoodDescriptionandnregaWork", // also fills nregaWork (special-case below)
    "Anyone in Family Does MNREGA Work": "familyNregaStatus",
    "Landholding?": "landholding",
    "# members in household": "membersInHousehold",
    "# children": "childrenInHousehold",
    "Family Notes": "familyNotes",
    "# kalamandir chicks alive": "kalamandirChicksAlive",
    "# female kalamandir chicks alive": "femaleKalamandirChicksAlive",
    "Mortality Category": "mortalityCategory",
    "Mortality Description": "mortalityDescription",
    "Own poultry": "ownPoultry",
    "Care description": "careDescription",
    "Azolla Status": "azollaStatus",
    "Azolla Notes": "azollaNotes",
    "Where they sell": "sellLocation",
    "Selling description (price, frequency etc.)": "sellingDescription",
    "Entrepreneurial Tendencies": "entrepreneurialTendencies",
    "Entrepreneurial Aspirations": "entrepreneurialAspirations",
    "Village Level Egg FPO Acceptance": "fpoAcceptance",
    "Additional Notes": "additionalNotes",
};

/** Heuristic for any unexpected new columns */
const guessField = (header: string): keyof Household | "SKIP" => {
    if (EXACT_MAP[header] !== undefined) return EXACT_MAP[header];
    const h = header.trim().toLowerCase();
    if (h.includes("date")) return "date";
    if (h === "name") return "name";
    if (h.includes("village")) return "village";
    if (h.includes("members")) return "membersInHousehold";
    if (h.includes("children")) return "childrenInHousehold";
    if (h.includes("land")) return "landholding";
    if (h.includes("female") && h.includes("chick")) return "femaleKalamandirChicksAlive";
    if (h.includes("kalamandir") || (h.includes("chick") && !h.includes("female"))) return "kalamandirChicksAlive";
    if (h.includes("nrega")) return "nregaWork";
    if (h.includes("livelihood")) return "livelihoodDescription";
    if (h.includes("mortality") && h.includes("category")) return "mortalityCategory";
    if (h.includes("mortality")) return "mortalityDescription";
    if (h.includes("sell")) return "sellLocation";
    if (h.includes("tendenc")) return "entrepreneurialTendencies";
    if (h.includes("azolla") && h.includes("status")) return "azollaStatus";
    if (h.includes("azolla")) return "azollaNotes";
    if (h.includes("fpo")) return "fpoAcceptance";
    if (h.includes("family") && h.includes("notes")) return "familyNotes";
    if (h.includes("notes")) return "additionalNotes";
    return "SKIP";
};

/** Parsing/normalization for your sheet */
function parseDateToISO(input: any): string {
    if (input === null || input === undefined || input === "") return "";

    // Case 1: Excel serial number (e.g. 45123)
    if (typeof input === "number" || /^\d+(\.\d+)?$/.test(String(input))) {
        const serial = Number(input);
        const d = XLSX.SSF.parse_date_code(serial);
        if (d) {
            const y = d.y;
            const m = String(d.m).padStart(2, "0");
            const dd = String(d.d).padStart(2, "0");
            return `${y}-${m}-${dd}`;
        }
    }

    const s = String(input).trim();

    // Case 2: dd/mm/yy or dd/mm/yyyy
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
        const [, d, mm, y] = m;
        const year = y.length === 2 ? (Number(y) + 2000) : Number(y);
        const month = String(Number(mm)).padStart(2, "0");
        const day = String(Number(d)).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    // Case 3: ISO or something JS can parse
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const mth = String(parsed.getMonth() + 1).padStart(2, "0");
        const dd = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${mth}-${dd}`;
    }

    return s; // fallback: leave as-is
}

function normalizeValue(field: keyof Household, v: any): any {
    if (v === null || v === undefined) return undefined;
    // Excel sometimes gives numbers for text columns; coerce to string then trim
    const s = typeof v === "string" ? v.trim() : v;

    // numbers
    const numFields: (keyof Household)[] = ["membersInHousehold","childrenInHousehold","kalamandirChicksAlive","femaleKalamandirChicksAlive"];
    if (numFields.includes(field)) return Number(s) || 0;

    // booleans
    const boolFields: (keyof Household)[] = ["landholding","fpoAcceptance"];
    if (boolFields.includes(field)) {
        const sv = String(s).toLowerCase();
        return ["1","true","yes","y"].includes(sv);
    }

    // lists
    if (field === "mortalityCategory" || field === "sellLocation") {
        if (Array.isArray(v)) return v;
        const text = String(s);
        if (!text) return [];
        return text.split(/[,;|]/).map(t=>t.trim()).filter(Boolean);
    }

    // enums/simple strings
    if (field === "familyNregaStatus" || field === "azollaStatus" || field === "entrepreneurialTendencies") {
        const text = String(s).trim();
        return text || undefined;
    }

    // date
    if (field === "date") return parseDateToISO(String(s));

    // plain text
    return String(s);
}

export function BulkImportPage({ onImport }:{ onImport: (records: Household[]) => Promise<void> }) {
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<RawRow[]>([]);
    const [mapping, setMapping] = useState<Mapping>({});
    const [error, setError] = useState<string>("");

    const fileRef = useRef<HTMLInputElement>(null);

    const mappedPreview = useMemo(() => {
        if (!rows.length) return [];
        return rows.slice(0, 20).map((r) => buildHouseholdFromRow(r, mapping));
    }, [rows, mapping]);

    function buildHouseholdFromRow(r: RawRow, map: Mapping): Partial<Household> {
        const h: Partial<Household> = {};
        for (const [col, field] of Object.entries(map)) {
            if (field === "SKIP") continue;
            const val = normalizeValue(field, r[col]);

            // special-case: combined column fills both fields
            if (col === "Livelihood description, NREGA work") {
                h.livelihoodDescriptionandnregaWork = String(r[col] ?? "");
                continue;
            }

            (h as any)[field] = val;
        }
        return h;
    }

    function seedMapping(hdrs: string[]) {
        const m: Mapping = {};
        hdrs.forEach(h => { m[h] = guessField(h); });
        setMapping(m);
    }

    function handleFile(file: File) {
        setError("");
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const wb = XLSX.read(reader.result, { type: "array" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data: RawRow[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
                const hdrs = (XLSX.utils.sheet_to_json(ws, { header: 1 })[0] as string[]).map(String);
                setRows(data);
                setHeaders(hdrs);
                seedMapping(hdrs);
            } catch (e:any) {
                setError(e?.message || "Failed to parse file");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function handleImport() {
        if (!rows.length) return;
        const out: Household[] = rows.map((r) => {
            const partial = buildHouseholdFromRow(r, mapping);
            const h: any = {
                id: `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                ...partial,
            };
            // defaults
            h.date ??= "";
            h.name ??= "";
            h.village ??= "";
            h.membersInHousehold ??= 0;
            h.childrenInHousehold ??= 0;
            h.kalamandirChicksAlive ??= 0;
            h.femaleKalamandirChicksAlive ??= 0;
            h.landholding ??= false;
            h.fpoAcceptance ??= false;
            h.mortalityCategory ??= [];
            h.sellLocation ??= [];
            return h as Household;
        });

        await onImport(out);
    }

    function downloadTemplate() {
        const cols = Object.keys(EXACT_MAP);
        const ws = XLSX.utils.aoa_to_sheet([cols]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const url = URL.createObjectURL(new Blob([out]));
        const a = document.createElement("a");
        a.href = url; a.download = "households_template.xlsx"; a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Bulk Import</h3>
                    <Button variant="secondary" onClick={downloadTemplate}>Download Template</Button>
                </div>
                <Separator className="my-4" />

                <div className="flex flex-col gap-3">
                    <div className="md:w-96">
                        <Label>Upload Excel or CSV</Label>
                        <Input
                            ref={fileRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => e.currentTarget.files?.[0] && handleFile(e.currentTarget.files[0])}
                            className="mt-1"
                        />
                        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                    </div>

                    {headers.length > 0 && (
                        <>
                            <Separator className="my-2" />
                            <h4 className="font-semibold">Step 2: Map Columns</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {headers.map(h => (
                                    <div key={h} className="flex items-center gap-2">
                                        <Label className="w-1/2 truncate" title={h}>{h}</Label>
                                        <Select
                                            value={(mapping[h] ?? "SKIP") as string}
                                            onValueChange={(v) => setMapping(m => ({ ...m, [h]: v as any }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SKIP">Skip</SelectItem>
                                                {FIELDS.map(f => (
                                                    <SelectItem key={f} value={f}>{LABELS[f] ?? f}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>

                            <Separator className="my-4" />
                            <h4 className="font-semibold mb-2">Step 3: Preview (first 20)</h4>
                            <ScrollArea className="border rounded-md max-h-[50vh]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {FIELDS.map(f => <TableHead key={f}>{LABELS[f] ?? f}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mappedPreview.length === 0 ? (
                                            <TableRow><TableCell colSpan={FIELDS.length} className="text-center py-6">No rows</TableCell></TableRow>
                                        ) : mappedPreview.map((r, i) => (
                                            <TableRow key={i}>
                                                {FIELDS.map(f => (
                                                    <TableCell key={String(f)}>
                                                        {Array.isArray((r as any)[f]) ? (r as any)[f].join(", ") : String((r as any)[f] ?? "")}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>

                            <div className="flex justify-end mt-4">
                                <Button onClick={handleImport} disabled={rows.length === 0}>
                                    Import {rows.length} Rows
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}