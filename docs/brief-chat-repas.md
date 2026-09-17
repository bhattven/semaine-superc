# Brief à coller dans le chat de planification des repas

Ce chat-là n'a pas accès au dépôt et ne peut donc pas modifier l'app. Son rôle est de
**produire le contenu** ; la publication se fait ensuite dans une session Claude Code
ouverte dans `G:\Aiproject\FreshMeal`.

Coller le texte ci-dessous dans le chat des repas. Il en ressort un bloc JSON, à rapporter
ici pour publication.

---

Le panneau de repas est devenu une app installée (PWA), séparée de l'artifact. Tu ne peux
plus la mettre à jour en modifiant l'artifact : l'app lit des fichiers JSON dans un dépôt
auquel tu n'as pas accès. N'essaie donc pas de republier l'artifact pour « pousser » du
contenu — ça ne l'atteint pas.

À partir de maintenant, quand je te demande une semaine de repas, réponds avec **un seul
bloc de code JSON** conforme au schéma ci-dessous, et rien d'autre à copier. Je le
transporterai moi-même vers l'app.

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

Règles à respecter :

- `id` = la date du **premier jour** de la semaine, format `AAAA-MM-JJ`. `from` = `id`,
  `to` = le dernier jour.
- `list[].items[].id` : un identifiant court, unique dans la semaine (c'est la clé des
  cases à cocher). Réutiliser le même identifiant d'une semaine à l'autre pour un même
  produit est souhaitable.
- `price` : un nombre, point décimal (`11.81`, pas `11,81 $`). L'app fait l'affichage en
  virgule, les sous-totaux par rayon et le grand total — ne pas les calculer.
- `sp` : `true` si l'article est en spécial cette semaine.
- `menu[]` : un objet par jour, `midi` et `soir`. `lo` est facultatif et sert d'étiquette
  (« restes »).
- `badge` vaut exactement `"ok"` ou `"freeze"`.
- Le HTML permis dans les textes se limite à `<strong>`.
- Pas de virgule finale, pas de commentaire : le JSON doit être valide tel quel.
