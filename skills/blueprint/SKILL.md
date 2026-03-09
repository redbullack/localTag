---
name: blueprint
description: localTag의 신규 기능 설계와 구조 변경을 위한 지침이다. Next.js renderer, Electron main process, SQLite, IPC 경계를 정리하거나 태그 기반 파일 정리 앱의 핵심 비즈니스 규칙과 데이터 흐름을 설계할 때 사용한다.
---

# Blueprint

## Preserve the product model
- 앱을 물리 폴더 이동 대신 계층형 태그로 파일을 찾고 관리하는 데스크톱 파일 정리기로 취급한다.
- Renderer는 Next.js와 React, Main은 Electron, 저장소는 SQLite, 프로세스 간 통신은 IPC가 담당하도록 경계를 분명히 둔다.

## Preserve core business rules
- 앱이 관리하는 파일은 하나의 루트 폴더(`vault`) 아래에 모이게 설계한다.
- 루트 폴더 내부 파일명은 고유해야 하며, 충돌 시 UUID로 강제 변경하지 말고 사용자에게 이름 수정 흐름을 제공한다.
- SQLite에는 실제 파일 내용이 아니라 루트 기준 파일 경로, 태그 메타데이터, 파일-태그 다대다 매핑만 저장한다.

## Plan changes explicitly
- 기능을 설계할 때 어느 계층이 UI, 파일 시스템, 데이터베이스, IPC 책임을 가지는지 먼저 적는다.
- 태그의 부모/자식 관계와 파일-태그 N:M 매핑이 어떻게 바뀌는지 명시한다.
- 파일 추가나 이동 흐름을 바꿀 때는 이름 충돌 처리와 실패 경로를 함께 설계한다.

## Output expectation
- 구현 전에는 변경 대상 레이어, 데이터 모델 영향, 사용자 흐름, 실패 케이스를 짧게 정리한다.
