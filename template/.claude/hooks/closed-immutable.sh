#!/bin/bash
# .claude/hooks/closed-immutable.sh
# PreToolUse(Write|Edit) 훅 — closed 상태 task 문서 + spec-diffs/ 재수정 차단
#
# 잡는 것:
#   1. .project/tasks/<vX.X>/<NNN>_<slug>.md (또는 폴더 승격 시 task.md) 중
#      헤더 status가 'closed'인 task 문서 자체 재수정
#   2. 해당 task의 spec-diffs/ 하위 파일 재수정
#
# 우회 (의도적으로 closed task를 풀어 다시 진행해야 하는 경우):
#   - 헤더 status를 closed → developing(또는 다른 상태)으로 직접 sed로 변경 (Bash 영역)
#   - 그 후 정상 Edit 가능
#   - hook 자체 비활성화는 비권장 — 임시 케이스 외 closed 보호 안전망 유지
#
# Catastrophic 영역 (완료 보호). 잘 지키면 작동 0회 (무해).

INPUT=$(cat)

# tool_input.file_path 추출
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
    print('')
" 2>/dev/null)

# task 영역 외 통과
# 매칭: .project/tasks/v*/<NNN>_<slug>.md 또는 .project/tasks/v*/TASK-<NNN>_<slug>/(task.md|spec-diffs/*.md)
if ! echo "$FILE_PATH" | grep -qE '\.project/tasks/v[^/]+/[^/]+(\.md$|/(task\.md|spec-diffs/[^/]+\.md)$)'; then
  exit 0
fi

# task.md 본 파일 결정
# - 단일 파일: .project/tasks/v*/<NNN>_<slug>.md
# - 폴더 승격: .project/tasks/v*/TASK-<NNN>_<slug>/task.md (또는 그 안의 spec-diffs/*.md)
TASK_MD=""
if echo "$FILE_PATH" | grep -qE '\.project/tasks/v[^/]+/TASK-[^/]+/(task\.md|spec-diffs/[^/]+\.md)$'; then
  # 폴더 승격: spec-diffs/*.md 또는 task.md → 부모 폴더의 task.md 사용
  TASK_MD=$(echo "$FILE_PATH" | sed -E 's|(\.project/tasks/v[^/]+/TASK-[^/]+)/.*|\1/task.md|')
elif echo "$FILE_PATH" | grep -qE '\.project/tasks/v[^/]+/[^/]+\.md$'; then
  # 단일 파일
  TASK_MD="$FILE_PATH"
else
  exit 0
fi

# task.md 존재 안 하면 통과 (신규 생성 케이스)
if [ ! -f "$TASK_MD" ]; then
  exit 0
fi

# 헤더 status 추출 (5컬럼 표 — 생성일 / 플랜 / 유형 / 규모 / 상태)
# python3 정규식 사용 (mac BSD grep -P 미지원)
STATUS=$(TM="$TASK_MD" python3 -c "
import os, re
try:
    content = open(os.environ['TM']).read()
except Exception:
    print('')
    raise SystemExit(0)
# 7-state whitelist
WL = r'(draft|planned|developing|developed|testing|tested|closed)'
# 5-column row: | 생성일 | 플랜 | 유형 | 규모 | 상태 |
m = re.search(rf'^\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*{WL}\s*\|\s*\$', content, re.MULTILINE)
print(m.group(1) if m else '')
" 2>/dev/null)

# closed 상태면 차단
if [ "$STATUS" = "closed" ]; then
  echo "closed-immutable: '$FILE_PATH' 차단. task '$TASK_MD' 상태가 'closed' — 재수정 금지." >&2
  echo "  의도적 재진입 필요 시: sed로 헤더 status를 'developing' 또는 다른 상태로 직접 변경 후 Edit 가능." >&2
  echo "  단 *closed task 코드 영역* 수정은 새 task로 처리가 정상 흐름." >&2
  exit 2
fi

exit 0
