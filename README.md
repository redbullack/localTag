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

* **2026-03-07**
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
