---
description: 
---

# Antigravity Reflector: Code Review & Quality Assurance

코드 작성 후 다음 사항을 스스로 검토하고 수정하세요:

1.  **IPC 통신 안전성:** Next.js(Renderer)에서 Electron(Main)으로 데이터를 요청할 때, 보안 문제가 없도록 Context Bridge가 올바르게 설정되었는가?
2.  **SQLite 최적화:** N:M 관계(파일-태그)를 조회할 때 N+1 문제가 발생하지 않도록 쿼리가 최적화(JOIN 활용 등) 되었는가? DB 연결 누수(Leak)는 없는가?
3.  **컴포넌트 단일 책임:** 커스텀 UI 컴포넌트(예: Modal)가 비즈니스 로직(DB 저장 등)까지 직접 처리하고 있지는 않은가? 프레젠테이셔널(Presentational) 역할에 충실하게 분리하세요.
4.  **테마 누락 검사:** 새로 추가된 UI에 Light/Dark 모드 대응 코드가 누락된 곳은 없는가?