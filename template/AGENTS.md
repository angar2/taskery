# AGENTS.md

## taskery
1. 이 리포는 taskery로 운영한다. 모든 작업은 taskery 스킬과 명령으로 한다.
2. 사용자가 명시한 범위만 수행한다. 범위를 말하지 않으면 한 단계만 하고 멈춘다. "~까지", "끝까지"라고 하면 거기까지 이어 간다. 눈으로 확인할 항목·테스트 실패·풀지 못한 충돌에서는 멈춘다.
3. 태스크는 항상 브랜치와 워크트리를 분기한다. 생략은 사용자가 명시할 때만 하고, 먼저 제안하지 않는다.
4. git과 로컬 규칙은 `.taskery/rules/GIT_RULE.md`와 `*.local.md`를 따른다.
5. taskery 명령은 MCP 도구가 있으면 도구로, 없으면 `npx @angar2/taskery`로 부른다.
6. 사용법이 막히면 `.taskery/rules/TASKERY_RULE.md`를 참고한다.

## 프로젝트
- 이름: <프로젝트명>
- 타입: <frontend / backend / fullstack / cli / library / other>
- 소개: <한 줄>

## 세션 시작
- `taskery status`로 진행 중인 태스크를 확인한다.
