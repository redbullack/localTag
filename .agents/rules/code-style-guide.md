---
trigger: always_on
---

# Antigravity Project - Code Style Guide for AI Agents

이 문서는 안티그래비티 프로젝트에서 코드를 생성, 수정, 분석하는 모든 AI 에이전트가 반드시 준수해야 하는 핵심 규칙입니다.

## 0. 한국어 답변
* **한국어 답변:** 모든 작업의 답변과 설명은 한국어로 해줘.

## 1. 기본 원칙 (Core Principles)
* **가독성 우선:** 짧고 복잡한 코드보다, 약간 길더라도 누구나 읽고 이해하기 쉬운 코드를 작성하세요.
* **단일 책임 원칙 (SRP):** 함수나 클래스는 오직 하나의 명확한 작업만 수행해야 합니다.
* **불변성 (Immutability):** 가능한 한 상태 변경을 피하고, 데이터의 불변성을 유지하세요.

## 2. 네이밍 컨벤션 (Naming Conventions)
* **파일 및 디렉토리:** `kebab-case`를 사용합니다. (예: `user-profile.ts`, `auth-service/`)
* **클래스 및 인터페이스:** `PascalCase`를 사용합니다. (예: `UserProfile`, `IAuthService`)
* **변수 및 함수:** `camelCase`를 사용합니다. (예: `getUserData`, `isLoggedIn`)
* **상수 (Constants):** `UPPER_SNAKE_CASE`를 사용합니다. (예: `MAX_RETRY_COUNT`, `API_BASE_URL`)
* **명확한 이름:** `data`, `info`, `temp`와 같은 모호한 이름은 절대 사용하지 마세요. 변수가 무엇을 담고 있는지 명확히 알 수 있게 작성하세요. (예: `userList`, `temporaryFilePath`)

## 3. 코드 구조 및 패턴 (Code Structure & Patterns)
* **Early Return (조기 반환):** `if-else` 중첩을 피하고, 에러나 예외 상황은 함수 도입부에서 즉시 `return` 처리하세요.
  ```javascript
  // Bad
  if (user) {
    if (user.isActive) {
      // do something
    }
  }
  // Good
  if (!user || !user.isActive) return;
  // do something
* **파일, 컴포넌트 분리:** 하나의 파일이 너무 길어지지 않게 기능별로 분리할 것. 추후 확장 및 유지보수의 원활함을 고려하여 component를 기능별로 잘 구분하고 분리하여 관리할 것.