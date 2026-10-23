import { Carte } from "./Carte"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useState } from "react"

export function Galerie({ records, colonnes, colInfos, champsVisibles = [] }) {
    const [selected, setSelected] = useState(null)

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {records.map((record) => (
                    <Carte key={record.id} record={record} colonnes={colonnes} colInfos={colInfos} forces={champsVisibles} onClick={() => setSelected(record)} />
                ))}
            </div>

            <Sheet open={selected !== null} onOpenChange={(ouvert) => { if (!ouvert) setSelected(null) }}>
                <SheetContent className="w-[400px] sm:max-w-[540px] h-full flex flex-col">
                    <SheetHeader className="mb-4 shrink-0">
                        <SheetTitle>Détail</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto pr-4 -mr-4 pb-8">
                        {selected && <Carte record={selected} colonnes={colonnes} colInfos={colInfos} forces={champsVisibles} isDetail={true} />}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    )
}