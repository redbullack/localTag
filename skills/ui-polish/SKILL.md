---
name: ui-polish
description: localTag의 UI 다듬기와 디자인 규칙을 정의한다. 고밀도 레이아웃, 상단 액션 구조, Light/Dark/System 테마, 재사용 가능한 컴포넌트, 레이아웃 안정성을 개선하거나 새 UI를 추가할 때 사용한다.
---

# UI Polish

## Preserve the visual direction
- 좌우 공백을 최소화하고 많은 파일과 태그를 한눈에 볼 수 있는 고밀도 레이아웃을 유지한다.
- 주요 네비게이션과 액션은 가능하면 상단 메뉴바에서 항상 접근 가능하게 둔다.

## Enforce strict theming
- Light, Dark, System 모드를 함께 지원한다.
- 텍스트, 배경, 경계선 대비를 명확히 유지해 가독성을 우선한다.
- 스타일을 추가할 때는 CSS 변수나 대응 클래스 기준으로 양쪽 테마를 동시에 반영한다.

## Build reusable components
- Select Box, Card, Check Box, Input Box, DataGrid, Chart, Modal 같은 UI 요소는 재사용 가능하면 개별 커스텀 컴포넌트로 분리한다.
- Props는 직관적이고 간결하게 설계해 확장 비용을 낮춘다.

## Prevent layout shift
- 창 크기 변경이나 긴 데이터에도 요소가 겹치거나 밀리지 않도록 Flexbox와 Grid를 견고하게 설계한다.
- 내용 길이에 취약한 일회성 간격 보정으로 문제를 덮지 않는다.
