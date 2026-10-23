/* global grist */
import { useState, useEffect } from 'react'
import { Galerie } from './Galerie'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Filter, ArrowUpDown, GripVertical } from "lucide-react"

export default function AppGalerie() {
  const [records, setRecords] = useState([])
  const [colInfos, setColInfos] = useState({})
  const [colonnes, setColonnes] = useState([])
  const [titre, setTitre] = useState('')
  const [editionTitre, setEditionTitre] = useState(false)
  const [panneauActif, setPanneauActif] = useState(null)
  const [champsVisibles, setChampsVisibles] = useState([])
  const [filtreChamp, setFiltreChamp] = useState(null)
  const [filtreVals, setFiltreVals] = useState([])
  const [tri, setTri] = useState(null)
  const [sensTri, setSensTri] = useState('asc')
  const [optionsChargees, setOptionsChargees] = useState(false)

  useEffect(() => {
    grist.ready({ requiredAccess: 'full' })
    grist.onRecords((r) => { setRecords(r); chargerColonnes() }, { includeColumns: 'normal' })
    grist.onOptions((options) => {
      setTitre(options?.titre || '')
      const opts = options?.galerieOptions || {}
      setChampsVisibles(opts.champsVisibles || [])
      setFiltreChamp(opts.filtreChamp || null)
      setFiltreVals(opts.filtreVals || [])
      setTri(opts.tri || null)
      setSensTri(opts.sensTri || 'asc')
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
      const colonnesListe = []
      cols.id.forEach((_, i) => {
        if (cols.parentId[i] === tableRef) {
          let options = {}
          try { options = JSON.parse(cols.widgetOptions[i] || '{}') } catch { options = {} }
          infos[cols.colId[i]] = {
            label: cols.label[i],
            type: cols.type[i],
            choiceOptions: options.choiceOptions || {},
            choices: options.choices || [],
            pos: ordre[cols.colId[i]] || 0,
          }
          if (!['id', 'manualSort'].includes(cols.colId[i])) colonnesListe.push(cols.colId[i])
        }
      })

      colonnesListe.sort((a, b) => (infos[a].pos - infos[b].pos))
      setColInfos(infos)
      setColonnes(colonnesListe)
      // Si pas de champs visibles sauvegardés, prendre les 3 premières colonnes
      setChampsVisibles((prev) => prev.length === 0 ? colonnesListe.slice(0, 3) : prev)
    }
  }, [])

  if (!colonnes.length || !optionsChargees) return <div className="p-4">Chargement...</div>

  function sauverGalerieOptions(nouvelles) {
    const opts = { champsVisibles, filtreChamp, filtreVals, tri, sensTri, ...nouvelles }
    setChampsVisibles(opts.champsVisibles)
    setFiltreChamp(opts.filtreChamp)
    setFiltreVals(opts.filtreVals)
    setTri(opts.tri)
    setSensTri(opts.sensTri)
    grist.setOption('galerieOptions', opts)
  }

  // Appliquer filtre + tri
  let recordsFinaux = records
  if (filtreChamp && filtreVals.length > 0) {
    recordsFinaux = recordsFinaux.filter(r => filtreVals.includes(r[filtreChamp]))
  }
  if (tri) {
    recordsFinaux = [...recordsFinaux].sort((a, b) => {
      const va = a[tri], vb = b[tri]
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sensTri === 'asc' ? cmp : -cmp
    })
  }

  return (
    <div className="h-screen overflow-auto p-6">
      {editionTitre ? (
        <input
          type="text"
          value={titre}
          autoFocus
          onChange={(e) => setTitre(e.target.value)}
          onBlur={() => { setEditionTitre(false); grist.setOption('titre', titre) }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
          className="text-2xl font-bold mb-6 ml-2 border rounded px-1"
        />
      ) : (
        <h1 className="text-2xl font-bold mb-6 ml-2 cursor-text" onDoubleClick={() => setEditionTitre(true)}>
          {titre || 'Galerie'}
        </h1>
      )}

      <div className="relative inline-block mb-4">
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
              {panneauActif === 'visibilite' && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Champs visibles</p>
                  <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                    {champsVisibles.map((col, i) => (
                      <div key={col} className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-muted/30 text-sm cursor-grab"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          const from = parseInt(e.dataTransfer.getData('text/plain'))
                          const ordre = [...champsVisibles]
                          const [moved] = ordre.splice(from, 1)
                          ordre.splice(i, 0, moved)
                          sauverGalerieOptions({ champsVisibles: ordre })
                        }}>
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <span className="flex-1 text-xs">{colInfos[col]?.label || col}</span>
                        <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => sauverGalerieOptions({ champsVisibles: champsVisibles.filter(c => c !== col) })}>×</button>
                      </div>
                    ))}
                  </div>
                  {colonnes.filter(c => !champsVisibles.includes(c)).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {colonnes.filter(c => !champsVisibles.includes(c)).map((col) => (
                        <button key={col} className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80"
                          onClick={() => sauverGalerieOptions({ champsVisibles: [...champsVisibles, col] })}>
                          + {colInfos[col]?.label || col}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {panneauActif === 'filtre' && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Filtre</p>
                  <Select value={filtreChamp || 'none'} onValueChange={(c) => sauverGalerieOptions({ filtreChamp: c === 'none' ? null : c, filtreVals: [] })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Colonne..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="italic text-muted-foreground">Aucun filtre</SelectItem>
                      {colonnes.map((nom) => (<SelectItem key={nom} value={nom}>{colInfos[nom]?.label || nom}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {filtreChamp && (
                    <div className="flex flex-wrap gap-1">
                      {colInfos[filtreChamp]?.choices?.length ? (
                        colInfos[filtreChamp].choices.map((choix) => {
                          const opt = colInfos[filtreChamp].choiceOptions?.[choix] || {}
                          const actif = filtreVals.includes(choix)
                          return (
                            <Badge key={choix} className="cursor-pointer text-xs" variant={actif ? "default" : "outline"}
                              style={actif ? { backgroundColor: opt.fillColor, color: opt.textColor } : {}}
                              onClick={() => sauverGalerieOptions({ filtreVals: actif ? filtreVals.filter(x => x !== choix) : [...filtreVals, choix] })}>{choix}
                            </Badge>
                          )
                        })
                      ) : (
                        <>
                          {filtreVals.map((val, i) => (
                            <Badge key={i} variant="secondary" className="cursor-pointer text-xs" onClick={() => sauverGalerieOptions({ filtreVals: filtreVals.filter(x => x !== val) })}>{val} ×</Badge>
                          ))}
                          <input type="text" placeholder="+ Entrée"
                            onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { sauverGalerieOptions({ filtreVals: [...filtreVals, e.target.value.trim()] }); e.target.value = '' } }}
                            className="border rounded px-2 py-0.5 text-xs w-24"
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {panneauActif === 'tri' && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Tri</p>
                  <Select value={tri || 'none'} onValueChange={(c) => sauverGalerieOptions({ tri: c === 'none' ? null : c })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Aucun tri" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="italic text-muted-foreground">Aucun tri</SelectItem>
                      {colonnes.map((nom) => (<SelectItem key={nom} value={nom}>{colInfos[nom]?.label || nom}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Select value={sensTri} onValueChange={(c) => sauverGalerieOptions({ sensTri: c })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Croissant</SelectItem>
                      <SelectItem value="desc">Décroissant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Galerie records={recordsFinaux} colonnes={colonnes} colInfos={colInfos} champsVisibles={champsVisibles} />
    </div>
  )
}
