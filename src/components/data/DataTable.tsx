// src/components/data/DataTable.tsx
import type { Household } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type SortState = { key: keyof Household, dir: "asc"|"desc" };

export function DataTable({
                              rows,
                              sort,
                              onToggleSort,
                              onDetails
                          }:{
    rows: Household[];
    sort: SortState;
    onToggleSort: (key: keyof Household) => void;
    onDetails: (row: Household) => void;
}) {
    const headers: [keyof Household, string][] = [
        ["name","Name"],
        ["village","Village"],
        ["landholding","Landholding"],
        ["membersInHousehold","Family Members"],
        ["kalamandirChicksAlive","Chicks Alive"],
        ["femaleKalamandirChicksAlive","Female Chicks"],
        ["azollaStatus","Azolla Status"],
        ["entrepreneurialTendencies","Tendencies"],
    ];

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {headers.map(([k, label]) => (
                        <TableHead
                            key={String(k)}
                            className="cursor-pointer select-none"
                            onClick={() => onToggleSort(k)}
                        >
                            {label}{" "}
                            <span className="text-xs opacity-70">
                {sort.key === k ? (sort.dir === "asc" ? "▲" : "▼") : ""}
              </span>
                        </TableHead>
                    ))}
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={9} className="text-center py-6">No records found.</TableCell>
                    </TableRow>
                ) : rows.map(r => (
                    <TableRow key={r.id} className="hover:bg-zinc-50">
                        <TableCell>{r.name ?? ""}</TableCell>
                        <TableCell>{r.village ?? ""}</TableCell>
                        <TableCell>{r.landholding ? <Badge>Yes</Badge> : "No"}</TableCell>
                        <TableCell>{r.membersInHousehold ?? ""}</TableCell>
                        <TableCell>{r.kalamandirChicksAlive ?? ""}</TableCell>
                        <TableCell>{r.femaleKalamandirChicksAlive ?? ""}</TableCell>
                        <TableCell>{r.azollaStatus ?? ""}</TableCell>
                        <TableCell>{r.entrepreneurialTendencies ?? ""}</TableCell>
                        <TableCell>
                            <button className="text-blue-600 underline" onClick={() => onDetails(r)}>More Info</button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}