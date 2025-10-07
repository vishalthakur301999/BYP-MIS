// src/components/layout/Sidebar.tsx
import { cn } from "@/lib/utils";

type Page = "data" | "dashboard" | "recommendations" | "bulkImport";

export function Sidebar({ page, onChange }:{
    page: Page;
    onChange: (p: Page) => void;
}) {
    const items: Page[] = ["data","dashboard","recommendations","bulkImport"];
    return (
        <aside className="w-64 bg-zinc-900 text-zinc-100 flex flex-col">
            <div className="p-4 text-2xl font-bold border-b border-zinc-800">BYP MIS</div>
            <nav className="p-2 space-y-2">
                {items.map(p => (
                    <button
                        key={p}
                        onClick={() => onChange(p)}
                        className={cn(
                            "w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition",
                            page === p && "bg-zinc-800 font-semibold"
                        )}
                    >
                        {p === "data" && "Data"}
                        {p === "dashboard" && "Dashboard"}
                        {p === "recommendations" && "Recommendations"}
                        {p === "bulkImport" && "Import"}
                    </button>
                ))}
            </nav>
        </aside>
    );
}