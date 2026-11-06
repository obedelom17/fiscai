export type Version = { version: string; date: string; titre: string; points: string[] }

export const CHANGELOG: Version[] = [
  {
    version: '2.1',
    date: '2026-11-07',
    titre: 'Plusieurs cabinets sur FiscAI',
    points: [
      'Chaque cabinet dispose de son espace isolé : clients, dossiers, documents et paramètres sont invisibles pour les autres cabinets.',
      'Création d\'un cabinet ou adhésion par code d\'invitation à la première connexion.',
      'Nom du cabinet affiché partout : menu, portail client, signature des e-mails ; adresse de réponse configurable.',
      'Automatisations (relances, récapitulatifs, notifications) réglables séparément pour chaque cabinet.',
      'Documents des dossiers désormais privés, ouverts par lien temporaire.',
    ],
  },
  {
    version: '2.0',
    date: '2026-11-06',
    titre: 'Automatisations, rapports et sécurité',
    points: [
      'Génération automatique des échéances (TVA, acomptes, IS) selon le régime du client.',
      'Relances automatiques J-7, J-3 et J+1, activables dans Paramètres.',
      'Notifications push sur téléphone et ordinateur.',
      'Estimation des pénalités de retard (indicative) sur les dossiers.',
      'Export Excel des dossiers et rapport mensuel par client.',
      'Import en masse des clients et des dossiers depuis Excel ou CSV.',
      'Portail client en lecture seule, par lien privé.',
      'Mode sombre (bêta), pages d\'erreur, squelettes de chargement.',
      'Sauvegarde hebdomadaire automatique, journal d\'erreurs, limitation de débit de l\'assistant.',
      'Correctif de sécurité : un utilisateur ne peut plus modifier son propre rôle.',
    ],
  },
  {
    version: '1.5',
    date: '2026-10-24',
    titre: 'Nouveau design',
    points: ['Nouveau logo, bandeaux illustrés, sidebar et tableaux modernisés.'],
  },
]

export const VERSION_COURANTE = CHANGELOG[0].version
