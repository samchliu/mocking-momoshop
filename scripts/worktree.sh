#!/usr/bin/env bash
# Create an isolated branch + worktree for one feature (SDD workflow, see CLAUDE.md).
#   scripts/worktree.sh search            → branch feat/search at .worktrees/search
#   scripts/worktree.sh goods fix         → branch fix/goods
set -euo pipefail
name="${1:?usage: scripts/worktree.sh <name> [type=feat]}"
type="${2:-feat}"
# always the main checkout, even when called from inside another worktree
root="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"
dir="$root/.worktrees/$name"
branch="$type/$name"

git -C "$root" worktree add -b "$branch" "$dir" main
# share dependencies with the main checkout (same lockfile), and install git hooks for this worktree
ln -s "$root/node_modules" "$dir/node_modules"
(cd "$dir" && npx --no -- husky >/dev/null)
echo "worktree ready: $dir (branch $branch)"
echo "next: cd $dir && npm run kb:build && read docs/_build/features/REQ-xxx/ai-context.md"
