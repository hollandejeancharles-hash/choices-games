# Dilemme / Dilemma

**[Jouer à Dilemme](https://hollandejeancharles-hash.github.io/choices-games/)**

**Deux choix. Aucune réponse facile.** Un jeu bilingue de dilemmes moraux, en solo ou à 2–6 sur le même appareil. Ancien nom : Choices ; le dépôt GitHub conserve son nom `choices-games`.

60 situations fictives opposent des valeurs et des conséquences coûteuses : justice contre protection, loyauté contre autonomie, présent contre avenir. Certaines évoquent la mort ou l'injustice, sans descriptions graphiques. Le scénario du centre commercial est inclus. Les issues imposées sont des conventions de jeu, pas des conseils pour une situation réelle.

## Lancer le projet

Node.js 22.12+ ou 24, npm.

```sh
npm ci
npm run dev
```

Ouvrir l'adresse indiquée par Vite. Pour vérifier la version de production :

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

`npm run format` met en forme le code ; `npm run format:check` le vérifie.

Stack : Vite, React, TypeScript strict, Tailwind CSS, CSS personnalisé et Vitest. Aucun backend, compte utilisateur, police distante ou service d'analyse. Le radar est un SVG accessible ; la carte téléchargeable est dessinée en Canvas et exportée en PNG.

## Fonctionnalités

- FR/EN détecté depuis le navigateur, modifiable pendant la partie ; nom Dilemme/Dilemma selon la langue.
- Parties adaptatives de 10, 15 ou 25 questions. Ordre des options alterné pour limiter le biais de position.
- Clavier ←/→, clic, glissement horizontal sur les cartes tactiles, focus visible, lien d'évitement, réduction des animations.
- Thèmes clair et sombre ; responsive pour téléphone et ordinateur.
- Pause explicite et pause quand l'onglet est masqué. Le chronomètre commence quand le dilemme est révélé.
- Reprise de la dernière partie, langue et thème conservés avec `localStorage`, accès protégés par `try/catch`. Une sauvegarde invalide est ignorée ; un échec d'écriture est signalé.
- Profils avec 10 archétypes, second archétype, radar, trois tendances, contradictions et décisions longues.
- Pass-and-play : une question commune, puis chaque joueur répond derrière un écran de passage ; les résultats sont visibles ensemble à la fin.
- Comparaison de tous les duos et question la plus divisée. Les égalités sont départagées dans l'ordre du catalogue ou des joueurs ; avec deux joueurs, le même duo est nécessairement le plus proche et le plus contrasté.
- PNG 1200 × 1400 et lien de portrait autonome.

La confidentialité entre les tours est visuelle, pas une protection contre une personne qui inspecterait le stockage local de l'appareil. Le portrait est ludique, non clinique. La rareté affichée est explicitement fictive.

## Architecture

```text
src/
  core/          Types et moteur pur : scores, confiance, sélection, archétypes, groupes
  data/          Questions, archétypes et textes des axes, FR/EN
  components/    Questions, profils, radar, groupe, partage
  services/      Sessions, validation du stockage, liens et export PNG
  i18n.ts        Textes de l'interface
  App.tsx        Navigation et orchestration
  style.css      Identité visuelle, responsive, thèmes, mouvement
public/
  dilemma-mark.png
```

## Modèle de scoring

| Clé          | Pôle −100  | Pôle +100    |
| ------------ | ---------- | ------------ |
| adventure    | Sécurité   | Aventure     |
| reason       | Cœur       | Raison       |
| independence | Collectif  | Indépendance |
| future       | Instant    | Avenir       |
| structure    | Créativité | Structure    |
| ambition     | Humilité   | Ambition     |

Aucun pôle n'est supérieur à l'autre. Les poids sont des choix éditoriaux sur une tension donnée, pas une évaluation morale de la personne. Un même arbitrage pourrait avoir plusieurs motivations que ce jeu ne peut pas distinguer.

Chaque option touche 1 à 3 axes avec des poids non nuls de −3 à +3. Moins de 3 secondes : ×1,25 ; plus de 15 secondes : ×0,75 ; sinon ×1. Les temps de pause et d'onglet masqué sont exclus. La lecture et les distractions peuvent néanmoins allonger une réponse : l'interface le précise. Après rechargement, la question en attente est révélée à nouveau et son chronomètre repart à zéro.

Pour chaque axe, le score est la somme pondérée divisée par la somme des poids absolus maximaux proposés sur cet axe, multipliés par 1,25, puis ramenée sur [−100,100]. Une option non choisie peut augmenter la capacité, mais ne crée ni preuve ni confiance. La normalisation conserve l'effet du temps, même pour une réponse isolée.

La cohérence vaut `abs(somme des contributions) / somme(abs(contributions))`. La confiance combine nombre de réponses effectives et cohérence : `(1 − exp(−n/3)) × (0,5 + 0,5 × cohérence)`. Un axe sans réponse est inconnu. Un axe touché au moins deux fois, de cohérence inférieure à 0,5, est ambigu.

La sélection moyenne les besoins des joueurs, favorise les axes peu mesurés ou ambigus et ajoute une priorité de couverture aux axes jamais touchés, pour empêcher les contradictions de monopoliser la partie. Elle évite les deux derniers thèmes lorsque possible, exclut les questions déjà répondues et encourage à compléter une paire de cohérence. La graine enregistrée départage les égalités de manière reproductible ; elle ne remplace pas la sélection adaptative par du hasard.

Les six paires de cohérence mesurent le même axe dans deux contextes. Les signes opposés alimentent les contradictions sans pénalité. La section présente aussi les axes avec une faible cohérence globale ; si une paire n'a pas été entièrement jouée, aucune conclusion spécifique n'en est tirée.

Les archétypes sont classés par distance euclidienne dans les six dimensions. La rareté est `prior / somme(prior) × 100`, une distribution théorique éditoriale. La compatibilité est `100 × (1 − distance / (200 × √6))`, arrondie et bornée. Une question divise au maximum lorsqu'elle partage le groupe également ; seules les questions répondues par tous comptent.

Le radar place le pôle négatif au centre, le positif au bord et l'équilibre à mi-rayon. Les deux pôles et le nombre de réponses sont également listés sous le graphique. La partie courte donne une esquisse ; une nouvelle partie peut aboutir à un autre résultat.

## Ajouter une question

Ajouter un appel à `q()` dans `src/data/questions.ts`. Les paramètres sont l'identifiant, le thème, l'axe principal, l'énoncé FR/EN, les deux choix FR/EN, les poids secondaires éventuels et l'identifiant de paire éventuel.

```ts
q(
  "unique-id",
  "relationships",
  "independence",
  l("Situation en français…", "Adapted English situation…"),
  l("Choix autonome avec son coût…", "Independent choice and its cost…"),
  l("Choix collectif avec son coût…", "Collective choice and its cost…"),
  { future: 1 },
  { reason: -1 },
);
```

Le helper attribue +3 à l'option A et −3 à l'option B sur l'axe principal. Pour opposer deux axes distincts ou varier les poids, ajouter directement un objet `Question` typé. Le contenu reste indépendant du moteur. Les sept thèmes disponibles sont `travel`, `work`, `relationships`, `powers`, `everyday`, `absurd`, `ethics`.

Exiger deux coûts explicites, éviter la réponse caricaturalement vertueuse, adapter l'anglais naturellement et ne pas insérer de détails graphiques. Une paire partage `consistency.pairId` et `consistency.axis` ainsi que la convention de signe. Mettre à jour le test de paires si le catalogue gagne des paires supplémentaires.

`src/data/content.test.ts` vérifie : ≥60 identifiants uniques, FR/EN, 1–3 poids par choix, ≥10 situations dans chaque sens de chaque axe, thèmes et paires. Les tests de sessions vérifient aussi la couverture sur 100 graines avec des réponses de groupe contradictoires.

## Ajouter un archétype

Ajouter un objet `Archetype` dans `src/data/archetypes.ts` : identifiant unique, nom et description bilingues, vecteur cible complet borné entre −100 et +100, `prior` positif. Rééquilibrer les priors pour conserver un total de 100 et actualiser le nombre attendu dans les tests. Écrire un texte bienveillant qui comprend une nuance concrète.

## Partage et hébergement

Le fragment `#r=…` contient un JSON versionné encodé en base64url : scores, compteurs, cohérence, marqueurs de contradiction, durée du format et langue. Il ne contient ni prénom ni réponses détaillées. Le décodage valide types et bornes ; un lien corrompu affiche un message et permet de jouer. L'encodage n'est ni un chiffrement ni une signature.

Un lien `localhost`/`127.0.0.1` fonctionne seulement sur l'appareil qui sert le jeu. Pour partager avec d'autres personnes, héberger le dossier `dist/` sur un hébergement statique HTTPS. Le `base` relatif permet de servir le jeu dans un sous-dossier, notamment sous le nom du dépôt. Le workflow `.github/workflows/deploy-pages.yml` lance les tests et le build à chaque push sur `main`, puis publie `dist/` sur GitHub Pages. Un échec de test ou de build bloque le déploiement.

## Identité visuelle

Logo fourni par le propriétaire du projet, intégré sans modification dans `public/dilemme-logo.png`. Typographie Inter variable, hébergée localement via Fontsource (licence OFL). La direction visuelle reprend les titres massifs et les aplats colorés de [Coolors](https://coolors.co/?home). Les 55 teintes fournies (Vibrant Coral, Emerald, Fresh Sky, Sunflower Gold, Tangerine Dream) sont conservées dans `src/styles/palette.css`. Le thème clair est proposé par défaut ; le thème sombre et les préférences existantes sont conservés. La carte PNG utilise la même palette, la même police et le logo fourni. L’ancienne proposition de logo et son prompt restent archivés dans le dépôt.

### Fond Aurora

`src/components/ui/aurora-background.tsx` adapte le composant fourni. Le dossier `components/ui` isole les primitives visuelles réutilisables des écrans du jeu, conformément à la convention shadcn. Le projet dispose déjà de React, TypeScript strict et Tailwind CSS v4 ; aucun nouveau scaffolding ni configuration Tailwind v3 n'est nécessaire.

Le composant accepte les props HTML d'un `div`, `children`, `className`, `enabled` et `showRadialGradient`. Il utilise les variables de la palette et `data-theme` existants, sans état partagé, alias supplémentaire, image distante ou dépendance Framer Motion. Le CSS se trouve dans `src/styles/aurora.css`.

L'aurore est réservée à l'accueil et démontée pendant les autres écrans. Le mouvement lent utilise une transformation CSS ; les couleurs ne sont pas inversées. Le masque atténue les lumières sous le texte et vers le bas de page. Le mobile utilise une seule couche ; les préférences de réduction du mouvement figent le fond, et le contraste renforcé le masque. La couche décorative ne reçoit aucun clic, est ignorée par les lecteurs d'écran et n'ajoute pas de second élément `main`.

## Validation

22 tests unitaires couvrent pondération temporelle, bornes, confiance, contradictions, sélection, archétypes, compatibilité, contenu, reprise de session, groupe et sérialisation du partage. Vérification TypeScript stricte et build Vite.

Vérifications navigateur : partie solo FR complète, reprise après rechargement, partie groupe EN (deux joueurs, dix questions communes), portraits individuels, téléchargement PNG, copie et ouverture d'un lien partagé, vues mobile et ordinateur. Les tests automatisés complètent ces parcours, notamment pour les formats 15/25 et les séries de réponses contradictoires.

### Avis illustratifs et portraits bonus

Les cartes en perspective de `src/components/ui/3d-testimonials.tsx` présentent six
avis **fictifs**, signalés comme tels, traduits en français et en anglais. Le
composant Marquee est adapté à la structure existante React / TypeScript / Tailwind
4, sans dépendance Avatar ou photos externes. Pause manuelle, au survol et au focus ;
une grille statique remplace l'animation avec `prefers-reduced-motion`.

Les résultats individuels (solo, groupe et liens partagés) incluent deux bonus :

- **Ton dark side / Your dark side** : caricature du pôle le plus marqué parmi les
  axes mesurés. Son intensité est la valeur absolue du score de cet axe, arrondie
  sur 100 ; elle ne mesure pas la méchanceté. Douze personnages bilingues, avec un
  texte neutre lorsque tous les scores sont proches du centre.
- **Solidarité ↔ Autonomie / Solidarity ↔ Autonomy** : lecture de l'axe existant
  collectif / indépendance. Position = `(score + 100) / 2`, zone équilibrée de 40
  à 60, nombre de réponses et divergences affichés. Aucune affiliation politique
  n'est déduite. Un axe absent reste « à explorer ».

Le calcul est dans `src/core/bonus.ts`. Les liens existants permettent de recalculer
ces bonus sans modifier leur format. La carte PNG reste le résumé du portrait principal.

### Avatars chibi

Les dix archétypes possèdent un avatar chibi 2D original, généré avec imagegen à
partir de la référence de style fournie. Les fichiers `public/avatars/<id>.png`
sont associés aux identifiants stables des archétypes, dans les deux langues.
Ils apparaissent sur le portrait individuel, les boutons des résultats de groupe
et dans la carte PNG exportée. Les images sont hébergées avec le jeu.

### Galerie et propositions communautaires

La galerie FR/EN présente les dix personnages depuis l’accueil et le pied de page.
Le formulaire public et l’espace admin utilisent un projet Supabase séparé. Sans
configuration, ils affichent un état indisponible explicite et n’envoient rien.
Voir [le guide de mise en service](docs/COMMUNITY_SETUP.md) et la migration
`supabase/community.sql`. Les variables publiques de build sont décrites dans
`.env.example`. Les propositions ne rejoignent le catalogue qu’après validation
admin avec traductions et axe de score. Les contrôles SQL doivent être exécutés
sur le projet réel avant ouverture des propositions.
