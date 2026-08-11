import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { formaterValeur } from "./formaterValeur"

export function Carte({ record, colonnes, colInfos, max }) {
    const [titre, ...autres] = colonnes
    const champs = max ? autres.slice(0, max) : autres

    return (
        <Card>
            <CardHeader>
                <CardTitle>{formaterValeur(record[titre], colInfos[titre])}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">{champs.map((nom) => (
                <div key={nom}>
                    <span className="text-muted-foreground">{colInfos[nom]?.label || nom} : </span>
                    {formaterValeur(record[nom], colInfos[nom])}
                </div>
            ))}
            {max && autres.length > max && (
                <div className="text-xs text-muted-foreground italic">+ {autres.length - max} autres champs...</div>
            )}
            </CardContent>
        </Card>
    )
}