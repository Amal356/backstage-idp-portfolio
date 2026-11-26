# Platform Engineering avec Backstage – Industrialisation du cycle de vie d'un Portfolio Next.js

**Étudiante :** Amal Jemli – Master DevOps & Cloud, ISET Tozeur
**Formateur :** M. Wahid Hamdi
**Date de réalisation :** 26 novembre 2026

| Élément | Lien / valeur |
|---|---|
| Portail Backstage (IDP) | http://localhost:3001 (backend : http://localhost:7007) |
| Dépôt généré | https://github.com/Amal356/portfolio-amal |
| Image Docker Hub | `amal878/portfolio-nextjs` (tags `v1`, `v2`, `latest`) |
| Application déployée | http://localhost:3000 – santé : http://localhost:3000/api/health |

---

## 1. Objectif

Faire de Backstage le **portail développeur unique** (Internal Developer Platform) qui orchestre tout le cycle de vie d'un Portfolio Next.js :

```
Modification du code → Build → Image Docker → Docker Hub → Déploiement local → Validation du service
```

Aucune commande `git`, `docker` ou `docker compose` n'est lancée à la main par le développeur : tout part de Backstage.

---

## 2. Architecture

```
┌──────────────────────── Windows (hôte) ────────────────────────┐
│ Navigateur : Backstage :3001 · Portfolio :3000 · GitHub · Docker Hub │
└───────────────┬─────────────── redirections NAT VirtualBox ─────┘
                │ 3000→3000 · 3001→3001 · 7007→7007 · 2222→22
┌───────────────▼──────────── VM ubuntu-server-26 ─────────────────┐
│ Backstage (yarn start)                                            │
│  ├─ Catalog (SQLite persistant : ~/activite-backstage/backstage-data)
│  ├─ Scaffolder : templates portfolio-nextjs-template / portfolio-deliver
│  ├─ Intégration GitHub (PAT) + Auth GitHub (OAuth App)            │
│  └─ Plugin GitHub Actions (statut des runs dans la fiche composant)│
│ Runner GitHub Actions self-hosted « vm-ubuntu-26 » (label portfolio, service systemd)
│ Docker + Docker Compose → conteneur portfolio-nextjs :3000         │
└───────────────────────────────────────────────────────────────────┘
        │ github:actions:dispatch                ▲ job "deploy"
        ▼                                        │
┌──────────── GitHub ────────────┐   push   ┌────┴──── Docker Hub ────┐
│ Dépôt portfolio-amal            │ ───────▶ │ amal878/portfolio-nextjs │
│ Workflow deliver.yml            │          │ v1 · v2 · latest         │
│  ├─ build-push : ubuntu-latest  │          └──────────────────────────┘
│  └─ deploy : [self-hosted, portfolio]
└─────────────────────────────────┘
```

**Choix d'un pipeline hybride :** le build et le push tournent sur un runner hébergé par GitHub (réseau rapide, éphémère) ; le déploiement tourne sur le runner self-hosted de la VM, seul capable d'atteindre `localhost:3000`.

---

## 3. Contenu de ce dossier

```
activite-backstage-portfolio/
├── README.md                     ← ce document (documentation technique)
├── FICHE-REVISION.md             ← résumé d'une page pour la validation orale
├── backstage-config/
│   └── app-config.local.yaml     ← configuration locale de Backstage (aucun secret en clair)
├── templates/
│   ├── portfolio-nextjs-template/  ← Software Template de création (étapes 1–3)
│   │   ├── template.yaml
│   │   └── skeleton/             ← projet généré (_github = .github, renommé dans la VM)
│   └── portfolio-deliver/        ← Software Template de livraison (étapes 4–7)
│       └── template.yaml
├── evolution-v2/app/             ← fichiers modifiés pour la v2 (étape 7)
└── screenshots/                  ← 51 captures numérotées par étape
```

Dans la VM : `~/activite-backstage/idp-portfolio` (app Backstage), `~/activite-backstage/actions-runner` (runner), `~/activite-backstage/backstage-data` (bases SQLite).

---

## 4. Réalisation étape par étape

### Étape 0 – Préparation de la VM
- Diagnostic : 9,2 Go RAM (2,8 Go libres), 13 Go de disque, Node 24, Docker 29, Compose v5.
- Mise en pause de K3s (`k3s-killall.sh`), Jenkins et Harbor → **8,6 Go disponibles**.
- Ports déjà ouverts : UFW (3000, 3001, 7007) et redirections VirtualBox.
- Captures : `00-*`, `01-*`.

### Étape 1 – Création automatisée du projet (Software Template)
- Application Backstage générée avec `npx @backstage/create-app` (`idp-portfolio`), dépendances via Yarn 4 (3 min 45 s).
- `app-config.local.yaml` : frontend sur **3001** (le 3000 est réservé au portfolio), `listen.host: 0.0.0.0` (accès via la redirection VirtualBox), intégration GitHub `${GITHUB_TOKEN}`.
- Template **`portfolio-nextjs-template`** (`templates/portfolio-nextjs-template/template.yaml`) :
  - formulaire 3 pages : infos personnelles, dépôt (`RepoUrlPicker`) + propriétaire (`OwnerPicker`), Docker Hub (jeton via `ui:field: Secret`) ;
  - actions : **`fetch:template`** (skeleton Next.js + Docker + CI, workflows copiés sans templating) → **`publish:github`** → **`catalog:register`**.
- Le développeur ne lance aucune commande Next.js : le code est standardisé dans le skeleton.
- Captures : `02-*` à `06-*`.

### Étape 2 – Dépôt Git créé automatiquement
- `publish:github` crée `Amal356/portfolio-amal` (public, branche `main`, commit « feat: projet généré par Backstage »), pousse le code et le `README.md`.
- Il configure aussi la **variable** `DOCKERHUB_USERNAME`, la variable `IMAGE_NAME` et le **secret chiffré** `DOCKERHUB_TOKEN`.
- `catalog-info.yaml` (kind `Component`, type `website`, owner `group:default/guests`, annotation `github.com/project-slug`, liens vers l'app et Docker Hub).
- Le push a échoué deux fois (réseau lent) puis réussi : **retries automatiques avec backoff**.
- Captures : `07-*`, `08-*`, `09-*`.

### Étape 3 – Artefacts Docker générés
- **`Dockerfile`** multi-étapes (deps → builder → runner), `node:24-alpine`, Next.js `output: 'standalone'`, `npm ci` (lockfile), utilisateur **non-root**, `HEALTHCHECK` sur `/api/health`, version injectée par `--build-arg APP_VERSION`.
- **`.dockerignore`** : exclut `node_modules`, `.next`, `.git`, `.env*`…
- **`docker-compose.yml`** : projet `portfolio`, image `amal878/portfolio-nextjs:${APP_VERSION:-v1}`, port `3000:3000`, `restart: unless-stopped`, healthcheck.
- Testé avant publication : rendu du template, `next build`, démarrage, `/api/health`.
- Captures : `10-*`.

### Étape 4 – Build déclenché depuis Backstage
- Template **`portfolio-deliver`** : paramètre `version` validé par `pattern: ^v[0-9]+(\.[0-9]+)*$`, action **`github:actions:dispatch`** (`deliver.yml`, branche `main`, input `version`, `returnWorkflowRunDetails`).
- Workflow `deliver.yml` : vérification de la convention → checkout → `docker build` → tags `vN` + `latest`.
- **Statut du build dans Backstage** : plugin `@backstage-community/plugin-github-actions` (découverte automatique) + module `@backstage/plugin-auth-backend-module-github-provider` + OAuth App GitHub (callback `http://localhost:7007/api/auth/github/handler/frame`).
- Base Backstage passée de `:memory:` à **SQLite persistante** pour que le catalogue survive aux redémarrages.
- Captures : `11-*` (runner), `12-*` (OAuth, base persistante), `13-*` (plugin), `14-*` (runs).

### Étape 5 – Publication sur Docker Hub
- Authentification : `docker/login-action` avec `vars.DOCKERHUB_USERNAME` et `secrets.DOCKERHUB_TOKEN` (jeton Read & Write, 30 jours), logout automatique en fin de job.
- Push de `amal878/portfolio-nextjs:v1` et `:latest` (même digest `1aae52f470e9`, 79,24 Mo).
- Captures : `15-*`.

### Étape 6 – Déploiement local
- Job `deploy` sur le runner self-hosted : `docker compose pull` → `docker compose up -d` → `docker compose ps`.
- Health check : 30 tentatives de `curl http://localhost:3000/api/health`, qui doit renvoyer **la version attendue** ; résumé avec l'URL dans le run.
- Résultat : run « Livraison v1 » vert en 5 min 38 s, portfolio sur http://localhost:3000 (« Version déployée : v1 »).
- Captures : `16-*`.

### Étape 7 – Évolution et réexécution
- Demandes du client : section **Certifications**, section **Projets DevOps & Cloud**, **Dark Mode** (composant `ThemeToggle`, variables CSS `[data-theme='dark']`, thème mémorisé), **informations personnelles** mises à jour.
- Code modifié par **upload dans l'interface GitHub** (commit `2b4c59a`), sans commande git.
- Backstage → *Livrer le Portfolio* → `v2` : build cloud, push `v2` + `latest` (digest `cd9f3ccfcec8`), redéploiement du même conteneur, health check `"version":"v2"`. Plus rapide grâce au cache Docker.
- Captures : `17-*`, `18-*`.

---

## 5. Sécurité et gestion des secrets

| Secret | Où il vit | Comment il est saisi |
|---|---|---|
| PAT GitHub (`repo`, `workflow`, 7 jours) | Variable d'environnement du processus Backstage | `read -rsp` puis `unset` à l'arrêt |
| OAuth App (Client ID / secret) | Variables d'environnement | `read -rsp` |
| Jeton Docker Hub (Read & Write, 30 jours) | **Secret chiffré du dépôt GitHub** | Champ `Secret` (masqué) du formulaire Backstage |
| Jeton d'enregistrement du runner (1 h) | Utilisé une seule fois | `read -rsp` puis `unset` |

- Aucun secret dans Git, dans `app-config.local.yaml` (références `${VAR}`) ni dans les captures (capture du runner masquée).
- Workflow déclenché uniquement par `workflow_dispatch` : pas d'exécution de code de *fork* sur le runner self-hosted d'un dépôt public.
- Archive du runner vérifiée par **SHA-256** (un téléchargement tronqué a été détecté : `FAILED`).
- Conteneur non-root ; principe du moindre privilège sur les jetons.

---

## 6. Problèmes rencontrés et solutions

| Problème | Cause | Solution |
|---|---|---|
| Téléchargement du runner : 56 min | Réseau ≈ 68 Ko/s | Build/push déplacés sur `ubuntu-latest` (39 s) ; runner téléchargé dans le navigateur, vérifié par SHA-256 |
| Composant disparu après redémarrage | Base SQLite **en mémoire** | `backend.database.connection.directory` → base persistante |
| `Auth provider … github is misconfigured` | `AUTH_GITHUB_CLIENT_ID` vide au démarrage (`got empty-string`) | Ressaisie avec contrôle des longueurs `${#VAR}` |
| `JWKSNoMatchingKey` en boucle | Session navigateur signée par d'anciennes clés | Déconnexion / reconnexion Guest |
| `ERR_CONNECTION_RESET` sur :3000 | Aucun conteneur démarré à ce moment | Normal avant le job `deploy` |

---

## 7. Rejouer la démonstration (validation)

🐧 Dans la VM (tmux) :

```bash
tmux new -s backstage            # ou : tmux attach -t backstage
cd ~/activite-backstage/idp-portfolio
read -rsp "PAT GitHub : " GITHUB_TOKEN; echo
read -rsp "OAuth Client ID : " AUTH_GITHUB_CLIENT_ID; echo
read -rsp "OAuth Client secret : " AUTH_GITHUB_CLIENT_SECRET; echo
export GITHUB_TOKEN AUTH_GITHUB_CLIENT_ID AUTH_GITHUB_CLIENT_SECRET
yarn start
```

Vérifications : `sudo ~/activite-backstage/actions-runner/svc.sh status` (runner actif) et `docker ps` (conteneur `portfolio-nextjs` healthy).

Démo dans le navigateur :
1. **Create → Portfolio Next.js** : montrer le formulaire et le `template.yaml` (étapes 1–3).
2. **Catalog → Portfolio de Amal Jemli** : métadonnées, liens, relations, carte *Recent Workflow Runs* (étapes 2 et 4).
3. **Create → Livrer le Portfolio → v3** (évolution démontrée en direct) → suivre le run → http://localhost:3000 et `/api/health`.
4. **Docker Hub** : tags et digests.

Après la validation : arrêter Backstage (`Ctrl+C`, puis `unset GITHUB_TOKEN AUTH_GITHUB_CLIENT_ID AUTH_GITHUB_CLIENT_SECRET`), relancer les services mis en pause (`sudo systemctl start k3s jenkins`, `docker start harbor-log`), révoquer ou laisser expirer les jetons.
