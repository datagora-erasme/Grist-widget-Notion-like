/* global grist */
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "./components/ui/badge"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors,} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, horizontalListSortingStrategy} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, X } from 'lucide-react'
import { formaterValeur } from './formaterValeur'
import { Tableau } from './Tableau'
import { Carte } from './Carte'
import { Kanban } from './Kanban'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import { useState, useEffect } from 'react'

function App() {
  const [records, setRecords] = useState([])
  const [colInfos, setColInfos] = useState({})
  const [kanbanVues, setKanbanVues] = useState([])
  const [titre, setTitre] = useState('')
  const [editionTitre, setEdititionTitre] = useState(false)
  const [editionVue, setEditionVue] = useState(null)
  const [ordreVues, setOrdreVues] = useState([])
  const [ongletActif, setOngletActif] = useState(null)
  
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
      .filter((nom) => nom !== 'id')
      .sort((a,b) => (colInfos[a]?.pos ?? 9999) - (colInfos[b]?.pos ?? 9999))
    : []

  const baseVues = [
    {id: "tableau", titre:"Tableau", type:"tableau"},
    ...kanbanVues.map((v) => ({
      id: "kanban-" + v.id,
      titre: v.nom || "Par " + (colInfos[v.champ]?.label || v.champ),
      vueId: v.id,
      type:"kanban",
      champ: v.champ,
      tri: v.tri,
      sensTri: v.sensTri,
      filtreChamp: v.filtreChamp,
      filtreVals: v.filtreVals,
      ordreColonnes: v.ordreColonnes,
    })),
  ]

  const vues = [...baseVues].sort((a, b) => {
    const ia = ordreVues.indexOf(a.id)
    const ib = ordreVues.indexOf(b.id)
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
  })

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
          {titre || 'Bibliothèque'}
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
                  ongletActif={ongletActif}
                  setOngletActif={setOngletActif}
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
            {vue.type === "tableau" && <Tableau records={records} colonnes={colonnes} colInfos={colInfos} />}
            {vue.type === "kanban" && (
              <>
                <details className="mb-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground">Réglage</summary>
                  <div className="flex flex-col gap-2 mt-2">
                    
                    {/* Zone de Tri */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm whitespace-nowrap">Trier par :</span>
                      <Select value={vue.tri || 'none'} onValueChange={(c) => modifierVue(vue.vueId, {tri : c === 'none' ? null : c})}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="-"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="italic text-muted-foreground">Aucun tri</SelectItem>
                          {colonnes.map((nom) => (
                            <SelectItem key={nom} value={nom}>{colInfos[nom]?.label || nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={vue.sensTri || 'asc'} onValueChange={(c) => modifierVue(vue.vueId, { sensTri: c})}>
                        <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">croissant</SelectItem>
                          <SelectItem value="desc">décroissant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Zone de Filtre */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm ml-4 whitespace-nowrap">Filtrer :</span>
                      <Select value={vue.filtreChamp || 'none'} onValueChange={(c) => modifierVue(vue.vueId, { filtreChamp: c === 'none' ? null : c, filtreVals: []})}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Colonne..."/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="italic text-muted-foreground">Aucun filtre</SelectItem>
                          {colonnes.map((nom) => (
                            <SelectItem key={nom} value={nom}>{colInfos[nom]?.label || nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {vue.filtreChamp && (
                        <>
                          <span className="text-sm whitespace-nowrap">contient :</span>
                          {colInfos[vue.filtreChamp]?.choices?.length ? (
                            colInfos[vue.filtreChamp].choices.map((choix) => {
                              const opt = colInfos[vue.filtreChamp].choiceOptions?.[choix] || {}
                              const actif = (vue.filtreVals || []).includes(choix)
                              
                              return(
                                <Badge
                                  key={choix}
                                  className="cursor-pointer"
                                  variant={actif ? "default" : "outline"}
                                  style={actif ? { backgroundColor: opt.fillColor, color: opt.textColor } : {}}
                                  onClick={() => {
                                    const actuels = vue.filtreVals || []
                                    modifierVue(vue.vueId, { filtreVals: actif ? actuels.filter((x) => x !== choix) : [...actuels, choix] })
                                  }}>
                                  {choix}
                                </Badge>
                              )
                            })
                          ) : (
                            <>
                              {(vue.filtreVals || []).map((val, i) => (
                                <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => modifierVue(vue.vueId, { filtreVals: vue.filtreVals.filter((x) => x !== val) })}>{val} x</Badge>
                              ))}
                              <input
                                type="text"
                                placeholder="ajouter + Entrée"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    modifierVue(vue.vueId, { filtreVals: [...(vue.filtreVals || []), e.target.value.trim()]})
                                    e.target.value=''
                                  }
                                }}
                                className="border rounded px-2 py-1 text-sm w-40"
                              />
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </details>
                <Kanban records={records} colonnes={colonnes} colInfos={colInfos} champ={vue.champ} tri={vue.tri} sensTri={vue.sensTri} filtreChamp={vue.filtreChamp} filtreVals={vue.filtreVals} ordreColonnesEnregistre={vue.ordreColonnes} onReorderColumns={(nouvelOrdre) => sauverOrdreColonnes(vue.vueId, nouvelOrdre)} />
              </>
            )}
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
        className={vue.type === 'kanban' ? 'pr-6' : ''}
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

      {vue.type === 'kanban' && (
        <button
          type="button"
          onClick={() => supprimerVue(vue.vueId)}
          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive z-10"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export default App