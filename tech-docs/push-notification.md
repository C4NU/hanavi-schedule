# 📱 알림 시스템 (Push Notification) 기술 문서

본 문서는 '하나비 스케줄' 프로젝트의 알림 시스템 아키텍처와 사용 방법을 설명합니다.

## 1. 개요
본 프로젝트는 **Firebase Cloud Messaging (FCM)**을 사용하여 사용자들에게 실시간 스케줄 업데이트 및 일일 방송 요약 알림을 제공합니다. 기존의 구글 앱스 스크립트 기반 레거시를 제거하고, 모든 알림 로직을 Next.js 서버 환경으로 통합하였습니다.

## 2. 알림 종류

### 2.1 스케줄 업데이트 알림 (실시간)
- **발생 시점**: 관리자 페이지에서 스케줄을 수정하고 '저장' 버튼을 클릭할 때.
- **작동 원리**: 
    1. 관리자가 스케줄 저장 API(`POST /api/admin/schedule`) 호출.
    2. 서버에서 기존 스케줄과 비교하여 변경된 멤버가 누구인지 판별.
    3. Firebase Admin SDK를 통해 모든 구독자에게 푸시 알림 발송.
- **메시지 예시**: 
    - `📅 [주간범위] 주간 스케줄` (새로운 주간 등록 시)
    - `✨ [멤버이름] 스케줄 수정` (특정 멤버 수정 시)

### 2.2 일일 방송 요약 알림 (자동)
- **발생 시점**: 매일 아침 (스케줄러에 의해 호출).
- **엔드포인트**: `GET /api/push/daily-summary?secret=[ADMIN_SECRET]`
- **작동 원리**:
    1. 호출 시 현재 한국 시간(KST) 기준 오늘의 요일을 계산.
    2. Supabase에서 최신 스케줄을 가져와 오늘 방송이 있는 멤버들만 추출.
    3. 시간순으로 정렬하여 요약 문구 생성 후 발송.
- **자동화 설정**: Vercel Cron 또는 GitHub Actions를 사용하여 매일 오전 8~9시 사이에 위 엔드포인트를 호출하도록 설정해야 합니다.

## 3. 클라이언트 구현 (PWA/Browser)

### 3.1 토큰 등록 및 관리
- `NotificationManager.tsx` 컴포넌트가 담당합니다.
- 사용자가 알림 권한을 허용하면 FCM 토큰을 생성하여 `/api/push/subscribe` 엔드포인트로 전송, Firestore의 `fcm_tokens` 컬렉션에 저장합니다.

### 3.2 서비스 워커 (`public/firebase-messaging-sw.js`)
- 백그라운드 상태에서 알림 수신을 처리합니다.
- 알림 클릭 시 앱의 메인 페이지(`/`)로 이동하며, 이미 창이 열려 있다면 해당 창을 포커싱합니다.

## 4. 운영 및 문제 해결

### 4.1 수동 알림 발송
- 관리자 권한이 있는 경우 `/api/push/send` (POST)를 통해 자유로운 문구로 전체 공지 알림을 보낼 수 있습니다.

### 4.2 알림이 오지 않을 때
1. **권한 확인**: 브라우저 설정에서 알림 권한이 '허용'인지 확인.
2. **VAPID 키**: `.env.local`의 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`가 Firebase 콘솔의 키와 일치하는지 확인.
3. **토큰 확인**: 개발자 도구 콘솔에서 `Firebase Token:` 로그가 정상적으로 출력되는지 확인.

---

> [!TIP]
> **GitHub Actions 스케줄러 예시**:
> ```yaml
> name: Daily Summary Notification
> on:
>   schedule:
>     - cron: '0 0 * * *' # UTC 00:00 = KST 09:00
> jobs:
>   ping:
>     runs-on: ubuntu-latest
>     steps:
>       - name: Request Daily Summary
>         run: curl -X GET "https://[your-domain]/api/push/daily-summary?secret=${{ secrets.ADMIN_SECRET }}"
> ```
