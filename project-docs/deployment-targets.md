# Deployment Targets

## Current remotes

- `origin`: `https://github.com/jjjjjjisong/dknh-sys.git`
- `dev-origin`: `https://github.com/jjjjjjisong/dknh-sys-dev.git`

## Why one PC may not show the development remote

Git remotes are stored in each local clone's `.git/config`, not in the tracked project files.

That means:

- one PC can have both `origin` and `dev-origin`
- another PC can have only `origin`
- branch lists will differ until the missing remote is added in that clone

If `develop` or the development deployment repository is missing on one machine, it is usually a local Git remote setup issue, not a missing branch in the repository itself.

## Intended usage

- Production deployment uses `origin`
- Development deployment uses `dev-origin`

## Branch notes

- `origin/main` should be treated as the production line
- `dev-origin/main` should be treated as the development deployment line
- `origin/dev` can exist as a working branch, but it is not the development server deployment target by itself

## GitHub Pages

- GitHub Pages workflow in this repository should run from `main` only
- Do not use the Pages workflow as the deployment path for the development server

## One-time setup for each new clone

Run the standard remote setup script once after cloning:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-git-remotes.ps1
```

Optional flags:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-git-remotes.ps1 -FixDevOrigin
powershell -ExecutionPolicy Bypass -File .\scripts\setup-git-remotes.ps1 -Fetch
```

- `-FixDevOrigin`: update `dev-origin` if it already exists but points to the wrong URL
- `-Fetch`: refresh remote branch lists immediately after setup

## Verification checklist

After the script runs, confirm:

```bash
git remote -v
git branch -a -vv
```

Expected results:

- `origin` points to `jjjjjjisong/dknh-sys`
- `dev-origin` points to `jjjjjjisong/dknh-sys-dev`
- `origin/main` is the production deployment line
- `dev-origin/main` is the development deployment line
- `origin/dev` may still be used as a working branch, but it is not the development deployment target

## New PC onboarding

1. Clone the repository.
2. Run `.\scripts\setup-git-remotes.ps1`.
3. Check `git remote -v`.
4. Check `git branch -a -vv`.
5. Push to the correct remote for the target environment.

## Practical push examples

Production release:

```bash
git checkout main
git push origin main
```

Development release from the current branch tip:

```bash
git push dev-origin HEAD:main
```

## Safety notes

- Do not rename `origin`; keep it as the production remote.
- Do not treat `origin/dev` as the development server deployment line.
- If a PC is missing `dev-origin`, rerun the setup script in that clone.
