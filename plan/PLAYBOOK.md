# PLAYBOOK — 미래 옵션 카탈로그

> 진짜 데이터 / 짜증 / 시점에 따라 부활시킬 *미래 옵션* 인덱스.
> **미리 박지 X. 진짜 필요해질 때 찾아 추가.**

---

## 사용 방법

- 평소 짜증/한계는 `.project/FRICTION_LOG.md`에 기록 (메인이 한 줄씩)
- 5 task마다 또는 사용자 호출 시 `/refine` 슬래시로 정리 + 패턴 감지
- `/refine`이 *반복 패턴* 감지 → 이 카탈로그에서 해당 항목 부활 검토 제안
- 지크 OK 시 부활 항목의 **방법** 따라 도입

각 항목 형식:

```markdown
## <주제>
- **상황**: <언제 이게 필요해질지>
- **요소**: <무엇을 추가할지>
- **방법**: <어떻게 도입할지>
- **얻는 것**: <효용>
- **주의**: <함정/조건>
- **출처**: <시니어 패턴 / 5사이클 회고 / bottoms-up>
```

---

## 1. 컨텍스트 격리 강화 (Task tool default 확장)

- **상황**: 30+ task 누적되어 메인 세션 컨텍스트 폭발 직전. `/task-plan`, `/task-dev` 같은 슬래시도 격리 필요해짐
- **요소**: `/task-test` 외 슬래시도 default를 *Task tool 격리*로 옮김. 슬래시별로 부담 큰 곳 지정
- **방법**:
  1. FRICTION_LOG에서 *어느 슬래시가 컨텍스트 부담 큰지* 통계
  2. 후보 슬래시(예: `/task-plan` 큰 코드베이스 탐색 시) instruction에 *"기본 Task tool 격리 호출"* 추가
  3. 격리 prompt에 task.md 경로 + 필요 컨텍스트만 명시 (자기완결적)
- **얻는 것**: 메인 세션 컨텍스트 절감. 30+ task 굴려도 압축 회피
- **주의**: 격리 prompt가 *자기완결적*이지 않으면 격리 세션이 가정 헛돌릴 수 있음. prompt 디자인 필수
- **출처**: 시니어 패턴 (바이브마피아 최수민 — 의도 파악만 메인, 구현 위임)

---

## 2. 압축 평가 기준 subagent (유사 RAG)

- **상황**: 9 기획 문서 + 코드 컨벤션 누적되어 task별 *관련만 골라내기* 부담 ↑
- **요소**: 메인이 task 시작 전 *압축 평가 subagent* 호출. 그 task와 관련된 기획 문서/코드 영역만 추출해 메인에 전달
- **방법**:
  1. Task tool로 *"이 task 주제에 관련된 기획/코드 영역 추출"* 요청
  2. subagent가 9 기획 문서 정독 → 관련 부분만 발췌
  3. 메인이 발췌만 받아 작업 — 9 문서 전체 메인 컨텍스트 X
- **얻는 것**: 큰 프로젝트에서도 메인 컨텍스트 가벼움. RAG 효과
- **주의**: subagent가 *놓친 부분* 위험. 발췌 누락 시 메인이 잘못된 가정. fallback으로 메인이 직접 살펴보는 옵션 유지
- **출처**: 시니어 패턴 (서브에이전트 = 평가 기준 / 핵심 파일 추출 / 압축)

---

## 3. Python orchestrator + `claude -p` 헤드리스

- **상황**: task당 phase 100개 단위 풀 자동화 시나리오. v0.2의 4 중단점 대화 흐름이 부담스러워질 때
- **요소**: Python 스크립트가 phase별 `claude -p` subprocess 호출. JSON 인덱스로 재시작/복구
- **방법**:
  1. `bin/orchestrator.py` 작성. phase 인덱스 JSON 관리
  2. 각 phase = `subprocess.run(["claude", "-p", prompt])` 호출
  3. 실패 phase 재시도, 성공 phase 인덱스 저장
- **얻는 것**: 자동화 극대화. 사용자 간섭 0
- **주의**: **v0.2 정신과 충돌** — 4 중단점 대화가 *지크 use case의 핵심*. 풀 자동화는 5사이클 함정 재발 위험. 진짜 phase 100+ 시나리오 *발생할 때만* 검토
- **출처**: 시니어 패턴 (subprocess + claude -p)

---

## 4. minimal form hook

- **상황**: 태스크 문서 형식 위반(헤더 누락 / 섹션 빠짐)이 *진짜 프로젝트에서* 짜증 패턴으로 5회 이상 누적
- **요소**: PreToolUse(Write|Edit) hook으로 task.md 헤더 5컬럼 + 6 섹션 존재만 검증. 통과 못 하면 차단
- **방법**:
  1. `.claude/hooks/form-check.sh` 작성 (40~50행 이내)
  2. tasks/*/*.md 변경 시 헤더 표 + 6 섹션 헤딩 grep
  3. 둘 중 하나라도 누락 → exit 2 + 메시지
- **얻는 것**: 형식 일관성 회복
- **주의**: **5사이클 함정 재발 주의** — 25행 화이트리스트 검증이 합리적 변형 차단해 망함. *섹션 존재* 검사만, *내용 검증 X*. 진짜 짜증 누적 후 도입
- **출처**: 5사이클 회고 (form 강제 hook 폐기 후 instruction 1차 — bottoms-up 보강용)

---

## 5. `/plan-roadmap` 슬래시

- **상황**: 큰 묶음 작업(예: 인증 시스템 전체) 빈발 + plans/*/ROADMAP.md 수동 관리 부담
- **요소**: 9번째 슬래시. plan 단위 task 묶음 자동 생성 + ROADMAP.md 갱신
- **방법**:
  1. `template/.claude/skills/plan-roadmap.md` 작성
  2. 인자 = plan 버전. plan 하위 task 후보 추출 → ROADMAP.md 체크리스트 갱신
  3. 사용자 confirm 후 task.md 일괄 생성 (선택 적용)
- **얻는 것**: 묶음 작업 자동화. ROADMAP 자동 동기화
- **주의**: 자동 생성된 task가 *waterfall phase 미리 박기* 함정 재발 위험. 단일 task만 생성, phase 미리 X
- **출처**: bottoms-up + 5사이클 (project-prologue → roadmap 흐름의 잔여)

---

## 6. Claude Code plugin 발행

- **상황**: `/plugin` 지원 환경 사용자(동료) 편의 ↑ 요구
- **요소**: Claude Code plugin marketplace에 taskery 발행. 사용자가 `/plugin install` 한 번으로 도입
- **방법**:
  1. plugin manifest 작성 (`.claude-plugin/`)
  2. 발행 절차 따라 marketplace 등록
  3. npm publish와 *이중* 운영 (npx 경로도 유지 — 환경별 선호 다름)
- **얻는 것**: 진입 장벽 ↓ (한 명령). plugin 자체 갱신 메커니즘 활용
- **주의**: **이중 유지비**. plugin 갱신 + npm 갱신 동기화 부담. plugin 미지원 환경(VSCode extension 등) 사용자도 보호하려면 npx 경로 유지 필수
- **출처**: bottoms-up

---

## 7. 자동 PR 리뷰 (CodeRabbit + 자동 반영)

- **상황**: PR 리뷰 부담 ↑ + *다른 시각* 필요 (지크 단독 시야 한계)
- **요소**: GitHub Actions로 PR 생성 시 CodeRabbit 자동 호출 → 리뷰 코멘트 → 메인 세션이 자동 반영
- **방법**:
  1. `.github/workflows/coderabbit.yml` 추가
  2. CodeRabbit token 설정
  3. `/task-close` 끝에 PR 자동 생성 옵션 추가
  4. 메인 세션이 PR 코멘트 받아 자동 fix commit
- **얻는 것**: 리뷰 자동화. 다른 시각 자동 흡수
- **주의**: **PR 자동 머지는 v0.2 정신과 충돌**. 리뷰만 자동, 머지 결정은 지크. 자동 fix도 사용자 confirm 한 단계 필수
- **출처**: 시니어 패턴

---

## 8. 우선순위 컬럼 부활

- **상황**: task 누적 30+ 단위로 *우선순위 정렬* 필요. backlog 관리 부담
- **요소**: task 헤더 표에 6번째 컬럼 *우선순위* (high/medium/low) 추가
- **방법**:
  1. `template/.project/rules/TASK_DOC_RULE.md` 헤더 spec 6컬럼으로 갱신
  2. `/task-init` 슬래시 instruction에 우선순위 질문 추가
  3. backlog 정렬 슬래시 (선택) `/task-list` 추가 검토
- **얻는 것**: backlog 관리 가능
- **주의**: 단독 task 흐름에서는 의미 약함. 30+ backlog 누적 후 도입. 미리 박으면 task마다 빈 컬럼 짜증
- **출처**: 헤더 5컬럼 결정 시 보류 항목

---

## 9. 머지 로직 엣지 케이스 보강

- **상황**: `npx taskery update` 시 사용자 customize 충돌 빈발 — 자동 머지가 의도한 customize 깨뜨리는 케이스
- **요소**: `bin/update.js` 머지 로직에 엣지 케이스 처리 추가
- **방법**:
  1. FRICTION_LOG에서 머지 충돌 케이스 수집
  2. 패턴별 처리 분기 추가:
     - 사용자 customize 부분만 보존 + 코어 부분만 갱신 (3-way merge)
     - `*.local.md` 분리 권장 메시지
     - rebase 모드 (사용자 변경 위에 코어 변경 얹기)
  3. fallback = 항상 *.bak 백업 + 사용자 confirm
- **얻는 것**: 동료 사용자 마찰 ↓
- **주의**: 3-way merge 복잡도 ↑. 진짜 충돌 패턴 데이터 5건 이상 모인 후 도입. 데이터 없이 추가하면 over-engineering
- **출처**: bottoms-up

---

## 부활 트리거 메커니즘

1. 평소 짜증 → `.project/FRICTION_LOG.md`에 한 줄 기록 (메인이)
2. `/refine` 호출 (5 task마다 또는 사용자 호출)
3. `/refine`이 FRICTION_LOG 정독 → 패턴 감지 → 이 PLAYBOOK 항목 매칭 검토
4. 매칭되는 항목 발견 시 메인이 *"이 패턴 N번 반복됨. PLAYBOOK §X 항목 부활 검토 어때?"* 보고
5. 지크 OK 시 해당 항목 **방법** 따라 도입

**핵심: 미리 박지 X. 진짜 데이터 모이면 그때.**
