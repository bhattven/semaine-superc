# Brief à coller dans le chat de planification des repas

Ce brief donne au chat des repas de quoi publier lui-même dans l'app, via le connecteur
GitHub de claude.ai.

**Prérequis, à faire une seule fois :** activer le connecteur GitHub dans les paramètres
de claude.ai, et lui donner accès au dépôt `bhattven/semaine-superc`. Sans ça, le chat ne
pourra rien écrire et il devrait le dire franchement plutôt que de prétendre avoir publié.

Ensuite, coller tout le texte sous le trait horizontal dans le chat des repas. À refaire
si la conversation est repartie de zéro.

---

## Comment publier une semaine de repas

Le panneau de repas est devenu une app installée sur mon téléphone et mon PC. Elle ne lit
plus l'artifact : elle lit des fichiers JSON dans le dépôt GitHub `bhattven/semaine-superc`,
branche `main`. **Modifier l'artifact ne change plus rien à ce que je vois** — ne l'utilise
plus pour ça.

Quand je te demande une nouvelle semaine, publie-la toi-même dans le dépôt, avec le
connecteur GitHub, en deux écritures :

**1. Créer `data/<id>.json`** où `<id>` est la date du premier jour de la semaine, au
format `AAAA-MM-JJ` — par exemple `data/2026-09-24.json`.

**2. Mettre à jour `data/index.json`.** Lis d'abord le fichier existant, ajoute ton entrée
au tableau `weeks` **sans toucher aux entrées déjà présentes**, et rafraîchis `updated`.
C'est le piège principal : si tu réécris `index.json` de zéro, les semaines passées
disparaissent de mon historique.

Commite directement sur `main`, sans passer par une pull request : c'est cette branche qui
est publiée. Le site se met à jour en moins d'une minute, et l'app affiche la semaine à sa
prochaine ouverture — je n'ai rien à réinstaller.

### Forme de `data/index.json`

```json
{
  "updated": "2026-09-24T14:00:00Z",
  "weeks": [
    { "id": "2026-09-17", "from": "2026-09-17", "to": "2026-09-23",
      "label": "17 – 23 sept. 2026", "title": "Semaine franco-asiatique" },
    { "id": "2026-09-24", "from": "2026-09-24", "to": "2026-09-30",
      "label": "24 – 30 sept. 2026", "title": "Titre de la nouvelle semaine" }
  ]
}
```

### Forme d'une semaine

```json
{
  "id": "2026-09-24",
  "from": "2026-09-24",
  "to": "2026-09-30",
  "eyebrow": "Super C · circulaire du 24 au 30 septembre 2026",
  "title": "Titre de la semaine",
  "intro": "Un paragraphe qui résume l'idée de la semaine.",
  "portions": 28,
  "notesTop": ["<strong>Conseil</strong> — encadré affiché avant la liste."],
  "notesBottom": ["<strong>Avant de partir</strong> — encadré affiché après la liste."],
  "footer": "Source des prix et mise en garde.",
  "list": [
    {
      "name": "Viande, volaille, poisson",
      "items": [
        { "id": "poulet", "what": "Poulet entier frais", "qty": "≈ 5 lb — sert à 3 repas",
          "price": 11.81, "unit": "2,25 $/lb", "sp": true }
      ]
    }
  ],
  "menu": [
    {
      "day": "Jeudi", "num": "24 sept.",
      "midi": { "n": "Nom du repas", "h": "Comment le faire, en une ou deux phrases.", "lo": "restes" },
      "soir": { "n": "Nom du repas", "h": "Comment le faire. — Pays d'origine" }
    }
  ],
  "conservation": [
    { "name": "Poulet entier", "badge": "freeze", "badgeLabel": "à congeler",
      "timeline": "Acheté jeudi · cuisiné dimanche",
      "action": "Ce qu'il faut faire, avec <strong>les mots importants en gras</strong>." }
  ],
  "recipes": [
    { "t": "Jeudi — Nom du souper",
      "s": ["Première étape.", "Deuxième étape, avec <strong>4 minutes</strong> en gras."] }
  ]
}
```

### Règles

- `id`, `from`, `to` : dates `AAAA-MM-JJ`. `from` est égal à `id`, `to` est le dernier jour
  de la semaine. Ces trois champs doivent être identiques à ceux de l'entrée d'`index.json`.
- `list[].items[].id` : identifiant court, **unique dans la semaine** — c'est la clé des
  cases cochées. Réutiliser le même identifiant d'une semaine à l'autre pour un même
  produit est souhaitable.
- `price` : un nombre avec un point décimal (`11.81`), jamais du texte comme `"11,81 $"`.
  L'app fait l'affichage en virgule, les sous-totaux par rayon et le grand total —
  ne les calcule pas et ne les écris pas.
- `sp` : `true` si l'article est en spécial cette semaine, `false` sinon.
- `unit` : le prix unitaire affiché sous le prix, ou `""`.
- `menu[]` : un objet par jour, avec `midi` et `soir`. `lo` est facultatif et sert
  d'étiquette (« restes »).
- `badge` vaut exactement `"ok"` ou `"freeze"`.
- Le seul HTML permis dans les textes est `<strong>`.
- JSON strict : pas de virgule finale, pas de commentaire.

### Ce à quoi tu ne touches pas

`index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `icons/`,
`installer/`, `tools/`. Ce sont les fichiers de l'app elle-même. Tu n'écris que dans
`data/`. En particulier, ne touche pas à `SHELL_VERSION` dans `sw.js`.

### Vérifier

Un contrôle automatique tourne à chaque écriture (`tools/validate_data.py`, via GitHub
Actions). S'il échoue, GitHub m'envoie un courriel et la semaine peut s'afficher en erreur
dans l'app — corrige alors le fichier.

Après publication, dis-moi simplement quelle semaine tu as publiée et sur quelles dates.
Je peux la voir ici : https://bhattven.github.io/semaine-superc/

Si le connecteur GitHub n'est pas disponible de ton côté, **dis-le-moi au lieu d'inventer
une publication** : je passerai par mon autre session pour publier à ta place.
