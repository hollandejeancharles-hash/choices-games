# Dilemme / Dilemma

**[Jouer à Dilemme](https://dilemme.app/)**

Après chaque choix solo, les pourcentages A/B regroupent les votes des joueurs connectés et invités. Un identifiant aléatoire conservé dans le navigateur limite chaque appareil à un vote par dilemme, sans enregistrer de nom ni d’adresse e-mail.

**Deux choix. Aucune réponse facile.** Un jeu bilingue de dilemmes moraux, en solo ou à 2–6 sur le même appareil. Ancien nom : Choices ; le dépôt GitHub conserve son nom `choices-games`.

150 situations fictives (60 générales et 30 pour chacun des packs Amitié, Couple et Famille) opposent des valeurs et des conséquences coûteuses : justice contre protection, loyauté contre autonomie, présent contre avenir. Certaines évoquent la mort ou l'injustice, sans descriptions graphiques. Le scénario du centre commercial est inclus. Les issues imposées sont des conventions de jeu, pas des conseils pour une situation réelle.

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

Stack : Vite, React, TypeScript strict, Tailwind CSS, CSS personnalisé, Supabase Auth et Vitest. Les comptes joueurs utilisent Supabase Auth ; aucune réponse détaillée de partie n’y est envoyée. Le radar est un SVG accessible ; la carte téléchargeable est dessinée en Canvas et exportée en PNG.

## Fonctionnalités

- FR/EN détecté depuis le navigateur, modifiable pendant la partie ; nom Dilemme/Dilemma selon la langue.
- Parties équilibrées de 10, 15 ou 25 questions, avec un pack présélectionné. Ordre des options alterné pour limiter le biais de position.
- Clavier ←/→, clic, glissement horizontal sur les cartes tactiles, focus visible, lien d'évitement, réduction des animations.
- Thèmes clair et sombre ; responsive pour téléphone et ordinateur.
- Compte joueur facultatif : inscription par e-mail, confirmation d’adresse, connexion persistante, déconnexion et récupération sécurisée du mot de passe. Le pseudo est stocké dans les métadonnées du compte ; les salons restent accessibles sans compte.
- Sauvegarde cloud privée de la partie en cours pour les joueurs connectés. Les portraits solo terminés alimentent une chronologie affichant les 20 résultats les plus récents avec comparaison de l’évolution entre deux parties.
- Espace joueur avec modification du pseudo et de l’e-mail, export JSON, suppression d’un portrait, effacement de l’historique et suppression définitive du compte.
- Dilemme quotidien réservé aux joueurs connectés, avec résultat collectif agrégé après le vote.
- Duels privés asynchrones de cinq questions par code à huit caractères, valables 14 jours. Les réponses ne sont révélées qu’après la participation du second joueur.
- Cercles privés par code d’invitation avec compteur de membres et historique des scores d’accord des duels associés.
- Pause explicite et pause quand l'onglet est masqué. Le chronomètre commence quand le dilemme est révélé.
- Reprise de la dernière partie, langue et thème conservés avec `localStorage`, accès protégés par `try/catch`. Une sauvegarde invalide est ignorée ; un échec d'écriture est signalé.
- Profils avec 10 archétypes, second archétype, radar, trois tendances, contradictions et décisions longues.
- Pass-and-play : une question commune, puis chaque joueur répond derrière un écran de passage. Le groupe choisit une révélation après chaque question (par défaut) ou un récapitulatif de toutes les réponses à la fin. Les portraits viennent ensuite.
- Chrono groupe optionnel : 20 secondes (par défaut), 30 secondes ou sans limite. À zéro, la réponse reste possible et aucun choix automatique n’est effectué. Les pauses suspendent le chrono ; comme le temps de réponse, il redémarre si la question est rechargée.
- Les révélations en attente sont sauvegardées ; le récapitulatif reste accessible depuis les résultats du groupe.
- Comparaison de tous les duos et question la plus divisée. Les égalités sont départagées dans l'ordre du catalogue ou des joueurs. À deux, une carte « Votre duo » affiche les réponses communes, les dimensions proches (écart maximal de 20 points sur l’échelle −100 à +100) et toutes les dimensions ex æquo pour le plus grand écart.
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

Les nouvelles parties utilisent un seul axe par question, avec des poids +3/−3 et aucun multiplicateur de vitesse. Le score est la moyenne des choix sur cet axe, ramenée sur [−100,100]. Les durées restent disponibles pour les hésitations. Les anciennes sauvegardes gardent leur moteur historique (poids secondaires et multiplicateur de temps) pour ne pas modifier leurs résultats.

La cohérence vaut `abs(somme des contributions) / somme(abs(contributions))`. La confiance combine nombre de réponses effectives et cohérence : `(1 − exp(−n/3)) × (0,5 + 0,5 × cohérence)`. Un axe sans réponse est inconnu. Un axe touché au moins deux fois, de cohérence inférieure à 0,5, est ambigu.

Le tirage est enregistré dès le début de partie. Dans l’ordre des axes du tableau, les quotas sont [2,2,2,2,1,1] pour 10 questions, [3,3,3,2,2,2] pour 15 et [5,4,4,4,4,4] pour 25. Ils restent identiques quels que soient la graine, le pack et les réponses. Chaque pack thématique contient cinq questions par axe. Le format général utilise des variantes calibrées des 60 questions originales ; les identifiants historiques restent disponibles pour les anciennes sauvegardes.

À choix équivalents par dimension, les scores sont identiques malgré un autre tirage ou une autre vitesse de réponse. Des choix différents peuvent toujours produire un autre portrait : l’équilibrage ne garantit pas une personnalité immuable. La cohérence globale sert à montrer les contradictions des nouvelles parties ; les anciennes parties conservent aussi leurs paires de cohérence et leur sélection adaptative.

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

Le helper attribue +3 à l'option A et −3 à l'option B sur l'axe principal. Les variantes des nouvelles parties ne conservent que cet axe principal. Pour enrichir un pack, ajouter une ligne bilingue dans `src/data/packs.ts`, en conservant les quotas disponibles. Le contenu reste indépendant du moteur. Les sept thèmes disponibles sont `travel`, `work`, `relationships`, `powers`, `everyday`, `absurd`, `ethics`.

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

### Comptes joueurs

Dans **Supabase > Authentication > URL Configuration**, ajouter l’URL de
redirection de production :

`https://dilemme.app/?account=1`

Conserver les URL de développement utilisées par l’équipe (par exemple
`http://localhost:5173/?account=1`) uniquement si nécessaire. Activer la
confirmation e-mail dans les réglages d’authentification pour que la création
d’un compte exige la validation de l’adresse. Les modèles d’e-mail de
confirmation et de récupération doivent conserver `{{ .ConfirmationURL }}`.

Exécuter ensuite `supabase/player-accounts.sql` dans l’éditeur SQL. La migration
crée la sauvegarde active et l’historique privé, active RLS et limite chaque
lecture ou écriture au propriétaire authentifié. Les résultats historiques ne
contiennent pas les réponses détaillées : uniquement la date, le format,
l’archétype et le vecteur des six dimensions. Les réponses restent présentes
dans la sauvegarde active le temps de terminer la partie, puis celle-ci est
supprimée.

Exécuter enfin `supabase/player-social.sql` pour activer les réglages du compte,
le dilemme du jour, les duels asynchrones et les cercles privés. Les tables
sociales ne sont jamais accessibles directement depuis le client : toutes les
opérations passent par des fonctions contrôlant `auth.uid()`. Un duel expire
après 14 jours et ses réponses restent invisibles jusqu’à ce que les deux
participants aient terminé.

Exécuter aussi `supabase/public-votes.sql` pour afficher les résultats A/B de
tous les dilemmes. La table n’est pas lisible directement : une fonction RPC
publique valide le dilemme, limite un identifiant de navigateur à un vote et ne
renvoie que les totaux agrégés.
