bug-fixer 에이전트를 사용하여 다음 버그를 수정해줘: $ARGUMENTS

작업 전에 반드시 CLAUDE.md를 참고하여 프로젝트 컨벤션을 따를 것.
1) 실패 계층(Renderer/Main/IPC/SQLite/파일시스템) 먼저 격리
2) 구조적 원인 파악 후 수정 (임시 margin/px 보정 금지)
3) 수정 후 인접 경로까지 검증할 것.
