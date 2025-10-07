import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Household } from "@/types";
import { RecordEditForm } from "@/components/data/RecordEditForm";

export function DetailsDialog({
                                  item,
                                  onClose,
                                  villages,
                                  onUpdated,
                              }: {
    item: Household | null;
    onClose: () => void;
    villages: string[];
    onUpdated: (updated: Household) => Promise<void>;
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
                            await onUpdated(updated);
                            onClose();
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}