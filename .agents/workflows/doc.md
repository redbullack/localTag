---
description: 
---

# Antigravity Doc: Documentation & Commenting Standards

## 1. 컴포넌트 명세
* 커스텀 UI 컴포넌트(Select Box, Modal 등) 상단에는 JSDoc을 사용하여 허용되는 Props의 타입, 역할, 그리고 각 테마(Light/Dark)에서의 동작 방식을 명시하세요.

## 2. IPC 채널 문서화
* Electron Main과 Renderer 간의 통신 채널 이름(예: `file:read`, `tag:create`)과 주고받는 데이터의 페이로드(Payload) 구조를 명확히 주석으로 남기세요.

## 3. 데이터베이스 스키마
* SQLite 초기화 코드 근처에 테이블 구조(Files, Tags, FileTags)와 각 컬럼의 역할, 제약 조건(Unique, Foreign Key 등)을 주석으로 요약해 두세요.

## 4. README.md 업데이트 규칙 (Changelog)
* 프로젝트의 메인 개발 브랜치인 `main-dev`에서 작업할 때는, 의미 있는 기능 추가나 수정 사항이 발생할 때마다 반드시 `README.md` 파일의 `## 진행 및 수정 사항 (Changelog)` 섹션에 해당 내용을 기록하세요.
* 기록할 때는 날짜, 작업 내용, 변경된 핵심 파일 등을 마크다운 리스트 형태로 간결하고 명확하게 작성하세요.
* 커밋(Commit) 및 푸시(Push) 작업을 수행하기 전에 `README.md`가 최신 상태로 업데이트되었는지 항상 먼저 확인하세요.

## 5. Git 브랜치 및 PR(Pull Request) 작업 규칙 (Strict Workflow)
* **작업 브랜치 생성:** 모든 새로운 기능 개발, 버그 수정, 세팅 등 새로운 작업은 반드시 최신 상태의 `main-dev` 브랜치에서 파생된 새로운 작업 브랜치를 생성하여 진행하세요. (브랜치명 규칙: `feature/작업명`, `fix/버그명`, `chore/세팅명`)
* **직접 푸시(Direct Push) 절대 금지:** 어떠한 경우에도 `main` 또는 `main-dev` 브랜치에 직접 커밋하고 푸시해서는 안 됩니다.
* **PR(Pull Request) 생성 필수:** 작업이 완료되고 `README.md` (Changelog) 업데이트가 끝났다면, 변경 사항을 커밋하고 현재 작업 브랜치를 원격 저장소로 푸시하세요. 그 후, GitHub MCP를 활용하여 해당 브랜치를 `main-dev` 브랜치로 병합(Merge)해 달라는 Pull Request를 생성해야 합니다.