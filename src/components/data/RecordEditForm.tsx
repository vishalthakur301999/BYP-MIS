import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import type { Household } from "@/types";

export function RecordEditForm({
                                   record,
                                   onCancel,
                                   onSave,
                                   villages
                               }: {
    villages: string[];
    record: Household;
    onCancel: () => void;
    onSave: (updated: Household) => void;
}) {
    const [form, setForm] = useState<Household>({ ...record });

    const setField = (field: keyof Household, value: any) =>
        setForm((f) => ({ ...f, [field]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date" value={form.date} onChange={(v) => setField("date", v)} type="date" required />
            <Field label="Name" value={form.name} onChange={(v) => setField("name", v)} type="text" required />

            <div>
                <Label className="text-sm font-semibold">Village</Label>
                <Select value={form.village} onValueChange={(v) => setField("village", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {villages.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <TextAreaRow
                label="Livelihood Description & NREGA Work"
                value={form.livelihoodDescriptionandnregaWork ?? ""}
                onChange={(v) => setField("livelihoodDescriptionandnregaWork", v)}
            />

            <div>
                <Label className="text-sm font-semibold">MNREGA Status</Label>
                <Select value={form.familyNregaStatus ?? ""} onValueChange={(v) => setField("familyNregaStatus", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                        {["Yes", "No", "Did in the Past"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <CheckboxRow
                label="Landholding"
                checked={form.landholding}
                onChange={(v) => setField("landholding", v)}
            />

            <Field label="Members in Household" value={form.membersInHousehold} onChange={(v) => setField("membersInHousehold", Number(v))} type="number" />
            <Field label="Children in Household" value={form.childrenInHousehold} onChange={(v) => setField("childrenInHousehold", Number(v))} type="number" />

            <TextAreaRow label="Family Notes" value={form.familyNotes} onChange={(v) => setField("familyNotes", v)} />

            <Field label="Kalamandir Chicks Alive" value={form.kalamandirChicksAlive} onChange={(v) => setField("kalamandirChicksAlive", Number(v))} type="number" />
            <Field label="Female Kalamandir Chicks Alive" value={form.femaleKalamandirChicksAlive} onChange={(v) => setField("femaleKalamandirChicksAlive", Number(v))} type="number" />

            <TextAreaRow label="Mortality Category (comma separated)" value={form.mortalityCategory?.join(", ") ?? ""} onChange={(v) => setField("mortalityCategory", v.split(",").map(s=>s.trim()).filter(Boolean))} />
            <TextAreaRow label="Mortality Description" value={form.mortalityDescription} onChange={(v) => setField("mortalityDescription", v)} />

            <Field label="Own Poultry" value={form.ownPoultry} onChange={(v) => setField("ownPoultry", v)} type="text" />
            <TextAreaRow label="Care Description" value={form.careDescription} onChange={(v) => setField("careDescription", v)} />

            <div>
                <Label className="text-sm font-semibold">Azolla Status</Label>
                <Select value={form.azollaStatus ?? ""} onValueChange={(v) => setField("azollaStatus", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                        {["Remaining", "Destroyed", "Data Unavailable", "Not Azolla Beneficiary"].map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <TextAreaRow label="Azolla Notes" value={form.azollaNotes} onChange={(v) => setField("azollaNotes", v)} />

            <TextAreaRow label="Where They Sell (comma separated)" value={form.sellLocation?.join(", ") ?? ""} onChange={(v) => setField("sellLocation", v.split(",").map(s=>s.trim()).filter(Boolean))} />
            <TextAreaRow label="Selling Description" value={form.sellingDescription} onChange={(v) => setField("sellingDescription", v)} />

            <div>
                <Label className="text-sm font-semibold">Entrepreneurial Tendencies</Label>
                <Select value={form.entrepreneurialTendencies ?? ""} onValueChange={(v) => setField("entrepreneurialTendencies", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                        {["Low", "Medium", "High"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <TextAreaRow label="Entrepreneurial Aspirations" value={form.entrepreneurialAspirations} onChange={(v) => setField("entrepreneurialAspirations", v)} />
            <CheckboxRow label="Egg FPO Acceptance" checked={form.fpoAcceptance} onChange={(v) => setField("fpoAcceptance", v)} />
            <TextAreaRow label="Additional Notes" value={form.additionalNotes} onChange={(v) => setField("additionalNotes", v)} />

            <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save</Button>
            </div>
        </form>
    );
}

function Field({
                   label,
                   value,
                   onChange,
                   type,
                   required
               }: {
    label: string;
    value: any;
    onChange: (v: string) => void;
    type: "text" | "date" | "number";
    required?: boolean;
}) {
    return (
        <div>
            <Label className="text-sm font-semibold">{label}</Label>
            <Input type={type} required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1" />
        </div>
    );
}

function TextAreaRow({ label, value, onChange }: { label: string, value: any, onChange: (v: string)=>void }) {
    return (
        <div className="md:col-span-2">
            <Label className="text-sm font-semibold">{label}</Label>
            <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

function CheckboxRow({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v:boolean)=>void }) {
    return (
        <div className="flex items-center gap-3">
            <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
            <Label className="text-sm font-semibold">{label}</Label>
        </div>
    );
}