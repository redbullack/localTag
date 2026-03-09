---
name: fix
description: localTag의 버그 진단과 수정 절차를 다룬다. Next.js renderer 오류, Electron main process 문제, SQLite 쿼리 실패, 레이아웃 깨짐, 로컬 파일 시스템 예외를 재현하고 해결할 때 사용한다.
---

# Fix

## Isolate the failure first
- 문제가 Renderer, Main, SQLite, IPC 경계 중 어디에서 시작되는지 먼저 식별한다.
- 가장 짧은 재현 경로와 실제 오류 메시지를 확보한 뒤 수정에 들어간다.

## Prefer structural fixes
- UI 레이아웃 버그는 임시 `margin`이나 고정 `px` 높이보다 Flexbox/Grid 구조와 크기 계산의 원인을 찾아 해결한다.
- 파일 시스템 코드는 권한 문제, 파일 잠금, 디스크 용량 부족 같은 예외를 염두에 두고 방어적으로 작성한다.
- 로컬 환경 의존 오류에는 `try-catch`와 사용자에게 전달할 실패 경로를 함께 둔다.

## Verify adjacent paths
- 수정 후에는 원래 실패 경로를 다시 실행한다.
- 같은 IPC 채널, 같은 쿼리, 같은 레이아웃 컨테이너를 공유하는 인접 흐름도 함께 확인한다.
