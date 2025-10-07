// src/pages/DataPage.tsx
const ALL_VILLAGES = "__ALL__";
import type { Household } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, SortState } from "@/components/data/DataTable";
import { RecordForm } from "@/components/data/RecordForm";
import { DetailsDialog } from "@/components/data/DetailsDialog";

export function DataPage({
                             villages,
                             filtered,
                             sort,
                             setSort,
                             search, setSearch,
                             village, setVillage,
                             configNeeded,
                             onAddRecord,
                             onDetails,
                             details,
                             closeDetails,
                             showForm, setShowForm,
                             onUpdateRecord
                         }:{
    villages: string[];
    filtered: Household[];
    sort: SortState;
    setSort: (s: SortState | ((s: SortState) => SortState)) => void;
    search: string; setSearch: (v: string) => void;
    village: string; setVillage: (v: string) => void;
    configNeeded: boolean;
    onAddRecord: (fd: FormData) => void;
    onDetails: (row: Household) => void;
    details: Household | null;
    closeDetails: () => void;
    showForm: boolean; setShowForm: (v: boolean) => void;
    onUpdateRecord: (updated: Household) => Promise<void>;
}) {
    const toggleSort = (key: keyof Household) =>
        setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

    return (
        <section className="space-y-4">
            {configNeeded && (
                <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4 text-red-700">
                    <div className="font-bold">Configuration Needed</div>
                    <div>Set your Firebase env vars to enable sync.</div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="text-xl font-semibold">Household Data Records</h3>
                    <Button onClick={() => setShowForm(true)}>Add New Record</Button>
                </div>

                <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <Input placeholder="Search by name, village, etc…" value={search} onChange={(e) => setSearch(e.target.value)} /><Select
                    value={village || undefined}               // <- undefined when none selected
                    onValueChange={(v) => setVillage(v === ALL_VILLAGES ? "" : v)}
                >
                    <SelectTrigger className="w-full md:w-64">
                        <SelectValue placeholder="Filter by Village" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_VILLAGES}>All Villages</SelectItem>
                        {villages.map(v => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                </div>

                <ScrollArea className="w-full">
                    <DataTable rows={filtered} sort={sort} onToggleSort={toggleSort} onDetails={onDetails} />
                </ScrollArea>
            </div>

            {/* Add Record Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Household Record</DialogTitle>
                    </DialogHeader>

                    {/* Scrollable form container */}
                    <div className="overflow-y-auto pr-1">
                        <RecordForm villages={villages} onCancel={() => setShowForm(false)} onSubmit={onAddRecord} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Details */}
            {/* Details */}
            <DetailsDialog item={details} onClose={closeDetails} villages={villages} onUpdated={onUpdateRecord} />
        </section>
    );
}