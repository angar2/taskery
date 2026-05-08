#!/bin/bash
# ./.claude/hooks/validate-task-state.sh
# PreToolUse(Write|Edit) 훅 — 태스크 상태 전이 검증

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ti = d.get('tool_input', {})
    print(ti.get('file_path', ''))
except:
    print('')
" 2>/dev/null)

# .project/tasks/v{버전}/ 경로의 .md 파일만 검증 (spec-diffs/ 하위 파일 및 다른 파일은 통과)
if ! echo "$FILE_PATH" | grep -qE '\.project/tasks/v[^/]+/[^/]+\.md$'; then
  exit 0
fi

CURRENT_AGENT=""
for TOKEN_FILE in ./.taskestra/.agent-token-*; do
  if [ -f "$TOKEN_FILE" ]; then
    AGENT=$(cat "$TOKEN_FILE" 2>/dev/null | tr -d '[:space:]')
    if [ -n "$AGENT" ]; then CURRENT_AGENT="$AGENT"; break; fi
  fi
done

# 현재 파일의 상태 읽기 (신규 파일이면 빈 문자열)
# 주의: lookbehind(`(?<=...)`)는 PCRE 전용이라 macOS BSD grep에서 미지원.
# 일관성과 호환성을 위해 python3 정규식으로 추출 (이미 hook이 python3 의존).
CURRENT_STATE=""
if [ -f "$FILE_PATH" ]; then
  CURRENT_STATE=$(FP="$FILE_PATH" python3 -c "
import os, re
try:
    content = open(os.environ['FP']).read()
except Exception:
    content = ''
STATUS_WHITELIST = r'(draft|planning|planned|plan-approved|revision-required|developing|developed|dev-revision-required|dev-approved|test-passed|test-failed|closed)'
m = re.search(rf'^\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*{STATUS_WHITELIST}\s*\|\s*$', content, re.MULTILINE)
print(m.group(1) if m else '')
" 2>/dev/null)
fi

# 새로 쓰려는 내용에서 상태 추출
NEW_CONTENT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ti = d.get('tool_input', {})
    print(ti.get('content', ti.get('new_string', '')))
except:
    print('')
" 2>/dev/null)

NEW_STATE=$(NC="$NEW_CONTENT" python3 -c "
import os, re
content = os.environ.get('NC', '')
STATUS_WHITELIST = r'(draft|planning|planned|plan-approved|revision-required|developing|developed|dev-revision-required|dev-approved|test-passed|test-failed|closed)'
m = re.search(rf'^\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*{STATUS_WHITELIST}\s*\|\s*$', content, re.MULTILINE)
print(m.group(1) if m else '')
" 2>/dev/null)

# 상태 변경 없으면 통과
if [ -z "$NEW_STATE" ] || [ "$NEW_STATE" = "$CURRENT_STATE" ]; then
  exit 0
fi

# 에이전트별 허용 상태 전이 목록 (project-system-plan.md Section 5 기준)
ALLOWED_TRANSITIONS=(
  # tasker
  "tasker:→draft"
  "tasker:dev-approved→closed"
  "tasker:test-passed→closed"
  # planner
  "planner:draft→planning"
  "planner:planning→planned"
  "planner:planning→plan-approved"
  "planner:draft→plan-approved"
  "planner:revision-required→planning"
  # plan-reviewer
  "plan-reviewer:planned→plan-approved"
  "plan-reviewer:planned→revision-required"
  # architect
  "architect:draft→planning"
  "architect:planning→planned"
  "architect:planning→plan-approved"
  "architect:revision-required→planning"
  # architect-reviewer
  "architect-reviewer:planned→plan-approved"
  "architect-reviewer:planned→revision-required"
  # developer
  "developer:plan-approved→developing"
  "developer:developing→developed"
  "developer:dev-revision-required→developing"
  "developer:test-failed→developing"
  # develop-reviewer
  "develop-reviewer:developed→dev-approved"
  "develop-reviewer:developed→dev-revision-required"
  # tester
  "tester:dev-approved→test-passed"
  "tester:dev-approved→test-failed"
)

TRANSITION_KEY="${CURRENT_AGENT}:${CURRENT_STATE}→${NEW_STATE}"

for ALLOWED in "${ALLOWED_TRANSITIONS[@]}"; do
  if [ "$TRANSITION_KEY" = "$ALLOWED" ]; then
    exit 0
  fi
done

echo "🚫 [HARNESS] 허용되지 않은 태스크 상태 전이 차단됨"
echo "에이전트: ${CURRENT_AGENT:-'미확인'}"
echo "전이 시도: '${CURRENT_STATE}' → '${NEW_STATE}'"
echo "이 에이전트는 이 상태 전이 권한이 없습니다."
exit 2
