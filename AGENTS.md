# localTag Agent Guide

## Project Rules
- 모든 답변과 작업 설명은 한국어로 작성한다.
- `.agents/`는 백업 및 레거시 참조용으로 유지하고, 활성 Codex 구조는 이 파일과 `skills/` 아래의 `SKILL.md`를 기준으로 사용한다.
- 짧고 복잡한 코드보다 읽기 쉽고 유지보수하기 쉬운 코드를 우선한다.
- 함수와 클래스는 하나의 명확한 책임만 갖게 설계한다.
- 가능한 한 상태 변경을 줄이고 불변 데이터 흐름을 선호한다.

## Naming Conventions
- 파일과 디렉터리는 `kebab-case`를 사용한다.
- 클래스와 인터페이스는 `PascalCase`를 사용한다.
- 변수와 함수는 `camelCase`를 사용한다.
- 상수는 `UPPER_SNAKE_CASE`를 사용한다.
- `data`, `info`, `temp` 같은 모호한 이름 대신 역할이 드러나는 이름을 사용한다.

## Code Structure
- 중첩 `if-else`보다 early return을 우선해 예외 상황을 먼저 정리한다.
- 파일과 컴포넌트가 과도하게 커지지 않도록 기능과 책임 기준으로 분리한다.

## Skills
A skill is a set of local instructions stored in a `SKILL.md` file. Use the smallest relevant set of skills for the task.

### Available skills
- blueprint: `localTag`의 기능 설계, 아키텍처 변경, IPC/SQLite 경계 정의, 비즈니스 규칙 정리에 사용한다. (file: C:/myNote/git_project/localTag/skills/blueprint/SKILL.md)
- doc: 컴포넌트 문서화, IPC/DB 주석, `README.md` 변경 이력, 브랜치/PR 규칙 점검에 사용한다. (file: C:/myNote/git_project/localTag/skills/doc/SKILL.md)
- fix: Next.js, Electron, SQLite, 레이아웃, 로컬 파일 시스템 관련 버그를 진단하고 수정할 때 사용한다. (file: C:/myNote/git_project/localTag/skills/fix/SKILL.md)
- refactor: 코드 정리, 자기 점검, IPC 안전성, SQLite 쿼리 품질, 컴포넌트 책임 분리, 테마 누락 검토에 사용한다. (file: C:/myNote/git_project/localTag/skills/refactor/SKILL.md)
- ui-polish: 고밀도 UI, 테마 일관성, 재사용 가능한 컴포넌트, 레이아웃 안정성 개선에 사용한다. (file: C:/myNote/git_project/localTag/skills/ui-polish/SKILL.md)

### How to use skills
- 작업에 맞는 최소 skill만 선택하고, 필요한 `SKILL.md`만 연다.
- 항상 이 파일의 공통 규칙을 먼저 적용한 뒤 선택한 skill 지침을 따른다.
- `.agents/`의 원본 파일은 수정하거나 이동하지 않고 참조만 한다.
