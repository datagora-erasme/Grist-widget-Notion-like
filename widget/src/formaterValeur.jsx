import { Badge } from "@/components/ui/badge"

export function formaterValeur(valeur, colInfo) {
  const type = colInfo?.type

  // vide => rien
  if (valeur === null || valeur === undefined || valeur === '') {
    return ''
  }
  
  // booléen
  if (typeof valeur === 'boolean') {
    return <input type="checkbox" checked={valeur} readOnly className="h-4 w-4 accent-green-600"/>
  }

  // liste Grist => badge
  if (Array.isArray(valeur)) {
    const items = valeur[0] === 'L' ? valeur.slice(1) : valeur
    return (
      <span className="flex flex-wrap gap-0.5">
        {items.map((item, i) => {
          const opt = colInfo?.choiceOptions?.[item] || {}
          return (
            <Badge variant="secondary" className="h-auto whitespace-normal break-words" style={{ backgroundColor: opt.fillColor, color: opt.textColor}}>
              {String(item)}
            </Badge>
          )
      })}
      </span>
    )
  }

  // Choix unique => badge
  if (type === 'Choice') {
    const opt = colInfo?.choiceOptions?.[valeur] || {}
    return (
      <Badge variant="secondary" className="h-auto whitespace-normal break-words" style={{ backgroundColor: opt.fillColor, color: opt.textColor}}>{String(valeur)}</Badge>
    )
  }

  // Date / Date-heure
  if (type === 'Date' || type?.startsWith('DateTime')) {
    const d = typeof valeur === 'number' ? new Date(valeur * 1000) : new Date(valeur)
    return type === 'Date'
      ? d.toLocaleDateString('fr-FR', { timeZone: 'UTC'})
      : d.toLocaleString('fr-FR')
  }

  return String(valeur)
}