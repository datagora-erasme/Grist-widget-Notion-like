# Widget Grist "bibliothèque" (Notion-like)

Un widget personnalisé pour [Grist](https://www.getgrist.com/) qui affiche une table sous plusieurs vues - **tableau**, **galerie** et **kanban** - configurables.

Il permet de partager des "vues bibliothèque" (comme sur Notion) à des personnes internes ou externes, **sans leur donner accès à l'espace de travail Grist**.

🔗 **Version en ligne :** https://monabzh.github.io/Grist-widget-Notion-like/

---
## Aperçu du widget
![Démo](docs/demo.gif)

Démonstration rapide du Widget en accès éditeur.
Bien penser à **enregistrer** pour que les modifications de vues / filtre soient enregistrés pour tous.

---

## Utilisation dans Grist

### 1. Ajouter le widget à une page
1. Sur une page Grist : **+ Ajouter -> Ajouter une page**, sélectionner la table en données sources et **Personnalisé** en type.
2. Dans le panneau : choisir **Ajouter votre propre widget "URL personnalisé"** et coller :
   ```
   https://monabzh.github.io/Grist-widget-Notion-like/
   ```
3. Règle **Option de la vue -> Niveau d'accès -> Accès complet au document** (nécessaire pour lire les noms de
   colonnes, les couleurs, et pour le glisser-déposer).

### 2. Configurer les vues
- **Gérer les vues kanban** (panneau repliable en haut) : ajouter / supprimer une vue et
  choisir la **colonne de regroupement** (ex. Statut, Type…).
- **Réglages** (au-dessus de chaque kanban) : **trier** et **filtrer** les cartes de cette vue.
- **Titre** : double-clic dessus pour mettre un titre personnalisé.
- **Glisser-déposer** : déplacer une carte d'une colonne à l'autre change sa valeur dans Grist
> **Important :** après chaque changement de configuration, clique sur l'icône **« Enregistrer »**
> pour que Grist mémorise les réglages (modifié pour tous).

---

## Partage

Pour donner un accès en lecture seule :
1. **Partager** le document (**"Gérer les utilisateurs"**) → rôle **Lecture seule**.
2. Copier le lien de la **page** qui contient le widget (ajouter `?embed=true` pour masquer l'interface Grist).
> `embed=true` permet de cacher l'interface Grist aux visiteurs, mais cela ne rendra que la première vue visible.

Les visiteurs voient les vues et le glisser-déposer, mais **toute écriture leur est refusée**.

---

## Développement

### Stack
[React](https://react.dev/) + [Vite](https://vite.dev/) + [Tailwind CSS](https://tailwindcss.com/)
+ [shadcn/ui](https://ui.shadcn.com/) + [dndkit](https://dndkit.com/).
Les données viennent de l'**API interne de Grist** (`grist.onRecords`, `grist.docApi`,
`grist.setOption`…) — aucune clé API, rien n'est stocké hors de Grist.

### Lancer en local
```bash
npm install
npm run dev
```
Puis, dans Grist, mettre l'**URL personnalisé** sur `http://localhost:5173/` pour tester en direct
(rechargement à chaud). Repasser sur l'URL GitHub Pages pour la version partagée.

### Déploiement
Un push sur `main` déclenche une **GitHub Action** qui build le projet et le publie sur
**GitHub Pages**.

### Structure du code (`src/`)
| Fichier | Rôle |
|---|---|
| `App.jsx` | Logique Grist (records, métadonnées de colonnes, options), onglets, config des vues |
| `Tableau.jsx` | Vue tableau (+ clic ligne → carte détail dans un panneau) |
| `Galerie.jsx` | Vue galerie (grille de cartes) |
| `Kanban.jsx` | Vue kanban : regroupement, tri, filtre, glisser-déposer |
| `Carte.jsx` | Une carte (un enregistrement) |
| `formaterValeur.jsx` | Affichage selon le type : badges colorés, dates, cases à cocher… |

---

## Feat à ajouter prochainement
- Le glisser-déposer sur une colonne à choix multiple écrase les valeurs de la carte -> choix à faire
- Les colonnes Référence et Pièce jointe ne sont pas encore gérées.
- Sous-groupement à 2 niveaux (colonnes par statut + sous-sections par usage).
- Couleurs de cellule / d'en-tête reprises de Grist, formats de nombres (€, %), liens cliquables.
