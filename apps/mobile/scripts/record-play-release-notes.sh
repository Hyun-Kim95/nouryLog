#!/usr/bin/env bash
# production AAB 빌드 직후: versionCode·git·커밋·출시노트를
# docs/release/play-store-release-notes.md 에 자동 prepend + dist sidecar JSON.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
NOTES_MD="$ROOT/docs/release/play-store-release-notes.md"
PENDING_NOTES="$ROOT/docs/release/pending-play-release-notes.txt"
DIST_DIR="$ROOT/apps/mobile/dist"
SIDECAR="$DIST_DIR/nourylog-production.release.json"
MARKER="## 기록 (최신 위)"

LOG=""
AAB="$DIST_DIR/nourylog-production.aab"
BUILD_HOW="apps/mobile/scripts/docker-local-production-aab.sh"
VERSION_CODE_OVERRIDE=""
NOTES_FILE=""
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: record-play-release-notes.sh [options]
  --log PATH           eas build 로그 (versionCode 파싱)
  --aab PATH           AAB 경로 (기본: apps/mobile/dist/nourylog-production.aab)
  --build-how TEXT     buildHow 필드
  --version-code N     로그 없이 versionCode 지정
  --notes-file PATH    출시 노트 문구 파일 (기본: pending-play-release-notes.txt)
  --dry-run            파일에 쓰지 않고 요약만
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --log) LOG="${2:-}"; shift 2 ;;
    --aab) AAB="${2:-}"; shift 2 ;;
    --build-how) BUILD_HOW="${2:-}"; shift 2 ;;
    --version-code) VERSION_CODE_OVERRIDE="${2:-}"; shift 2 ;;
    --notes-file) NOTES_FILE="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ ! -f "$NOTES_MD" ]]; then
  echo "Missing $NOTES_MD" >&2
  exit 1
fi

version_code=""
if [[ -n "$VERSION_CODE_OVERRIDE" ]]; then
  version_code="$VERSION_CODE_OVERRIDE"
elif [[ -n "$LOG" && -f "$LOG" ]]; then
  version_code="$(grep -Eo 'Incremented versionCode from [0-9]+ to [0-9]+' "$LOG" | tail -1 | grep -Eo '[0-9]+$' || true)"
  if [[ -z "$version_code" ]]; then
    version_code="$(grep -Eo '"versionCode":[[:space:]]*"[0-9]+"' "$LOG" | tail -1 | grep -Eo '[0-9]+' || true)"
  fi
fi

if [[ -z "$version_code" ]]; then
  echo "versionCode not found. Pass --log (eas build output) or --version-code." >&2
  exit 1
fi

semver="$(grep -E "version:[[:space:]]*'[^']+'" "$ROOT/apps/mobile/app.config.ts" | head -1 | sed -E "s/.*version:[[:space:]]*'([^']+)'.*/\1/" || true)"
[[ -n "$semver" ]] || semver="0.0.0"

cd "$ROOT"
git_head="$(git rev-parse --short HEAD)"
if [[ -d /usr/share/zoneinfo/Asia/Seoul ]]; then
  built_at="$(TZ=Asia/Seoul date +%Y-%m-%d)"
else
  built_at="$(date +%Y-%m-%d)"
fi

already=0
if grep -qE "\(versionCode ${version_code}\)" "$NOTES_MD"; then
  already=1
fi

# New entry: includesSince = current top gitHead. Re-record same vc: keep existing includesSince via Python.
includes_since="$(grep -E '^\| gitHead \|' "$NOTES_MD" | head -1 | sed -E 's/.*`([^`]+)`.*/\1/' || true)"
[[ -n "$includes_since" ]] || includes_since="—"

artifact_rel="apps/mobile/dist/nourylog-production.aab"
artifact_bytes=0
artifact_note="$artifact_rel"
if [[ -f "$AAB" ]]; then
  artifact_bytes="$(wc -c < "$AAB" | tr -d ' ')"
  artifact_mb="$(awk "BEGIN { printf \"%.1f\", $artifact_bytes / 1024 / 1024 }")"
  artifact_note="${artifact_rel} (~${artifact_mb} MB, 로컬 Docker)"
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Commits since includesSince..HEAD (mobile/server focus)
if [[ "$includes_since" != "—" ]] && git rev-parse --verify "${includes_since}^{commit}" >/dev/null 2>&1; then
  git log --oneline "${includes_since}..HEAD" -- apps/mobile apps/server >"$tmp/commits.txt" 2>/dev/null \
    || git log --oneline "${includes_since}..HEAD" >"$tmp/commits.txt"
else
  git log --oneline -15 -- apps/mobile apps/server >"$tmp/commits.txt"
fi

notes_source="auto-git"
resolve_notes_file=""
if [[ -n "$NOTES_FILE" && -f "$NOTES_FILE" ]]; then
  resolve_notes_file="$NOTES_FILE"
elif [[ -f "$PENDING_NOTES" ]] && grep -qvE '^[[:space:]]*(#|$)' "$PENDING_NOTES"; then
  resolve_notes_file="$PENDING_NOTES"
fi

if [[ -n "$resolve_notes_file" ]]; then
  grep -vE '^[[:space:]]*#' "$resolve_notes_file" | sed -E '/^[[:space:]]*$/d' >"$tmp/notes.txt"
  notes_source="pending:${resolve_notes_file#"$ROOT"/}"
else
  : >"$tmp/notes.txt"
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    printf '• %s\n' "${line#* }" >>"$tmp/notes.txt"
  done <"$tmp/commits.txt"
  if [[ ! -s "$tmp/notes.txt" ]]; then
    printf '%s\n' '• (자동 초안: 커밋 없음 — pending-play-release-notes.txt 에 작성하세요)' >"$tmp/notes.txt"
  fi
fi

export RN_NOTES_MD="$NOTES_MD"
export RN_SIDECAR="$SIDECAR"
export RN_DIST_DIR="$DIST_DIR"
export RN_MARKER="$MARKER"
export RN_SEMVER="$semver"
export RN_VC="$version_code"
export RN_HEAD="$git_head"
export RN_SINCE="$includes_since"
export RN_BUILT="$built_at"
export RN_ARTIFACT_REL="$artifact_rel"
export RN_ARTIFACT_NOTE="$artifact_note"
export RN_BYTES="$artifact_bytes"
export RN_BUILD_HOW="$BUILD_HOW"
export RN_NOTES_SOURCE="$notes_source"
export RN_COMMITS_FILE="$tmp/commits.txt"
export RN_NOTES_FILE="$tmp/notes.txt"
export RN_ALREADY="$already"
export RN_DRY="$DRY_RUN"
export RN_PENDING_PATH="$PENDING_NOTES"

python3 <<'PY'
import json, os, re
from pathlib import Path

md_path = Path(os.environ["RN_NOTES_MD"])
sidecar = Path(os.environ["RN_SIDECAR"])
dist = Path(os.environ["RN_DIST_DIR"])
marker = os.environ["RN_MARKER"]
semver = os.environ["RN_SEMVER"]
vc = os.environ["RN_VC"]
head = os.environ["RN_HEAD"]
since = os.environ["RN_SINCE"]
built = os.environ["RN_BUILT"]
artifact_rel = os.environ["RN_ARTIFACT_REL"]
artifact_note = os.environ["RN_ARTIFACT_NOTE"]
bytes_ = int(os.environ["RN_BYTES"] or "0")
build_how = os.environ["RN_BUILD_HOW"]
notes_source = os.environ["RN_NOTES_SOURCE"]
already = os.environ["RN_ALREADY"] == "1"
dry = os.environ["RN_DRY"] == "1"

commits = Path(os.environ["RN_COMMITS_FILE"]).read_text(encoding="utf-8").splitlines()
notes_ko = Path(os.environ["RN_NOTES_FILE"]).read_text(encoding="utf-8").rstrip() + "\n"

commit_bullets = []
for line in commits:
    if not line.strip():
        continue
    parts = line.split(" ", 1)
    h = parts[0]
    subj = parts[1] if len(parts) > 1 else ""
    commit_bullets.append(f"- `{h}` — {subj}")
if not commit_bullets:
    commit_bullets = ["- (해당 구간 커밋 없음)"]

entry = f"""### {built} — v{semver} (versionCode {vc})

| 필드 | 값 |
|------|-----|
| semver | `{semver}` |
| versionCode | `{vc}` |
| gitHead | `{head}` |
| includesSince | `{since}` |
| artifact | `{artifact_note}` |
| buildHow | `{build_how}` |
| track | `미업로드` (Play 업로드 시 HUMAN 갱신) |
| playStatus | `미업로드` |
| uploadedAt | `—` |
| easBuildId | 로컬 빌드 (cloud ID 없음) |

**출시 노트 (Play Console에 넣을 문구)** · 출처: {notes_source}

```
{notes_ko.rstrip()}
```

**포함 작업 (자동 · git log)**

{chr(10).join(commit_bullets)}

**비고**

- 이 항목은 `record-play-release-notes.sh`가 빌드 직후 자동 작성함.
- Play 업로드 후 `track` / `playStatus` / `uploadedAt`만 HUMAN 갱신.
- 다음 빌드 전 사용자용 문구: `docs/release/pending-play-release-notes.txt`
"""

dist.mkdir(parents=True, exist_ok=True)
data = {
    "semver": semver,
    "versionCode": int(vc),
    "gitHead": head,
    "includesSince": since,
    "builtAt": built,
    "artifact": artifact_rel,
    "artifactBytes": bytes_,
    "buildHow": build_how,
    "notesSource": notes_source,
    "notesKo": notes_ko.rstrip(),
    "commits": commits,
}
if not dry:
    sidecar.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"SIDECAR={sidecar}")

if already:
    if dry:
        print(f"RELEASE_NOTES_SKIP=versionCode {vc} already in markdown (dry-run)")
    else:
        print(f"RELEASE_NOTES_SKIP=versionCode {vc} already in markdown; sidecar updated")
    raise SystemExit(0)

if dry:
    print(entry)
    raise SystemExit(0)

text = md_path.read_text(encoding="utf-8")
if marker not in text:
    raise SystemExit(f"marker not found: {marker}")
idx = text.index(marker) + len(marker)
while idx < len(text) and text[idx] == "\n":
    idx += 1
insert = "\n" + entry.rstrip() + "\n\n---\n\n"
md_path.write_text(text[:idx] + insert + text[idx:], encoding="utf-8")
print(f"RELEASE_NOTES_OK={md_path}")

# Consume pending notes after a successful new entry
pending = Path(os.environ.get("RN_PENDING_PATH", ""))
if notes_source.startswith("pending:") and pending.is_file():
    kept = []
    for line in pending.read_text(encoding="utf-8").splitlines():
        if line.lstrip().startswith("#") or not line.strip():
            kept.append(line)
        # drop previous body lines
    # ensure trailing instruction blank
    body = "\n".join(kept).rstrip() + "\n"
    pending.write_text(body, encoding="utf-8")
    print(f"PENDING_CONSUMED={pending}")
PY
