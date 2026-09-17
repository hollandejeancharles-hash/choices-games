# Dilemme / Dilemma

Jeu bilingue « Tu préfères… » entièrement côté navigateur. Moteur et catalogue bilingue disponibles. L'interface actuelle est un écran temporaire, pas encore un jeu jouable.

## Développement

Node.js 22.12+ (ou 24) et npm.

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

Stack : Vite, React, TypeScript strict, Tailwind CSS, Vitest. Aucun backend.

## Architecture

- `src/core/types.ts` : contrats de données bilingues et état de partie versionné.
- `src/core/engine.ts` : fonctions pures, sans stockage, horloge ni interface.
- `src/core/engine.test.ts` : tests du modèle.

## Modèle de scoring

Les pôles positifs sont aventure, raison, indépendance, avenir, structure et ambition ; leurs opposés sont sécurité, cœur, collectif, instant, créativité et humilité. Aucun pôle n'est supérieur à l'autre.

Chaque réponse porte des poids non nuls de −3 à +3. Moins de 3 secondes : ×1,25 ; plus de 15 secondes : ×0,75 ; sinon ×1. Ces seuils sont des choix de jeu, pas une mesure psychologique validée. L'interface devra transmettre uniquement le temps actif de décision.

Le score est la somme pondérée divisée par la somme des poids absolus maximaux proposés sur cet axe, multipliés par 1,25, puis ramenée sur [−100,100]. Un axe proposé mais non choisi augmente cette capacité, sans créer de preuve ni de confiance. Cette normalisation conserve l'effet du temps même pour une réponse isolée.

La cohérence vaut la valeur absolue de la somme des contributions divisée par la somme de leurs valeurs absolues. La confiance combine nombre de réponses effectives et cohérence : `(1 − exp(−n/3)) × (0,5 + 0,5 × cohérence)`. Un axe sans réponse reste inconnu. Un axe renseigné au moins deux fois dont la cohérence est inférieure à 0,5 est ambigu.

La sélection favorise les axes peu mesurés ou ambigus, moyenne les besoins de tous les joueurs et évite les deux derniers thèmes lorsque possible. Elle exclut les questions déjà répondues ; le mode groupe doit appeler la sélection après que tous les joueurs ont répondu à la question commune. Les égalités suivent l'ordre du catalogue. Un petit bonus encourage à compléter les paires de cohérence.

Les contradictions explicites proviennent de signes opposés dans une paire sur le même axe ; aucune pénalité n'est appliquée. Les réponses lentes alimentent séparément les hésitations.

Les archétypes sont classés par distance euclidienne dans les six dimensions. La rareté fictive est la fréquence théorique normalisée (`prior`), jamais une statistique réelle. La compatibilité est `100 × (1 − distance / (200 × √6))`, arrondie. La division d'une question est maximale pour un partage égal ; les questions non répondues par tous sont exclues. En cas d'égalité, l'ordre initial départage les résultats.

## Ajouter du contenu (étape 2)

Une question respecte `Question` : identifiant unique, thème, énoncé et deux options FR/EN, chaque option avec 1 à 3 axes pondérés. Une paire partage `consistency.pairId` et `consistency.axis`, avec les mêmes conventions de signe.

Un archétype respecte `Archetype` : identifiant, nom et description FR/EN, vecteur cible complet dans [−100,100] et fréquence théorique `prior` strictement positive. Le catalogue et les tests de couverture seront ajoutés à l'étape 2.

## Suite

2. Contenu bilingue et couverture des axes.
3. Parcours solo et sauvegarde locale.
4. Profils et radar.
5. Groupe et compatibilité.
6. Partage, finition visuelle, accessibilité et documentation finale.
