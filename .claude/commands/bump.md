---
description: Release a new skeleton-web version (patch/minor/major bump + CI + deploy)
argument-hint: [patch|minor|major]
allowed-tools: [Bash, Read, Edit, Write]
---

# skeleton-web Bump & Release

Esegui il processo completo di release. Argomento opzionale: `$ARGUMENTS` (`patch`, `minor`, `major`, o semver esplicito; default: `patch`).

## Passi — esegui in sequenza, fermati se uno fallisce

### 1. Determina la nuova versione

```bash
git tag --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1
```

Se non esiste nessun tag, parti da `v0.0.0`.

Calcola la nuova versione in base all'argomento:
- nessun argomento o `patch` → incrementa PATCH (es. `v0.1.1` → `v0.1.2`)
- `minor` → incrementa MINOR, azzera PATCH (es. `v0.1.1` → `v0.2.0`)
- `major` → incrementa MAJOR, azzera MINOR e PATCH (es. `v0.1.1` → `v1.0.0`)
- semver esplicito (es. `1.2.3`) → usalo così com'è

NEW_TAG = `v<nuova versione>` (es. `v0.1.2`)

Mostra all'utente: "Bumping: vCORRENTE → NEW_TAG" e chiedi conferma prima di procedere.

### 2. Aggiorna il file VERSION

```bash
echo "<nuova versione>" > backend/VERSION
```

### 3. Commit delle modifiche

```bash
git status --short
```

Se ci sono modifiche (incluso VERSION):
```bash
git add -A
git commit -m "chore: release $NEW_TAG"
```

Se il working tree è già pulito dopo aver aggiornato VERSION:
```bash
git add backend/VERSION
git commit -m "chore: release $NEW_TAG"
```

### 4. Crea il tag git

```bash
git tag -a $NEW_TAG -m "Release $NEW_TAG"
```

### 5. Push su GitHub

```bash
git push origin HEAD
git push origin $NEW_TAG
```

Questo innesca il workflow `release.yml` che builda e pusha le immagini su GHCR e Docker Hub.

### 6. Crea GitHub Release

```bash
gh release create $NEW_TAG --title "Release $NEW_TAG" --generate-notes
```

### 7. Ricostruisci i container locali

```bash
docker compose up --build -d
```

Verifica la versione:
```bash
curl -s http://localhost:${BACKEND_PORT:-8000}/openapi.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('version:', d['info']['version'])"
```

### 8. Attendi la CI e deploya sul server

```bash
gh run list --workflow=release.yml --limit 1 --json databaseId --jq '.[0].databaseId'
```
Poi attendi il completamento:
```bash
gh run watch <run-id> --exit-status
```

Una volta che la CI è verde:
```bash
make deploy
```

### 9. Pulizia immagini Docker vecchie

Mantieni: versione nuova, versione precedente, `latest`. Elimina tutto il resto.

Calcola la versione precedente (es. se NEW_TAG=`v0.1.2`, PREV_TAG=`v0.1.1`).

**Locale:**
```bash
docker images --format "{{.Repository}}:{{.Tag}}" | grep "manzolo/skeleton-web" | grep -v "<new>\|<prev>\|latest" | xargs -r docker rmi -f
```

**Server remoto:**
```bash
ssh root@home-server "docker images --format '{{.Repository}}:{{.Tag}}' | grep 'manzolo/skeleton-web' | grep -v '<new>\|<prev>\|latest' | xargs -r docker rmi -f; docker image prune -f"
```

> IMPORTANTE: usa sempre `--format "{{.Repository}}:{{.Tag}}"` — mai `awk '{print $3}'`.
> IMPORTANTE: `docker rmi -f` (force) obbligatorio.

### 10. Report finale

- Tag pushato: `$NEW_TAG`
- GitHub Release: URL da `gh release create`
- Locale: versione verificata
- CI: immagini pubblicate su GHCR e Docker Hub
- Server: deployato via `make deploy`
- Pulizia: immagini vecchie rimosse

## Prerequisiti
- `gh` CLI autenticato (`gh auth status`)
- Remote `origin` puntato a GitHub (`git remote -v`)
- Secrets `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` configurati nel repo
