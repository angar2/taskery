---
name: add-backlog
description: 백로그 등록 — backlog-add로 번호와 빈 양식을 받아 BACKLOG.md 항목 하나의 필수 칸을 채운다
---

# add-backlog

프로젝트 백로그(`.taskery/BACKLOG.md`, 하나뿐)에 항목 하나를 등록한다.

- `.taskery/BACKLOG.md` 맨 위의 쓰는 법을 따른다.
- `backlog-add "<제목>"`(종류를 알면 `--type`)으로 양식을 받은 뒤 나머지 필수 칸(종류·현상)을 채운다. 모자라면 사용자에게 한 줄로 묻는다.
- 선택 칸은 대화·작업 맥락에 근거가 있을 때만 줄을 더해 적거나 제안한다. 근거가 없으면 두지 않는다. 칸을 채우려고 지어내지 않는다.

## 부르는 명령

- `backlog-add`
