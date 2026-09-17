# Activer les propositions publiques et la modération

Le formulaire utilise le même projet Supabase que les salons en ligne. Les tables
et fonctions ont été installées le 17 septembre 2026. La configuration publique
commune se trouve dans `src/services/supabase-config.ts`; les variables Vite
permettent de choisir un autre projet.

## Mise en service sur un autre projet

1. Installer `supabase/multiplayer.sql`, puis `supabase/community.sql` une seule fois.
2. Créer le compte dans Supabase → Authentication → Users, avec un mot de passe
   défini par son propriétaire. Ajouter son UUID à `public.dilemma_admins` depuis
   SQL Editor. Aucun utilisateur ne peut s’attribuer ce rôle depuis le site.
3. Configurer `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` dans `.env.local`
   et les variables GitHub Actions, puis déployer. Ne jamais utiliser service_role
   dans le navigateur.
4. Ouvrir « Admin » en bas du site et se connecter. Une inscription ordinaire
   éventuelle ne donne aucun droit de modération.

## Fonctionnement

- Public : formulaire sans compte, langue + situation + deux choix + accord de
  publication. Pas de nom ou d’adresse e-mail collectés par le formulaire.
- Admin : connexion email/mot de passe, liste des 100 premières propositions en
  attente, original visible, édition et traduction avant validation, refus.
- L’axe sélectionné donne +3 à A et −3 à B. L’admin doit vérifier cette cohérence.
- La publication est atomique et immuable : les parties en cours restent cohérentes.
  Une correction d’un texte publié nécessite une intervention dans la base et une
  stratégie de versionnement, pas un changement silencieux des scores existants.
- Le catalogue public contient au maximum 1 000 nouvelles questions. Il est chargé
  avant l’application, avec délai maximal de 2,5 s et cache local des seules
  questions publiques. Les 150 questions intégrées restent disponibles hors ligne.
- Les jetons admin restent en mémoire et sont renouvelés toutes les 30 minutes ;
  rechargement ou sortie de l’écran = reconnexion.
- Les publications alimentent le pack « Tous les horizons » et son catalogue de
  validation serveur pour les salons QR. Les quotas de dimensions restent inchangés.
- Les refus sont conservés dans la base. Définir une durée de conservation et les
  supprimer depuis le tableau de bord selon la politique retenue.

## Contrôles avant ouverture réelle

Les fonctions administrateur vérifient le rôle dans la base, pas seulement dans
l’interface. RLS empêche le public de consulter les propositions ou de modifier
leur statut. Les clés publiques ne donnent aucun droit admin.

Sur un projet de test, exécuter `supabase/security-check.sql` après la migration.
Le fichier teste les refus d’accès et les insertions publiques dans une transaction
annulée. Tester aussi manuellement avec un vrai compte admin, un compte ordinaire
et sans connexion avant d’ouvrir les propositions.

Une limite globale de 30 propositions/minute et 2 000 en attente protège le volume,
avec un champ piège dans le formulaire. Ce n’est pas une protection anti-bot forte :
pour une audience importante, ajouter un CAPTCHA vérifié par une Edge Function et
une limite par source. Aucun secret ne doit être ajouté au frontend.

`npm run test:community` teste PostgreSQL via PGlite : soumission, file privée,
refus des non-admins, validation bilingue, publication, rejet et synchronisation
du catalogue en ligne. Ce test est exécuté en CI.

Documentation officielle :
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/passwords
