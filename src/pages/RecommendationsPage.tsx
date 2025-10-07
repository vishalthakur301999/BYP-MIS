// src/pages/RecommendationsPage.tsx
import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pencil, Save, X, Bold, Italic, List, ListOrdered, Plus } from "lucide-react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";

type SectionDoc = {
    id: string;
    title: string;
    content: string;
    updatedAt?: any; // Firestore Timestamp
};


const SEED: SectionDoc[] = [
    {
        id: "key-problems-identified",
        title: "Key Problems Identified",
        content: `
The primary challenges can be grouped into four main areas: extremely high chick mortality, widespread misinformation, market access issues, and social/behavioral barriers.

### 1. High Chick Mortality
This is the most critical issue, often wiping out entire flocks and preventing families from achieving scale. The initial 7 chicks provided frequently do not survive.

* **Disease:** The leading cause of death. Many reports mention sickness with symptoms like "white excrement," "loss of appetite," and sudden death. Diseases often spread through entire villages, affecting multiple households at once.
* **Predation:** The second-largest cause. **Wild cats (Siyal), dogs, and snakes** are common predators that hunt the chicks.
* **Improper Care & Accidents:** Chicks die from drowning in Azolla pits, exposure, starvation, or initial stress/weakness within a week of being brought home.

### 2. Misinformation & Knowledge Gaps
There is a significant gap in technical knowledge which directly leads to chick mortality and low productivity.

* **Misunderstanding Azolla:** A recurring theme is the misconception of **Azolla as a medicine**, not a protein-rich feed supplement. This leads to families not feeding it regularly or at all, and many Azolla pits are destroyed or abandoned.
* **Inadequate Healthcare:** Most families rely on traditional remedies like **turmeric water**, which are insufficient against major diseases. There is very low awareness or use of proper veterinary medicines (like dewormers) and vaccines. Interventions by trained personnel (*Pashu Sakhi*) were noted as highly effective but rare.
* **Poor Biosecurity:** The practice of eating sick birds and improperly disposing of carcasses likely contributes to the rapid spread of disease within villages.

### 3. Market & Logistical Challenges
Even for families who manage to raise chickens, converting them into a stable income source is difficult.

* **Market Access:** Many are unwilling or unable to travel to larger markets (*haat*), especially women. They either sell to middlemen at lower prices, sell only within the village, or prefer buyers to pick up from their homes. Many travel to markets in **Orissa** for better rates.
* **Lack of Scale:** Due to high mortality, most families never have a large enough flock to sell regularly. Selling is often restricted to emergencies or festivals.
* **Flock Composition:** Several households reported having only male chicks, making breeding for eggs and flock expansion impossible.

### 4. Behavioral & Social Barriers
Mindset and household dynamics play a crucial role in the success of this livelihood activity.

* **Lack of Entrepreneurial Mindset:** Many view poultry solely for **personal consumption, religious purposes (Puja), or as an emergency asset**, rather than a regular business.
* **Low Female Autonomy:** In some households, male members or mothers-in-law are the primary decision-makers, limiting the woman's ability to manage the poultry as an enterprise.
* **Misconception of Ownership:** At least one family believed the chickens were still owned by the NGO (Kalamandir) and they were not allowed to sell them.
`.trim(),
    },
    {
        id: "feasible-solutions",
        title: "Feasible Solutions",
        content: `
The solutions must be low-cost, easy to implement, and communicated effectively in the local language.

### 1. Reducing Mortality
* **Village-Level Health Camps:** Organize periodic **vaccination and deworming camps** for poultry, targeting common diseases like Ranikhet. This is the single most effective way to prevent mass-death events.
* **Train Community Animal Health Workers (Pashu Sakhi):** Identify and train one woman in each village as a *Pashu Sakhi*. Equip her with a basic medicine kit, training on diagnosing common illnesses, and knowledge about biosecurity. She can serve as the first point of contact.
* **Promote Ethno-veterinary Practices:** Identify and validate successful local herbal remedies, like the one used by **Karmi Murmu**. Document and share these low-cost recipes through video or pictorial guides.
* **Improve Night Shelters:** Conduct demonstrations on reinforcing existing night shelters using locally available materials like **bamboo and stone** to make them predator-proof.

### 2. Bridging Knowledge Gaps
* **Targeted Training & Awareness:**
    * **On Azolla:** Run a clear communication campaign using flip charts and demonstrations to explain that **Azolla is a daily food, not a medicine**. Show how it increases chicken weight and health.
    * **On Biosecurity:** Create simple, visual guides (in the local language) on the importance of **burying dead chickens**, separating sick birds, and keeping the shelter clean to prevent disease spread.
* **Demonstration Farms:** Establish a model poultry farm with a "champion" entrepreneur in each village cluster. This allows others to see the benefits of proper feed (including Azolla), biosecurity, and healthcare firsthand.

### 3. Improving Market Linkages
* **Form Producer Groups/FPOs:** Encourage the formation of a **Village Level Farmer Producer Organization (FPO)**. This group can:
    * **Aggregate chickens and eggs** to sell in bulk, attracting better buyers and prices.
    * Establish a **local collection center**, eliminating the need for each woman to travel to the market.
    * Negotiate collectively with middlemen.
* **Explore Niche Markets:** Train families to identify and sell high-value chickens (e.g., fighting cocks) which, as the data shows, fetch premium prices of ₹1200 or more.

### 4. Fostering an Entrepreneurial Mindset
* **Share Success Stories:** Widely publicize the stories of successful entrepreneurs from the data (e.g., **Purgi Soren**, who sells strategically in Orissa; **Parwati Sabar**, who thinks of boiling and selling eggs). Peer inspiration is highly effective.
* **Involve Male Family Members:** Conduct sensitization meetings for the entire household to explain the economic benefits of poultry rearing. This can help secure family support and improve female autonomy in decision-making.
* **Clarify Ownership:** Continuously reinforce the message that the families **own the chickens and have the full right to sell them** and their produce for profit.
`.trim(),
    },
];

function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function fmtUpdated(ts: any) {
    try {
        if (ts?.toDate) return format(ts.toDate(), "PP p");
        if (ts instanceof Date) return format(ts, "PP p");
    } catch { /* empty */ }
    return "—";
}

export default function RecommendationsPage() {
    const [sections, setSections] = useState<SectionDoc[]>([]);
    const [editing, setEditing] = useState<Record<string, boolean>>({});
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const taRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

    // New section dialog
    const [newOpen, setNewOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");

    // Seed once if empty
    useEffect(() => {
        (async () => {
            const col = collection(db, "recommendations");
            const snap = await getDocs(col);
            if (snap.empty) {
                await Promise.all(
                    SEED.map((s) =>
                        setDoc(doc(db, "recommendations", s.id), {
                            title: s.title,
                            content: s.content,
                            updatedAt: serverTimestamp(),
                        })
                    )
                );
            }
        })();
    }, []);

    // Live subscribe
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "recommendations"), (qs) => {
            const rows: SectionDoc[] = qs.docs.map((d) => ({
                id: d.id,
                title: d.get("title") ?? "",
                content: d.get("content") ?? "",
                updatedAt: d.get("updatedAt"),
            }));
            rows.sort((a, b) => a.title.localeCompare(b.title));
            setSections(rows);
            // Note: drafts persist while editing; we don't overwrite drafts on snapshot
        });
        return () => unsub();
    }, []);

    // --- editing helpers
    const startEdit = (sec: SectionDoc) => {
        setEditing((m) => ({ ...m, [sec.id]: true }));
        setDrafts((d) => ({ ...d, [sec.id]: sec.content })); // seed draft once
    };

    const cancelEdit = (id: string) => {
        setEditing((m) => ({ ...m, [id]: false }));
        setDrafts((d) => {
            const n = { ...d };
            delete n[id];
            return n;
        });
    };

    const saveEdit = async (sec: SectionDoc) => {
        const content = drafts[sec.id] ?? sec.content;
        await setDoc(
            doc(db, "recommendations", sec.id),
            { title: sec.title, content, updatedAt: serverTimestamp() },
            { merge: true }
        );
        cancelEdit(sec.id);
    };

    // --- inline toolbar for markdown
    const applyToolbar = (id: string, action: "bold" | "italic" | "ul" | "ol") => {
        const ta = taRefs.current[id];
        if (!ta) return;
        const start = ta.selectionStart ?? 0;
        const end = ta.selectionEnd ?? 0;
        const val = drafts[id] ?? "";
        const sel = val.slice(start, end);

        let next = val;
        let ns = start, ne = end;

        if (action === "bold") {
            const text = sel || "bold";
            next = val.slice(0, start) + `**${text}**` + val.slice(end);
            ns = start + 2; ne = start + 2 + text.length;
        } else if (action === "italic") {
            const text = sel || "italic";
            next = val.slice(0, start) + `*${text}*` + val.slice(end);
            ns = start + 1; ne = start + 1 + text.length;
        } else if (action === "ul") {
            const text = sel || "List item";
            const lines = text.split("\n").map((l) => (l.trim() ? `* ${l}` : l)).join("\n");
            next = val.slice(0, start) + lines + val.slice(end);
            ns = start; ne = start + lines.length;
        } else if (action === "ol") {
            const text = sel || "First item\nSecond item";
            const lines = text.split("\n").map((l, i) => (l.trim() ? `${i + 1}. ${l}` : l)).join("\n");
            next = val.slice(0, start) + lines + val.slice(end);
            ns = start; ne = start + lines.length;
        }

        setDrafts((d) => ({ ...d, [id]: next }));
        requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(ns, ne);
        });
    };

    // --- create new section
    const createSection = async () => {
        if (!newTitle.trim()) return;
        const base = slugify(newTitle.trim());
        // make id unique
        let id = base || `section-${Date.now()}`;
        const ids = new Set(sections.map((s) => s.id));
        let k = 1;
        while (ids.has(id)) id = `${base}-${k++}`;

        await setDoc(doc(db, "recommendations", id), {
            title: newTitle.trim(),
            content: newContent,
            updatedAt: serverTimestamp(),
        });
        setNewOpen(false);
        setNewTitle("");
        setNewContent("");
    };
    return (
        <div className="space-y-6">
            {/* Page actions */}
            <div className="flex items-center justify-end">
                <Button onClick={() => setNewOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> New Section
                </Button>
            </div>

            {sections.map((sec) => {
                const isEditing = !!editing[sec.id];
                const draftVal = drafts[sec.id] ?? sec.content;

                return (
                    <Card key={sec.id} className="shadow-sm border">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-semibold">{sec.title}</CardTitle>
                                <div className="text-xs text-zinc-500 mt-1">Last updated: {fmtUpdated(sec.updatedAt)}</div>
                            </div>

                            <div className="flex gap-2">
                                {isEditing ? (
                                    <Button size="sm" variant="secondary" onClick={() => cancelEdit(sec.id)}>
                                        <X className="w-4 h-4 mr-1" /> Cancel
                                    </Button>
                                ) : (
                                    <Button size="sm" onClick={() => startEdit(sec)}>
                                        <Pencil className="w-4 h-4 mr-1" /> Edit
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        <Separator />

                        <CardContent>
                            {isEditing ? (
                                <div className="space-y-3">
                                    {/* Toolbar */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => applyToolbar(sec.id, "bold")}>
                                            <Bold className="w-4 h-4 mr-1" /> Bold
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => applyToolbar(sec.id, "italic")}>
                                            <Italic className="w-4 h-4 mr-1" /> Italic
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => applyToolbar(sec.id, "ul")}>
                                            <List className="w-4 h-4 mr-1" /> Bulleted
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => applyToolbar(sec.id, "ol")}>
                                            <ListOrdered className="w-4 h-4 mr-1" /> Numbered
                                        </Button>
                                    </div>

                                    {/* Editor */}
                                    <Textarea
                                        ref={(el) => { taRefs.current[sec.id] = el; }}
                                        value={draftVal}
                                        onChange={(e) => setDrafts((d) => ({ ...d, [sec.id]: e.target.value }))}
                                        rows={18}
                                        className="font-mono text-sm"
                                    />

                                    <Button onClick={() => saveEdit(sec)}>
                                        <Save className="w-4 h-4 mr-1" /> Save
                                    </Button>
                                </div>
                            ) : (
                                <div className="prose prose-zinc max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.content}</ReactMarkdown>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {/* New Section Dialog */}
            <Dialog open={newOpen} onOpenChange={setNewOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>New Section</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            placeholder="Title (e.g., Implementation Roadmap)"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />
                        <Textarea
                            placeholder="Markdown content…"
                            rows={12}
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setNewOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={createSection}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

