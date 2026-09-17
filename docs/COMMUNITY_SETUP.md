# Activer les propositions publiques et la modération

La galerie fonctionne immédiatement. Le formulaire et l’admin restent explicitement
indisponibles tant que Supabase n’est pas configuré : aucune fausse confirmation
et aucune proposition enregistrée uniquement dans le navigateur.

## Mise en service

1. Créer un projet sur https://supabase.com/dashboard. Choisir une région adaptée
   aux utilisateurs. Aucun compte payant n’a été créé par cette modification.
2. Exécuter `supabase/community.sql` **une seule fois** dans SQL Editor, sur un
   projet neuf. Le script crée les tables, droits et fonctions de modération.
3. Dans Authentication, désactiver les inscriptions publiques. Créer le compte
   administrateur dans le tableau de bord (adresse vérifiée et mot de passe fort).
4. Copier son UUID puis exécuter dans SQL Editor :

```sql
insert into public.dilemma_admins(user_id) values ('UUID_DU_COMPTE_ADMIN');
```

5. Dans GitHub → dépôt → Settings → Secrets and variables → Actions → Variables,
   définir `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`, depuis les
   paramètres API du projet. Utiliser uniquement la clé **publishable** publique,
   jamais `service_role` ou une clé secrète. L’URL attendue est
   `https://<project-ref>.supabase.co`.
6. Relancer « Test and deploy Dilemme » dans Actions. En local, copier `.env.example`
   en `.env.local` et renseigner les mêmes valeurs.
7. Tester avec une proposition fictive : elle apparaît dans Admin après connexion,
   mais pas dans le catalogue public. Compléter FR/EN, choisir l’axe, puis publier.
   Recharger le jeu pour récupérer la nouvelle question.

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
  questions publiques. Les 60 questions intégrées restent disponibles hors ligne.
- Le jeton admin reste en mémoire ; rechargement ou sortie de l’écran = reconnexion.
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

Les tests SQL et les appels réels d’authentification/publication n’ont pas pu être
exécutés tant qu’aucun projet Supabase n’est fourni.

Documentation officielle :
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/passwords
