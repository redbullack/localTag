# localTag 프로젝트

Electron과 Next.js 기반의 데스크탑 애플리케이션 프로젝트입니다.

## 📌 개발 목적
- 파일이 특정 폴더 하나에만 종속되어 탐색하기 어려운 문제를 해결하고자 고안되었습니다.
- 단일 루트 폴더(Vault 형식) 안에 모든 파일을 모아 관리하되, 각 파일에 **여러 태그**를 부여하고 관리함으로써 사용자가 키워드(태그) 기반으로 원하는 파일을 한눈에 파악하고 쉽게 탐색하도록 돕습니다.

## 📌 주요 특징 및 기능
- **단일 폴더 아키텍처 (Vault)**: 모든 파일은 사용자가 처음 지정한 `MyTaggedFiles/` 루트 폴더 내에 저장됩니다. (추후 드라이브 위치 변경 가능)
- **로컬 데이터베이스 (SQLite)**: 서버 없이 사용자의 로컬 환경에서 SQLite를 사용하여 파일 및 태그 데이터를 빠르고 안전하게 관리합니다. (`files`, `tags`, `file_tags` 관계 테이블 기반)
- **다중 및 계층형 태그 시스템**: 하나의 파일이 여러 태그를 가질 수 있으며, 태그는 계층 구조(메인 태그, 하위 태그)를 가질 수 있습니다.
- **주요 기능 요약**:
  - 📂 **파일 관리**: 목록 조회, 열기, 이름 변경, 설명 수정, 태그 수정
  - 🏷️ **태그 관리**: 메인/하위 태그 생성 및 목록 조회, 색상/이름/설명 수정
  - 📁 **Vault 관리**: 파일 드래그 앤 드롭 추가, `MyTaggedFiles` 폴더 용량 및 파일 개수 확인, 파일 삭제
- **사용자 경험 고려**: 파일을 `MyTaggedFiles`로 가져올 때 중복된 파일명 감지 시 경고창을 띄워 직관적인 파일 관리를 유도합니다. (난해한 고유값(UUID) 이름 변경 최소화)

<img width="1444" height="847" alt="스크린샷 2026-03-24 200756" src="https://github.com/user-attachments/assets/ad9de23f-5287-42e7-949c-fbca2e79a452" />

---
## 진행 및 수정 사항 (Changelog)

* **2026-03-27** (2)
  * **작업 내용**: 자동 수집 설정 모달 개선. (1) 감시 폴더 목록을 최대 10개로 제한 — 10개 도달 시 추가 버튼 비활성화 및 error toast 안내. (2) 폴더 추가 버튼에 현재/최대 개수(n/10) 표시. (3) 설정 저장 성공 시 success toast 메시지 표시.
  * **변경된 핵심 파일**: `renderer/app/components/auto-collect-settings/auto-collect-settings.tsx`

* **2026-03-27**
  * **작업 내용**: 태그 사이드바 헤더 버튼 툴팁 시스템 통일. "모두 접기/펼치기", "정렬", "새 태그 만들기" 3개 버튼의 브라우저 네이티브 `title` 속성을 CSS 커스텀 `data-tooltip`으로 교체하여 앱 전체 툴팁 스타일과 통일(즉시 표시, 딜레이 없음).
  * **변경된 핵심 파일**: `renderer/app/components/tag-sidebar/tag-sidebar.tsx`

* **2026-03-26** (3)
  * **작업 내용**: 앱 버전 표시 및 기본 메뉴바 제거. (1) `next.config.mjs`에서 `package.json`의 버전을 읽어 `NEXT_PUBLIC_APP_VERSION` 환경변수로 주입. (2) 헤더 우측에 `v{버전}` 텍스트를 소형 뮤트 스타일로 표시. (3) Electron 기본 애플리케이션 메뉴바를 `Menu.setApplicationMenu(null)`로 제거. (4) `update-banner.css`에서 메시지 텍스트의 ellipsis(말줄임) 처리를 제거하여 긴 업데이트 메시지가 잘리지 않도록 개선.
  * **변경된 핵심 파일**: `main/main.ts`, `renderer/next.config.mjs`, `renderer/app/page.tsx`, `renderer/app/globals.css`, `renderer/app/components/shared/update-banner.css`

* **2026-03-26** (2)
  * **작업 내용**: 툴팁 시스템 통일 및 UX 개선. 헤더 영역 버튼들(`AutoStartToggle`, 다운로드 수집 설정 버튼)에서 브라우저 네이티브 `title` 속성을 CSS 커스텀 `data-tooltip`으로 교체하여 앱 전체 툴팁 스타일 통일. `ThemeToggle` 버튼에도 `data-tooltip` 속성 추가. 툴팁 CSS 트랜지션을 간소화(`cubic-bezier` → `ease`, 0.2s → 0.1s)하고, `:focus` → `:focus-visible`로 변경하여 마우스 클릭 시 불필요한 툴팁 노출 방지.
  * **변경된 핵심 파일**: `renderer/app/components/shared/auto-start-toggle.tsx`, `renderer/app/components/shared/theme-toggle.tsx`, `renderer/app/globals.css`, `renderer/app/page.tsx`

* **2026-03-26**
  * **작업 내용**: 다운로드 자동 수집 기능 추가. 지정한 감시 폴더(예: 다운로드 폴더)에 새 파일이 추가되면 Vault로 자동 이동하고 기본 태그를 부여하는 기능. (1) **Main 프로세스**: `download-watcher.ts` 싱글톤 클래스 신규 생성 — `fs.watch` 이벤트 감시 + 60초 폴링 fallback 병행, 파일 크기 안정성 검사(최대 10회) 및 잠금 해제 확인 후 수집, 브라우저 임시 파일(.crdownload, .part 등) 자동 필터링. `collect-handler.ts` 신규 생성 — `collect:get-settings`, `collect:update-settings`, `collect:toggle`, `collect:select-watch-folder`, `collect:get-status` IPC 채널 5개 및 `collect:file-collected` Main→Renderer 이벤트 1개 구현. (2) **설정 영속화**: `store.ts`에 `AutoCollectSettings` 타입 및 `getAutoCollectSettings`/`setAutoCollectSettings` 함수 추가, electron-store 기반 설정 저장. (3) **Renderer**: `AutoCollectSettingsModal` 컴포넌트 신규 생성 — 토글 ON/OFF, 감시 폴더 추가/제거, 기본 태그 선택 UI. 헤더에 다운로드 아이콘 버튼 추가(활성 시 초록 점 표시). 수집 완료/실패 시 Toast 알림. (4) **기타**: 개발 포트 3123→3456 변경, `next.config.mjs`에 turbopack root 설정 추가.
  * **변경된 핵심 파일**: `main/lib/download-watcher.ts`(신규), `main/ipc/collect-handler.ts`(신규), `main/lib/store.ts`, `main/main.ts`, `main/preload.ts`, `main/lib/file-repository.ts`, `renderer/app/components/auto-collect-settings/auto-collect-settings.tsx`(신규), `renderer/app/components/auto-collect-settings/auto-collect-settings.css`(신규), `renderer/app/page.tsx`, `renderer/global.d.ts`, `package.json`, `renderer/next.config.mjs`, `CLAUDE.md`

* **2026-03-25** (3)
  * **작업 내용**: v1.1.1 버그픽스 릴리스. `latest.yml`에 명시된 파일명(`LocalTag-Setup-1.1.0.exe`)과 실제 GitHub 릴리스에 업로드된 파일명(`LocalTag.Setup.1.1.0.exe`)이 달라 `electron-updater`가 다운로드 실패하는 문제 수정. `package.json`의 `nsis` 설정에 `artifactName` 필드를 명시(`LocalTag-Setup-${version}.exe`)하여 빌드 시 파일명이 항상 일치하도록 고정. 버전 `1.1.0` → `1.1.1` bump.
  * **변경된 핵심 파일**: `package.json`

* **2026-03-25** (2)
  * **작업 내용**: Public 레포 전환 준비 및 v1.1.0 버전 태깅. (1) **`.gitignore` 보완**: Public 레포 전환 시 민감 정보 유출 방지를 위해 `.env` 파일을 `.gitignore`에 추가. (2) **버전 업**: `package.json`의 앱 버전을 `1.0.0` → `1.1.0`으로 갱신.
  * **변경된 핵심 파일**: `.gitignore`, `package.json`

* **2026-03-25**
  * **작업 내용**: 배포 준비(Git 정리 + GitHub Releases 설정) 및 자동 업데이트 기능 구현. (1) **Git 정리**: `tsc.log`, `tsconfig.tsbuildinfo`, `package-lock.json`을 Git 추적에서 해제하고 `.gitignore`에 `*.log`, `tsconfig.tsbuildinfo`, `.vscode` 항목 추가. (2) **GitHub Releases 배포 설정**: `package.json`의 `build` 섹션에 `publish` 설정(provider: github) 추가. (3) **자동 업데이트**: `electron-updater` 패키지 도입. Main 프로세스에 `update-handler.ts`를 신규 생성하여 GitHub Releases 기반 업데이트 감지·다운로드·설치 IPC 채널 4개(`update:check`, `update:download`, `update:install`, `update:get-version`) 및 Main→Renderer 이벤트 4개(`update:available`, `update:download-progress`, `update:downloaded`, `update:error`) 구현. Renderer에 `useAutoUpdate` 커스텀 훅과 `UpdateBanner` 배너 컴포넌트를 추가하여 앱 시작 시 자동 감지 → 사용자 알림 → 다운로드 → 설치 흐름 완성. (4) **앱 아이콘 추가**: `build/` 폴더에 `icon.ico`, `icon.png` 파일 추가하여 인스톨러 및 앱 아이콘 적용. (5) **Next.js 상대 경로 설정**: `next.config.mjs`에 상대 경로 설정 추가하여 빌드된 Renderer가 Electron 환경에서 정상 로드되도록 개선. (6) **자동 업데이트 에러 메시지 개선**: `useAutoUpdate` 훅의 에러 핸들링을 수정하여 에러 메시지 내용이 UpdateBanner에 정확히 출력되도록 로직 보완 및 배너 CSS 스타일 개선.
  * **변경된 핵심 파일**: `.gitignore`, `package.json`, `tsup.config.ts`, `main/ipc/update-handler.ts`(신규), `main/main.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/utils/use-auto-update.ts`(신규), `renderer/app/components/shared/update-banner.tsx`(신규), `renderer/app/components/shared/update-banner.css`(신규), `renderer/app/page.tsx`, `build/icon.ico`(신규), `build/icon.png`(신규), `renderer/next.config.mjs`

* **2026-03-24**
  * **작업 내용**: 인스톨러 바탕화면 바로가기 옵션 및 앱 내 PC 부팅 자동 시작 토글 기능 추가. NSIS 설치 마법사에서 바탕화면 바로가기 생성 여부를 선택할 수 있으며, 헤더 우측 슬라이드 토글로 자동 시작을 켜고 끌 수 있음. electron-store 기반 설정 영속화 및 `app.setLoginItemSettings()` 연동.
  * **변경된 핵심 파일**: `package.json`, `main/lib/store.ts`, `main/ipc/config-handler.ts`, `main/main.ts`, `renderer/global.d.ts`, `renderer/app/components/shared/auto-start-toggle.tsx`, `renderer/app/components/shared/auto-start-toggle.css`, `renderer/app/page.tsx`, `renderer/app/globals.css`

* **2026-03-24**
  * **작업 내용**: 태그 및 파일 목록의 hover 액션 버튼을 완전히 제거하고, 우클릭 컨텍스트 메뉴(아이콘+제목 표시)로 대체. TagSidebar(즐겨찾기/하위태그생성/수정/삭제)와 FileList(열기/탐색기/태그수정/이름변경/이동/복사/삭제) 각각 우클릭 메뉴 적용. 공유 ContextMenu 컴포넌트 신규 추가. FileList의 actions 전용 컬럼(90px)도 제거하여 파일 정보 표시 공간 확보.
  * **변경된 핵심 파일**: `renderer/app/components/shared/context-menu.tsx`(신규), `renderer/app/components/shared/context-menu.css`(신규), `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.css`, `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/file-list/file-list.css`

* **2026-03-23**
  * **작업 내용**: 태그 즐겨찾기 기능 추가. Steam 라이브러리 스타일로, 태그 위에 커서를 올리면 나타나는 별(★) 아이콘 버튼으로 즐겨찾기를 토글할 수 있음. 즐겨찾기된 태그는 사이드바 상단 "즐겨찾기" 섹션에 별도로 표시되며, 클릭 시 기존과 동일하게 파일 필터로 동작함. 즐겨찾기 상태는 SQLite `tags.is_favorite` 컬럼에 영속 저장됨. 기존 `tag:update` IPC 채널에 `isFavorite` 파라미터를 추가하는 방식으로 구현하여 변경 범위 최소화.
  * **변경된 핵심 파일**: `main/lib/db.ts`, `main/lib/tag-repository.ts`, `main/ipc/tag-handler.ts`, `main/preload.ts`, `renderer/app/types.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.css`

* **2026-03-23**
  * **작업 내용**: Vault 폴더 이동 시 앱이 "(응답 없음)" 상태가 되는 현상 수정. 원인은 `vault-handler.ts`의 파일 복사/삭제가 모두 동기 API(`fs.copyFileSync`, `fs.unlinkSync`)로 처리되어 메인 프로세스 이벤트 루프를 블로킹한 것. 모든 파일 I/O를 `fs.promises.*` 비동기 API로 전환하고, `BrowserWindow.getFocusedWindow()`에 `getAllWindows()` fallback을 추가하여 포커스 이탈 시에도 진행률이 정상 전송되도록 개선. 또한 Vault 이동 중 자체 진행률 UI 대신 전체 화면 `LoadingOverlay`를 사용하여 모든 UI 조작을 차단하도록 변경.
  * **변경된 핵심 파일**: `main/ipc/vault-handler.ts`, `renderer/app/components/vault-info/vault-info.tsx`, `renderer/app/components/shared/loading-overlay.tsx`, `renderer/app/utils/use-delayed-loading.ts`, `renderer/app/page.tsx`

* **2026-03-23**
  * **작업 내용**: 태그 컬럼 더블클릭 자동 맞춤 시 최대 너비 상한 적용. 기존에는 태그가 많은 행이 있을 때 더블클릭 auto-fit으로 태그 컬럼이 과도하게 넓어지는 문제가 있었음. 테이블 컨테이너 너비의 40%를 상한으로 설정하여 자동 맞춤이 일정 수준 이상 커지지 않도록 개선. 드래그 수동 리사이즈 동작에는 영향 없음.
  * **변경된 핵심 파일**: `renderer/app/components/file-list/file-list.tsx`

* **2026-03-23**
  * **작업 내용**: 파일 목록 컬럼 리사이징 기능을 Windows 파일 탐색기 방식으로 전면 개선. 기존에는 name↔tags, tags↔size 컬럼이 시소처럼 연동되고 전체 테이블 너비가 고정되어 있어 독립 조작이 불가능했음. 각 컬럼(name/tags/size)이 독립적으로 리사이즈되고, 컬럼 확장 시 전체 테이블 너비가 커지며 횡 스크롤이 발생하도록 구조 변경. size 컬럼에 리사이저 추가, sticky 헤더 적용, 더블 클릭 auto-fit을 컬럼별 독립 동작으로 개선. 또한 size 컬럼 더블 클릭 시 `scrollWidth`(컬럼 너비)를 반환하여 매번 증가하던 버그를 Range API를 사용한 실제 텍스트 너비 측정으로 수정.
  * **변경된 핵심 파일**: `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/file-list/file-list.css`

* **2026-03-23**
  * **작업 내용**: 파일 목록 컬럼 헤더 구분선(리사이저) 색상 가시성 개선. 기존 `--border-subtle` 변수로 인해 라이트/다크 테마 모두에서 잘 보이지 않던 문제를 `--border-strong` 변수로 교체하여 더 명확하게 표시되도록 수정. 호버 및 드래그 중 강조 색상(`--accent-primary`)은 기존과 동일하게 유지.
  * **변경된 핵심 파일**: `renderer/app/components/file-list/file-list.css`

* **2026-03-21**
  * **작업 내용**: 파일 이동/복사 시 로딩 오버레이가 표시되지 않는 버그 수정. 기존에는 `showLoading()` 호출 후 IPC 내부에서 OS 폴더 선택 다이얼로그가 열려, 500ms 지연 타이머가 다이얼로그 뒤에서 소진되고 실제 파일 작업 시 로딩이 표시되지 않는 문제가 있었음. `file:select-folder` IPC를 신설하여 다이얼로그와 파일 작업을 2단계로 분리 — 폴더 선택 완료 후에 `showLoading()`을 호출하는 방식으로 파일 추가와 동일한 패턴으로 통일.
  * **변경된 핵심 파일**: `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`

* **2026-03-21**
  * **작업 내용**: 파일 추가 중 `window.focus` 이벤트로 동기화가 트리거될 때 발생하는 레이스 컨디션으로 원본 파일이 삭제되는 치명적 데이터 손실 버그 수정. 크로스 디바이스 복사(EXDEV) 시 원본 삭제 시점을 DB INSERT 이후로 변경하고, 비동기 뮤텍스(`file-operation-lock.ts`)로 파일 작업 간 상호 배제를 보장함.
  * **변경된 핵심 파일**: `main/lib/file-operation-lock.ts`(신규), `main/lib/file-repository.ts`, `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`

* **2026-03-19**
  * **작업 내용**: 파일 검색 기능 구현. (1) **debounce 실시간 검색**: 검색창에 타이핑 시 300ms 지연 후 자동으로 결과 반영. 빈 검색어는 전체 목록 표시. (2) **DB 검색**: 파일명을 LIKE '%keyword%' 형태로 조회. SQL 와일드카드(%, _) 이스케이프 처리로 특수문자 포함 검색 안전성 보장. (3) **세 쿼리 함수 확장**: `getAllFiles`, `getFilesByTagIds`, `getUntaggedFiles`에 `searchKeyword` 파라미터 추가. 각 함수는 기존 필터(태그·페이징·정렬)와 독립적으로 검색 조건 적용. (4) **UI 배치**: 파일 목록 헤더에 `file-list__header-center` 영역 추가, 검색창 배치. 빈 상태 텍스트를 검색 여부에 따라 동적 변경. (5) **CSS 테마 대응**: Light/Dark/System 모드에서 CSS 변수 기반으로 자동 적용. 포커스/hover 시 accent 색상 강조.
  * **변경된 핵심 파일**: `main/lib/file-repository.ts`, `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/utils/use-debounce.ts`(신규), `renderer/app/page.tsx`, `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/file-list/file-list.css`

* **2026-03-19**
  * **작업 내용**: 파일 이동/복사 실패 토스트 메시지 UX 개선. 여러 파일이 동시에 실패할 때 `errors.join(', ')`으로 모든 메시지를 한 줄에 이어붙이던 방식을 개선. (1) `groupErrorsByReason()` — 이유별 그룹핑, (2) `formatErrorGroups()` — 3개 미만은 파일명 나열, 3개 이상은 `"N개 파일 — 이유"` 요약으로 출력. Toast 컴포넌트에 `whiteSpace: pre-line` 추가로 `\n` 줄바꿈 렌더링 지원. 파일 추가 중복 메시지도 동일 임계값 처리 적용. 실패 수에 따라 토스트 표시 시간 자동 연장(5000ms → 7000ms).
  * **변경된 핵심 파일**: `renderer/app/utils/file-transfer.ts`, `renderer/app/components/shared/toast.tsx`, `renderer/app/components/shared/toast.css`

* **2026-03-19**
  * **작업 내용**: 테마 설정 저장소를 localStorage에서 electron-store로 마이그레이션. (1) `electron-store` 기반 범용 설정 구조(`AppSettings`) 도입 — 향후 언어·정렬 방식 등 설정 추가 시 `AppSettings` 인터페이스 확장만으로 대응 가능. (2) Main 프로세스에서 `BrowserWindow` 생성 시 `additionalArguments`로 테마 값을 전달하고, preload에서 `process.argv`로 읽어 `window.__initialSettings`에 주입 — sandbox 환경 호환 + FOUC 방지. (3) `config:get-settings`, `config:get`, `config:set` IPC 채널 추가. (4) 기존 localStorage에 저장된 테마 값은 최초 실행 시 자동으로 electron-store로 이관 후 삭제.
  * **변경된 핵심 파일**: `main/lib/store.ts`, `main/ipc/config-handler.ts`(신규), `main/main.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/layout.tsx`, `renderer/app/utils/use-theme.ts`

* **2026-03-18**
  * **작업 내용**: 파일 작업(추가/삭제/이동/복사/동기화) 시 실시간 진행률 오버레이 추가. (1) 스트림 기반 파일 복사(`file-copy-stream.ts`)로 대용량 파일 바이트 단위 진행률 지원. (2) Main→Renderer IPC 진행률 이벤트(`file:operation-progress`) 도입. (3) `LoadingOverlay` 공유 컴포넌트 및 `useDelayedLoading` 훅으로 짧은 작업 시 깜빡임 방지. (4) 일괄 삭제 IPC(`file:delete-batch`) 추가로 기존 `Promise.all` 병렬 삭제를 순차 진행률 방식으로 개선. (5) Light/Dark/System 테마 CSS 변수 동시 적용.
  * **변경된 핵심 파일**: `main/lib/file-copy-stream.ts`(신규), `main/ipc/file-handler.ts`, `main/lib/file-repository.ts`, `main/preload.ts`, `renderer/app/components/shared/loading-overlay.tsx`(신규), `renderer/app/components/shared/loading-overlay.css`(신규), `renderer/app/utils/use-delayed-loading.ts`(신규), `renderer/app/page.tsx`, `renderer/app/globals.css`, `renderer/app/layout.tsx`, `renderer/global.d.ts`

* **2026-03-18**
  * **작업 내용**: 컴포넌트 폴더 구조 정리. (1) `tag-badge/`를 `shared/`로 이동 — 여러 컴포넌트(`file-list`, `file-tag-editor`)에서 공용으로 사용되므로 범용 공유 컴포넌트로 재분류. (2) 빈 `progress-modal/` 폴더 삭제. (3) 관련 import 경로 3곳 수정. (4) `CLAUDE.md` Architecture 섹션 최신화(`vault-info/` 추가, `tag-badge/`·`progress-modal/` 제거 반영, `shared/` 설명 보강).
  * **변경된 핵심 파일**: `renderer/app/components/shared/tag-badge.tsx`(이동), `renderer/app/components/shared/tag-badge.css`(이동), `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/file-tag-editor/file-tag-editor.tsx`, `renderer/app/page.tsx`, `CLAUDE.md`

* **2026-03-17**
  * **작업 내용**: 테마 시스템 개선. (1) **FOUC 해결**: 초기화 스크립트(`THEME_INIT_SCRIPT`)가 system 모드일 때 `matchMedia`로 OS 테마를 즉시 감지하여 `data-theme`을 설정하도록 수정, 다크 플래시 제거. (2) **applyThemeToDOM 일관성**: system 모드일 때도 항상 resolved 값으로 `data-theme`을 설정하여 초기화 스크립트와 동작을 통일. (3) **하드코딩 색상 변수화**: `--accent-warning`, `--color-dot-border` CSS 변수를 `globals.css`에 추가하고, `toast.css`의 `#faa61a`, `tag-form-modal.css`·`tag-search-dropdown.css`의 `rgba(255,255,255,0.15)`, `vault-info.css`의 불일치 fallback을 모두 CSS 변수로 교체.
  * **변경된 핵심 파일**: `renderer/app/layout.tsx`, `renderer/app/utils/use-theme.ts`, `renderer/app/globals.css`, `renderer/app/components/shared/toast.css`, `renderer/app/components/tag-form-modal/tag-form-modal.css`, `renderer/app/components/shared/tag-search-dropdown.css`, `renderer/app/components/vault-info/vault-info.css`

* **2026-03-17**
  * **작업 내용**: 다크/라이트/시스템 테마 수동 전환 기능 추가. 메인 콘텐츠 헤더 우측에 3단 토글 버튼(☀️ 라이트 / 🖥️ 시스템 / 🌙 다크)을 배치. 선택한 테마를 localStorage에 저장하여 앱 재시작 시에도 유지. `data-theme` 속성 기반으로 CSS 변수 구조를 리팩토링하여 기존 모든 컴포넌트에서 테마 전환이 자동 적용. FOUC 방지를 위한 인라인 스크립트 추가. 아울러 `pagination.css`의 미정의 CSS 변수 3개를 기존 변수로 매핑하여 수정.
  * **변경된 핵심 파일**: `renderer/app/utils/use-theme.ts`(신규), `renderer/app/components/shared/theme-provider.tsx`(신규), `renderer/app/components/shared/theme-toggle.tsx`(신규), `renderer/app/components/shared/theme-toggle.css`(신규), `renderer/app/globals.css`, `renderer/app/components/shared/pagination.css`, `renderer/app/layout.tsx`, `renderer/app/page.tsx`

* **2026-03-17**
  * **작업 내용**: `getFileIcon` 함수를 `file-list.tsx`에서 `utils/get-file-icon.ts`로 분리하여 컴포넌트 가독성 향상
  * **변경된 핵심 파일**: `renderer/app/utils/get-file-icon.ts`, `renderer/app/components/file-list/file-list.tsx`

* **2026-03-17**
  * **작업 내용**: Vault 동기화 시 하위 폴더 감지 경고 추가. 사용자가 Vault 폴더에 수동으로 폴더를 생성한 경우, 동기화 실행 시 감지된 폴더 수를 warning 토스트로 알려 Vault가 파일만 관리함을 안내한다. silent 동기화(포커스 복귀 시 자동 실행) 포함 모든 동기화 경로에서 동작.
  * **변경된 핵심 파일**: `main/lib/file-repository.ts`, `main/ipc/file-handler.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`

* **2026-03-16**
  * **작업 내용**: 코드 중복 제거 및 재사용 최적화. (1) **공유 상수 파일**: `constants.ts` 생성으로 `UNTAGGED_TAG_ID`, `DEFAULT_TAG_COLOR`, `DEFAULT_TAG_MUTED_COLOR`, `COLOR_PRESETS`를 5개 파일에서 중앙 관리. (2) **ORDER BY 빌더**: `file-repository.ts` 내 3곳 반복 쿼리 로직을 `buildOrderByClause()` 헬퍼로 통합. (3) **파일 전송 유틸**: `page.tsx`의 6개 함수 중복 토스트 처리를 `file-transfer.ts`로 추출. (4) **Pagination 컴포넌트**: 62줄 인라인 페이지네이션 로직을 `shared/pagination.tsx`로 분리하여 재사용 가능하게 개선.
  * **변경된 핵심 파일**: `renderer/app/constants.ts`(신규), `renderer/app/utils/file-transfer.ts`(신규), `renderer/app/components/shared/pagination.tsx`(신규), `renderer/app/components/shared/pagination.css`(신규), `main/lib/file-repository.ts`, `renderer/app/page.tsx`, `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/tag-badge/tag-badge.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/tag-form-modal/tag-form-modal.tsx`, `renderer/app/components/shared/tag-search-dropdown.tsx`

* **2026-03-16**
  * **작업 내용**: Vault 위치 변경 및 저장 용량 표시 기능 추가. (1) **Vault 위치 변경**: 새로운 "위치 변경" 버튼으로 MyTaggedFiles 폴더를 다른 드라이브/경로로 이동. 2단계 커밋 방식(전체 복사 → 원본 삭제)으로 안전성 보장. 이동 중 진행률과 현재 파일명 실시간 표시. (2) **저장 용량 정보**: vault-info 영역을 2행 compact 레이아웃으로 재구성. 1행: 경로 + 버튼, 2행: Vault 크기/파일 수 + 드라이브 용량/사용률 + 프로그레스 바. 용량 정보는 파일 변경 시마다 이벤트 기반으로 자동 갱신. (3) **컴포넌트 분리**: 기존 page.tsx의 vault-info 인라인 코드를 `<VaultInfo />` 컴포넌트로 추출하여 코드 정리.
  * **변경된 핵심 파일**: `main/ipc/vault-handler.ts`(신규), `main/main.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/utils/format-bytes.ts`(신규), `renderer/app/components/vault-info/vault-info.tsx`(신규), `renderer/app/components/vault-info/vault-info.css`(신규), `renderer/app/page.tsx`, `renderer/app/globals.css`

* **2026-03-16**
  * **작업 내용**: 태그 드래그 앤 드롭 버그 수정. 하위 태그가 펼쳐진 태그를 드래그할 때 자식 영역을 경유하면서 `position` 상태가 리셋되어 드롭이 동작하지 않던 문제 해결. `handleDragOver`에서 자기 자신 위 hover 시 `overTagId`만 `null`로 설정하고 `position`은 유지하도록 수정하고, `handleDrop`에서 유효성 판단을 `position` 대신 `overTagId` 기준으로 변경하여 드롭이 정상 동작하도록 개선.
  * **변경된 핵심 파일**: `renderer/app/components/tag-sidebar/tag-sidebar.tsx`

* **2026-03-15**
  * **작업 내용**: 파일 목록 FileRow에 "파일 탐색기에서 보기" 기능 추가. 새로운 🗂️ 버튼을 클릭하면 Windows 파일 탐색기가 열리면서 MyTaggedFiles 폴더 내의 해당 파일이 선택(Focus)된 상태로 표시됩니다. Electron의 `shell.showItemInFolder()` API를 활용하여 구현하였습니다.
  * **변경된 핵심 파일**: `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/components/file-list/file-list.tsx`

* **2026-03-15**
  * **작업 내용**: 사이드바에 "태그 없음" 가상 태그 추가. 태그가 하나도 연결되지 않은 파일만 필터링하는 기능 구현. (1) 태그 검색창과 기존 태그 목록 사이에 "태그 없음" 항목을 구분선과 함께 배치. (2) 우측에 태그 없는 파일 개수를 `(N)` 형태로 표시하되 전체 태그 카운팅에는 미포함. (3) 다른 태그와 동시 선택 시 해당 태그 파일 + 태그 없는 파일을 UNION으로 합쳐 조회. (4) Main 프로세스에 `getUntaggedFiles`, `getUntaggedFileCount` 쿼리 함수 및 IPC 채널 추가.
  * **변경된 핵심 파일**: `main/lib/file-repository.ts`, `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.css`

* **2026-03-15**
  * **작업 내용**: 태그 사이드바 정렬 기능 확장. 기존 이름순 정렬(오름/내림차순)에 **파일 개수 기준 정렬(오름/내림차순)** 추가. (1) 정렬 버튼 클릭 시 순환: 기본 → 이름↑ → 이름↓ → 파일수↑ → 파일수↓. (2) 파일 개수 정렬 시 정렬 아이콘이 `#` 문자로 변경되어 시각적 구분. (3) 같은 파일 개수일 경우 이름순 fallback 적용. (4) 계층 구조 유지하며 같은 레벨 형제끼리만 정렬.
  * **변경된 핵심 파일**: `renderer/app/utils/tag-tree.ts`, `renderer/app/components/tag-sidebar/tag-sidebar.tsx`

* **2026-03-15**
  * **작업 내용**: 태그 사이드바에 드래그 앤 드롭 순서 변경 기능 추가. (1) "기본 정렬" 상태에서 태그를 드래그하여 같은 부모 레벨 내 원하는 위치로 순서 변경 가능. (2) 변경된 순서는 SQLite `sort_order` 컬럼에 영구 저장되어 앱 재시작 후에도 유지. (3) 새 태그는 해당 그룹 맨 끝에 자동 배치. (4) "이름 오름차순/내림차순" 정렬 모드에서 드래그 시도 시 차단 및 안내 토스트 표시. (5) 낙관적 업데이트로 드래그 즉시 UI에 반영하고 IPC 실패 시 롤백. 드래그 중 위치 표시선(accent 색상) 및 반투명 효과 등 시각 피드백 포함.
  * **변경된 핵심 파일**: `main/lib/db.ts`, `main/lib/tag-repository.ts`, `main/ipc/tag-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/utils/tag-tree.ts`, `renderer/app/page.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.css`

* **2026-03-12**
  * **작업 내용**: 사이드바 드래그 리사이즈 기능 및 전체 태그 접기/펼치기 버튼 추가. (1) 사이드바 우측 경계선을 드래그하여 너비 조절 가능 (180px~400px). CSS 변수 기반으로 너비 변경을 실시간 반영. (2) 모든 태그 계층을 한번에 접거나 펼치는 버튼을 헤더에 추가. 상태 리프팅으로 각 노드별 expand 상태를 중앙 관리하되, 접힌 id만 추적하여 신규 태그 자동 펼침 보장. (3) 파일 필터링 시 태그 목록 리로드로 인한 expand 상태 초기화 버그 수정.
  * **변경된 핵심 파일**: `renderer/app/utils/use-sidebar-resize.ts`(신규), `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.css`

* **2026-03-12**
  * **작업 내용**: 태그 사이드바에 이름순 정렬 기능 추가. 헤더의 정렬 버튼을 클릭하면 기본 → 오름차순(ㄱ→ㅎ) → 내림차순(ㅎ→ㄱ) 순으로 순환. 계층 구조를 유지하며 같은 레벨의 형제 태그끼리만 정렬되고, 자식 태그는 부모를 따라 이동.
  * **변경된 핵심 파일**: `renderer/app/utils/tag-tree.ts`, `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.css`

* **2026-03-12**
  * **작업 내용**: Claude Code 전용 프로젝트 설정 추가. `CLAUDE.md`에 프로젝트 아키텍처, 코드 스타일 규칙, 브랜치 정책, 서브에이전트 워크플로우를 정리. `.claude/agents/`에 `blueprint`, `doc-writer`, `bug-fixer`, `reflector`, `ui-polish` 에이전트 정의 파일을 추가. `.gitignore`에 `.mcp.json` 항목 추가.
  * **변경된 핵심 파일**: `CLAUDE.md`, `.claude/agents/blueprint.md`, `.claude/agents/doc-writer.md`, `.claude/agents/bug-fixer.md`, `.claude/agents/reflector.md`, `.claude/agents/ui-polish.md`, `.gitignore`

  * **2026-03-11**
  * **작업 내용**: 사용자 피드백 시스템 개선 및 토스트 스택 기능 구현. (1) 성공 시 피드백이 없던 8개 작업에 `showToast(success)` 추가. (2) 브라우저 네이티브 `alert()`를 커스텀 Toast로, `confirm()`을 `useConfirm` 훅으로 교체. (3) 모든 피드백 메시지 형식 통일. (4) **추가 개선**: 여러 토스트가 겹치지 않고 역순(오래된 것이 위)으로 쌓이도록 레이아웃을 개선하고, 제거 시 부드러운 정렬 애니메이션 적용.
  * **변경된 핵심 파일**: `renderer/app/components/shared/confirm-dialog.tsx`, `renderer/app/components/shared/confirm-dialog.css`, `renderer/app/components/shared/toast.tsx`, `renderer/app/components/shared/toast.css`, `renderer/app/components/shared/toast-provider.tsx`, `renderer/app/layout.tsx`, `renderer/app/page.tsx`, `renderer/app/components/file-list/file-list.tsx`

* **2026-03-10**
  * **작업 내용**: 새 태그 만들기 모달에서 상위 태그 검색 입력창을 클릭할 때 입력창이 중복 표시되던 문제를 수정. 드롭다운 위치를 입력창 위로 겹치도록 조정해 입력창이 1개만 보이도록 정리.
  * **변경된 핵심 파일**: `renderer/app/components/tag-form-modal/tag-form-modal.css`

* **2026-03-10**
  * **작업 내용**: 파일 목록에서 원하는 파일을 사용자의 다른 로컬 개인 폴더로 "이동" 또는 "복사"하는 기능 구현. 개별 파일 액션 버튼(이동, 복사) 및 선택된 여러 파일을 한 번에 이동/복사할 수 있는 벌크 액션 버튼 추가. 파일 이동 시 Vault 내부 이동이 아닌 OS 레벨 폴더 이동을 지원하며, 이동 시에는 DB 레코드 삭제, 복사 시에는 원본 유지 처리. 파티션 등 제약 시 폴백(copy+unlink) 로직 적용. 또한 기존 "파일 열기" 버튼의 이름을 "열기"로 간결하게 변경.
  * **변경된 핵심 파일**: `main/lib/file-repository.ts`, `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`, `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/file-list/file-list.css`

* **2026-03-10**
  * **작업 내용**: 컴포넌트/유틸리티 재사용 리팩토링. `TagBadge` 컴포넌트가 미사용 상태로 방치되고 `file-list.tsx`, `file-tag-editor.tsx`에 동일 마크업이 하드코딩되어 있던 문제를 `TagBadge` 컴포넌트 import로 교체. `tag-sidebar.tsx`에서 `utils/tag-tree.ts`의 `buildTagTree` 함수와 동일한 로직을 로컬에 중복 정의하고 있던 문제를 import로 교체. 3개 파일에서 반복되던 외부 클릭 감지 `useEffect` 패턴을 `useClickOutside` 커스텀 훅으로 추출하여 적용. 향후 재발 방지를 위해 코드 스타일 가이드(`.agents/rules/code-style-guide.md`)에 "컴포넌트 및 유틸리티 재사용" 규칙(섹션 4)을 추가.
  * **변경된 핵심 파일**: `.agents/rules/code-style-guide.md`, `renderer/app/utils/use-click-outside.ts`(신규), `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/file-tag-editor/file-tag-editor.tsx`, `renderer/app/components/shared/tag-search-dropdown.tsx`, `renderer/app/components/tag-form-modal/tag-form-modal.tsx`

* **2026-03-09**
  * **작업 내용**: 파일 목록에서 현재 페이지 기준 다중 선택 상태를 관리하도록 구조를 정리하고, 선택된 여러 파일에 동일한 태그 집합을 한 번에 적용하는 **태그 일괄 편집** 기능을 추가. 태그 편집 모달은 단일 파일/다중 파일 흐름을 함께 처리하도록 확장했고, 선택된 파일 삭제 액션과 파일 추가 확인 문구도 현재 선택 태그 맥락에 맞게 정리.
  * **변경된 핵심 파일**: `main/lib/file-repository.ts`, `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`, `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/file-list/file-list.css`, `renderer/app/components/file-tag-editor/file-tag-editor.tsx`, `renderer/app/components/file-tag-editor/file-tag-editor.css`

* **2026-03-09**
  * **작업 내용**: 기존 `.agents` 백업 자산은 유지한 채, Codex가 직접 읽는 공식 에이전트 구조를 별도로 추가. 루트 `AGENTS.md`를 신설해 공통 규칙과 skill 목록을 정의하고, `blueprint`, `doc`, `fix`, `refactor`, `ui-polish` workflow를 각각 독립 `SKILL.md`로 이식.
  * **변경된 핵심 파일**: `AGENTS.md`, `skills/blueprint/SKILL.md`, `skills/doc/SKILL.md`, `skills/fix/SKILL.md`, `skills/refactor/SKILL.md`, `skills/ui-polish/SKILL.md`

* **2026-03-08**
  * **작업 내용**: 안티그래비티 파일 리스트에서 항목을 더블클릭하거나 파일 우측의 액션 버튼(📂)을 클릭하여 로컬 OS의 기본 프로그램으로 파일을 여는 **파일 열기** 기능 구현. Main 프로세스의 `file-handler`를 통해 `shell.openPath` 호출, Renderer의 `global.d.ts`와 컴포넌트에 IPC 통신 연결 작업.
  * **변경된 핵심 파일**: `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/components/file-list/file-list.tsx`

* **2026-03-08**
  * **작업 내용**: 파일 동기화(`syncVault`) 및 파일 수동 추가(`addFile`) 시, MS Office 등에서 생성되는 임시 파일(`~$` 등)과 숨김 파일(`.DS_Store` 등)이 DB에 등록되거나 화면에 표시되지 않도록 `isIgnoredFile` 필터 로직 추가. 임시 파일로 인한 경로 탐색 에러 및 혼동 방지 처리.
  * **변경된 핵심 파일**: `main/lib/file-repository.ts`

* **2026-03-08**
  * **작업 내용**: 물리적 폴더 내 파일과 로컬 DB의 싱크를 맞추는 Vault 동기화(`syncVault`) 기능과 화면 하단에서 나타나는 애니메이션 Toast 알림 컴포넌트(`ToastProvider`)를 전역적으로 상시 사용할 수 있도록 구현. 앱 화면에 포커스 될 시 자동 조용한 동기화가 이루어지며, 동기화 진행 중일 경우 충돌이 없게끔 중복 실행 방지 락(Lock) 상태와 버튼 비활성화를 도입해 데이터 접근 안정성을 강화함. 덤으로 동기화 버튼 호버 시 정보를 제공하는 전역 툴팁(`data-tooltip`) 컴포넌트를 직접 CSS로 구현하여 적용.
  * **변경된 핵심 파일**: `main/lib/file-repository.ts`, `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`, `renderer/app/globals.css`, `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/shared/toast.tsx`, `renderer/app/components/shared/toast.css`, `renderer/app/components/shared/toast-provider.tsx`

* **2026-03-08**
  * **작업 내용**: "파일 추가" 버튼 클릭 시에도 파일 드래그 앤 드롭 방식과 동일하게 사용자 확인창(`confirm`)이 나타나도록 구현. 이를 위해 메인 프로세스와 렌더러 프로세스 간의 통신(IPC) 구조를 개선하여, 새롭게 `file:select` 채널을 도입함으로써 파일 선택과 추가 단계를 분리. 선택된 파일 수량 및 적용될 태그명을 사용자에게 명확히 안내한 뒤에만 최종적으로 파일이 추가되도록 강화.
  * **변경된 핵심 파일**: `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`

* **2026-03-08**
  * **작업 내용**: 파일 목록 최좌측에 개별 파일 선택용 체크박스를, 테이블 헤더에는 전체 선택용 체크박스를 추가. 선택된 파일에 대해 다중 삭제가 가능하도록 '선택 삭제' 기능을 구현. 이후, 여러 파일을 일괄 삭제할 때 개별 파일마다 노출되던 이중 확인창 로직을 생략(스킵)하여 한 번의 확인 창으로 처리하도록 작업 흐름 개선. 체크박스의 기본 투박한 디자인을 둥글고 부드러운 형태로 커스터마이징. 마지막으로, 체크박스 컬럼이 추가되면서 기존 파일명 컬럼 리사이즈 시 발생하던 그리드 레이아웃 오작동 그리드 오토 사이징 관련 버그 해결.
  * **변경된 핵심 파일**: `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/file-list/file-list.css`, `renderer/app/page.tsx`


* **2026-03-08**
  * **작업 내용**: 파일 목록 헤더의 태그 컬럼 구분선을 더블 클릭하여 오토 사이징할 때, 내부 태그 뱃지 길이 합산으로 인해 테이블 전체 너비를 초과하여 화면 우측으로 밀려나가고 횡 스크롤이 발생하는 버그를 수정. 가시 화면 컨테이너 폭에서 고정 너비 컬럼값을 제외한 나머지 가용 공간을 최대 허용 너비로 산정하도록 계산 로직 개선.
  * **변경된 핵심 파일**: `renderer/app/components/file-list/file-list.tsx`

  * **작업 내용**: 파일 목록 헤더 각 컬럼(파일명, 태그, 크기) 사이에 윈도우 파일 탐색기 스타일의 구분선 리사이저를 추가하고 드래그 앤 드롭으로 동적 컬럼 폭 조절 기능을 구현. 구분선 더블 클릭 시 컬럼의 내용 길이에 딱 맞춰 폭을 조정하는 오토 리사이징 추가. CSS 변수 및 CSS Grid 템플릿 제어를 사용해 성능 최적화 진행.
  * **변경된 핵심 파일**: `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/file-list/file-list.css`

* **2026-03-07**
  * **작업 내용**: 파일 목록 영역 전체에 드래그 앤 드롭으로 파일을 추가하는 기능 구현. 폴더 드롭 시 방어 로직 추가, 저장 전 사용자 확인 과정(`confirm`) 추가 및 관련 IPC 인터페이스(`webUtils.getPathForFile` 등) 수정. 파일 목록 상단 타이틀이 필터 해제 버튼 우측에 자연스럽게 배치되도록 레이아웃 조정 및 필터 버튼 줄바꿈/깨짐 방지 CSS 처리 적용.
  * **변경된 핵심 파일**: `main/preload.ts`, `main/ipc/file-handler.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`, `renderer/app/globals.css`, `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/file-list/file-list.css`


  * **작업 내용**: 파일 목록 헤더 영역에 전체 파일 개수를 표기하고, "✕ 필터 해제" 버튼을 파일 개수 옆으로 나란히 배치하도록 UI 구조 변경. 📁 아이콘을 가장 좌측에 고정하고, 우측 가장자리에 "전체 파일" 또는 선택된 태그명이 표시되도록 Flexbox 정렬 수정.
  * **변경된 핵심 파일**: `renderer/app/page.tsx`, `renderer/app/globals.css`

  * **작업 내용**: 사이드바 상단 "태그" 타이틀 옆에 전체 태그 및 파일 개수 표기, 그리고 각 태그 이름 옆에 연결된 파일 개수를 표시하도록 파일 필터 UI 개선.
  * **추가된 최적화**: `getAllTags` 호출 시 하위 태그들이 소유한 파일 개수까지 모두 포함하되, 중복되는 파일은 DB 레이어가 아닌 Node.js 메모리 단에서 `Set`을 이용한 Bottom-up 방식 취합으로 처리하여 쿼리 성능(부하 방지) 최적화 도입.
  * **변경된 핵심 파일**: `main/lib/tag-repository.ts`, `main/lib/file-repository.ts`, `main/ipc/file-handler.ts`, `renderer/global.d.ts`, `renderer/app/types.ts`, `renderer/app/page.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.css`

  * **작업 내용**: 태그 검색 및 계층 렌더링 로직을 공유하는 공통 컴포넌트(`TagSearchDropdown`)를 생성하여 리팩토링 진행. 파일 태그 편집(`FileTagEditor`) 모달과 새 태그 만들기(`TagFormModal`) 모달 기능에서 분편화되었던 로직을 하나로 통합하고, `parent-tag-select` 관련 파일들을 완전히 제거함. 두 개의 모달 모두 부모 태그를 검색할 때 검색창을 클릭하면 드롭다운이 뜨는 통일된 UI/UX 제공.
  * **변경된 핵심 파일**: `renderer/app/utils/tag-tree.ts`(신규), `renderer/app/components/shared/tag-search-dropdown.tsx`(신규), `renderer/app/components/tag-form-modal/tag-form-modal.tsx`, `renderer/app/components/file-tag-editor/file-tag-editor.tsx`

  * **작업 내용**: 공통 태그 검색 컴포넌트(`TagSearchDropdown`)를 재사용하여, 사이드바 태그 메뉴 상단에 실시간 태그 필터링 및 선택 기능 추가. 검색창 클릭(포커스) 시에만 드롭다운 리스트가 노출되고, 외부 클릭 시 닫히도록 UI 개선 및 기존 파일 필터링 로직과 연동.
  * **변경된 핵심 파일**: `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.css`, `renderer/app/components/shared/tag-search-dropdown.tsx`

* **2026-03-06**
  * **작업 내용**: Vault(`MyTaggedFiles`)에 파일을 등록할 때 파일을 복사(`fs.copyFileSync`)하던 기존 방식을, 파일을 완전히 이동시키는 방식(`fs.renameSync`)으로 동작 변경. 파티션이 다른 드라이브 간 이동 등 OS 환경적 제약으로 `EXDEV` 에러가 발생할 경우를 대비하여 폴백(기존처럼 복사 후 원본 삭제) 로직을 추가하여 시스템 안정성 확보.
  * **변경된 핵심 파일**: `main/lib/file-repository.ts`

  * **작업 내용**: 파일 목록창에서 데이터가 많을 때 하단 페이지네이션 버튼이 스크린 밖으로 밀려 가려지는 이슈 해결. 고정 스크롤 영역 할당 대신, Flexbox(`flex: 1`, `min-height: 0`)를 적용하여 브라우저 가용 높이에 맞게 리스트 스크롤 영역이 유연하게 계산되고 하단 페이지네이션이 항상 노출되도록 레이아웃을 개선.
  * **변경된 핵심 파일**: `renderer/app/globals.css`, `renderer/app/components/file-list/file-list.css`

* **2026-03-04**
  * **작업 내용**: 단일 태그 선택만 가능했던 파일 필터링 기능을 개선하여 **다중 태그 선택 기능**으로 확장. 사용자가 선택한 태그 중 하나라도 일치하는 파일들을 리스트에 보여주도록(OR 조건/합집합) 변경. 좌측 사이드바 트리에서 다수의 태그를 클릭하여 활성화/비활성화(토글 방식) 할 수 있도록 상태 관리를 `selectedTagIds` (배열)로 변경. 백엔드 `getFilesByTagId` 함수를 `getFilesByTagIds`로 교체하고 `IN (?, ?..)` SQL 쿼리를 동적으로 생성하여 대응. 선택한 여러 태그의 이름을 상단 헤더에 나열하도록 UI 개선.
  * **변경된 핵심 파일**: `main/lib/file-repository.ts`, `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.tsx`

  * **작업 내용**: 파일 목록 헤더에서 파일명/확장자/사이즈/생성일/수정일 기준으로 리스트를 오룸차순/내림차순 정렬할 수 있는 기능(Select Box) 구현. DB 조회 시 인메모리 정렬이 아닌 동적 `ORDER BY` 쿼리로 안정적인 페이지네이션 지원.
  * **변경된 핵심 파일**: `main/lib/file-repository.ts`, `main/ipc/file-handler.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/types.ts`, `renderer/app/page.tsx`, `renderer/app/components/file-list/file-list.tsx`, `renderer/app/components/file-list/file-list.css`

  * **작업 내용**: 파일 태그 편집 모달(`FileTagEditor`)에서 태그 검색 드롭다운 리스트가 모달 하단에 잘려 보이는 UI 문제 수정. 모달 컨테이너의 `overflow`를 `visible`로 변경하여 드롭다운이 모달 영역 밖으로 확장 가능하게 하고, 드롭다운 `max-height`를 200px → 300px로 늘려 더 많은 태그 항목을 표시하도록 개선.
  * **변경된 핵심 파일**: `renderer/app/components/file-tag-editor/file-tag-editor.css`

  * **작업 내용**: 파일 관리 시스템 구현. Backend 파일 CRUD 레이어(`file-repository.ts`, `file-handler.ts`) 구축 — 파일 추가(Vault 복사+DB 등록), 전체/태그별 조회, 이름 변경, 삭제, 태그 할당/해제, 중복 파일명 체크 포함. Frontend에 `FileList` 컴포넌트(테이블 형태 파일 목록, hover 액션, 인라인 이름변경), `FileTagEditor` 모달(태그 칩 + 계층형 드롭다운 검색으로 태그 할당/해제) 신규 생성. 사이드바 태그 클릭 시 해당 태그 파일만 필터링하는 기능 추가(`selectedTagId`/`onSelectTag`). `page.tsx`에 파일 상태 관리 및 전체 컴포넌트 통합.
  * **변경된 핵심 파일**: `main/lib/file-repository.ts`(신규), `main/ipc/file-handler.ts`(신규), `main/main.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/types.ts`, `renderer/app/page.tsx`, `renderer/app/globals.css`, `renderer/app/components/file-list/`(신규), `renderer/app/components/file-tag-editor/`(신규), `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.css`

* **2026-03-03**
  * **작업 내용**: 사이드바 태그 트리에서 기존 태그 호버 시 "하위 태그 생성(+)" 액션 버튼 추가. 클릭 시 해당 태그가 부모로 미리 선택된 상태의 태그 생성 모달(`TagFormModal`)이 열리도록 구현. `TagFormModal`에 `defaultParentId` prop 추가, `TagSidebar`에 `onCreateChildTag` 콜백 추가, `page.tsx`에서 상태 관리 연동. 빌드 산출물(`renderer/out/`) `.gitignore` 추가.
  * **변경된 핵심 파일**: `renderer/app/page.tsx`, `renderer/app/components/tag-sidebar/tag-sidebar.tsx`, `renderer/app/components/tag-form-modal/tag-form-modal.tsx`, `.gitignore`

* **2026-03-02**
  * **작업 내용**: 태그 CRUD 시스템 구현. Backend IPC 핸들러(`tag:create`, `tag:get-all`, `tag:update`, `tag:delete`), 태그 DB 레이어 분리(`tag-repository.ts`). Frontend 사이드바+콘텐츠 레이아웃 변경, `TagSidebar`(계층형 트리), `TagFormModal`(생성/수정 모달), `TagBadge`(색상 뱃지) 컴포넌트 신규 구축. Discord 스타일 다크/라이트 테마 CSS 변수 시스템 도입.
  * **변경된 핵심 파일**: `main/lib/tag-repository.ts`, `main/ipc/tag-handler.ts`, `main/main.ts`, `main/preload.ts`, `renderer/global.d.ts`, `renderer/app/page.tsx`, `renderer/app/globals.css`, `renderer/app/types.ts`, `renderer/app/components/tag-sidebar/`, `renderer/app/components/tag-form-modal/`, `renderer/app/components/tag-badge/`

  * **작업 내용**: 상위 태그 셀렉트박스에 컬러 dot 아이콘 추가. HTML 네이티브 `<select>`는 내부 커스텀 렌더링이 불가하여 커스텀 드롭다운 컴포넌트(`ParentTagSelect`)로 교체. 각 태그 옵션 왼쪽에 해당 태그 색상의 원형 아이콘 표시, 외부 클릭/Escape 닫힘 처리, fade-in 애니메이션 적용.
  * **변경된 핵심 파일**: `renderer/app/components/tag-form-modal/parent-tag-select.tsx`(신규), `renderer/app/components/tag-form-modal/parent-tag-select.css`(신규), `renderer/app/components/tag-form-modal/tag-form-modal.tsx`

* **2026-03-01**
  * **작업 내용**: Next.js 및 Electron 수동 연동 초기 세팅 완료 및 TailwindCSS 초기 적용.
  * **변경된 핵심 파일**: `package.json`, `main/main.ts`, `main/preload.ts`, `renderer/app/page.tsx`, `tailwind.config.ts`, `postcss.config.mjs`, `renderer/app/globals.css`

  * **작업 내용**: Vault 경로 선택 UI 및 SQLite DB 초기화 구현. `electron-store`를 활용한 Vault 경로 저장, `better-sqlite3`로 DB 스키마(`files`, `tags`, `file_tags` 테이블) 자동 생성, Vault 선택 시 `MyTaggedFiles` 폴더 자동 생성 로직 추가.
  * **변경된 핵심 파일**: `main/lib/store.ts`(신규), `main/lib/db.ts`(신규), `main/main.ts`, `main/preload.ts`, `renderer/app/page.tsx`, `renderer/global.d.ts`

  * **작업 내용**: `dist-main` 빌드 파일 Git 추적 제거 및 `.gitignore` 정리, Next.js 캐시 파일 무시 설정 추가, `COLOR_PRESETS` 중복 key 에러 수정.
  * **변경된 핵심 파일**: `.gitignore`, `renderer/app/components/tag-form-modal/tag-form-modal.tsx`

* **2026-02-28**
  * **작업 내용**: AI 에이전트 코드 스타일 가이드 및 워크플로우 세팅 초기화. `README.md` 작성 및 Git PR 브랜치 작업 규칙 명세.
  * **변경된 핵심 파일**: `code-style-guide.md`, `.agents/workflows/doc.md` 등 워크플로우 가이드 파일 5종
