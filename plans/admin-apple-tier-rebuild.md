# Plan — Espace admin niveau Apple/Linear, entièrement réel

**Contexte de départ (audit du 2026-08-03, vérifié en lisant le code réel,
pas supposé) :** l'espace admin (`purity-os/src/app/admin/**`) est en fait
solide sur la majorité de ses pages — filtres réels, recherche, Server
Actions câblées, pas de mock. Ce n'est **pas** un cas de reconstruction
totale depuis zéro : réécrire les pages qui marchent déjà (dashboard,
clients, projets, paiements, documents, inbox, settings, acquisition)
introduirait un risque de régression sur du code testé, sans bénéfice réel.

Le vrai travail : (1) corriger la seule page réellement fake, (2) combler
les manques fonctionnels identifiés, (3) passer CHAQUE page existante par
une grille de qualité Apple/Linear (motion, densité d'info, états
loading/erreur/vide, hit areas, focus clavier) sans casser ce qui marche.

**Mode :** direct (pas de PR/branche — dépôt `purity-os` a un remote mais
l'historique de session pousse déjà directement sur `main`, cohérence avec
l'usage établi cette session).

**Vérification systématique à chaque étape :** `npx tsc --noEmit -p
tsconfig.json` propre + `npm run build` propre + test réel dans le
navigateur (Browser pane) avec de vraies données de la base, pas un mock.
Aucune étape n'est marquée FAIT sans capture/preuve de ce test.

---

## Étape 0 — Fondations visuelles partagées (avant de toucher les pages)

**Pourquoi en premier :** appliquer une grille de qualité page par page sans
règles communes produit un patchwork, pas un système. Cette étape crée les
règles, ne touche encore aucune page.

**Tâches :**
- Auditer les rayons de bordure utilisés (`rounded-lg`, `rounded-xl`,
  `rounded-2xl`, `rounded-3xl`) — actuellement mélangés sans règle
  documentée. Fixer une échelle : `rounded-lg` (8px) pour inputs/boutons,
  `rounded-2xl` (16px) pour cards, cohérent avec le padding contenu
  (concentric radius).
- Vérifier que toutes les valeurs numériques qui changent (montants €,
  scores, compteurs) utilisent `tabular-nums` — grep actuel montre que ce
  n'est pas systématique.
- Vérifier les états `:focus-visible` sur tous les éléments interactifs
  (boutons, liens, inputs) — actuellement aucune classe focus custom
  visible dans les pages lues, dépend du défaut navigateur uniquement.
- Documenter dans `purity-os/src/lib/adminFormat.ts` (déjà la source
  commune) une fonction `focusRing()` ou classe Tailwind partagée.

**Vérification :** `npx tsc --noEmit`, puis capture d'écran Tab-navigation
sur `/admin` montrant un focus visible sur chaque élément interactif.

---

## Étape 1 — Corriger la page Brand (le seul vrai fake)

**Statut au moment d'écrire ce plan : PAS FAIT.**

**Contexte :** `src/app/admin/brand/page.tsx` a des boutons ("+ Nouveau
Brief Stratégique", "Rejeter", "Approuver & Publier") sans `onClick` ni
`action` — décoratifs. Le pôle 02 Brand n'a aucun agent codé
(`src/lib/agents/` n'a que `acquisition/`), donc câbler ces boutons pour de
vrai n'a rien à appeler.

**Décision produit (pas une question technique) :** cacher cette page du
menu (`AdminSidebar.tsx`) tant qu'elle ne fait rien, plutôt que de la
laisser promettre une fonctionnalité qui n'existe pas. La route reste
accessible en direct (pas supprimée, juste pas dans la nav) pour ne rien
casser si un lien externe existe déjà.

**Tâches :**
- Retirer l'entrée "02: Brand & Authority" de `navGroups` dans
  `AdminSidebar.tsx`.
- Ajouter un bandeau discret en haut de `/admin/brand` : "Ce pôle n'est pas
  encore construit — page technique, pas encore dans le menu."
- Ne PAS supprimer les boutons pour l'instant (garder trace visuelle de ce
  qui reste à câbler le jour où pôle 02 sera codé).

**Vérification :** naviguer `/admin`, confirmer "Brand" absent du menu.
Naviguer directement vers `/admin/brand`, confirmer le bandeau visible.

---

## Étape 2 — Recherche globale (Cmd+K)

**Dépendances :** aucune, parallélisable avec Étape 3-5.

**Contexte :** chaque page (clients, projets) a sa propre recherche
isolée. Rien ne cherche à travers clients + projets + leads + documents en
une fois.

**Tâches :**
- Nouvelle route `GET /api/admin/search?q=...` — recherche `OR` sur
  `User.name/email` (role CLIENT), `Project.name`, `Lead.companyName`,
  limité à 5 résultats par catégorie, `requireAdminSession()` obligatoire.
- Composant client `GlobalSearch.tsx` (Cmd+K / Ctrl+K, `<dialog>` natif ou
  overlay), débounce 250ms, groupé par catégorie (Clients / Projets /
  Leads), navigation clavier haut/bas/Enter.
- Ajouter le déclencheur dans `AdminSidebar.tsx` ou `MobileHeader.tsx`.

**Vérification :** taper Cmd+K, chercher un client réel existant en base,
confirmer qu'il apparaît et que cliquer navigue vers sa fiche.

---

## Étape 3 — Export CSV (clients, projets, paiements, leads)

**Dépendances :** aucune, parallélisable.

**Tâches :**
- Route `GET /api/admin/export/[resource]` (`resource` ∈ clients, projects,
  payments, leads), `requireAdminSession()`, génère un CSV en streaming
  (pas de librairie lourde nécessaire — `Content-Type: text/csv`,
  échappement manuel des virgules/guillemets).
- Bouton "Exporter CSV" sur `/admin/clients`, `/admin/projects`,
  `/admin/payments`, et la section leads de `/admin/acquisition`, respecte
  les filtres actifs de la page (mêmes `searchParams`).

**Vérification :** cliquer "Exporter CSV" sur `/admin/clients` avec un
filtre actif, ouvrir le fichier téléchargé, confirmer que le contenu
correspond exactement à la liste filtrée affichée.

---

## Étape 4 — Action rapide paiement depuis la liste

**Dépendances :** aucune.

**Contexte :** `/admin/payments` liste mais pour marquer "payé" il faut
aller sur la fiche projet. `markPaymentPaid`/`markPaymentCancelled`
existent déjà dans `paymentActions.ts` — pas de nouvelle logique métier,
juste les rendre accessibles depuis la liste.

**Tâches :**
- Ajouter les mêmes boutons "Marquer payé"/"Annuler" (déjà présents sur
  `/admin/projects/[id]`) directement dans la liste `/admin/payments`, pour
  les paiements `PENDING`.
- Réutiliser `markPaymentPaid`/`markPaymentCancelled` tels quels.

**Vérification :** depuis `/admin/payments`, marquer un paiement de test
comme payé, confirmer que le statut change sans recharger manuellement et
que `/admin/projects/[id]` reflète le même changement.

---

## Étape 5 — Ecosystem : polling ciblé + honnêteté sur les pôles non codés

**Dépendances :** aucune.

**Contexte :** `/admin/ecosystem` interroge `/api/agents/status` toutes les
2s en boucle infinie sans condition d'arrêt (onglet en arrière-plan
inclus). Le dashboard `/admin` affiche aussi une grille "COO IA & 5 Pôles
Autonomes" avec statut `"ACTIF"` codé en dur pour des pôles qui n'ont
aucun agent réel (voir `AdminDashboard`, tableau `dept` avec `status:
"ACTIF"` en dur) — c'est exactement le genre d'affirmation non vérifiée
que ce pôle Ops/Delivery interdit ailleurs dans le code.

**Tâches :**
- `EcosystemDashboard` : arrêter le polling quand `document.hidden` est
  vrai (`visibilitychange`), reprendre à la reconnexion. Envisager de
  passer de 2s à 5s (le statut d'un agent ne change pas assez vite pour
  justifier 2s).
- `AdminDashboard` (page.tsx) : remplacer le statut `"ACTIF"` codé en dur
  par une vraie requête — `AgentActivity` groupé par département, "ACTIF"
  seulement si au moins un agent de ce département a une ligne récente
  (`updatedAt` dans les dernières 24h), sinon "NON CODÉ" ou "INACTIF".

**Vérification :** `/admin`, confirmer que seul le pôle 01 Acquisition
affiche un statut actif réel (les autres pôles n'ont pas d'`AgentActivity`
en base). Onglet `/admin/ecosystem` en arrière-plan 30s, confirmer via
l'onglet Réseau du navigateur que le polling s'arrête.

---

## Étape 6 — Digest quotidien (notification proactive)

**Dépendances :** Étape 2-5 non bloquantes.

**Contexte :** rien n'alerte Amir en dehors de l'ouverture de l'admin.

**Tâches :**
- Route `GET /api/cron/daily-digest` (protégée par `CRON_SECRET`, même
  pattern que `/api/cron/acquisition`), calcule : nouveaux events NEW
  depuis 24h, paiements PENDING en retard, projets en retard, brouillons
  email en attente > 24h. Envoie un email via `sendEmail()` existant
  (`lib/email.ts`, déjà corrigé pour échouer bruyamment).
- Vercel Cron : ajouter une entrée quotidienne 8h Europe/Brussels dans
  `vercel.json` (actuellement `crons: []` — vide depuis le passage au VPS,
  mais ceci est un nouveau cron indépendant du pôle Acquisition, pas de
  conflit de quota).

**Vérification :** déclencher la route manuellement en local avec des
données de test, confirmer la réception réelle de l'email avec le contenu
correct.

---

## Étape 7 — Gestion multi-admin (si jugé utile — vérifier avec Amir avant de coder)

**Dépendances :** aucune. **NE PAS commencer sans confirmation explicite**
— contrairement aux étapes 1-6 qui comblent des manques déjà confirmés,
celle-ci ajoute une fonctionnalité (inviter d'autres comptes admin) dont
l'utilité dépend d'un besoin qu'Amir n'a pas encore confirmé (agence
solo ?). Poser la question avant d'écrire le code.

---

## Étape 8 — Passe qualité Apple/Linear sur chaque page existante

**Dépendances :** Étape 0 terminée (fondations partagées).

**Grille de vérification, appliquée à CHAQUE page (`/admin`,
`/admin/inbox`, `/admin/clients`, `/admin/clients/[id]`,
`/admin/projects`, `/admin/projects/[id]`, `/admin/payments`,
`/admin/documents`, `/admin/settings`, `/admin/acquisition`,
`/admin/ecosystem`) :**

- [ ] État vide : message clair, jamais juste une liste blanche
- [ ] État de chargement : pas de flash blanc, skeleton ou spinner cohérent
- [ ] État d'erreur : `error.tsx` déjà présent au niveau admin — vérifier
      qu'aucune page n'a une erreur silencieuse (ex: `catch {}` vide)
- [ ] Chaque bouton a un état `:disabled` visible pendant une action en
      cours (pattern déjà posé dans `DraftActions.tsx` — répliquer)
- [ ] Zones cliquables ≥ 40×40px
- [ ] `transition-property` explicite, jamais `transition: all`
- [ ] Focus clavier visible sur 100% des éléments interactifs
- [ ] Mobile : tester `resize_window` preset mobile sur chaque page

**Vérification :** capture d'écran + notes par page, dans ce fichier même
(mise à jour au fur et à mesure), pas dans une conversation perdue.

---

## Étape 9 — Vérification finale bout-en-bout

**Dépendances :** toutes les étapes précédentes.

- `npx tsc --noEmit -p tsconfig.json` propre
- `npm run build` propre
- Parcours manuel complet dans le navigateur, session admin réelle,
  chaque page cliquée, chaque action testée avec de vraies données
- Déploiement Production, `curl` sur `/api/health` et 2-3 pages admin
  (redirect login attendu sans session = normal)

---

## Ordre d'exécution recommandé

```
Étape 0 (fondations) ──┬─ Étape 1 (Brand)
                        ├─ Étape 2 (recherche)
                        ├─ Étape 3 (export)
                        ├─ Étape 4 (paiement rapide)
                        ├─ Étape 5 (ecosystem honnête)
                        └─ Étape 6 (digest)
                                    │
                        Étape 8 (passe qualité, après Étape 0)
                                    │
                        Étape 9 (vérification finale)

Étape 7 : en attente de confirmation Amir, pas dans le flux automatique.
```

## État d'avancement (mis à jour au fil de l'exécution)

- Étape 0 : PAS COMMENCÉ
- Étape 1 : PAS COMMENCÉ
- Étape 2 : PAS COMMENCÉ
- Étape 3 : PAS COMMENCÉ
- Étape 4 : PAS COMMENCÉ
- Étape 5 : PAS COMMENCÉ
- Étape 6 : PAS COMMENCÉ
- Étape 7 : EN ATTENTE DE CONFIRMATION
- Étape 8 : PAS COMMENCÉ
- Étape 9 : PAS COMMENCÉ
