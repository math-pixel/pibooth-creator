# Pibooth Creator

Éditeur visuel pour créer des templates compatibles avec le plugin
[pibooth-picture-template](https://github.com/pibooth/pibooth-picture-template), sans passer par
l'éditeur ML (Flowchart Maker / draw.io) qui n'est pas intuitif pour les débutants.

## Fonctionnalités

- Choix du format de page (4x6", 2x6" bande photo, 5x7", 6x8" ou personnalisé) et de la résolution (DPI).
- Pour chaque nombre de photos (1 à 4) et chaque orientation (portrait / paysage) :
  - Ajout d'images de fond (background) et de premier plan (foreground / cadre), positionnables et
    redimensionnables librement, avec gestion de l'ordre des calques (z-index).
  - Ajout de zones photo numérotées (1 à 4), déplaçables, redimensionnables et pivotables à la souris.
  - Ajout de zones de texte (`footer_text1`, `footer_text2`) supportées par le plugin.
  - Bouton pour dupliquer une mise en page portrait vers le paysage (rotation automatique des zones).
- Export en un clic vers un fichier `picture_template.xml` directement utilisable par le plugin
  (format `mxGraphModel` natif, aucune dépendance à draw.io).

## Utilisation

```bash
npm install
npm run dev
```

Puis ouvrez `http://localhost:5173`.

## Utiliser le template généré dans pibooth

1. Téléchargez `picture_template.xml` depuis l'application.
2. Placez-le à l'endroit de votre choix (ex: `~/.config/pibooth/picture_template.xml`).
3. Dans `pibooth.cfg`, section `[PICTURE]`, renseignez :
   ```ini
   [PICTURE]
   template = /chemin/vers/picture_template.xml
   ```
4. Redémarrez pibooth.

Seules les combinaisons (nombre de photos × orientation) que vous avez activées et pour lesquelles
vous avez défini des zones photo sont incluses dans l'export — inutile de tout créer d'un coup.
