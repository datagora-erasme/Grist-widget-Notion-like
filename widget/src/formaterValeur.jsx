import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Paperclip, X, Download } from "lucide-react"

let tokenCache = null
let tokenPromise = null

async function getGristToken() {
  const maintenant = Date.now()
  if (tokenCache && tokenCache.expire > maintenant) return tokenCache
  if (!tokenPromise) {
    tokenPromise = grist.docApi.getAccessToken({ readOnly: true }).then((info) => {
      tokenCache = { ...info, expire: maintenant + 3 * 60 * 1000 }
      tokenPromise = null
      return tokenCache
    })
  }
  return tokenPromise
}

export function PieceJointe({ id, variante = "miniature" }) {
  const [src, setSrc] = useState(null)
  const [erreur, setErreur] = useState(false)
  const [estAgrandie, setEstAgrandie] = useState(false)

  // Chargement de l'image
  useEffect(() => {
    let annule = false
    getGristToken().then(({ baseUrl, token }) => {
      if (!annule) setSrc(`${baseUrl}/attachments/${id}/download?auth=${token}`)
    })
    return () => { annule = true }
  }, [id])

  // Gestion de la touche Echap pour fermer la modale
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setEstAgrandie(false)
    }
    if (estAgrandie) window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [estAgrandie])

  if (!src) return null

  // Affichage si c'est un fichier non-image (trombone)
  if (erreur) {
    return (
      <a 
        href={src} 
        target="_blank" 
        rel="noreferrer" 
        onClick={(e) => e.stopPropagation()} 
        className="flex items-center justify-center h-12 w-12 rounded border bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
      >
        <Paperclip size={18} />
      </a>
    )
  }

  // Affichage de la couverture (en haut de la carte)
  if (variante === "couverture") {
    return (
      <img
        src={src}
        alt="Couverture"
        onError={() => setErreur(true)}
        className="w-full h-48 object-cover" 
      />
    )
  }

  // Affichage normal (miniature cliquable + modale)
  return (
    <>
      {/* Miniature de l'image */}
      <div 
        onClick={(e) => {
          e.stopPropagation()
          setEstAgrandie(true)
        }}
        className="cursor-pointer"
        title="Cliquez pour agrandir"
      >
        <img
          src={src}
          alt="Pièce jointe"
          onError={() => setErreur(true)}
          className="h-12 w-12 object-cover rounded border hover:opacity-80 transition-opacity"
        />
      </div>

      {/* Modale plein écran (Lightbox) */}
      {estAgrandie && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation()
            setEstAgrandie(false)
          }}
        >
          {/* Conteneur principal de l'image agrandie */}
          <div className="relative flex flex-col items-center">
            
            {/* Boutons d'action en haut à droite */}
            <div className="absolute -top-12 right-0 flex gap-4">
              <a 
                href={src} 
                target="_blank" 
                rel="noreferrer"
                className="p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
                title="Ouvrir / Télécharger"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={24} />
              </a>
              <button 
                className="p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  setEstAgrandie(false)
                }}
                title="Fermer (Échap)"
              >
                <X size={24} />
              </button>
            </div>

            <img
              src={src}
              alt="Agrandie"
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-md shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </>
  )
}

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

  // Pièces jointes (images + fichiers)
  if (type === 'Attachments' && Array.isArray(valeur)) {
    const ids = valeur[0] === 'L' ? valeur.slice(1) : valeur
    return (
      <span className="inline-flex flex-wrap gap-1">
        {ids.map((id) => <PieceJointe key={id} id={id} />)}
      </span>
    )
  }

  // liste Grist => badge
  if (Array.isArray(valeur)) {
    const items = valeur[0] === 'L' ? valeur.slice(1) : valeur
    return (
      <span className="inline-flex flex-wrap gap-0.5">
        {items.map((item, i) => {
          const opt = colInfo?.choiceOptions?.[item] || {}
          return (
            <Badge key={i} variant="secondary" className="h-auto whitespace-normal break-words" style={{ backgroundColor: opt.fillColor, color: opt.textColor}}>
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