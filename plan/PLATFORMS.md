# PLATFORMS

> taskery 멀티 에이전트 플랫폼(Claude Code / Codex CLI) 지원의 단일 진실 소스다.
> 플랫폼별 자산 매핑 + 메커니즘 대응 + 설치/추가/갱신 흐름을 정의한다. (0.2.0+)

---

## 1. 지원 플랫폼

| 플랫폼 | 진입점 | 스킬 위치 | Hook 등록 | 격리 검증 |
|--------|--------|----------|-----------|----------|
| Claude Code | `CLAUDE.md` (자동 로드) | `.claude/skills/` | `.claude/settings.json` | Task tool 인라인 spawn |
| Codex CLI | `AGENTS.md` (자동 로드) | `.agents/skills/` | `.codex/config.toml` | `.codex/agents/task-tester.toml` 서브에이전트 |

공통 자산(`.project/`, `.gitignore`)은 플랫폼 무관 — 항상 설치한다.

---

## 2. 공통 소스 + 플랫폼별 조립 설치 원칙

- **`npx ... init` 시 플랫폼 선택** (claude / codex / 둘 다). 고른 플랫폼 자산 + 공통만 설치한다.
- **양 플랫폼이 내용까지 동일한 자산(스킬 9종 · `git-guard.sh`)은 `template/shared/`에 단일 소스로 보관**한다. 설치 시점에 고른 플랫폼의 실제 경로로 매핑 복사(조립)한다 — 사본 중복을 template에 두지 않는다.
- **플랫폼 고유 자산**(`closed-immutable.sh`·hook 등록 파일·진입점·격리 검증 정의)은 메커니즘이 달라 공통화 불가 → 각 플랫폼 폴더(`.claude/` / `.codex/`)에 그대로 둔다.
- **설치 결과는 폴더가 갈려**(`.claude/` vs `.agents/`+`.codex/`) 충돌하지 않는다. 둘 다 선택해도 안전.
- 조립 = template 경로 → 설치 경로 **매핑 복사**뿐(내용 변환 없음). shared 본문은 양 플랫폼 무수정 동일(실측 diff 확인).
- **플랫폼 전용 스킬은 `shared/`가 아니라 해당 플랫폼 폴더에 직접 둔다** — agent teams 기반 `run-team`은 Codex에 대응 기능이 없어 공통화 불가하므로 `template/.claude/skills/run-team/`에 배치한다. `platformOf`가 `.claude/`를 claude 소속으로 분류 → Claude 선택 시에만 설치(Codex 미포함). 양 플랫폼 byte-identical 자산만 `shared/`에 둔다.

> **동일성 근거(실측 diff):** `shared/skills/*` 9종 = 양 플랫폼 byte-identical, `shared/hooks/git-guard.sh` = 양 플랫폼 byte-identical. `closed-immutable.sh`만 코덱스가 `apply_patch` 파싱이라 달라 공통화 제외.

---

## 3. 플랫폼별 자산 매핑

`bin/lib.js`의 `platformOf(relPath)`가 template 상대경로를 소속(`agnostic`/`shared`/`claude`/`codex`)으로 분류하고, `resolveInstallPlan(templateFiles, platforms)`이 설치 계획(`{templateRel, installRel, hash}`)으로 전개한다(단일 진실 소스). init/update/add가 공유한다.

| 소속 | template 경로 | 설치 경로 (installRel) |
|------|--------------|----------------------|
| agnostic | `.project/**`, `.gitignore` | 동일 (항상 설치) |
| shared | `shared/skills/**` | claude→`.claude/skills/**` / codex→`.agents/skills/**` |
| shared | `shared/hooks/git-guard.sh` | claude→`.claude/hooks/` / codex→`.codex/hooks/` |
| claude | `.claude/**`(settings.json·closed-immutable.sh·**Claude 전용 스킬 `run-team`**), `CLAUDE.md` | 동일 |
| codex | `.codex/**`(config.toml·closed-immutable.sh·task-tester.toml), `AGENTS.md` | 동일 |

`shared/`는 1:N 전개 — 선택 플랫폼마다 매핑 경로로 1건씩(`SHARED_DEST[platform]` 테이블). manifest는 **설치 경로(installRel)** 기준으로 기록 → update/add가 일관 비교. `add`는 `includeAgnostic:false`로 해당 플랫폼 고유 + shared 매핑만 추가한다.

---

## 4. 코덱스 ↔ 클로드 메커니즘 대응 (실측 기반)

| 영역 | Claude | Codex | 이식 |
|------|--------|-------|------|
| 스킬 인식 | `.claude/skills/` | `.agents/skills/` (frontmatter `name`/`description` 동일) | 본문 무수정 인식 |
| git 안전망 | `git-guard.sh` (PreToolUse Bash) | 동일 스크립트 (코덱스 stdin `tool_input.command` 동일) | 무변경 |
| 완료 보호 | `closed-immutable.sh` (`tool_input.file_path`) | 재작성판 (`apply_patch`의 `command`에서 `*** Update File:` 경로 파싱, matcher=`apply_patch`) | 코덱스 전용 스크립트 |
| 격리 검증 | Task tool로 인라인 sub-agent | `.codex/agents/task-tester.toml` 서브에이전트(`model` 명시 필수, `sandbox_mode=read-only`) | 코덱스 전용 정의 |
| 메모리 진입점 | `CLAUDE.md` | `AGENTS.md` (운영룰 자체 보유 + 코덱스 차이 명시) | 코덱스판 작성 |
| Hook 등록 | `settings.json` (JSON) | `config.toml` (TOML, `[[hooks.PreToolUse]]`, 경로 `$(git rev-parse --show-toplevel)` 기준) | 등록 방식 차이. 최초 `/hooks` trust 승인 |
| 자동 병렬 | agent teams + `run-team` 스킬 (Claude 전용, `.claude/skills/`) | 없음 (agent teams 미지원) | **이식 불가** — `AGENTS.md` 가드로 미지원 안내, 단일 태스크 흐름 권유 |

> 코덱스 hook은 trust 모델 — 설치 후 최초 1회 `/hooks`로 hook 정의를 승인해야 자동 작동한다(승인 전 skip).

---

## 5. 설치 / 추가 / 갱신 흐름

| 명령 | 동작 |
|------|------|
| `npx @angar2/taskery init` | 플랫폼 선택 → 선택 + 공통 자산 설치 + `manifest.platforms` 기록 |
| `npx @angar2/taskery add <platform>` | manifest 읽고 해당 플랫폼 전용 자산만 추가 + `platforms` push (멱등 — 이미 있으면 변경 없음) |
| `npx @angar2/taskery update` | `manifest.platforms` 보고 설치된 플랫폼 자산만 머지 갱신. `platforms` 누락(0.1.x) 시 `["claude"]` 마이그레이션 |

---

## 6. manifest `platforms`

```jsonc
{
  "version": "0.2.0",
  "platforms": ["claude"],   // init 선택, add로 push. 0.1.x 누락 시 update가 ["claude"] 주입
  "files": { ... }           // 설치된 플랫폼 + 공통 자산만 기록
}
```

---

## 7. 동작 검증 (실측 — codex-cli 0.142, 실제 실행)

| 항목 | 결과 |
|------|------|
| 프로젝트 레벨 `.codex/config.toml` hook (글로벌 hook 0개) | main·dev 직접 커밋 차단 ✓ |
| `closed-immutable` 재작성판 (apply_patch) | closed task.md 편집 차단 / 신규·비-task 통과 ✓ |
| `.codex/agents/task-tester.toml` 서브에이전트 | spawn 격리 실행 + 독립 verdict ✓ |
| `AGENTS.md` 리포 자동 로드 | 자동 정독 + `CLAUDE.md` 위임 체인 ✓ |
| claude+codex 공존 | 코덱스 `.agents/skills/` 로드, `.claude/` 무시 (충돌 0) ✓ |
| 스킬 9종 코덱스 인식 | 전 종 인식 ✓ |
| bin: init 플랫폼별 설치 / add / update 마이그레이션 | smoke 통과 ✓ |
| 조립 매핑 (shared→플랫폼 경로 1:N) | dry-run 정합 + init(codex)→add(claude)→update 스모크 통과 ✓ |
| shared 단일 소스 동일성 | `skills/*` 9종·`git-guard.sh` byte-identical (diff 0) ✓ |

---

## 수정 이력

| 날짜 | 변경 사항 |
|------|----------|
| 2026-06-22 | 신규 작성 — 멀티 플랫폼(Claude/Codex) 선택형 독립 설치 설계 + 메커니즘 대응 + 자산 매핑 + 동작 검증 (0.2.0) |
| 2026-06-22 | 구조 개편 — 동일 자산(스킬 9·git-guard) `template/shared/` 단일 소스화 + 설치 시 플랫폼 경로 조립(`resolveInstallPlan`). 사본 중복 제거, manifest installRel 기준 전환 |
| 2026-06-28 | `run-team` (agent teams 자동 병렬, Claude 전용) 추가 — §2 *플랫폼 전용 스킬은 해당 플랫폼 폴더 직접 배치* 원칙 + §3 매핑표 claude 행 주석 + §4 메커니즘 대응표 *자동 병렬* 행(Codex 미지원, AGENTS.md 가드). agent teams가 Codex에 없어 공통화 불가 → `.claude/skills/run-team/` 배치. PLAYBOOK §15 본구현. |
