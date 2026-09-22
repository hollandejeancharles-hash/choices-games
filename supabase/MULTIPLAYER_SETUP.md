# Salons Dilemme

Le jeu reste une application React/Vite statique sur GitHub Pages. Il utilise Supabase Postgres via une seule fonction RPC `dilemma_room`; aucun serveur Next.js ni middleware de session n'est nécessaire. `@supabase/ssr` est installé à la demande mais n'est pas utilisé par cette architecture.

## Installation

1. Exécuter `multiplayer.sql` dans l'éditeur SQL du projet Supabase.
2. Exécuter `multiplayer-catalog.sql` pour importer les 150 questions bilingues équilibrées.
3. Configurer `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` dans `.env.local` et les variables GitHub Actions pour utiliser un autre projet. Le client contient les valeurs publiques du projet Dilemma comme valeurs par défaut. Ne jamais mettre une clé service-role dans le frontend.

Le projet Dilemma fourni a été installé et testé le 17 septembre 2026. Les tables de modération des propositions sont indépendantes de cette installation.

## Fonctionnement

L'hôte choisit un pack, 10/15/25 questions, un chrono indicatif de 20/30 secondes ou aucun, et le mode de révélation. Deux à six joueurs rejoignent par QR code/lien/code avant le lancement. Chacun peut utiliser sa langue. Le QR ne contient que le code du salon, jamais le jeton personnel.

Un jeton aléatoire propre au navigateur est conservé dans localStorage, et seulement son empreinte en base. Il permet de reprendre après rechargement ou retour à l'accueil. Utiliser un autre navigateur ou effacer son stockage fait perdre cette possibilité. Les entrées ferment au lancement. L'hôte commande le démarrage et l'avancement après chaque révélation; il peut fermer le salon pour tous. Il n'y a pas encore de transfert du rôle d'hôte: un joueur déconnecté doit revenir pour continuer.

La synchronisation interroge le serveur toutes les deux secondes lorsque l'onglet est visible. Le chrono utilise l'heure serveur, mais n'impose aucune réponse à expiration. Les salons expirent deux heures après leur création. Les salons expirés sont supprimés lors de la création d'un nouveau salon; sans nouvelles créations, les données restent en base jusqu'à ce nettoyage. Pour une rétention strictement bornée, prévoir un nettoyage planifié côté Supabase.

En production, exécuter aussi `maintenance.sql`. Il active `pg_cron` et programme
`dilemma-clean-expired-rooms` à la minute 17 de chaque heure. La tâche supprime
uniquement les salons arrivés à expiration ; joueurs et réponses associés sont
supprimés par les contraintes `ON DELETE CASCADE`. Réexécuter le fichier remplace
la tâche existante sans en créer de doublon.

## Confidentialité et validations

Les quatre tables ont RLS activé et aucun accès direct pour `anon`/`authenticated`. La RPC vérifie le jeton et l'appartenance au salon. Avant la révélation, elle ne renvoie aucune réponse, seulement les compteurs et l'état « a répondu ». En mode récapitulatif final, les réponses restent cachées jusqu'à la fin. Les actions de l'hôte sont contrôlées côté serveur, les réponses sont verrouillées et les relances identiques sont idempotentes. Le serveur valide le pack, la taille et les quotas des six dimensions, puis conserve son propre instantané des questions.

Un code partagé donne accès au lobby: ne pas publier le lien d'une partie privée. Limites actuelles: 30 créations/minute globalement, 2 000 salons conservés. Pour une ouverture à grande échelle, ajouter une limitation par origine et une supervision des abus.

## Vérification

- `npm test`: tests du jeu.
- `npm run test:rooms`: PostgreSQL local via PGlite, deux parties complètes, confidentialité, contrôles d'hôte, relances, entrées tardives et interdiction de lecture directe des tables.
- `npm run build`: TypeScript et bundle de production. Le module Supabase/QR est chargé à l'ouverture du mode en ligne.

Les deux modes ont aussi été testés contre la RPC du projet Supabase réel, avec des salons de test fermés ensuite.

## Pronostics (19 septembre 2026)

Les nouvelles parties à plusieurs activent `settings.predictions`. Chaque joueur choisit sa réponse puis prédit celle de chaque autre participant. Une bonne prédiction rapporte un point, aucun point ne dépend du choix personnel ou de la rapidité. Les égalités partagent le rang et le titre.

Réexécuter `multiplayer.sql` ajoute la colonne JSONB `guesses` et remplace la RPC sans supprimer les parties existantes. Les anciens salons continuent sans pronostics. La RPC exige exactement une prédiction (0 ou 1) par autre membre, enregistre réponse et pronostics ensemble, refuse les modifications après validation et masque les pronostics jusqu’à la révélation. Le classement est calculé à partir des réponses et pronostics validés, jamais à partir d’un score envoyé par le client.

Sur un appareil partagé, les pronostics en cours sont sauvegardés localement, puis les réponses et pronostics terminés sont conservés dans la session. En ligne, un brouillon local permet de reprendre après rechargement et la validation est conservée par le serveur. Le chrono reste indicatif. Les nouveaux tests couvrent les deux modes de révélation, les pronostics incomplets, la confidentialité, les relances, les égalités et les anciens formats.
