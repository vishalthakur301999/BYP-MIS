// src/components/data/RecordForm.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export function RecordForm({
                               villages,
                               onCancel,
                               onSubmit
                           }:{
    villages: string[];
    onCancel: () => void;
    onSubmit: (fd: FormData) => void;
}) {
    const [vill, setVill] = useState<string>("");
    const [familyNregaStatus, setFam] = useState<string>("");
    const [azolla, setAzolla] = useState<string>("");
    const [tend, setTend] = useState<string>("");

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (vill) fd.set("village", vill);
        if (familyNregaStatus) fd.set("familyNregaStatus", familyNregaStatus);
        if (azolla) fd.set("azollaStatus", azolla);
        if (tend) fd.set("entrepreneurialTendencies", tend);
        onSubmit(fd);
    };

    return (
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
            <Field id="date" label="Date" type="date" required />
            <Field id="name" label="Name" type="text" required />

            <div>
                <Label className="text-sm font-semibold">Village</Label>
                <Select value={vill} onValueChange={setVill}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select village" /></SelectTrigger>
                    <SelectContent>
                        {villages.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                </Select>
                <input type="hidden" name="village" value={vill} />
            </div>

            <TextArea id="livelihoodDescriptionandnregawork" label="Livelihood Description and NREGA Work" />


            <div>
                <Label className="text-sm font-semibold">Anyone in Family Does MNREGA Work</Label>
                <Select value={familyNregaStatus} onValueChange={setFam}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                        {["Yes","No","Did in the Past"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                </Select>
                <input type="hidden" name="familyNregaStatus" value={familyNregaStatus} />
            </div>

            <CheckboxRow id="landholding" label="Landholding" />

            <Field id="membersInHousehold" label="Members in Household" type="number" />
            <Field id="childrenInHousehold" label="Children in Household" type="number" />
            <TextArea id="familyNotes" label="Family Notes" />

            <Field id="kalamandirChicksAlive" label="Kalamandir Chicks Alive" type="number" />
            <Field id="femaleKalamandirChicksAlive" label="Female Kalamandir Chicks Alive" type="number" />

            <MultiCheck name="mortalityCategory" label="Mortality Category"
                        options={["Disease","Predator","Improper Care","Others"]} />
            <TextArea id="mortalityDescription" label="Mortality Description" />

            <Field id="ownPoultry" label="Own Poultry" type="text" />
            <TextArea id="careDescription" label="Care Description" />

            <div>
                <Label className="text-sm font-semibold">Azolla Status</Label>
                <Select value={azolla} onValueChange={setAzolla}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                        {["Remaining","Destroyed","Data Unavailable","Not Azolla Beneficiary"].map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <input type="hidden" name="azollaStatus" value={azolla} />
            </div>

            <TextArea id="azollaNotes" label="Azolla Notes" />

            <MultiCheck name="sellLocation" label="Where They Sell"
                        options={["Haat Market","Middlemen","Neighbors/intra-village","Others","NA"]} />
            <TextArea id="sellingDescription" label="Selling Description" />

            <div>
                <Label className="text-sm font-semibold">Entrepreneurial Tendencies</Label>
                <Select value={tend} onValueChange={setTend}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                        {["Low","Medium","High"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                </Select>
                <input type="hidden" name="entrepreneurialTendencies" value={tend} />
            </div>

            <TextArea id="entrepreneurialAspirations" label="Entrepreneurial Aspirations" />
            <CheckboxRow id="fpoAcceptance" label="Village Level Egg FPO Acceptance" />
            <TextArea id="additionalNotes" label="Additional Notes" />

            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Record</Button>
            </div>
        </form>
    );
}

function Field(props: { id: string, label: string, type: "text"|"date"|"number", required?: boolean }) {
    return (
        <div>
            <Label htmlFor={props.id} className="text-sm font-semibold">{props.label}</Label>
            <Input id={props.id} name={props.id} type={props.type} required={props.required} className="mt-1" />
        </div>
    );
}

function TextArea({ id, label }: { id: string, label: string }) {
    return (
        <div className="md:col-span-2">
            <Label htmlFor={id} className="text-sm font-semibold">{label}</Label>
            <textarea id={id} name={id}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                      rows={3}
            />
        </div>
    );
}

function CheckboxRow({ id, label }: { id: string, label: string }) {
    return (
        <div className="flex items-center gap-3">
            <Checkbox id={id} name={id} />
            <Label htmlFor={id} className="text-sm font-semibold">{label}</Label>
        </div>
    );
}

function MultiCheck({ name, label, options }: { name: string, label: string, options: string[] }) {
    return (
        <div className="md:col-span-2">
            <Label className="text-sm font-semibold">{label}</Label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {options.map(o => (
                    <label key={o} className="flex items-center gap-2">
                        <input type="checkbox" name={name} value={o} className="h-4 w-4 accent-black" />
                        <span className="text-sm">{o}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}