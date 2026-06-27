#!/bin/bash
# .codex/hooks/closed-immutable.sh
# Codex PreToolUse(apply_patch) 훅 — closed 상태 task.md 재수정 차단 (코덱스 전용판)
#
# 클로드판(.claude/hooks/closed-immutable.sh)과의 차이:
#   - 클로드: tool_input.file_path 1개를 읽음 (Write|Edit 도구)
#   - 코덱스: 파일 편집이 apply_patch 도구 1개로 처리되며 tool_input.command 안에
#     patch envelope 전체(`*** Begin Patch` ... `*** Update File: <경로>` ...)가 들어옴.
#     file_path 키가 없으므로 command에서 `*** Update File:` / `*** Add File:` 헤더의
#     경로를 정규식 추출해 각각 검사한다. matcher = "apply_patch".
#
# 잡는 것:
#   1. .project/tasks/<NNN_slug>/<NNN>_<slug>.md (단일 파일)
#   2. .project/tasks/<NNN_slug>/TASK-<NNN>_<slug>/task.md (폴더 승격)
#   → 헤더 status가 'closed'면 차단 (exit 2)
#
# 차단 안 함 (의도적): spec-diffs / screenshots / mockup — 역사적 자료 자유 수정.
#   Add File은 대상 파일이 존재하지 않으므로 자연 통과(새 파일은 closed일 수 없음).
#
# 우회: 헤더 status를 closed → developing 등으로 직접 변경 후 편집.
# Catastrophic 영역 (완료 보호). 잘 지키면 작동 0회 (무해).

INPUT=$(cat)

# tool_input.command (apply_patch envelope 전체) 추출
CMD=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    print(json.load(sys.stdin).get('tool_input', {}).get('command', ''))
except Exception:
    print('')
" 2>/dev/null)

# Update/Add File 헤더에서 대상 경로 추출 (한 patch에 여러 파일 가능)
PATHS=$(echo "$CMD" | grep -oE '^\*\*\* (Update|Add) File: .+$' | sed -E 's/^\*\*\* (Update|Add) File: //')

[ -z "$PATHS" ] && exit 0

while IFS= read -r FILE_PATH; do
  # task.md 본 파일 패턴만 검사 (spec-diffs/screenshots/mockup 직속은 보호 대상 X)
  echo "$FILE_PATH" | grep -qE '\.project/tasks/[^/]+/([0-9]+_[^/]+\.md|TASK-[^/]+/task\.md)$' || continue
  # 존재하는 파일만 (Add File 신규 생성은 통과)
  [ -f "$FILE_PATH" ] || continue

  # 헤더 status 추출 (5컬럼 표 — 생성일 / 플랜 / 유형 / 규모 / 상태)
  STATUS=$(TM="$FILE_PATH" python3 -c "
import os, re
try:
    content = open(os.environ['TM']).read()
except Exception:
    print('')
    raise SystemExit(0)
WL = r'(draft|planned|developing|developed|testing|tested|closed)'
m = re.search(rf'^\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*{WL}\s*\|\s*\$', content, re.MULTILINE)
print(m.group(1) if m else '')
" 2>/dev/null)

  if [ "$STATUS" = "closed" ]; then
    echo "closed-immutable: '$FILE_PATH' 차단. task 상태가 'closed' — 재수정 금지." >&2
    echo "  의도적 재진입 시: sed로 헤더 status를 'developing' 등으로 변경 후 편집 가능." >&2
    echo "  closed task 코드 / spec-diffs / screenshots / mockup은 보호 영역 외 — 자유 수정. 코드 변경은 새 task로 처리가 정상 흐름." >&2
    exit 2
  fi
done <<< "$PATHS"

exit 0
