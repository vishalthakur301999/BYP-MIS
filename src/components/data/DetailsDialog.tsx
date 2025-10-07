import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Household } from "@/types";
import { RecordEditForm } from "@/components/data/RecordEditForm";
import { put } from "@/lib/idb";
import { PENDING } from "@/lib/idb";

export function DetailsDialog({
                                  item,
                                  onClose,
                                  villages,
                                  onUpdated,
                              }: {
    item: Household | null;
    onClose: () => void;
    villages: string[];
    onUpdated: () => void;   // we'll call this to refresh records
}) {
    return (
        <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Household Record</DialogTitle>
                </DialogHeader>

                {item && (
                    <RecordEditForm
                        record={item}
                        villages={villages}
                        onCancel={onClose}
                        onSave={async (updated) => {
                            // 1️⃣ Update local IDB
                            await put(PENDING, updated as any);
                            // 2️⃣ Notify parent to refresh state (hydrateFromIDB)
                            onUpdated();
                            // 3️⃣ Close dialog
                            onClose();
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}