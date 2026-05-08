#!/bin/bash
# ./.claude/hooks/post-state-sync.sh
# PostToolUse(Write|Edit) 훅 — 상태 전환 검증 + 검토 결과 검증 + 작업 메모 검증 (Tier 2)

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

if ! echo "$FILE_PATH" | grep -qE '\.project/tasks/v[^/]+/[^/]+\.md$'; then
  exit 0
fi
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

CURRENT_AGENT=""
for TOKEN_FILE in ./.taskestra/.agent-token-*; do
  if [ -f "$TOKEN_FILE" ]; then
    AGENT=$(cat "$TOKEN_FILE" 2>/dev/null | tr -d '[:space:]')
    if [ -n "$AGENT" ]; then CURRENT_AGENT="$AGENT"; break; fi
  fi
done

# 이전 상태 읽기
PREV_STATE=$(cat "./.taskestra/.task-state-prev" 2>/dev/null | tr -d '[:space:]')
# 새 상태 읽기 (mac BSD grep -P 미지원이라 python3 정규식 사용)
# G1 통일: validate-task-state.sh와 동일한 6컬럼 + STATUS_WHITELIST 정규식
NEW_STATE=$(FP="$FILE_PATH" python3 -c "
import os, re
try:
    content = open(os.environ['FP']).read()
except Exception:
    content = ''
STATUS_WHITELIST = r'(draft|planning|planned|plan-approved|revision-required|developing|developed|dev-revision-required|dev-approved|test-passed|test-failed|closed)'
m = re.search(rf'^\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*{STATUS_WHITELIST}\s*\|\s*$', content, re.MULTILINE)
print(m.group(1) if m else '')
" 2>/dev/null)

# 태스크 유형 추출 (헤더 표 4번째 컬럼: 생성일 | 프로젝트 | 규모 | 유형 | 우선순위 | 상태)
TASK_TYPE=$(FP="$FILE_PATH" python3 -c "
import os, re
try:
    content = open(os.environ['FP']).read()
except Exception:
    content = ''
m = re.search(r'^\|[^|]*\|[^|]*\|[^|]*\|\s*([a-z]+)\s*\|', content, re.MULTILINE)
print(m.group(1) if m else '')
" 2>/dev/null)

# 상태 변경 없으면 통과
if [ -z "$NEW_STATE" ] || [ "$NEW_STATE" = "$PREV_STATE" ]; then
  exit 0
fi

# 허용 상태 전이 목록 (validate-task-state.sh와 동일 — PostToolUse 2차 검증)
ALLOWED_TRANSITIONS=(
  "tasker:→draft" "tasker:dev-approved→closed" "tasker:test-passed→closed"
  "planner:draft→planning" "planner:planning→planned" "planner:planning→plan-approved"
  "planner:draft→plan-approved" "planner:revision-required→planning"
  "plan-reviewer:planned→plan-approved" "plan-reviewer:planned→revision-required"
  "architect:draft→planning" "architect:planning→planned" "architect:planning→plan-approved" "architect:revision-required→planning"
  "architect-reviewer:planned→plan-approved" "architect-reviewer:planned→revision-required"
  "developer:plan-approved→developing" "developer:developing→developed" "developer:dev-revision-required→developing" "developer:test-failed→developing"
  "develop-reviewer:developed→dev-approved" "develop-reviewer:developed→dev-revision-required"
  "tester:dev-approved→test-passed" "tester:dev-approved→test-failed"
)

TRANSITION_KEY="${CURRENT_AGENT}:${PREV_STATE}→${NEW_STATE}"
ALLOWED=false
for T in "${ALLOWED_TRANSITIONS[@]}"; do
  if [ "$TRANSITION_KEY" = "$T" ]; then
    ALLOWED=true
    break
  fi
done

if [ "$ALLOWED" = false ]; then
  echo "🚫 [HARNESS Tier2] 허용되지 않은 상태 전환: ${PREV_STATE} → ${NEW_STATE} (에이전트: ${CURRENT_AGENT:-미확인})"
  exit 2
fi

# 자기 행 검증 (v2 A-03 fix) — 상태 전이 시 ## 에이전트 실행 로그 마지막 행이 CURRENT_AGENT 행인지 확인
# AGENT-CONSTITUTION 절대 규칙 3번: 작업 종료 직전 마지막 단계로 자기 행 추가 필수.
if [ -n "$CURRENT_AGENT" ]; then
  LOG_AGENT=$(FP="$FILE_PATH" python3 -c "
import os, re, sys
try:
    content = open(os.environ['FP']).read()
except Exception:
    sys.exit(0)
m_section = re.search(r'^## 에이전트 실행 로그\s*\n(.*?)(?=\n## |\Z)', content, re.MULTILINE | re.DOTALL)
if not m_section:
    print('NO_SECTION')
    sys.exit(0)
section = m_section.group(1)
matches = re.findall(r'^\|[^|]*\|\s*([a-z][a-z-]+)\s*\|', section, re.MULTILINE)
print(matches[-1] if matches else 'NO_ROW')
" 2>/dev/null)
  if [ "$LOG_AGENT" = "NO_SECTION" ] || [ "$LOG_AGENT" = "NO_ROW" ] || [ "$LOG_AGENT" != "$CURRENT_AGENT" ]; then
    echo "🚫 [HARNESS Tier2] 에이전트 실행 로그 자기 행 누락 — ${CURRENT_AGENT}가 작업 후 행 추가 안 함 (마지막 행 에이전트: ${LOG_AGENT:-없음})"
    echo "AGENT-CONSTITUTION 절대 규칙 3번 위반. 작업 종료 직전 '## 에이전트 실행 로그'에 자기 행 추가 필수."
    exit 2
  fi
fi

# 상태가 dev-approved 또는 plan-approved로 전환 시: 검토 결과 섹션 존재 + 비어있지 않음 검증
# 단, chore/docs 타입은 기획 리뷰가 N/A로 대체되어 검토 결과 섹션이 없으므로 검사 스킵 (A-04)
# 검토 결과 본문은 다음 섹션(## / ### / #### 헤더) 직전까지 추출 후 strip해서 비었는지 확인 — tail+빈줄 grep의 거짓양성 회피.
if echo "$NEW_STATE" | grep -qE '^(dev-approved|plan-approved)$' && ! echo "$TASK_TYPE" | grep -qE '^(chore|docs)$'; then
  REVIEW_BODY=$(FP="$FILE_PATH" python3 -c "
import os, re
try:
    content = open(os.environ['FP']).read()
except Exception:
    content = ''
m = re.search(r'^#### 결과\s*\n(.*?)(?=\n#### |\n### |\n## |\Z)', content, re.MULTILINE | re.DOTALL)
print(m.group(1).strip() if m else '')
" 2>/dev/null)
  if [ -z "$REVIEW_BODY" ]; then
    echo "🚫 [HARNESS Tier2] 검토 결과 섹션이 비어있습니다."
    echo "승인 전 '#### 결과' 섹션을 작성해야 합니다."
    exit 2
  fi
fi

# 상태 전환 시: 작업 메모 섹션 존재 + 비어있지 않음 검증 (초기 draft 제외)
if [ "$NEW_STATE" != "draft" ] && [ "$NEW_STATE" != "planning" ] && [ "$NEW_STATE" != "developing" ]; then
  WORK_MEMO=$(grep -A3 "## 작업 메모" "$FILE_PATH" 2>/dev/null | grep -v "## 작업 메모" | head -2)
  if echo "$WORK_MEMO" | grep -qE '\(에이전트 완료 시 업데이트'; then
    echo "🚫 [HARNESS Tier2] 작업 메모가 초기값입니다."
    echo "상태 전환 전 '## 작업 메모' 섹션을 업데이트해야 합니다."
    exit 2
  fi
fi

# pre-state-save가 만든 임시 파일 자기 소비 후 정리 (회귀 5차 fix F1).
# 모든 검증 통과한 정상 분기에서만 cleanup. exit 2 차단 분기는 잔존 OK
# (다음 Edit에서 pre-state-save가 덮어쓰기 갱신하므로 무영향).
rm -f "./.taskestra/.task-state-prev"

exit 0
