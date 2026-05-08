#!/bin/bash
# ./.claude/hooks/pre-state-save.sh
# PreToolUse(Write|Edit) 훅 — 태스크 상태 임시 저장

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

# .project/tasks/v{버전}/ 경로 .md 파일만 (spec-diffs/ 제외)
if ! echo "$FILE_PATH" | grep -qE '\.project/tasks/v[^/]+/[^/]+\.md$'; then
  exit 0
fi

if [ ! -f "$FILE_PATH" ]; then
  echo "" > "./.taskestra/.task-state-prev"
  exit 0
fi

# 현재 상태 추출 후 임시 저장 (mac BSD grep -P 미지원이라 python3 정규식 사용)
# G1 통일: validate-task-state.sh와 동일한 6컬럼 + STATUS_WHITELIST 정규식 사용 — 본문 `상태: pass` 같은 라벨 오인 방지
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
echo "$CURRENT_STATE" > "./.taskestra/.task-state-prev"

exit 0
