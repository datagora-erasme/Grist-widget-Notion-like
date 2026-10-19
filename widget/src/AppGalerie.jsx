/* global grist */
import { useState, useEffect } from 'react'
import { Galerie } from './Galerie'

export default function AppGalerie() {
  const [records, setRecords] = useState([])
  const [colInfos, setColInfos] = useState({})
  const [colonnes, setColonnes] = useState([])
  const [titre, setTitre] = useState('')
  const [editionTitre, setEditionTitre] = useState(false)

  useEffect(() => {
    grist.ready({ requiredAccess: 'full' })
    grist.onRecords((r) => { setRecords(r); chargerColonnes() }, { includeColumns: 'normal' })
    grist.onOptions((options) => {
      setTitre(options?.titre || '')
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
          colonnesListe.push(cols.colId[i])
        }
      })

      colonnesListe.sort((a, b) => (infos[a].pos - infos[b].pos))
      setColInfos(infos)
      setColonnes(colonnesListe)
    }
  }, [])

  if (!colonnes.length) return <div className="p-4">Chargement...</div>

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
      <Galerie records={records} colonnes={colonnes} colInfos={colInfos} />
    </div>
  )
}
