# Fiche de révision – Backstage & Portfolio Next.js (validation orale)

## La chaîne en une phrase
Un clic dans **Backstage** → `github:actions:dispatch` → **GitHub Actions** (build sur `ubuntu-latest`) → image **`amal878/portfolio-nextjs:vN`** sur **Docker Hub** → job `deploy` sur le **runner self-hosted** de la VM → `docker compose pull/up` → **health check** (`/api/health` doit renvoyer `vN`) → http://localhost:3000.

## Vocabulaire
| Terme | Définition courte |
|---|---|
| **Platform Engineering** | Une équipe construit une plateforme interne en libre-service pour les développeurs |
| **IDP** | *Internal Developer Platform* : outils + chemins standardisés ; Backstage en est le **portail** |
| **Golden path** | Chemin recommandé, déjà configuré (ex. créer un portfolio conteneurisé avec CI/CD) |
| **Software Template** | Entité `kind: Template` = `parameters` (formulaire) + `steps` (actions) + `output` |
| **Scaffolder** | Plugin backend qui exécute les templates |
| **`fetch:template`** | Copie un *skeleton* en remplaçant `${{ values.x }}` (Nunjucks) |
| **`publish:github`** | Crée le dépôt, commit + push ; ici aussi variables et secrets du dépôt |
| **`catalog:register`** | Enregistre le `catalog-info.yaml` dans le Catalog (crée une `Location`) |
| **`github:actions:dispatch`** | Déclenche un workflow `workflow_dispatch` avec des inputs |
| **Catalog** | Inventaire des entités, alimenté par les `catalog-info.yaml` (*metadata as code*) |
| **Entités** | **Component** (logiciel), **API**, **System** (groupe), **Resource** (infra), **Group/User** (propriétaires), **Template**, **Location** |
| **`catalog-info.yaml`** | Descripteur : kind, name, owner, lifecycle, type, annotations (`github.com/project-slug`), links |
| **Plugin** | Extension frontend/backend (ici GitHub Actions, auth GitHub, catalog-import) |
| **Runner** | Machine qui exécute les jobs : hébergé (GitHub) ou **self-hosted** (VM, label `portfolio`) |
| **Secret / variable** | `secrets.X` chiffré et masqué `***` ; `vars.X` en clair, non sensible |

## Les 3 identités
- **PAT GitHub** (intégration) : la *plateforme* crée les dépôts et déclenche les workflows.
- **OAuth App** : l'*utilisateur* se connecte ; le plugin lit les runs avec ses droits (flux Authorization Code).
- **Jeton Docker Hub** : le *pipeline* pousse les images (secret du dépôt, posé par Backstage).

## Questions probables (réponses courtes)
1. **Pourquoi Backstage ne fait pas le build lui-même ?** C'est un portail d'orchestration ; l'exécution est déléguée au CI.
2. **Pourquoi un runner self-hosted ?** Un runner cloud ne peut pas déployer sur `localhost:3000` de la VM.
3. **Pourquoi un pipeline hybride ?** Build/push rapides dans le cloud (39 s), déploiement local sur la VM.
4. **Pourquoi `copyWithoutTemplating` ?** GitHub Actions utilise aussi `${{ }}` : sans ça, Backstage casserait le workflow.
5. **Convention de version ?** `v<majeur>[.<mineur>]`, validée dans le formulaire *et* dans le pipeline ; `vN` immuable + `latest`.
6. **Même digest pour `v2` et `latest` ?** Une seule image, deux étiquettes ; le digest (SHA-256) identifie le contenu.
7. **Multi-stage build ?** Image finale légère, sans outils de build ; moins de vulnérabilités.
8. **Pourquoi `npm ci` ?** Respect strict du lockfile → builds reproductibles.
9. **Comment prouver que v2 tourne ?** Le health check compare la version renvoyée par `/api/health` ; sinon le pipeline échoue.
10. **Pourquoi la v2 a été plus rapide ?** Cache des couches Docker (base Node et `npm ci` inchangées).
11. **Pourquoi le composant avait disparu ?** SQLite en mémoire ; corrigé avec une base persistante (PostgreSQL en production).
12. **Risque du runner self-hosted en dépôt public ?** Exécution de code de *fork* ; mitigé : uniquement `workflow_dispatch`, label dédié, non-root.
13. **Où s'affiche le statut ?** Carte *Recent Workflow Runs* / onglet GitHub Actions de la fiche composant.
14. **`EXPOSE` vs `ports:` ?** Documentation de l'image vs publication réelle du port.
15. **Retour arrière ?** Relancer *Livrer le Portfolio* avec `v1` : l'image existe toujours sur Docker Hub.

## Chiffres à retenir
Backstage `yarn install` 3 min 45 s · build/push v1 **39 s** · run v1 **5 min 38 s** · image **79,24 Mo** · 2 templates · 51 captures.
