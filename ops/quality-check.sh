#!/usr/bin/env sh
set -eu

skip_frontend_build=0
include_docker_build=0
for arg in "$@"; do
  case "$arg" in
    --skip-frontend-build) skip_frontend_build=1 ;;
    --include-docker-build) include_docker_build=1 ;;
    *) printf 'Unknown option: %s\n' "$arg" >&2; exit 2 ;;
  esac
done

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

run_step() {
  name="$1"
  dir="$2"
  shift 2
  printf '\n==> %s\n' "$name"
  (cd "$dir" && "$@")
}

run_step "Backend tests" "$repo_root/backend" go test ./...
run_step "Frontend tests" "$repo_root/frontend" npm test
run_step "Frontend lint" "$repo_root/frontend" npm run lint

if [ "$skip_frontend_build" -eq 0 ]; then
  run_step "Frontend production build" "$repo_root/frontend" npm run build
fi

if [ "$include_docker_build" -eq 1 ]; then
  run_step "Backend Docker image build" "$repo_root" docker build -t purecms-api:local ./backend
  run_step "Frontend Docker image build" "$repo_root" docker build --build-arg VITE_API_BASE_URL=/api -t purecms-web:local ./frontend
fi

printf '\nQuality checks passed.\n'
