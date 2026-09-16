# Semaine Super C — PWA de planification de repas

App web installable (iPhone + Windows) qui affiche un menu hebdomadaire, une liste
d'épicerie cochable, des conseils de conservation et des recettes. Usage strictement
personnel. Pas de compte, pas de serveur applicatif : un site statique sur GitHub Pages.

## Principe

La **coquille** (`index.html`, `app.js`, `styles.css`, `sw.js`, icônes) est installée une
fois sur l'appareil. Le **contenu** vit dans `data/*.json` et est retéléchargé à chaque
ouverture. Ajouter une semaine ne demande donc jamais de réinstaller l'app.

```
index.html   coquille : onglets, sélecteur de semaine, bouton Super C
app.js       charge les JSON et fabrique l'affichage
styles.css   design (repris de l'artifact d'origine)
sw.js        service worker : coquille hors ligne + contenu réseau-d'abord
manifest.webmanifest
icons/
data/index.json      catalogue des semaines
data/AAAA-MM-JJ.json une semaine
```

## Ajouter une semaine — la seule tâche courante

1. Créer `data/<id>.json` où `<id>` est la date du **premier jour** de la semaine,
   au format `AAAA-MM-JJ` (ex. `2026-09-24.json`).
2. Ajouter l'entrée correspondante dans `data/index.json` → `weeks[]`.
3. Mettre à jour `updated` dans `data/index.json` (horodatage ISO 8601).
4. `git add -A && git commit && git push` — GitHub Pages redéploie en ~40 s.

Ne **pas** toucher à `sw.js` pour un simple ajout de contenu.

## Schéma d'une semaine

`data/index.json` :

```json
{
  "updated": "2026-09-16T23:00:00Z",
  "weeks": [
    { "id": "2026-09-17", "from": "2026-09-17", "to": "2026-09-23",
      "label": "17 – 23 sept. 2026", "title": "Semaine franco-asiatique" }
  ]
}
```

`from` / `to` servent à choisir automatiquement la semaine courante à l'ouverture
(première semaine dont `to` est aujourd'hui ou plus tard). `label` est le texte du
sélecteur. Les semaines peuvent être listées dans n'importe quel ordre : l'app trie.

`data/<id>.json` :

| Champ | Type | Rôle |
|---|---|---|
| `id`, `from`, `to` | `"AAAA-MM-JJ"` | doivent correspondre à l'entrée d'`index.json` |
| `eyebrow` | texte | surtitre en petites capitales |
| `title` | texte | titre de la semaine |
| `intro` | texte | paragraphe d'introduction |
| `portions` | nombre | sert à calculer le coût par portion |
| `notesTop` / `notesBottom` | tableau de HTML | encadrés avant / après la liste |
| `footer` | HTML | mention de bas de page (source des prix) |
| `list[]` | `{ name, items[] }` | rayons du magasin |
| `list[].items[]` | `{ id, what, qty, price, unit, sp }` | `price` = nombre, `sp` = en spécial |
| `menu[]` | `{ day, num, midi, soir }` | `midi`/`soir` = `{ n, h, lo? }` |
| `conservation[]` | `{ name, badge, badgeLabel, timeline, action }` | `badge` vaut `"ok"` ou `"freeze"` |
| `recipes[]` | `{ t, s[] }` | `t` = titre, `s` = étapes |

Règles :

- Les champs texte acceptent du HTML simple (`<strong>`), rendu tel quel.
- `items[].id` doit être **unique dans la semaine** : c'est la clé de l'état coché,
  stocké par semaine sous `fm:checked:<id>` dans `localStorage`.
- `price` est un nombre en dollars, toujours avec un point décimal en JSON.
  L'affichage en virgule et le total sont calculés par l'app.
- Valider avant de pousser : `python -m json.tool data/<id>.json > /dev/null`

## Modifier la coquille

Si `index.html`, `app.js`, `styles.css`, le manifeste ou une icône change, **incrémenter
`SHELL_VERSION` dans `sw.js`** (`"v1"` → `"v2"`). Sans ça, les appareils déjà installés
gardent l'ancienne coquille en cache. L'app affiche alors une bannière « Nouvelle version »
avec un bouton Recharger.

## Tester en local

```bash
python -m http.server 8787
```

Puis http://localhost:8787 (le service worker exige `localhost` ou HTTPS).

## Déploiement

En ligne : <https://bhattven.github.io/semaine-superc/>
Dépôt : `bhattven/semaine-superc` (public, branche `main`).

GitHub Pages sert `main` à la racine. Un `git push` suffit ; aucun build, aucune action
à lancer. Compter ~40 s avant que le changement soit visible.

## Super C — ne pas automatiser le panier

Le bouton ouvre simplement la circulaire. Le remplissage automatique du panier sur
superc.ca a été tenté une fois et n'a fonctionné que sous supervision pas à pas : le site
déclenche une vérification anti-robot quand les actions s'enchaînent vite, et une modale
invisible a avalé plusieurs clics « ajouter au panier » sans le moindre message d'erreur.
Une automatisation non surveillée échouerait donc en silence. Ne pas en ajouter une ici.
