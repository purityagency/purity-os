# Specification Design : Acquisition UI Redesign (The Sentinel)

## 1. Contexte et Objectif
Refonte totale de la section `/admin/ai/acquisition` de Purity OS. Élimination de l'aspect "brouillon" pour implémenter une interface de classe mondiale (Option A : "The Sentinel").
Cette interface doit refléter l'identité "Chief Agency AI" (COO), avec une haute densité d'informations, un contrôle absolu et un style visuel "Liquid Glass" sombre et cybernétique (Dark mode `#060309`, accents violet `#7C3AED`, bordures blanches ultra-fines).

## 2. Architecture Visuelle et Hiérarchie

La page sera divisée en trois zones principales structurées pour minimiser la charge cognitive (loi de Fitts).

### 2.1. Top Ribbon (Bandeau Supérieur)
- **Fonction :** Macro-pilotage immédiat.
- **Contenu :**
  - Titre avec indicateur de statut pulse (vert émeraude).
  - Bouton "Lancer Scan AI" (Violet) mis en évidence.
  - Ligne de KPIs condensée : Missions actives, Leads Totaux, Score Qualité Moyen, Taux de Conversion, Brouillons en attente, RDV Confirmés.
- **Style :** Composants "Glassmorphism" subtils, police mono pour les chiffres, bordures très fines (`border-white/5`).

### 2.2. Zone Principale (75% de la largeur) : Le Kanban Dense
- **Fonction :** Gestion du pipeline de prospection.
- **Contenu :** 
  - Colonnes représentant les statuts des leads.
  - Les cartes (leads) sont denses, affichant le nom, l'entreprise, et le **score IA** avec un code couleur.
- **Composant concerné :** `PipelineKanban.tsx` et `page.tsx` (remplacement des tabs actuels par une vue unifiée).
- **Style :** Scroll horizontal fluide invisible (`scrollbar-width: none`), cartes avec fond `bg-white/[0.02]` au hover.

### 2.3. Sidebar Droite (25% de la largeur) : Activity Feed & Missions
- **Fonction :** Flux d'activité en direct des agents IA.
- **Contenu :**
  - Liste des missions actives (`MissionTracker.tsx`).
- **Style :** Panneau collé à droite avec effet "frosted glass", typographie technique.

## 3. Composants à Modifier

*   `page.tsx` : Restructuration de la grille (75/25) et affinage du bandeau KPI. Suppression des Tabs inutiles pour une vue dashboard unifiée.
*   `MissionTracker.tsx` : Design plus technique (style terminal/logs) pour coller à l'aspect "Sentinel".
*   `PipelineKanban.tsx` : Refonte des cartes de lead. Ajout de badges de score IA, design plus compact, suppression des marges excessives.

## 4. Règles de Style Strictes (Purity ONE OS)
- **Couleurs :** Fond principal `#060309`, borders `rgba(255, 255, 255, 0.05)`. Accentuation primaire `#7C3AED` (Violet).
- **Typographie :** Utilisation de polices sans-serif modernes (Inter) et de polices monospace pour la data (score, logs).
- **Animation :** Transitions douces (`transition-all duration-300`) sur les hovers des cartes, sans surcharger le DOM.

## 5. Scope et Contraintes
- Le système de drag & drop du Kanban (s'il existe) ne doit pas être cassé par la mise à jour visuelle.
- Les requêtes Prisma (data fetching) dans `page.tsx` restent intactes. Seule l'interface change.
