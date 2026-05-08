#!/bin/bash
# .claude/hooks/pre-commit-verify.sh
# PreToolUse(Bash) 훅 — git commit 시점에 검증 명령 모두 PASS 게이트
#
# 잡는 것:
#   git commit 명령 감지 → 프로젝트 루트 CLAUDE.md '## 검증 명령' 섹션의 명령 모두 실행
#   하나라도 fail (exit code != 0) → exit 2 (commit 차단)
#
# Process catastrophic — 결정적 영역(린트/타입/빌드/테스트). 합리적 변형 없음.
# 잘 지키면 작동 0회 (무해 — /task-dev self-check + /task-close 게이트로 이미 PASS 상태에서 commit).
# 부분 작업 / 환경 변화 / 가정 누설 시 catastrophic 차단 안전망.
#
# Single source of truth: 프로젝트 루트 CLAUDE.md '## 검증 명령' 섹션
# 형식 예:
#   ## 검증 명령
#   - 린트: `npm run lint`
#   - 타입체크: `npm run typecheck`
#   - 빌드: `npm run build`
#   - 단위테스트: `npm test`

INPUT=$(cat)

# tool_input.command 추출
CMD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
" 2>/dev/null)

# git commit 명령 아니면 통과
if ! echo "$CMD" | grep -qE '(^|;|&&|\|\|)\s*git\s+commit\b'; then
  exit 0
fi

# CLAUDE.md 정독 — 프로젝트 루트
if [ ! -f "./CLAUDE.md" ]; then
  echo "pre-commit-verify: 프로젝트 루트 CLAUDE.md 없음. 검증 명령 단일 진실 소스 누락 — commit 차단." >&2
  echo "  '/project-init' 또는 'npx taskery init' 호출해 CLAUDE.md 생성." >&2
  exit 2
fi

# '## 검증 명령' 섹션 추출 + 백틱(`...`) 안 명령 추출
COMMANDS=$(python3 <<'PYEOF'
import re

try:
    with open('./CLAUDE.md') as f:
        content = f.read()
except Exception:
    raise SystemExit('claude_md_read_failed')

# '## 검증 명령' 섹션 (다음 ## 헤딩 또는 EOF까지)
m = re.search(r'^##\s*검증\s*명령\s*$([\s\S]*?)(?=^##\s|\Z)', content, re.MULTILINE)
if not m:
    raise SystemExit('section_missing')

section = m.group(1)
# 백틱 안 명령 추출 — 한 줄에 하나
cmds = re.findall(r'`([^`]+)`', section)
for c in cmds:
    print(c)
PYEOF
)

# 섹션 누락 / 추출 실패 케이스
if [ -z "$COMMANDS" ]; then
  echo "pre-commit-verify: CLAUDE.md '## 검증 명령' 섹션 없거나 명령 없음. commit 차단." >&2
  echo "  CLAUDE.md에 '## 검증 명령' 섹션 추가 + 백틱 안에 명령 박음 (예: \`npm run lint\`)." >&2
  exit 2
fi

# 각 명령 실행 — 하나라도 fail → 차단
FAILED=""
while IFS= read -r cmd; do
  [ -z "$cmd" ] && continue
  echo "pre-commit-verify: 실행 — $cmd" >&2
  if ! eval "$cmd" >/dev/null 2>&1; then
    FAILED="$FAILED\n  - FAIL: $cmd"
  fi
done <<< "$COMMANDS"

if [ -n "$FAILED" ]; then
  echo "pre-commit-verify: 검증 명령 실패 — commit 차단." >&2
  printf "%b\n" "$FAILED" >&2
  echo "  /task-dev self-check 또는 /task-close 게이트 통과 후 다시 시도." >&2
  exit 2
fi

exit 0
