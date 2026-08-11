/* global grist */
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "./components/ui/badge"
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

  useEffect(() => {
    grist.ready({ requiredAccess: 'full'})
    grist.onRecords((r) => { setRecords(r); chargerColonnes()}, { includeColumns: 'normal'})
    grist.onOptions((options) => {
      setKanbanVues(options?.kanbanVues || [])
      setTitre(options?.titre || '')
    })

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
}, [])


  const colonnes = records.length > 0
    ? Object.keys(records[0])
      .filter((nom) => nom !== 'id')
      .sort((a,b) => (colInfos[a]?.pos ?? 9999) - (colInfos[b]?.pos ?? 9999))
    : []

  const vues = [
    {id: "tableau", titre:"Tableau", type:"tableau"},
    ...kanbanVues.map((v) => ({
      id: "kanban-" + v.id,
      titre: "Par " + (colInfos[v.champ]?.label || v.champ),
      vueId: v.id,
      type:"kanban",
      champ: v.champ,
      tri: v.tri,
      sensTri: v.sensTri,
      filtreChamp: v.filtreChamp,
      filtreVals: v.filtreVals,
    })),
  ]

  function sauverVues(nouvelles){
    setKanbanVues(nouvelles)
    grist.setOption('kanbanVues', nouvelles)
  }
  function ajouterVue() {
    sauverVues([...kanbanVues, { id: Date.now(), champ: colonnes[0] }])
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
          autofocus
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

      <details className="mb-4">

        <summary className="cursor-pointer font-semibold mb-2">Gérer les vues kanban</summary>
        <div className="mb-4 p-3 border rounded">
          {kanbanVues.map((vue) => (
            <div key={vue.id} className="flex items-center gap-2 mb-2">
              <Select value={vue.champ} onValueChange={(c) => modifierVue(vue.id, {champ: c})}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Colonne..."/></SelectTrigger>
                <SelectContent>{colonnes.map((nom) => (
                  <SelectItem key={nom} value={nom}>{colInfos[nom]?.label || nom}</SelectItem>
                ))}
                </SelectContent>
              </Select>
              <Button variant="destructive" size="sm" onClick={() => supprimerVue(vue.id)}>Supprimer</Button>
            </div>
          ))}
          <Button size="sm" onClick={ajouterVue}>+ Ajouter une vue kanban</Button>
        </div>
      </details>

      <Tabs defaultValue={vues[0].id}>
        <TabsList>
          {vues.map((vue) => (
          <TabsTrigger key={vue.id} value={vue.id}>{vue.titre}</TabsTrigger>
          ))}
        </TabsList>

        {vues.map((vue) => (
          <TabsContent key={vue.id} value={vue.id}>
            {vue.type === "tableau" && <Tableau records={records} colonnes={colonnes} colInfos={colInfos} />}
            {vue.type === "kanban" && (
            <>
              <details className="mb-2">
                <summary className="cursor-pointer text-sm text-muted-foreground">Réglage</summary>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2">
                  <span className="text-sm">Trier par :</span>
                  <Select value={vue.tri || ''} onValueChange={(c) => modifierVue(vue.vueId, {tri : c})}>
                    <SelectTrigger className="w-40"><SelectValue paceholder="-"/></SelectTrigger>
                    <SelectContent>{colonnes.map((nom) => (
                      <SelectItem key={nom} value={nom}>{colInfos[nom]?.label || nom}</SelectItem>
                    ))}</SelectContent>
                  </Select>

                  <Select value={vue.sensTri || 'asc'} onValueChange={(c) => modifierVue(vue.vueId, { sensTri: c})}>
                    <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">croissant</SelectItem>
                      <SelectItem value="desc">décroissant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm ml-4">Filtrer :</span>
                  <Select value={vue.filtreChamp || ''} onValueChange={(c) => modifierVue(vue.vueId, { filtreChamp: c})}>
                    <SelectTrigger className="w-40"><SelectValue placehorder="Colonne..."/></SelectTrigger>
                    <SelectContent>{colonnes.map((nom) => (
                      <SelectItem key={nom} value={nom}>{colInfos[nom]?.label || nom}</SelectItem>
                    ))}</SelectContent>
                  </Select>

                  <span className="text-sm">contient :</span>
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
                    paceholder="ajouter + Entrée"
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
                  </div>
                </div>
              </details>
              <Kanban records={records} colonnes={colonnes} colInfos={colInfos} champ={vue.champ} tri={vue.tri} sensTri={vue.sensTri} filtreChamp={vue.filtreChamp} filtreVals={vue.filtreVals}/>
            </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default App
