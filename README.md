# Semaine Super C

Petite app web installable (PWA) de planification de repas : menu de la semaine, liste
d'épicerie cochable avec total, conseils de conservation, recettes. Usage personnel.

## Installer

**iPhone** — ouvrir le site **dans Safari**, bouton Partager → *Ajouter à l'écran
d'accueil*. L'app se lance ensuite en plein écran, sans barre de navigateur.

**Windows, au choix :**

- *Le fichier d'installation* — double-cliquer `dist/SemaineSuperC-Setup.exe` (~27 Ko).
  Il pose l'icône au menu Démarrer et sur le Bureau, et s'enlève par Ajout/Suppression de
  programmes. Comme il n'est pas signé, SmartScreen peut demander une confirmation au
  premier lancement : *Informations complémentaires* → *Exécuter quand même*.
- *Sans fichier* — ouvrir le site dans Edge, puis l'icône *Installer* dans la barre
  d'adresse (ou menu ⋯ → *Applications* → *Installer ce site en tant qu'application*).

Les deux donnent le même résultat : une fenêtre propre sans barre d'adresse, une icône au
menu Démarrer, et le fonctionnement hors ligne.

## Ce qu'elle fait

- **Liste d'épicerie** cochable, par rayon, avec sous-totaux et reste à payer.
  L'état des cases est conservé séparément pour chaque semaine.
- **Sélecteur de semaines** : les semaines passées restent consultables.
- **Hors ligne** : une fois ouverte, l'app fonctionne sans réseau — utile dans les allées
  où le signal ne passe pas.
- **Mise à jour automatique** : le contenu est retéléchargé à chaque ouverture. Une
  nouvelle semaine apparaît sans réinstallation.
- **Bouton Super C** vers la circulaire, pour magasiner.

## Ajouter une semaine

Voir [CLAUDE.md](CLAUDE.md) — schéma des fichiers `data/*.json` et marche à suivre.
