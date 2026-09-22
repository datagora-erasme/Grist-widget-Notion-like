import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { formaterValeur, PieceJointe } from "./formaterValeur"

export function Carte({ record, colonnes, colInfos, max, forces = [] }) {
    const [titre, ...autres] = colonnes
    
    // 1. On cherche la colonne qui servira de couverture
    const colCoverName = colonnes.find(col => {
        if (colInfos[col]?.type !== 'Attachments') return false
        const val = record[col]
        if (!val) return false
        const ids = Array.isArray(val) ? (val[0] === 'L' ? val.slice(1) : val) : val
        return ids && ids.length > 0
    })

    // 2. On récupère l'ID de l'image de couverture
    let coverId = null
    if (colCoverName) {
        const val = record[colCoverName]
        const ids = Array.isArray(val) ? (val[0] === 'L' ? val.slice(1) : val) : val
        coverId = ids[0]
    }

    // 3. On prépare les autres champs
    let champs = max ? autres.slice(0, max) : autres
    forces.forEach((f) => { 
        if (f && f !== titre && !champs.includes(f)) {
            champs = [...champs, f]
        }
    })

    // NOUVEAU : Fonction qui supprime l'ID de la couverture pour éviter le doublon partout
    const filtrerValeur = (nomCol, valeurInitiale) => {
        if (nomCol === colCoverName && coverId && Array.isArray(valeurInitiale)) {
            const ids = valeurInitiale[0] === 'L' ? valeurInitiale.slice(1) : valeurInitiale;
            const idsRestants = ids.filter(id => id !== coverId);
            if (idsRestants.length === 0) return null; // S'il n'y a pas d'autre image, on renvoie null
            return ['L', ...idsRestants];
        }
        return valeurInitiale;
    }

    // On applique le filtre sur le titre
    const valeurTitre = filtrerValeur(titre, record[titre]);

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
            
            {/* Couverture */}
            {coverId && (
                <div className="w-full border-b border-border/50">
                    <PieceJointe id={coverId} variante="couverture" />
                </div>
            )}

            {/* Titre : On l'affiche uniquement s'il n'est pas vide (s'il ne contenait QUE l'image de couverture, il sera caché) */}
            {valeurTitre !== null && valeurTitre !== undefined && valeurTitre !== '' && (
                <CardHeader className="pt-4 pb-2">
                    <CardTitle className="text-lg leading-tight">
                        {formaterValeur(valeurTitre, colInfos[titre])}
                    </CardTitle>
                </CardHeader>
            )}
            
            {/* Contenu : Si le titre est caché, on rajoute un peu de marge en haut (pt-4) pour aérer */}
            <CardContent className={`flex flex-col gap-2 pb-4 ${!valeurTitre ? 'pt-4' : ''}`}>
                {champs.map((nom) => {
                    // On applique le filtre anti-doublon sur chaque champ
                    const valeur = filtrerValeur(nom, record[nom]);
                    
                    if (valeur === null || valeur === undefined || valeur === '') return null;
                    
                    // On cache le label ("Nom de colonne :") pour les badges ET les images restantes
                    const sansLabel = Array.isArray(valeur) || colInfos[nom]?.type === 'Choice' || colInfos[nom]?.type === 'Attachments';

                    return (
                        <div key={nom} className="text-sm">
                            {!sansLabel && (
                                <span className="text-muted-foreground mr-1">{colInfos[nom]?.label || nom} : </span>
                            )}
                            {formaterValeur(valeur, colInfos[nom])}
                        </div>
                    )
                })}
                {max && autres.length > max && (
                    <div className="text-xs text-muted-foreground italic pt-1">+ {autres.length - max} autres...</div>
                )}
            </CardContent>
        </Card>
    )
}