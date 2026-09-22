/* global grist */
import { Carte } from "./Carte"
import { Badge } from "@/components/ui/badge"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable } from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { GripVertical } from "lucide-react"

const PALETTE = ['#64748B', '#9683C4', '#49cca0', '#cc67e0', '#C99A57', '#B87BA0', '#5CA1A6', '#C58A6B']

function CarteDraggable({ id, children, onClick, disabled }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled })
    return (
        <div ref={setNodeRef} {...listeners} {...attributes} onClick={onClick} className={disabled ? "cursor-pointer" : "cursor-grab"} style={{ opacity: isDragging ? 0.4 : 1 }}>
            {children}
        </div>
    )
}

function ColonneDroppable({ id, className, style, children }) {
    // useSortable gère à la fois le déplacement de la colonne et la réception des cartes
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: `col-${id}` })

    const sortableStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    return (
        <div ref={setNodeRef} style={{ ...style, ...sortableStyle }} className={className + (isOver ? " ring-2 ring-blue-400" : "")}>
            {children(attributes, listeners)}
        </div>
    )
}

export function Kanban({ records, colonnes, colInfos, champ, tri, sensTri, filtreChamp, filtreVals, ordreColonnesEnregistre, onReorderColumns }) {
    const [activeId, setActiveId] = useState(null)
    const [selected, setSelected] = useState(null)
    const [ordreColonnes, setOrdreColonnes] = useState(ordreColonnesEnregistre || null)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    const recordsFiltres = (filtreChamp && filtreVals?.length)
        ? records.filter((r) => {
            const v = r[filtreChamp]
            const texte = (Array.isArray(v) ? v.join(' ') : String(v ?? '')).toLowerCase()
            return filtreVals.some((val) => texte.includes(String(val).toLowerCase()))
        })
        : records

    const groupes = {}
    const choices = colInfos[champ]?.choices || []

    recordsFiltres.forEach((record) => {
        let valeurs = record[champ]
        if (Array.isArray(valeurs)) {
            valeurs = valeurs[0] === 'L' ? valeurs.slice(1) : valeurs
        } else { valeurs = [valeurs] }
        if (valeurs.length === 0) valeurs = ['(vide)']
        
        valeurs.forEach((v) => {
            const cle = v ?? '(vide)'
            if (!groupes[cle]) groupes[cle] = []
            groupes[cle].push(record)
        })
    })

    const colonnesDisponibles = Object.keys(groupes).sort((a, b) => {
        const indexA = choices.indexOf(a)
        const indexB = choices.indexOf(b)
        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        return a.localeCompare(b)
    })

    useEffect(() => {
        const sourceOrdre = ordreColonnesEnregistre || colonnesDisponibles
        const filtered = sourceOrdre.filter(c => colonnesDisponibles.includes(c))
        const added = colonnesDisponibles.filter(c => !sourceOrdre.includes(c))
        setOrdreColonnes([...filtered, ...added])
    }, [colonnesDisponibles.join(','), ordreColonnesEnregistre])

    const colonnesFinales = ordreColonnes || colonnesDisponibles
    const choiceOptions = colInfos[champ]?.choiceOptions || {}
    const dragDesactive = colInfos[champ]?.type === 'ChoiceList'

    return (
        <>
            <DndContext 
                sensors={sensors} 
                onDragStart={(e) => { setActiveId(e.active.id) }}
                onDragEnd={(e) => {
                    setActiveId(null)
                    const { active, over } = e
                    if (!over) return

                    // Gestion du déplacement des colonnes
                    if (String(active.id).startsWith('col-') && String(over.id).startsWith('col-')) {
                        const oldCol = active.id.replace('col-', '')
                        const newCol = over.id.replace('col-', '')
                        const oldIndex = colonnesFinales.indexOf(oldCol)
                        const newIndex = colonnesFinales.indexOf(newCol)
                        if (oldIndex !== -1 && newIndex !== -1) {
                            const nouvelOrdre = arrayMove(colonnesFinales, oldIndex, newIndex)
                            setOrdreColonnes(nouvelOrdre)
                            if (onReorderColumns) {
                                onReorderColumns(nouvelOrdre)
                            }
                        }
                        return
                    }

                    // Gestion du déplacement des cartes
                    const type = colInfos[champ]?.type
                    const rowId = e.active.id
                    const nouvelleValeur = e.over.id
                    const targetCol = String(nouvelleValeur).startsWith('col-') ? nouvelleValeur.replace('col-', '') : nouvelleValeur
                    
                    const valeur = type === 'ChoiceList' ? ['L', targetCol] : targetCol
                    grist.getTable()
                        .update({ id: rowId, fields: { [champ]: valeur } })
                        .catch((err) => console.log('écriture refusée (lecture seule)', err))
                }}
            >
                <SortableContext items={colonnesFinales.map(c => `col-${c}`)} strategy={horizontalListSortingStrategy}>
                    <div className="flex gap-4 items-start overflow-x-auto pb-4">
                        {colonnesFinales.map((valeur, index) => {
                            const cartes = groupes[valeur] || []
                            const opt = choiceOptions[valeur] || {}
                            const couleur = opt.fillColor || PALETTE[index % PALETTE.length]
                            
                            const cartesTriees = tri ? [...cartes].sort((a, b) => {
                                const va = a[tri], vb = b[tri]
                                let c
                                if (typeof va === 'number' && typeof vb === 'number') c = va - vb
                                else c = String(va ?? '').localeCompare(String(vb ?? ''))
                                return sensTri === 'desc' ? -c : c
                            }) : cartes

                            return (
                                <ColonneDroppable 
                                    key={valeur} 
                                    id={valeur} 
                                    className="flex-1 min-w-[250px] rounded-lg p-2 bg-muted/30" 
                                    style={{ backgroundColor: couleur + '22' }}
                                >
                                    {(attributes, listeners) => (
                                        <>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                                    {/* Poignée pour bouger la colonne */}
                                                    <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground p-1">
                                                        <GripVertical size={16} />
                                                    </div>
                                                    <Badge className="h-auto whitespace-normal break-words" style={{ backgroundColor: couleur, color: opt.textColor || '#fff' }}>
                                                        {valeur}
                                                    </Badge>
                                                </div>
                                                <span className="text-sm font-semibold shrink-0 ml-2" style={{ color: couleur }}>
                                                    {cartes.length}
                                                </span>
                                            </div>
                                                
                                            <div className="flex flex-col gap-2 min-h-[100px]">
                                                {cartesTriees.map((record) => (
                                                    <CarteDraggable key={record.id} id={record.id} onClick={() => setSelected(record)} disabled={dragDesactive}>
                                                        <Carte record={record} colonnes={colonnes} colInfos={colInfos} max={4} forces={[tri]} />
                                                    </CarteDraggable>  
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </ColonneDroppable>
                            )
                        })}
                    </div>
                </SortableContext>

                <DragOverlay>
                    {activeId && !String(activeId).startsWith('col-') ? (
                        <Carte record={records.find((r) => r.id === activeId)} colonnes={colonnes} colInfos={colInfos} />
                    ) : null}
                </DragOverlay>
            </DndContext>

            <Sheet open={selected !== null} onOpenChange={(ouvert) => { if (!ouvert) setSelected(null) }}>
                <SheetContent className="w-[400px] sm:max-w-[540px] h-full flex flex-col">
                    <SheetHeader className="mb-4 shrink-0">
                        <SheetTitle>Détail</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto pr-4 -mr-4 pb-8">
                        {selected && <Carte record={selected} colonnes={colonnes} colInfos={colInfos} isDetail={true} />}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    )
}