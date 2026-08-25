# FiscAI
Application web de gestion des dossiers fiscaux pour le cabinet Experts Afrique Conseils.

**Production** : https://fiscai-eac.vercel.app

## Présentation

FiscAI permet aux collaborateurs d'un cabinet fiscal de suivre en temps réel les obligations fiscales de leurs clients, de générer des relances par IA et de centraliser tous les documents liés aux déclarations OTR.

## Fonctionnalités

- **Gestion des dossiers fiscaux** - TVA, IRPP, IS, Patente, Retenue Sur Loyer, Droit d'Enregistrement, Taxe d'Habitation, Taxe Foncière (Bâties / Non Bâties), Acomptes OTR
- **Relances IA** - génération automatique de messages de relance via Groq (Llama 3.1), envoi par email (EmailJS) ou WhatsApp
- **Upload de documents PDF** - stockage dans Supabase Storage
- **Calendrier des échéances** - vue mensuelle des obligations fiscales
- **Notifications en temps réel** - alertes pour les dossiers en retard ou à échéance proche
- **Assistant IA** - chatbot fiscal intégré
- **Authentification sécurisée** - email/mot de passe + Google OAuth + 2FA TOTP
- **Gestion multi-collaborateurs** - portefeuilles clients, rôles admin/collaborateur
- **Audit trail** - historique complet de toutes les actions
- **Tableau de bord statistique** - graphiques et indicateurs clés

## Stack: 

 Technologie et Usage  :
 - Next.js 16 Framework React
 - TypeScript
 - Supabase  Base de données PostgreSQL + Auth + Storage 
 - Tailwind CSS 
 - Framer Motion pour les animations 
 - Groq (Llama 3.1) pour la génération de relances IA 
 - EmailJS pour l'envoi d'emails 
 - Vercel pour l'hébergement et déploiement 



## Installation locale :

### Ce qui faut télécharger sur sa machine :
- Node.js 
- Compte Supabase
- Compte Groq
- Compte EmailJS

### Etapes requis

# Cloner le dépôt
git clone https://github.com/obedelom17/fiscai.git
cd fiscai

# Installer les dépendances
npm install
npm install react-markdown remark-gfm


# Configurer les variables d'environnement
cp .env.local
# Remplir les valeurs dans .env.local

# Lancer en développement
npm run dev

Ouvrir par http://localhost:3000

## Variables d'environnement :
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GROQ_API_KEY=
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=

## Déploiement :

Le déploiement se fait automatiquement sur Vercel à chaque push sur la branche `main`.

Il faut aussi configurer les variables d'environnement dans Vercel.

## Auteur :

**ELOM Obed** - Étudiant en informatique, IAI-TOGO  
Stagiaire chez Experts Afrique Conseils, Lomé, Togo
