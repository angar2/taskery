#!/bin/bash
# .claude/hooks/closed-immutable.sh
# PreToolUse(Write|Edit) 훅 — closed 상태 task.md 재수정 차단
#
# 잡는 것 (단순화 — task.md 본 파일만 보호):
#   1. .project/tasks/<NNN_slug>/<NNN>_<slug>.md (단일 파일)
#   2. .project/tasks/<NNN_slug>/TASK-<NNN>_<slug>/task.md (폴더 승격)
#   → 헤더 status가 'closed'면 차단
#
# 차단 안 함 (의도적):
#   - .project/tasks/<NNN_slug>/spec-diffs/*.md — 역사적 자료, 자유 수정
#   - .project/tasks/<NNN_slug>/screenshots/* — 자유
#   - .project/tasks/<NNN_slug>/mockup/*.html — UX/UI 목업, 자유 수정 (<NNN_slug> 공통)
#   - 폴더 승격 task 폴더 안 추가 자료 (서브 문서 등) — 자유
#   - 코드 영역 — closed task 코드 재수정은 *새 task로 처리*가 정상 흐름
#
# 우회 (의도적으로 closed task를 풀어 다시 진행해야 하는 경우):
#   - 헤더 status를 closed → developing(또는 다른 상태)으로 직접 sed로 변경 (Bash 영역)
#   - 그 후 정상 Edit 가능
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

# task.md 본 파일 매칭 (단일 + 폴더 승격)
# - 단일: .project/tasks/<NNN_slug>/<NNN>_<slug>.md (NNN_<slug> 패턴 — plan 폴더 직속, spec-diffs/screenshots/mockup 하위 X)
# - 폴더: .project/tasks/<NNN_slug>/TASK-<NNN>_<slug>/task.md
# plan 폴더명은 한 세그먼트([^/]+)면 무엇이든 매칭 (NNN_slug 신규 / 구버전 vX.X 모두). spec-diffs/screenshots/mockup 직속 파일은 추가 세그먼트라 매칭 안 됨 (보호 대상 X)
if ! echo "$FILE_PATH" | grep -qE '\.project/tasks/[^/]+/([0-9]+_[^/]+\.md|TASK-[^/]+/task\.md)$'; then
  exit 0
fi

# task.md = file_path 자체
TASK_MD="$FILE_PATH"

# task.md 존재 안 하면 통과 (신규 생성 케이스)
if [ ! -f "$TASK_MD" ]; then
  exit 0
fi

# 헤더 status 추출 — status는 헤더 표의 *마지막* 셀.
#   5컬럼(구): 생성일 / 플랜 / 유형 / 규모 / 상태
#   6컬럼(0.6.0+): 생성일 / 플랜 / 유형 / 규모 / 부모 브랜치 / 상태
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
# status = 마지막 셀. 선행 셀 4개(구 5컬럼) 또는 5개(신 6컬럼) 뒤에 온다.
m = re.search(rf'^\|(?:[^|]*\|){{4,5}}\s*{WL}\s*\|\s*\$', content, re.MULTILINE)
print(m.group(1) if m else '')
" 2>/dev/null)

# closed 상태면 차단
if [ "$STATUS" = "closed" ]; then
  echo "closed-immutable: '$FILE_PATH' 차단. task '$TASK_MD' 상태가 'closed' — 재수정 금지." >&2
  echo "  의도적 재진입 필요 시: sed로 헤더 status를 'developing' 또는 다른 상태로 직접 변경 후 Edit 가능." >&2
  echo "  *closed task 코드 / spec-diffs / screenshots / mockup*은 보호 영역 외 — 자유 수정. 단 코드 변경은 *새 task로 처리*가 정상 흐름." >&2
  exit 2
fi

exit 0
