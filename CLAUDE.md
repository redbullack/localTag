# Project Overview

**localTag** — Electron + Next.js 기반 데스크탑 파일 정리 앱.
단일 루트 폴더(Vault)에 파일을 모으고 계층형 태그로 관리한다.
모든 답변과 작업 설명은 **한국어**로 작성한다.

## Tech Stack & Commands

| 구분 | 기술 |
|---|---|
| Renderer | Next.js 16, React 19, TailwindCSS 4 |
| Main Process | Electron 40, TypeScript |
| DB | better-sqlite3 (embedded SQLite) |
| 빌드 | tsup (main), next build (renderer) |

```bash
npm run dev              # Next.js + Electron 동시 실행
npm run dev:next         # renderer only (port 3123)
npm run dev:electron     # main only
npm run build            # 전체 프로덕션 빌드
npx tsc --noEmit         # 타입 체크
```

## Architecture

```
localTag/
├── main/                  # Electron Main Process (Node.js)
│   ├── main.ts            # 앱 진입점, BrowserWindow 생성
│   ├── preload.ts         # Context Bridge (IPC 노출)
│   ├── ipc/               # IPC 핸들러 (file-handler.ts, tag-handler.ts)
│   └── lib/               # DB/저장소 레이어 (file-repository.ts, tag-repository.ts, db.ts, store.ts)
├── renderer/              # Next.js Renderer Process
│   ├── app/
│   │   ├── page.tsx       # 루트 페이지, 전역 상태 관리
│   │   ├── layout.tsx     # 전역 레이아웃 (ToastProvider 포함)
│   │   ├── types.ts       # 공유 타입 정의
│   │   ├── components/    # UI 컴포넌트 (kebab-case 폴더)
│   │   │   ├── file-list/
│   │   │   ├── tag-sidebar/
│   │   │   ├── tag-form-modal/
│   │   │   ├── file-tag-editor/
│   │   │   └── shared/    # Toast, ConfirmDialog, TagSearchDropdown, TagBadge
│   │   └── utils/         # 유틸 함수 및 커스텀 훅
│   └── global.d.ts        # window.electronAPI 타입 선언
├── CLAUDE.md              # Claude Code 전용 가이드 (이 파일)
├── AGENTS.md              # Codex/OpenAI Agents 가이드 (수정 금지)
└── .agents/               # 레거시 워크플로우 백업 (수정 금지)
```

**IPC 채널 네이밍:** `도메인:동사` 형식 (예: `file:add`, `tag:create`, `file:get-all`)

**DB 스키마 (SQLite):**
- `files` — id, name, path, description, created_at
- `tags` — id, name, color, description, parent_id
- `file_tags` — file_id, tag_id (N:M 매핑)

## Code Style Rules

### 기본 원칙
- **가독성 우선** — 짧고 복잡한 코드보다 읽기 쉬운 코드를 선택한다.
- **단일 책임(SRP)** — 함수/클래스/컴포넌트는 하나의 역할만 가진다.
- **불변성** — 상태 변경을 최소화하고 불변 데이터 흐름을 선호한다.

### 네이밍
- 파일·디렉터리: `kebab-case`
- 클래스·인터페이스: `PascalCase`
- 변수·함수: `camelCase`
- 상수: `UPPER_SNAKE_CASE`
- `data`, `info`, `temp` 같은 모호한 이름 금지 — 역할이 드러나는 이름 사용

### 코드 구조
- **Early Return** — 예외 상황은 함수 도입부에서 즉시 return 처리
- **파일 분리** — 파일이 과도하게 커지면 기능/책임 기준으로 분리
- **컴포넌트 재사용** — 새 UI 작성 전 `components/` 폴더에 동일 컴포넌트 존재 여부 확인
- **유틸 재사용** — `utils/`에 정의된 함수를 개별 컴포넌트 내부에 중복 정의 금지
- **커스텀 훅 추출** — 2곳 이상에서 반복되는 `useEffect` 패턴은 `utils/use-*.ts`로 추출

### IPC 안전성
- Renderer → Main 통신은 반드시 Context Bridge를 통해서만 노출
- Modal 같은 UI 컴포넌트에 DB 저장·파일 처리 로직을 직접 작성 금지

### 테마
- 새 UI 추가 시 Light/Dark/System 세 가지 모드 CSS 변수 동시 작성

## Active Workflows

Claude Code 서브에이전트 (`.claude/agents/`):

| 에이전트 | 호출 시점 |
|---|---|
| `blueprint` | 신규 기능 설계, 아키텍처 변경, IPC/SQLite 경계 정리 |
| `doc-writer` | 컴포넌트 JSDoc, IPC 주석, README Changelog 업데이트 |
| `bug-fixer` | Next.js 렌더러, Electron, SQLite, 레이아웃 버그 수정 |
| `reflector` | 기능 작업 후 코드 리뷰, IPC 안전성·쿼리 최적화 점검 |
| `ui-polish` | 고밀도 레이아웃, 테마, 재사용 컴포넌트, 레이아웃 안정성 |

슬래시 커맨드: `/blueprint`, `/doc`, `/fix`, `/refactor`, `/ui-polish`

## Important Rules

1. **브랜치 정책** — `main`/`main-dev`에 직접 푸시 금지. 항상 작업 브랜치(`feature/`, `fix/`, `chore/`) 생성 후 PR
2. **README Changelog** — 의미 있는 변경 발생 시 `README.md`의 `## 진행 및 수정 사항` 섹션 갱신 후 커밋
3. **Vault 규칙** — 파일명 충돌 시 UUID 강제 변경 금지, 사용자에게 이름 수정 흐름 제공
4. **SQLite 저장 금지 항목** — 실제 파일 내용은 DB에 저장하지 않음. 경로·태그 메타데이터·N:M 매핑만 저장
5. **기존 구조 수정 금지** — `.agents/`, `skills/`, `AGENTS.md`는 레거시 참조용으로 수정·삭제 금지
