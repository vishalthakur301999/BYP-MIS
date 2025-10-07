// src/components/layout/Topbar.tsx
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/StatusDot";

export function Topbar({
                           title,
                           online,
                           syncState,
                           onSync
                       }:{
    title: string;
    online: boolean;
    syncState: "offline"|"syncing"|"synced"|"online";
    onSync: () => void;
}) {
    return (
        <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                <h2 className="text-2xl font-semibold capitalize">{title}</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <StatusDot state={online ? "online" : "offline"} />
                        <span className="text-sm font-medium">{online ? "Online" : "Offline"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusDot state={syncState} />
                        <span className="text-sm font-medium">
              {syncState === "syncing" ? "Syncing..." : syncState === "synced" ? "Synced" : syncState}
            </span>
                    </div>
                    <Button size="sm" onClick={onSync}>Sync Now</Button>
                </div>
            </div>
        </header>
    );
}