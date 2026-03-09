---
name: doc
description: localTag 프로젝트의 코드 문서화와 작업 기록을 위한 지침이다. 커스텀 UI 컴포넌트 JSDoc, IPC 채널/페이로드 설명, SQLite 스키마 주석, README 변경 이력, 브랜치 및 PR 문서를 정리할 때 사용한다.
---

# Doc

## Document code where context matters
- Select Box, Modal 같은 커스텀 UI 컴포넌트 상단에는 JSDoc을 두고 Props 타입, 역할, Light/Dark 테마 동작을 적는다.
- Electron Main과 Renderer 사이의 IPC 채널 이름과 페이로드 구조를 코드 가까이에 주석으로 남긴다.
- SQLite 초기화 코드 근처에 `Files`, `Tags`, `FileTags` 테이블 구조와 컬럼 역할, 제약 조건을 요약한다.

## Keep project records current
- 의미 있는 기능 추가나 수정이 있으면 `README.md`의 `## 진행 및 수정 사항 (Changelog)`를 갱신한다.
- 날짜, 작업 내용, 핵심 변경 파일을 간결한 마크다운 리스트로 기록한다.
- 커밋이나 푸시 전에 changelog가 최신인지 확인한다.

## Respect the repository workflow
- 저장소 정책상 `main-dev`가 기준 브랜치라면, 새 작업은 최신 `main-dev`에서 분기한 작업 브랜치에서 진행한다.
- `main`과 `main-dev`에는 직접 푸시하지 않는다.
- 코드와 문서 업데이트가 끝나면 작업 브랜치를 푸시하고 `main-dev` 대상으로 PR을 만든다.
