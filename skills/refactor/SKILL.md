---
name: refactor
description: localTag 코드의 구조 개선과 자기 점검을 위한 지침이다. 기능 작업 후 정리, 코드 리뷰 대응, IPC 안전성 점검, SQLite 쿼리 개선, 컴포넌트 책임 분리, 테마 누락 검토가 필요할 때 사용한다.
---

# Refactor

## Run this review after functional changes
- Renderer에서 Main으로 가는 요청이 안전한 Context Bridge를 통해 노출되는지 확인한다.
- 파일-태그 다대다 조회에서 N+1 문제가 생기지 않도록 JOIN 기반 쿼리와 연결 해제를 점검한다.
- Modal 같은 커스텀 UI 컴포넌트에 DB 저장이나 파일 처리 같은 비즈니스 로직이 섞여 있지 않은지 확인한다.
- 새 UI에 Light, Dark, System 테마 대응이 빠진 곳이 없는지 확인한다.

## Refactor direction
- 중복 로직은 책임이 가장 자연스러운 계층 하나로 모은다.
- 동작 보존을 우선하고, 그다음 구조를 단순화한다.
- 여러 역할을 가진 큰 컴포넌트나 헬퍼보다 단일 책임 단위로 쪼개는 방향을 택한다.
