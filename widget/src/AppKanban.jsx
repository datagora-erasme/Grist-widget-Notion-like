/* global grist */
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Badge } from "./components/ui/badge"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, X, Eye, Filter, ArrowUpDown, GripVertical } from 'lucide-react'
import { Kanban } from './Kanban'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from 'react'

function AppKanban() {
  const [records, setRecords] = useState([])
  const [colInfos, setColInfos] = useState({})
  const [kanbanVues, setKanbanVues] = useState([])
  const [titre, setTitre] = useState('')
  const [editionTitre, setEdititionTitre] = useState(false)
  const [editionVue, setEditionVue] = useState(null)
  const [ordreVues, setOrdreVues] = useState([])
  const [ongletActif, setOngletActif] = useState(null)
  const [optionsChargees, setOptionsChargees] = useState(false)
  const [panneauActif, setPanneauActif] = useState(null)

  function isGristDark() {
    return document.documentElement.getAttribute('data-grist-appearance') === 'dark';
  }

  document.documentElement.classList.toggle('dark', isGristDark());

  useEffect(() => {
    grist.ready({ requiredAccess: 'full' })
    grist.onRecords((r) => { setRecords(r); chargerColonnes()}, { includeColumns: 'normal'})
    grist.onOptions((options) => {
      setKanbanVues(options?.kanbanVues || [])
      setTitre(options?.titre || '')
      setOrdreVues(options?.ordreVues || [])
      setOptionsChargees(true)
    })

    const apply = () => {
      const isDark = document.documentElement.getAttribute('data-grist-appearance') === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
    };
    apply();

    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-grist-appearance']
    });

    async function chargerColonnes() {
      const tableId = await grist.getTable().getTableId()
      const tables = await grist.docApi.fetchTable('_grist_Tables')
      const cols = await grist.docApi.fetchTable('_grist_Tables_column')
      const fields = await grist.docApi.fetchTable('_grist_Views_section_field')

      const idx = tables.tableId.indexOf(tableId)
      const tableRef = tables.id[idx]
      const rawSectionRef = tables.rawViewSectionRef[idx]

      const colRefToId = {}
      cols.id.forEach((_, i) => { colRefToId[cols.id[i]] = cols.colId[i] })

      const ordre = {}
      fields.id.forEach((_, i) => {
        if (fields.parentId[i] === rawSectionRef) {
          ordre[colRefToId[fields.colRef[i]]] = fields.parentPos[i]
        }
      })

      const infos = {}
      cols.id.forEach((_,i) => {
        if (cols.parentId[i] === tableRef) {
          let options = {}
          try { options = JSON.parse(cols.widgetOptions[i] || '{}')} catch { options = {} }
          infos[cols.colId[i]] = {
            label: cols.label[i],
            type: cols.type[i],
            choiceOptions: options.choiceOptions || {},
            choices: options.choices || [],
            pos: ordre[cols.colId[i]] ?? 9999,
          }
        }
      })
      setColInfos(infos)
    }
    chargerColonnes()

    return () => observer.disconnect();
  }, [])

  const colonnes = records.length > 0
    ? Object.keys(records[0])
      .filter((nom) => !['id', 'manualSort'].includes(nom))
      .sort((a,b) => (colInfos[a]?.pos ?? 9999) - (colInfos[b]?.pos ?? 9999))
    : []

  const vues = kanbanVues.map((v) => ({
    id: "kanban-" + v.id,
    titre: v.nom || "Par " + (colInfos[v.champ]?.label || v.champ),
    vueId: v.id,
    type: "kanban",
    champ: v.champ,
    tri: v.tri,
    sensTri: v.sensTri,
    filtreChamp: v.filtreChamp,
    filtreVals: v.filtreVals,
    ordreColonnes: v.ordreColonnes,
    champsVisibles: v.champsVisibles || colonnes.filter(c => c !== v.champ).slice(0, 3),
  })).sort((a, b) => {
    const ia = ordreVues.indexOf(a.id)
    const ib = ordreVues.indexOf(b.id)
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
  })

  useEffect(() => {
    if (!ongletActif && vues.length > 0) {
      setOngletActif(vues[0].id)
    }
  }, [vues, ongletActif])

  function sauverVues(nouvelles){
    setKanbanVues(nouvelles)
    grist.setOption('kanbanVues', nouvelles)
  }
  function sauverOrdre(nouvel) {
    setOrdreVues(nouvel)
    grist.setOption('ordreVues', nouvel)
  }

  function sauverOrdreColonnes(vueId, nouvelOrdre) {
    const nouvellesVues = kanbanVues.map((v) => 
      v.id === vueId ? { ...v, ordreColonnes: nouvelOrdre } : v
    )
    sauverVues(nouvellesVues)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function gererFinDrag(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = vues.map((v) => v.id)
    const oldIndex = ids.indexOf(active.id)
    const newIndex = ids.indexOf(over.id)
    sauverOrdre(arrayMove(ids, oldIndex, newIndex))
  }
  function ajouterVue(champ) {
    sauverVues([...kanbanVues, { id: Date.now(), champ: champ || colonnes[0] }])
  }
  function modifierVue(id, changements) {
    sauverVues(kanbanVues.map((v) => (v.id === id ? { ...v, ...changements } : v)))
  }
  function supprimerVue(id) {
    sauverVues(kanbanVues.filter((v) => v.id !== id))
  }

  function sauverTitre(valeur) {
    setTitre(valeur)
    grist.setOption('titre', valeur)
  }

  if (!colonnes.length || !optionsChargees) return <div className="p-6">Chargement...</div>

  return (
    <div className="p-6">
      {editionTitre ? (
        <input 
          type="text"
          value={titre}
          autoFocus
          onChange={(e) => setTitre(e.target.value)}
          onBlur={() => { setEdititionTitre(false); grist.setOption('titre', titre)}}
          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
          className="text-2xl font-bold mb-4 ml-2 border rounded px-1"
        />
      ) : (
        <h1 className="text-2xl font-bold mb-4 ml-2 cursor-text" onDoubleClick={() => setEdititionTitre(true)}>
          {titre || 'Vue Kanban'}
        </h1>
      )}

      <Tabs value={ongletActif ?? vues[0]?.id} onValueChange={(v) => setOngletActif(v)}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={gererFinDrag}>
          <SortableContext items={vues.map((v) => v.id)} strategy={horizontalListSortingStrategy}>
            <TabsList>
              {vues.map((vue) => (
                <OngletTriable
                  key={vue.id}
                  vue={vue}
                  editionVue={editionVue}
                  setEditionVue={setEditionVue}
                  modifierVue={modifierVue}
                  supprimerVue={supprimerVue}
                />
              ))}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded hover:bg-accent text-muted-foreground">
                    <Plus size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {colonnes.map((nom) => (
                    <DropdownMenuCheckboxItem key={nom} checked={false} onClick={() => ajouterVue(nom)}>
                      {colInfos[nom]?.label || nom}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </TabsList>
          </SortableContext>
        </DndContext>

        {vues.map((vue) => (
          <TabsContent key={vue.id} value={vue.id}>
            {/* Icônes de réglage */}
            <div className="relative inline-block mb-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${panneauActif === 'visibilite' ? 'bg-accent' : ''}`} title="Champs visibles" onClick={() => setPanneauActif(panneauActif === 'visibilite' ? null : 'visibilite')}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${panneauActif === 'filtre' ? 'bg-accent' : ''}`} title="Filtre" onClick={() => setPanneauActif(panneauActif === 'filtre' ? null : 'filtre')}>
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${panneauActif === 'tri' ? 'bg-accent' : ''}`} title="Tri" onClick={() => setPanneauActif(panneauActif === 'tri' ? null : 'tri')}>
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
              {panneauActif && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPanneauActif(null)} />
                  <div className="absolute top-full left-0 mt-1 z-20 w-80 overflow-hidden bg-popover text-popover-foreground border rounded-lg shadow-md p-3">

                    {panneauActif === 'tri' && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">Tri</p>
                        <Select value={vue.tri || 'none'} onValueChange={(c) => modifierVue(vue.vueId, { tri: c === 'none' ? null : c })}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Aucun tri" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="italic text-muted-foreground">Aucun tri</SelectItem>
                            {colonnes.map((nom) => (<SelectItem key={nom} value={nom}>{colInfos[nom]?.label || nom}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Select value={vue.sensTri || 'asc'} onValueChange={(c) => modifierVue(vue.vueId, { sensTri: c })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Croissant</SelectItem>
                            <SelectItem value="desc">Décroissant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {panneauActif === 'filtre' && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">Filtre</p>
                        <Select value={vue.filtreChamp || 'none'} onValueChange={(c) => modifierVue(vue.vueId, { filtreChamp: c === 'none' ? null : c, filtreVals: [] })}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Colonne..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="italic text-muted-foreground">Aucun filtre</SelectItem>
                            {colonnes.map((nom) => (<SelectItem key={nom} value={nom}>{colInfos[nom]?.label || nom}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        {vue.filtreChamp && (
                          <div className="flex flex-wrap gap-1">
                            {colInfos[vue.filtreChamp]?.choices?.length ? (
                              colInfos[vue.filtreChamp].choices.map((choix) => {
                                const opt = colInfos[vue.filtreChamp].choiceOptions?.[choix] || {}
                                const actif = (vue.filtreVals || []).includes(choix)
                                return (
                                  <Badge key={choix} className="cursor-pointer text-xs" variant={actif ? "default" : "outline"}
                                    style={actif ? { backgroundColor: opt.fillColor, color: opt.textColor } : {}}
                                    onClick={() => {
                                      const actuels = vue.filtreVals || []
                                      modifierVue(vue.vueId, { filtreVals: actif ? actuels.filter((x) => x !== choix) : [...actuels, choix] })
                                    }}>{choix}
                                  </Badge>
                                )
                              })
                            ) : (
                              <>
                                {(vue.filtreVals || []).map((val, i) => (
                                  <Badge key={i} variant="secondary" className="cursor-pointer text-xs" onClick={() => modifierVue(vue.vueId, { filtreVals: vue.filtreVals.filter((x) => x !== val) })}>{val} ×</Badge>
                                ))}
                                <input type="text" placeholder="+ Entrée"
                                  onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { modifierVue(vue.vueId, { filtreVals: [...(vue.filtreVals || []), e.target.value.trim()] }); e.target.value = '' } }}
                                  className="border rounded px-2 py-0.5 text-xs w-24"
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {panneauActif === 'visibilite' && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Champs sur les cartes</p>
                        <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                          {(vue.champsVisibles || []).map((col, i) => (
                            <div key={col} className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-muted/30 text-sm cursor-grab"
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault()
                                const from = parseInt(e.dataTransfer.getData('text/plain'))
                                const ordre = [...(vue.champsVisibles || [])]
                                const [moved] = ordre.splice(from, 1)
                                ordre.splice(i, 0, moved)
                                modifierVue(vue.vueId, { champsVisibles: ordre })
                              }}>
                              <GripVertical className="h-3 w-3 text-muted-foreground" />
                              <span className="flex-1 text-xs">{colInfos[col]?.label || col}</span>
                              <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => modifierVue(vue.vueId, { champsVisibles: (vue.champsVisibles || []).filter(c => c !== col) })}>×</button>
                            </div>
                          ))}
                        </div>
                        {colonnes.filter(c => c !== vue.champ && !(vue.champsVisibles || []).includes(c)).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {colonnes.filter(c => c !== vue.champ && !(vue.champsVisibles || []).includes(c)).map((col) => (
                              <button key={col} className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80"
                                onClick={() => modifierVue(vue.vueId, { champsVisibles: [...(vue.champsVisibles || []), col] })}>
                                + {colInfos[col]?.label || col}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <Kanban records={records} colonnes={colonnes} colInfos={colInfos} champ={vue.champ} tri={vue.tri} sensTri={vue.sensTri} filtreChamp={vue.filtreChamp} filtreVals={vue.filtreVals} ordreColonnesEnregistre={vue.ordreColonnes} onReorderColumns={(nouvelOrdre) => sauverOrdreColonnes(vue.vueId, nouvelOrdre)} champsVisibles={vue.champsVisibles} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function OngletTriable({ vue, editionVue, setEditionVue, modifierVue, supprimerVue }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: vue.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative flex items-center">
      <TabsTrigger
        value={vue.id}
        onDoubleClick={() => { if (vue.vueId) setEditionVue(vue.vueId) }}
        className="pr-6"
        {...attributes}
        {...listeners}
      >
        {editionVue === vue.vueId ? (
          <input
            autoFocus
            defaultValue={vue.titre}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => { modifierVue(vue.vueId, { nom: e.target.value }); setEditionVue(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
            className="w-28 border rounded px-1"
          />
        ) : (
          vue.titre
        )}
      </TabsTrigger>

      <button
        type="button"
        onClick={() => supprimerVue(vue.vueId)}
        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive z-10"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default AppKanban
