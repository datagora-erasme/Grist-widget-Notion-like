import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { formaterValeur, PieceJointe } from "./formaterValeur"

// NOUVEAU : Ajout de "isDetail = false" dans les paramètres
export function Carte({ record, colonnes, colInfos, max, forces = [], isDetail = false }) {
    const [titre, ...autres] = colonnes
    
    const colCoverName = colonnes.find(col => {
        if (colInfos[col]?.type !== 'Attachments') return false
        const val = record[col]
        if (!val) return false
        const ids = Array.isArray(val) ? (val[0] === 'L' ? val.slice(1) : val) : val
        return ids && ids.length > 0
    })

    let coverId = null
    if (colCoverName) {
        const val = record[colCoverName]
        const ids = Array.isArray(val) ? (val[0] === 'L' ? val.slice(1) : val) : val
        coverId = ids[0]
    }

    let champs = max ? autres.slice(0, max) : autres
    forces.forEach((f) => { 
        if (f && f !== titre && !champs.includes(f)) {
            champs = [...champs, f]
        }
    })

    const filtrerValeur = (nomCol, valeurInitiale) => {
        if (nomCol === colCoverName && coverId && Array.isArray(valeurInitiale)) {
            const ids = valeurInitiale[0] === 'L' ? valeurInitiale.slice(1) : valeurInitiale;
            const idsRestants = ids.filter(id => id !== coverId);
            if (idsRestants.length === 0) return null; 
            return ['L', ...idsRestants];
        }
        return valeurInitiale;
    }

    const valeurTitre = filtrerValeur(titre, record[titre]);

    return (
        <Card className={isDetail ? "border-none shadow-none" : "overflow-hidden hover:shadow-md transition-shadow cursor-pointer"}>
            
            {coverId && (
                <div className="w-full border-b border-border/50">
                    <PieceJointe id={coverId} variante="couverture" />
                </div>
            )}

            {valeurTitre !== null && valeurTitre !== undefined && valeurTitre !== '' && (
                <CardHeader className="pt-4 pb-2">
                    <CardTitle className="text-lg leading-tight">
                        {formaterValeur(valeurTitre, colInfos[titre])}
                    </CardTitle>
                </CardHeader>
            )}
            
            <CardContent className={`flex flex-col gap-2 pb-4 ${!valeurTitre ? 'pt-4' : ''}`}>
                {champs.map((nom) => {
                    const valeur = filtrerValeur(nom, record[nom]);
                    
                    if (valeur === null || valeur === undefined || valeur === '') return null;
                    
                    const sansLabel = !isDetail && (Array.isArray(valeur) || colInfos[nom]?.type === 'Choice' || colInfos[nom]?.type === 'Attachments');

                    return (
                        <div key={nom} className="text-sm">
                            {!sansLabel && (
                                <span className="text-muted-foreground mr-2 font-medium">{colInfos[nom]?.label || nom} : </span>
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