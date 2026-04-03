Perform a version bump and release. Argument: $ARGUMENTS (patch | minor | major | explicit semver like 1.2.3)

## Steps — execute in order, stop and report if any step fails

### 1. Determine the new version

Run: `git tag --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1`

If no tag exists, start from `v0.0.0`.

Strip the leading `v` to get CURRENT (e.g. `0.1.0`).

Compute NEW version based on the argument:
- `patch` → increment third number (0.1.0 → 0.1.1)
- `minor` → increment second, reset third (0.1.0 → 0.2.0)
- `major` → increment first, reset others (0.1.0 → 1.0.0)
- explicit semver (e.g. `1.2.3`) → use as-is

NEW_TAG = `v<new version>` (e.g. `v0.1.1`)

Show the user: "Bumping: vCURRENT → NEW_TAG" and ask for confirmation before proceeding.

### 2. Update VERSION file

Write the new version (without `v` prefix) to the `VERSION` file at the repo root:

```bash
echo "<new version>" > VERSION
```

### 3. Stage and commit pending changes

Run: `git status --short`

If there are unstaged/staged changes (including the VERSION file update):
```bash
git add -A
git commit -m "chore: release $NEW_TAG"
```

If the working tree is already clean after updating VERSION, commit only VERSION:
```bash
git add VERSION
git commit -m "chore: release $NEW_TAG"
```

### 4. Create git tag

```bash
git tag -a $NEW_TAG -m "Release $NEW_TAG"
```

### 5. Push commit and tag to GitHub

```bash
git push origin HEAD
git push origin $NEW_TAG
```

This triggers the `release.yml` CI workflow which builds and pushes Docker images to GHCR and Docker Hub automatically.

### 6. Create GitHub Release

```bash
gh release create $NEW_TAG \
  --title "Release $NEW_TAG" \
  --generate-notes
```

### 7. Report

Print a summary:
- Tag pushed: `$NEW_TAG`
- GitHub Release: URL returned by `gh release create`
- CI workflow: "Images will be published to GHCR and Docker Hub by the release workflow — check Actions tab"

## Prerequisites (remind user if missing)
- `gh` CLI authenticated (`gh auth status`)
- Remote `origin` set to GitHub (`git remote -v`)
- Secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` configured in repository settings
