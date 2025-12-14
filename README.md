# 하나비 스케줄 (Hanabi Schedule)

하나비 버추얼 아이돌의 주간 스케줄을 보여주는 반응형 웹 앱(PWA)입니다.

## ✨ 기능
- **반응형 디자인**: 데스크탑과 모바일 모두 지원
- **PWA 지원**: 홈 화면에 추가하여 앱처럼 사용 가능
- **방송인 필터**: 원하는 방송인만 선택하여 볼 수 있습니다
- **이미지 저장**: 시간표를 이미지로 다운로드하거나 공유할 수 있습니다 (Web Share API)
- **캘린더 저장**: 주간 스케줄을 .ics 파일로 내보내어 캘린더에 등록할 수 있습니다
- **오프라인 지원**: 서비스 워커를 통한 기본 오프라인 기능
- **푸시 알림**: 스케줄 업데이트 시 브라우저 알림 수신 (Firebase Cloud Messaging)
- **관리자 페이지**: `/admin` 경로를 통해 스케줄 직접 수정 및 관리 가능
- **데이터베이스**: Supabase 연동을 통한 안정적인 데이터 관리

## 🚀 시작하기

### 필수 요구사항
- Node.js 20.x 이상
- npm 또는 yarn

### 설치 방법

1.  **저장소 클론**
    ```bash
    git clone https://github.com/C4NU/hanavi_schedule.git
    cd hanavi_schedule
    ```

2.  **의존성 설치**
    ```bash
    npm install
    ```

3.  **환경 변수 설정**
    `.env.local.sample` 파일을 참고하여 `.env.local` 파일을 생성하고 필요한 변수를 설정합니다.

4.  **💾 Supabase 데이터베이스 설정**
    - **SQL 쿼리 실행**: `supabase/setup_full.sql` 파일의 내용을 Supabase SQL Editor에서 실행하여 테이블과 정책을 일괄 생성합니다. (원클릭 설정)
    - **유저 시딩 (초기 계정 생성)**:
      ```bash
      # .env.local에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있어야 합니다.
      npx tsx scripts/seed_auth.ts
      ```

5.  **개발 서버 실행**
    ```bash
    npm run dev
    ```

## 📱 PWA 설치 (모바일)

### iOS (Safari)
1. Safari에서 사이트 접속
2. 공유 버튼 (상단 또는 하단) 클릭
3. "홈 화면에 추가" 선택
4. 이름 확인 후 "추가"

### Android (Chrome)
1. Chrome에서 사이트 접속
2. 메뉴 (⋮) 클릭
3. "홈 화면에 추가" 또는 "앱 설치" 선택

### Desktop (Chrome/Edge)
1. 주소창 오른쪽의 설치 아이콘 클릭
2. "설치" 버튼 클릭

## 🎨 사용 방법

### 방송인 필터
- "필터" 버튼을 클릭하여 필터 패널 열기
- 원하는 방송인을 체크/해제
- "전체 선택" 또는 "전체 해제"로 빠른 설정

### 이미지/캘린더 저장
- "이미지로 저장" 버튼: 현재 스케줄을 이미지 파일로 저장하거나 공유
- "캘린더로 저장" 버튼: 스케줄을 캘린더 앱에 추가할 수 있는 파일로 내보내기

### 알림 설정
- 최초 접속 시 또는 "알림 설정" 버튼을 통해 알림 권한 요청
- "허용" 시 스케줄 업데이트 알림 수신 가능

## 🔧 기술 스택
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **PWA**: next-pwa
- **Data Fetching**: SWR
- **Export**: html2canvas, ics
- **Notifications**: Firebase Cloud Messaging (FCM)

## 📝 데이터 편집 (관리자 페이지)

이제 구글 시트 대신 내장된 **관리자 페이지**에서 편리하게 스케줄을 수정할 수 있습니다.

1. 브라우저 주소창 뒤에 `/admin`을 입력하여 접속합니다. (예: `http://localhost:3000/admin`)
2. 초기 설정된 관리자 계정으로 로그인합니다. (기본 시딩 시 ID: `admin`, PW: `admin123`)
3. 웹 UI에서 직관적으로 스케줄을 수정하고 **"저장"** 버튼을 누르면 즉시 반영됩니다.

## 🚀 Vercel 배포

1. Vercel에 프로젝트 연결
2. 환경 변수 설정 (다음 항목들을 설정해야 합니다):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
3. 자동 빌드 및 배포




## 📄 라이선스

MIT
