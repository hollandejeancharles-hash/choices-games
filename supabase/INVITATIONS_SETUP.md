# Invitations Dilemme

La migration social-invitations.sql est appliquée au projet xkutdvtqjtamjpjbwhme.
La fonction send-invitation est déployée. Elle vérifie le jeton utilisateur avec auth.getUser ; la vérification JWT legacy doit rester désactivée.

## Configuration de production

Le domaine `dilemme.app` est vérifié dans Resend (région eu-west-1). Les secrets `RESEND_API_KEY` et `INVITATION_FROM` sont enregistrés dans Supabase ; l’expéditeur est `Dilemme <invitations@dilemme.app>`. La clé est limitée à l’envoi sur ce domaine.

Le 22 septembre 2026, un test depuis les secrets de la fonction Supabase a été reçu dans la boîte Gmail du propriétaire. Le diagnostic temporaire a été retiré après le test. Cela valide la connexion serveur au fournisseur ; les tests automatisés couvrent séparément les invitations, leurs permissions et les relances.

## Reconfiguration Resend

1. Créer un compte Resend et valider un domaine d’envoi avec ses enregistrements DNS.
2. Créer une clé API limitée à l’envoi.
3. Dans Supabase > Edge Functions > Secrets, définir :
   - RESEND_API_KEY : la clé Resend.
   - INVITATION_FROM : Dilemme <invitations@dilemme.app>.
4. Tester l’envoi avec une adresse de test que vous contrôlez, puis accepter l’invitation avec cette même adresse.
5. Dans Authentication > URL Configuration, autoriser les redirections vers https://dilemme.app/** pour conserver le paramètre invite après confirmation d’inscription.

Ne jamais mettre ces secrets dans Vite, Git ou le navigateur de l’application. Aucun e-mail n’est envoyé tant que les secrets ne sont pas configurés ; l’invitation reste partageable par lien et apparaît comme non envoyée. Le succès signifie que Resend a accepté l’e-mail, pas une garantie de réception.

## Fonctionnement et limites

Les liens sont à usage unique et expirent 14 jours après création. Les invitations par e-mail sont liées à une adresse confirmée. L’acceptation est explicite et idempotente. Seuls l’expéditeur et le destinataire voient une invitation ; seuls les deux amis voient leur relation. Aucune recherche publique d’adresses n’est exposée.

Maximum 10 créations par heure et par expéditeur, 3 invitations par jour du même expéditeur vers une même adresse, 5 tentatives d’envoi par invitation et une minute entre tentatives. Les relances après une erreur d’envoi réutilisent la clé d’idempotence. Les relations et invitations de l’expéditeur sont supprimées en cascade si son compte est supprimé.

Le bouton Créer un Duo depuis les amis ouvre le parcours Duo existant : partager ensuite son code avec l’ami.

## Vérifications

npm test
npm run test:social
npm run build

Les tests SQL utilisent PGlite. Les tests d’envoi utilisent un fournisseur simulé : aucun e-mail réel n’est envoyé.
