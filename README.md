# 하나비 스케줄 (Hanabi Schedule)

하나비 버추얼 아이돌의 주간 스케줄을 보여주는 반응형 웹 앱(PWA)입니다.

## ✨ 기능
- **반응형 디자인**: 데스크탑과 모바일 모두 지원
- **PWA 지원**: 홈 화면에 추가하여 앱처럼 사용 가능
- **방송인 필터**: 원하는 방송인만 선택하여 볼 수 있습니다
- **PNG 저장**: 시간표를 이미지로 다운로드할 수 있습니다
- **오프라인 지원**: 서비스 워커를 통한 기본 오프라인 기능
- **푸시 알림**: 스케줄 업데이트 시 브라우저 알림 수신 (Web Push)
- **실시간 업데이트**: Google Sheets 연동을 통한 데이터 자동 업데이트

## 🚀 시작하기

### 필수 요구사항
- Node.js 20.x 이상
- npm 또는 yarn

### 설치 방법

1.  **저장소 클론**
    ```bash
    git clone <repository-url>
    cd hanavi_schedule
    ```

2.  **Node.js 버전 확인 및 설정** (nvm 사용 시)
    ```bash
    nvm install 20
    nvm use 20
    ```

3.  **의존성 설치**
    ```bash
    npm install
    ```

4.  **환경 변수 설정**
    `.env.local` 파일을 생성하고 다음 변수들을 설정합니다:
    ```env
    # Google Sheets
    GOOGLE_SHEET_ID=your_sheet_id
    GOOGLE_SERVICE_ACCOUNT_EMAIL=your_email
    GOOGLE_PRIVATE_KEY="your_private_key"

    # Web Push (VAPID Keys)
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
    VAPID_PRIVATE_KEY=your_private_key
    VAPID_SUBJECT=mailto:your_email@example.com

    # Admin
    ADMIN_SECRET=your_admin_secret_key

    # Cron (Supabase/External Scheduler)
    CRON_SECRET=your_cron_bearer_token
    ```

5.  **개발 서버 실행**
    ```bash
    npm run dev
    ```
    브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

### 프로덕션 빌드

```bash
npm run build
npm start
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

### PNG 저장
- "PNG 저장" 버튼 클릭
- 현재 화면의 시간표가 이미지로 다운로드됩니다

### 알림 설정
- 최초 접속 시 또는 "알림 설정" 버튼을 통해 알림 권한 요청
- "허용" 시 스케줄 업데이트 알림 수신 가능

## 🔧 기술 스택
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **PWA**: next-pwa
- **Data Fetching**: SWR
- **Export**: html2canvas
- **Notifications**: Web Push API

## 📝 데이터 편집

Google Sheets를 통해 데이터를 관리합니다.
1. Google Cloud Console에서 서비스 계정 생성 및 키 발급
2. Google Sheet에 서비스 계정 이메일 공유 (뷰어 권한)
3. 환경 변수 설정 (위의 설치 방법 참고)

## 🚀 Vercel 배포

1. Vercel에 프로젝트 연결
2. 환경 변수 설정:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`
   - `CRON_SECRET`
3. 자동 빌드 및 배포

## ⏱️ 크론 (배경 푸시)
- `/api/cron/check-schedule?mode=detect` : 변경 감지만 하고 플래그 설정 (3분 주기 추천)
- `/api/cron/check-schedule?mode=notify` : 변경 플래그가 있을 때만 푸시 전송 (10분 주기 추천)
- 기본값 `mode=direct` 는 감지+전송을 한 번에 수행 (수동 테스트용)
- 호출 시 `Authorization: Bearer ${CRON_SECRET}` 헤더를 함께 보내세요.

## 📄 라이선스

MIT
