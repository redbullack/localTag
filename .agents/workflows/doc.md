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