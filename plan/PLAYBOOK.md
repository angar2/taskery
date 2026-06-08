# PLAYBOOK — 미래 옵션 카탈로그

> 진짜 데이터 / 짜증 / 시점에 따라 부활시킬 *미래 옵션* 인덱스.
> **선제적 작성 금지. 진짜 필요해질 때 찾아 추가.**

---

## 사용 방법

- 평소 불편/한계는 `.project/FRICTION_LOG.md`에 기록 (`/log-friction` 스킬이 한 행씩 추가)
- 사용자가 직접 FRICTION_LOG.md를 정독해 누적 패턴 검토
- 검토 결과 본 카탈로그에서 부활 후보 항목 발견 시 사용자가 부활 결정
- 부활 항목의 **방법** 따라 도입

각 항목 형식:

```markdown
## <주제>
- **상황**: <언제 이게 필요해질지>
- **요소**: <무엇을 추가할지>
- **방법**: <어떻게 도입할지>
- **얻는 것**: <효용>
- **주의**: <함정/조건>
- **출처**: <시니어 패턴 / bottoms-up / 등>
```

---

## 1. 컨텍스트 격리 강화 (Task tool default 확장)

- **상황**: 30+ task 누적되어 메인 세션 컨텍스트 폭발 직전. `/task-plan`, `/task-dev` 같은 스킬도 격리 필요해짐
- **요소**: `/task-test` 외 스킬도 default를 *Task tool 격리*로 옮김. 스킬별로 부담 큰 곳 지정
- **방법**:
  1. FRICTION_LOG에서 *어느 스킬이 컨텍스트 부담 큰지* 통계
  2. 후보 스킬(예: `/task-plan` 큰 코드베이스 탐색 시) instruction에 *"기본 Task tool 격리 호출"* 추가
  3. 격리 prompt에 task.md 경로 + 필요 컨텍스트만 명시 (자기완결적)
- **얻는 것**: 메인 세션 컨텍스트 절감. 30+ task 굴려도 압축 회피
- **주의**: 격리 prompt가 *자기완결적*이지 않으면 격리 세션이 가정 헛돌릴 수 있음. prompt 디자인 필수
- **출처**: 시니어 패턴 (의도 파악만 메인, 구현 위임)

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

- **상황**: task당 phase 100개 단위 풀 자동화 시나리오. 4 중단점 대화 흐름이 부담스러워질 때
- **요소**: Python 스크립트가 phase별 `claude -p` subprocess 호출. JSON 인덱스로 재시작/복구
- **방법**:
  1. `bin/orchestrator.py` 작성. phase 인덱스 JSON 관리
  2. 각 phase = `subprocess.run(["claude", "-p", prompt])` 호출
  3. 실패 phase 재시도, 성공 phase 인덱스 저장
- **얻는 것**: 자동화 극대화. 사용자 간섭 0
- **주의**: **현재 정신과 충돌** — 4 중단점 대화가 *주 use case의 핵심*. 풀 자동화는 강제 분담 함정 재발 위험. 진짜 phase 100+ 시나리오 *발생할 때만* 검토
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
- **주의**: **합리적 변형 차단 함정 주의** — 내용 검증 화이트리스트가 합리적 변형까지 차단해 망가지는 패턴이 있음. *섹션 존재* 검사만, *내용 검증 X*. 진짜 짜증 누적 후 도입
- **출처**: form 강제 hook 폐기 후 instruction 1차 — bottoms-up 보강용

---

## 5. `/plan-roadmap` 스킬

- **상황**: 큰 묶음 작업(예: 인증 시스템 전체) 빈발 + plans/*/ROADMAP.md 수동 관리 부담
- **요소**: 9번째 스킬. plan 단위 task 묶음 자동 생성 + ROADMAP.md 갱신
- **방법**:
  1. `template/.claude/skills/plan-roadmap/SKILL.md` 작성
  2. 인자 = plan 버전. plan 하위 task 후보 추출 → ROADMAP.md 체크리스트 갱신
  3. 사용자 confirm 후 task.md 일괄 생성 (선택 적용)
- **얻는 것**: 묶음 작업 자동화. ROADMAP 자동 동기화
- **주의**: 자동 생성된 task가 *waterfall phase 선제적 작성* 함정 재발 위험. 단일 task만 생성, phase 선제 작성 X
- **출처**: bottoms-up — project-prologue → roadmap 흐름의 잔여

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

- **상황**: PR 리뷰 부담 ↑ + *다른 시각* 필요 (단독 시야 한계)
- **요소**: GitHub Actions로 PR 생성 시 CodeRabbit 자동 호출 → 리뷰 코멘트 → 메인 세션이 자동 반영
- **방법**:
  1. `.github/workflows/coderabbit.yml` 추가
  2. CodeRabbit token 설정
  3. `/task-close` 끝에 PR 자동 생성 옵션 추가
  4. 메인 세션이 PR 코멘트 받아 자동 fix commit
- **얻는 것**: 리뷰 자동화. 다른 시각 자동 흡수
- **주의**: **PR 자동 머지는 현재 정신과 충돌**. 리뷰만 자동, 머지 결정은 사용자. 자동 fix도 사용자 confirm 한 단계 필수
- **출처**: 시니어 패턴

---

## 8. 우선순위 컬럼 부활

- **상황**: task 누적 30+ 단위로 *우선순위 정렬* 필요. backlog 관리 부담
- **요소**: task 헤더 표에 6번째 컬럼 *우선순위* (high/medium/low) 추가
- **방법**:
  1. `template/.project/rules/TASK_DOC_RULE.md` 헤더 spec 6컬럼으로 갱신
  2. `/task-init` 스킬 instruction에 우선순위 질문 추가
  3. backlog 정렬 스킬 (선택) `/task-list` 추가 검토
- **얻는 것**: backlog 관리 가능
- **주의**: 단독 task 흐름에서는 의미 약함. 30+ backlog 누적 후 도입. 선제적 도입 시 task마다 빈 컬럼 짜증
- **출처**: 헤더 5컬럼 결정 시 보류 항목

---

## 9. 머지 로직 엣지 케이스 보강

- **상황**: `npx @angar2/taskery update` 시 사용자 customize 충돌 빈발 — 자동 머지가 의도한 customize 깨뜨리는 케이스
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

## 10. task-plan Step 3 조건부 Explore 위임

- **상황**: 큰 코드베이스에서 task-plan 진행 시 Step 3 (Scope 코드 서치) 단계가 광범위 grep + read로 메인 컨텍스트 부담 발생. Claude Code 본체 가이드(*"3+ queries → Explore 서브에이전트"*)에 따라 *자율 판단*으로 Explore가 자동 호출되는 현상은 이미 발생 중이나 taskery 측 명시 부재로 메인 세션마다 *위임/직접* 결정이 흔들림. 일관성 부재 마찰 누적 시
- **요소**: task-plan SKILL.md Step 3 본문에 *위임 판정 휴리스틱* + *announce 룰* 추가. Step 3에 한정한 *조건부 권장* — 강제 X, 사용자 confirm X
- **방법**:
  1. Step 3 본문 상단에 *판정 표* 추가 — 영역 수 + 키워드 구체성 두 신호 조합:

     | 신호 | 방식 |
     |------|------|
     | Requirements에서 3+ 영역/모듈 언급 | Explore 서브에이전트 위임 |
     | 정확한 함수/파일 위치 불명 — 키워드만 | Explore 서브에이전트 위임 |
     | 단일 파일 / 명확한 함수 위치 명시 | 메인 직접 Grep/Read |
     | 작은 fix — 변경 위치 사전 확실 | 메인 직접 Grep/Read |

  2. 판정 후 *announce 한 줄* 룰 — *"광범위 탐색 판정 → Explore 위임 (근거: <영역 N개 / 키워드 모호>)"*. 사용자 confirm X. announce 근거만 공개
  3. 경계 케이스 default = 메인 직접 (안전쪽). 직접으로 시작했다 광범위 판명 시 그 자리에서 Explore 전환 허용
  4. SKILL.md Step 3:327 *디자인 산출 정독 sub-agent 금지* 룰 옆에 *범위 명시 한 줄 추가* — *"Step 3 코드 서치 영역의 sub-agent 위임은 별개 정책"* — 금지 범위 모호성 차단
- **얻는 것**: Step 3 컨텍스트 절감 일관 보장. 메인 자율 판단 흔들림 차단. 큰 코드베이스 task-plan 부담 ↓. 디자인 산출 금지 룰과 영역별 정책 대칭 확보
- **주의**:
  - *작은 task에 강제 위임*은 오히려 손해 — 휴리스틱이 *광범위 판정*에서만 위임으로 흐르도록 조정 필수
  - 휴리스틱 경계 케이스는 *메인 직접 default*로 안전쪽. 격리는 *명백히 광범위할 때만*
  - Claude Code 본체 가이드(*"3+ queries → Explore"*)와 정합 유지 — 충돌 시 본체 가이드 우선
  - 9 스킬 전체 정밀 검토 결과 격리 적합 후보는 *Step 3 하나*로 좁혀짐. §1 *전체 default 확장*은 사실상 *비어있는 방향*으로 드러남 — 본 항목이 §1보다 *더 정밀하고 즉시 검토 가능한 단계*
  - **부활 트리거 신호**: FRICTION_LOG에 *task-plan 컨텍스트 부담* 또는 *Step 3 일관성 깨짐* 패턴 누적 시. 지금 마찰 신호 X → 발견 사항 보존만, 부활 X
- **출처**: 본 대화 (2026-06-09) — Claude Code 본체가 Explore 자동 호출하는 현상 발견 + taskery 측 명시 부재 발견. 명시 가이드 확보 차원

---

## 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-05-08 | 신규 작성 — 9 미래 옵션 카탈로그 |
| 2026-05-09 | 표현 정제 — 인명 / 경박 표현 / 스킬 용어 / 이전 버전 비교 단락 정리 |
| 2026-05-09 | npm 패키지명 `@angar2/taskery`로 변경 반영 — §9 `npx taskery update` → `npx @angar2/taskery update`. |
| 2026-06-09 | §10 신규 추가 — *task-plan Step 3 조건부 Explore 위임*. 본 대화에서 Claude Code 본체의 Explore 자동 호출 현상 발견 + 9 스킬 전체 정밀 검토 결과 격리 적합 후보가 Step 3 하나로 좁혀짐을 근거로 등재. §1 *전체 default 확장*의 사실상 비어있는 방향 함의도 §10 주의에 명시. |
