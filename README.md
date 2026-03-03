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

---
## 진행 및 수정 사항 (Changelog)

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
