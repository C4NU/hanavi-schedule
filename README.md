# 하나비 스케줄 (Hanabi Schedule)

하나비 버추얼 아이돌의 주간 스케줄을 보여주는 반응형 웹 앱(PWA)입니다.

## ✨ 기능
- **반응형 디자인**: 데스크탑과 모바일 모두 지원
- **PWA 지원**: 홈 화면에 추가하여 앱처럼 사용 가능
- **방송인 필터**: 원하는 방송인만 선택하여 볼 수 있습니다
- **PNG 저장**: 시간표를 이미지로 다운로드할 수 있습니다
- **오프라인 지원**: 서비스 워커를 통한 기본 오프라인 기능
- **실시간 업데이트**: (예정) Google Docs 연동 시 자동 업데이트

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

4.  **개발 서버 실행**
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

## 🔧 기술 스택
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules
- **PWA**: next-pwa
- **Data Fetching**: SWR
- **Export**: html2canvas

## 📝 데이터 편집

현재는 `src/data/rawSchedule.ts` 파일의 데이터를 사용합니다.

Google Docs 연동을 위해서는:
1. `.env.local` 파일 생성
2. `GOOGLE_DOC_URL=<your-google-doc-url>` 추가
3. 서버 재시작

## 🚀 Vercel 배포

1. Vercel에 프로젝트 연결
2. 환경 변수 설정 (필요시):
   - `GOOGLE_DOC_URL`: Google Docs URL
3. 자동 빌드 및 배포

## 📄 라이선스

MIT
