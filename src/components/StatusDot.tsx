// src/components/StatusDot.tsx
import {cn} from "@/lib/utils";

export function StatusDot({ state }: { state: "online"|"offline"|"syncing"|"synced" }) {
    const color = {
        online: "bg-emerald-500",
        offline: "bg-rose-500",
        syncing: "bg-yellow-400",
        synced: "bg-sky-500",
    }[state];
    return <span className={cn("inline-block h-3 w-3 rounded-full transition-colors", color)} />;
}