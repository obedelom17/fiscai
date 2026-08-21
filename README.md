# FiscAI — Gestion Fiscale Intelligente

Application web de gestion des dossiers fiscaux pour le cabinet **Experts Afrique Conseils** (Lomé, Togo).

🌐 **Production** : [fiscai-eac.vercel.app](https://fiscai-eac.vercel.app)

---

## Présentation

FiscAI permet aux collaborateurs d'un cabinet fiscal de suivre en temps réel les obligations fiscales de leurs clients, de générer des relances par IA et de centraliser tous les documents liés aux déclarations OTR.

---

## Fonctionnalités

- **Gestion des dossiers fiscaux** — TVA, IRPP, IS, Patente, Retenue Sur Loyer, Droit d'Enregistrement, Taxe d'Habitation, Taxe Foncière (Bâties / Non Bâties), Acomptes OTR
- **Relances IA** — génération automatique de messages de relance via Groq (Llama 3.1), envoi par email (EmailJS) ou WhatsApp
- **Upload de documents PDF** — stockage dans Supabase Storage
- **Calendrier des échéances** — vue mensuelle des obligations fiscales
- **Notifications en temps réel** — alertes pour les dossiers en retard ou à échéance proche
- **Assistant IA** — chatbot fiscal intégré
- **Authentification sécurisée** — email/mot de passe + Google OAuth + 2FA TOTP
- **Gestion multi-collaborateurs** — portefeuilles clients, rôles admin/collaborateur
- **Audit trail** — historique complet de toutes les actions
- **Tableau de bord statistique** — graphiques et indicateurs clés

---

## Stack technique

| Technologie | Usage |
|---|---|
| Next.js 16 | Framework React (App Router) |
| TypeScript | Typage statique |
| Supabase | Base de données PostgreSQL + Auth + Storage + Realtime |
| Tailwind CSS | Styles |
| Framer Motion | Animations |
| Groq (Llama 3.1) | Génération de relances IA |
| EmailJS | Envoi d'emails |
| Vercel | Hébergement et déploiement |

---

## Installation locale

### Prérequis
- Node.js 18+
- Compte Supabase
- Compte Groq
- Compte EmailJS

### Étapes

```bash
# Cloner le dépôt
git clone https://github.com/obedelom17/fiscai.git
cd fiscai

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs dans .env.local

# Lancer en développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GROQ_API_KEY=
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
```

---

## Structure du projet

```
src/
├── app/
│   ├── auth/              # Page de connexion
│   ├── dashboard/
│   │   ├── dossiers/      # Gestion des dossiers fiscaux
│   │   ├── clients/       # Gestion des clients
│   │   ├── calendrier/    # Calendrier des échéances
│   │   └── assistant/     # Assistant IA
│   ├── admin/
│   │   ├── portefeuilles/ # Attribution des clients
│   │   └── statistiques/  # Tableau de bord admin
│   ├── parametres/        # Profil utilisateur
│   └── securite/2fa/      # Configuration 2FA
├── components/
│   ├── Sidebar.tsx        # Navigation principale
│   ├── DossierForm.tsx    # Formulaire dossier
│   ├── DossierPanel.tsx   # Panel de gestion dossier
│   ├── AuditTab.tsx       # Onglet audit
│   └── ...
├── lib/
│   ├── types.ts           # Types TypeScript centralisés
│   ├── supabase.ts        # Client Supabase
│   └── useRole.ts         # Hook gestion des rôles
└── supabase/
    ├── schema.sql          # Schéma de la base de données
    └── migration_montant.sql # Migration colonnes
```

---

## Base de données

Exécuter `supabase/schema.sql` dans l'éditeur SQL de Supabase pour créer toutes les tables.

Si la base existe déjà, exécuter `supabase/migration_montant.sql` pour appliquer les dernières modifications.

---

## Déploiement

Le déploiement est automatique sur Vercel à chaque push sur la branche `main`.

Configurer les variables d'environnement dans **Vercel → Settings → Environment Variables**.

---

## Auteur

**ELOM Obed** — Étudiant en informatique, IAI-TOGO  
Stage chez Experts Afrique Conseils, Lomé, Togo
