/* global grist */
import { Carte } from "./Carte"
import { Badge } from "@/components/ui/badge"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useState } from "react"

const PALETTE = ['#64748B', '#9683C4', '#49cca0', '#cc67e0', '#C99A57', '#B87BA0', '#5CA1A6', '#C58A6B']

function CarteDraggable({ id, children, onClick, disabled }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({id, disabled })
    return (
        <div ref={setNodeRef} {...listeners} {...attributes} onClick={onClick} className={disabled ? "cursor-pointer": "cursor-grab"} style= {{ opacity: isDragging ? 0.4 : 1 }}>
            {children}
        </div>
    )
}

function ColonneDroppable({ id, className, style, children }) {
    const { setNodeRef, isOver } = useDroppable({id})
    return <div ref={setNodeRef} className={className + (isOver ? " ring-2 ring-blue-400" : "")} style={style}>{children}</div>
}

export function Kanban({ records, colonnes, colInfos, champ, tri, sensTri, filtreChamp, filtreVals }) {
    // grouper les records par la valeur de champ
    const [activeId, setActiveId] = useState(null)
    const [selected, setSelected] = useState(null)
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 }}))
    const recordsFiltres = (filtreChamp && filtreVals?.length)
        ? records.filter((r) => {
            const v = r[filtreChamp]
            const texte = (Array.isArray(v) ? v.join(' ') : String(v ?? '')).toLowerCase()
            return filtreVals.some((val) => texte.includes(String(val).toLowerCase()))
        })
        :records
    const groupes = {}
    recordsFiltres.forEach((record) => {
        let valeurs = record[champ]
        if (Array.isArray(valeurs)) {
            valeurs = valeurs[0] === 'L' ? valeurs.slice(1) : valeurs
        } else { valeurs = [valeurs]}
        if (valeurs.length === 0) valeurs = ['(vide)']
        valeurs.forEach((v) => {
            const cle = v ?? '(vide)'
            if (!groupes[cle]) groupes[cle] = []
            groupes[cle].push(record)
        })
    })

    const choiceOptions = colInfos[champ]?.choiceOptions || {}
    const dragDesactive = colInfos[champ]?.type === 'ChoiceList'

    return(
        <>
            <DndContext sensors={sensors} onDragStart={(e) => { setActiveId(e.active.id) }}
            onDragEnd={(e) => {
                setActiveId(null)
                if (!e.over) return
                const type = colInfos[champ]?.type
                const rowId = e.active.id
                const nouvelleValeur = e.over.id
                const valeur = type === 'ChoiceList' ? ['L', nouvelleValeur] : nouvelleValeur
                grist.getTable()
                    .update({ id: rowId, fields: { [champ]: nouvelleValeur }})
                    .catch((err) => console.log('écriture refusée (lecture seule)', err))
            }}>

                <div className="flex gap-4 items-start">
                    {Object.entries(groupes).map(([valeur, cartes], index) => {
                        const opt = choiceOptions[valeur] || {}
                        const couleur = opt.fillColor || PALETTE[index % PALETTE.length]
                        const cartesTriees = tri ? [...cartes].sort((a,b) => {
                            const va = a[tri], vb = b[tri]
                            let c
                            if (typeof va === 'number' && typeof vb === 'number') c = va -vb
                            else c = String(va ?? '').localeCompare(String(vb ?? ''))
                            return sensTri === 'desc' ? -c : c
                        })
                        : cartes
                        return(
                            <ColonneDroppable key={valeur} id={valeur} className="flex-1 min-w-[250px] rounded-lg p-2" style={{ backgroundColor: couleur + '22'}}>
                                <div className="flex items-start gap-2 mb-2">
                                    <div className="min-w-0 flex-1">
                                        <Badge className="h-auto whitespace-normal break-words" style={{ backgroundColor: couleur, color: opt.textColor || '#fff' }}>{valeur}</Badge>
                                    </div>
                                    <span className="text-sm font-semibold shrink-0" style={{ color: couleur }}>{cartes.length}</span>
                                </div>
                                    
                                    <div className="flex flex-col gap-2">
                                        {cartesTriees.map((record) => (
                                            <CarteDraggable key={record.id} id={record.id} onClick={() => setSelected(record)} disabled={dragDesactive}>
                                                <Carte record={record} colonnes={colonnes} colInfos={colInfos} max={4} forces={[tri]} />
                                            </CarteDraggable>  
                                    ))}
                                </div>
                            </ColonneDroppable>
                        )
                    })}
                </div>
                <DragOverlay>
                    {activeId ? (
                        <Carte record={records.find((r) => r.id === activeId)} colonnes={colonnes} colInfos={colInfos} />
                    ) : null}
                </DragOverlay>
            </DndContext>

            <Sheet open={selected !== null} onOpenChange={(ouvert) => {if (!ouvert) setSelected(null)}}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Détail</SheetTitle>
                    </SheetHeader>
                    {selected && <Carte record={selected} colonnes={colonnes} colInfos={colInfos} />}
                </SheetContent>
            </Sheet>
        </>
    )
}