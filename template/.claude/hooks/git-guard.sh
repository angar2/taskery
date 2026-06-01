#!/bin/bash
# .claude/hooks/git-guard.sh
# PreToolUse(Bash) 훅 — catastrophic git 명령 차단
#
# 잡는 것:
#   1. main / dev 브랜치 직접 커밋 (5종 변형 인식: -C / --git-dir / --work-tree)
#   2. git push --force / -f
#   3. git commit --no-verify
#   4. git branch -D (강제 삭제)
#   5. git reset --hard
#   6. git clean -fd
#
# 정상 흐름에서는 작동 0회 (무해). 사용자 명시 승인 케이스는 hook 비활성화 또는 직접 우회 필요.
#
# Single source of truth: .project/rules/GIT_RULE.md (없으면 ~/.claude/rules/GIT_RULE.md)

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

# git 명령 아니면 통과
if ! echo "$CMD" | grep -qE '(^|;|&&|\|\|)\s*git\s'; then
  exit 0
fi

# 헬퍼: git 명령에서 대상 워크트리 경로 추출 (5종 변형)
#   1. git -C <경로>
#   2. git --git-dir=<경로>  (= 형태)
#   3. git --git-dir <경로>  (공백 분리)
#   4. git --work-tree=<경로>  (= 형태)
#   5. git --work-tree <경로>  (공백 분리)
# 추출 실패 시 빈 문자열 (cwd 사용).
# --git-dir 변형은 `.git` 디렉토리를 가리키므로 dirname 처리해 워크트리 경로로 변환.
extract_target_path() {
  local cmd="$1"
  local path=""

  if [[ "$cmd" =~ git[[:space:]]+-C[[:space:]]+([^[:space:]]+) ]]; then
    path="${BASH_REMATCH[1]}"
  elif [[ "$cmd" =~ --git-dir=([^[:space:]]+) ]]; then
    path=$(dirname "${BASH_REMATCH[1]}")
  elif [[ "$cmd" =~ --git-dir[[:space:]]+([^[:space:]]+) ]]; then
    path=$(dirname "${BASH_REMATCH[1]}")
  elif [[ "$cmd" =~ --work-tree=([^[:space:]]+) ]]; then
    path="${BASH_REMATCH[1]}"
  elif [[ "$cmd" =~ --work-tree[[:space:]]+([^[:space:]]+) ]]; then
    path="${BASH_REMATCH[1]}"
  fi

  echo "$path"
}

# 1. main / dev 직접 커밋 차단 (5종 변형 인식)
# 현재 브랜치 확인 + git commit 명령 감지 시 차단
if echo "$CMD" | grep -qE '(^|;|&&|\|\|)\s*git(\s+(-C\s+\S+|--git-dir[= ]\S+|--work-tree[= ]\S+))*\s+commit\b'; then
  TARGET_PATH=$(extract_target_path "$CMD")
  if [ -n "$TARGET_PATH" ]; then
    CURRENT_BRANCH=$(git -C "$TARGET_PATH" branch --show-current 2>/dev/null)
  else
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
  fi
  if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "dev" ]; then
    echo "git-guard: '$CURRENT_BRANCH' 브랜치 직접 커밋 차단. 작업 브랜치({타입}/{개발자}_TASK-NNN_slug)에서 커밋. (.project/rules/GIT_RULE.md §기본 원칙)" >&2
    echo "  변형 인식: 'git -C <경로> ...' / 'git --git-dir=<경로> ...' / 'git --work-tree=<경로> ...' — 메인 cwd에서 워크트리 대상 커밋 가능." >&2
    echo "  셸 prefix('cd <경로> && git ...' / '(cd ... && git ...)')는 hook이 정확히 인식 X — 'git -C <경로> ...' 형태로만 발행." >&2
    exit 2
  fi
fi

# 2. git commit --no-verify 차단
if echo "$CMD" | grep -qE 'git\s+commit\b.*--no-verify'; then
  echo "git-guard: 'git commit --no-verify' 차단. commit hook 우회 금지. (.project/rules/GIT_RULE.md §금지 사항)" >&2
  exit 2
fi

# 3. git push --force / -f 차단
if echo "$CMD" | grep -qE 'git\s+push\b.*(\s--force(\s|$|=)|\s-f(\s|$))'; then
  echo "git-guard: 'git push --force' 차단. 정상 흐름 사유 없음. 사용자 명시 승인 필요. (.project/rules/GIT_RULE.md §destructive 명령)" >&2
  exit 2
fi

# 4. git branch -D 차단 (강제 삭제)
if echo "$CMD" | grep -qE 'git\s+branch\b.*\s-D(\s|$)'; then
  echo "git-guard: 'git branch -D' 차단. 머지 안 된 브랜치 강제 삭제 사유 없음. 사용자 명시 승인 필요. (.project/rules/GIT_RULE.md §destructive 명령)" >&2
  exit 2
fi

# 5. git reset --hard 차단
if echo "$CMD" | grep -qE 'git\s+reset\b.*--hard'; then
  echo "git-guard: 'git reset --hard' 차단. 작업 손실 위험. 사용자 명시 승인 필요. (.project/rules/GIT_RULE.md §destructive 명령)" >&2
  exit 2
fi

# 6. git clean -fd 차단
if echo "$CMD" | grep -qE 'git\s+clean\b.*\s-[a-zA-Z]*f[a-zA-Z]*d'; then
  echo "git-guard: 'git clean -fd' 차단. untracked 파일 + 디렉토리 강제 삭제 사유 없음. 사용자 명시 승인 필요. (.project/rules/GIT_RULE.md §destructive 명령)" >&2
  exit 2
fi

exit 0
