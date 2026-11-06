# FiscAI

Suivi des dossiers fiscaux et des échéances OTR pour les cabinets comptables et fiscaux (plateforme multi-cabinets).
Next.js 16, Supabase, Tailwind 4, déploiement Vercel.

## Mise en route

1. Variables d'environnement : voir `.env.example` (à renseigner dans Vercel > Settings > Environment Variables).
2. Base de données : exécuter `supabase/schema.sql` (première installation), puis chaque fichier de `supabase/migrations/` dans l'ordre (`2026-11-06_ameliorations.sql`, puis `2026-11-07_multi_cabinets.sql`), depuis Supabase > SQL Editor.
3. Déployer : un push sur `main` déclenche Vercel.

## Fonctionnalités automatiques

| Tâche | Quand | Réglage |
|---|---|---|
| Génération des échéances de l'année | le 1er de chaque mois | toujours active (idempotente) |
| Relances e-mail J-7, J-3, J+1 | chaque jour 07h00 | Paramètres > Automatisations (désactivée par défaut) |
| Récapitulatif mensuel aux clients | le 1er du mois | Paramètres > Automatisations (désactivé par défaut) |
| Notification push quotidienne | chaque jour 07h00 | Paramètres > Automatisations + chaque utilisateur active son appareil |
| Sauvegarde JSON des tables | chaque dimanche 02h00 | bucket privé `sauvegardes`, 8 sauvegardes conservées |

Les crons sont déclarés dans `vercel.json` et protégés par `CRON_SECRET`.
La sauvegarde ne couvre pas les fichiers PDF du Storage `documents-fiscaux`.

## Règles métier à valider

Les échéances générées et les pénalités sont calculées avec des règles PAR DÉFAUT à faire valider par le cabinet :
- `src/lib/echeances.ts` : jour d'échéance de la TVA, date de l'IS, obligations par régime (les régimes TPU ne génèrent rien).
- `src/lib/penalites.ts` : taux de majoration et d'intérêt de retard (affichés comme « estimation »).

## Environnement de test (staging)

Vercel crée un aperçu pour chaque branche et chaque pull request. Pour ne pas toucher aux données réelles :
1. Créer un second projet Supabase « fiscai-test », y exécuter `schema.sql` et les migrations.
2. Dans Vercel > Settings > Environment Variables, renseigner les variables du projet de test avec la portée **Preview** uniquement.
3. Travailler sur une branche (`git checkout -b test`) : l'aperçu utilise la base de test, `main` utilise la production.

## Qualité

- `npm test` : tests unitaires (échéances, pénalités, relances, import, limitation de débit).
- `npm run typecheck` : vérification TypeScript.
- GitHub Actions (`.github/workflows/ci.yml`) exécute typage, tests et build à chaque push.
- Les erreurs rencontrées par les utilisateurs sont journalisées (table `error_logs`, page Admin > Journal d'erreurs).

## Portail client

Dans Clients > Portail : lien privé en lecture seule (statuts et échéances, sans montants). Révocable à tout moment.

## Multi-cabinets

- Un cabinet = un espace isolé (table `cabinets`). Toutes les tables métier portent `cabinet_id` et le RLS filtre sur `mon_cabinet()`.
- Première connexion : l'utilisateur crée son cabinet (il en devient administrateur) ou rejoint un cabinet avec son code d'invitation (page `/onboarding`).
- Le code d'invitation est visible et régénérable par les administrateurs dans Paramètres > Cabinet.
- Les automatisations (relances, récapitulatifs, push) se règlent par cabinet. Le cron traite chaque cabinet séparément.
- Les documents (bucket `documents-fiscaux`) sont privés et cloisonnés par cabinet ; ils s'ouvrent via une URL signée de 2 minutes.
- Opérateurs de la plateforme (table `operateurs`) : seuls à voir le journal d'erreurs et à générer les clés VAPID. Pour en ajouter un : `INSERT INTO operateurs (user_id) VALUES ('<uuid de l'utilisateur>');`.
- E-mails : tous les cabinets partagent le compte EmailJS de la plateforme ; le nom du cabinet sert de signature et d'expéditeur affiché, son e-mail de réponse est en `reply_to`.
- Non couvert : facturation, quotas par cabinet, adhésion soumise à validation (le code suffit).
