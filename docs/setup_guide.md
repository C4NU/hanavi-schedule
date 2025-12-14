# 하나비 스케줄 (Hanavi Schedule) - 초보자를 위한 셋업 가이드 📚

이 가이드는 개발 지식이 없는 분들도 차근차근 따라 하면 나만의 스케줄 웹사이트를 만들 수 있도록 작성되었습니다.
Next.js 16과 Tailwind CSS v4 최신 기술을 사용하여 빠르고 예쁜 사이트를 만듭니다.

---

## 📖 용어 설명 (먼저 읽어보세요!)

시작하기 전에, 자주 나오는 낯선 단어들을 설명해 드릴게요.

*   **PWA (프로그레시브 웹 앱)**: 웹사이트지만 앱처럼 설치해서 쓸 수 있는 기술입니다. 아이폰/안드로이드 홈 화면에 추가할 수 있습니다.
*   **환경 변수 (.env)**: 비밀번호나 설정값들을 모아둔 "비밀 금고"입니다. 코드에 직접 적으면 남들이 볼 수 있어서 따로 관리합니다.
*   **API Key**: "열쇠"입니다. Supabase 데이터베이스나 외부 서비스 문을 열 때 사용합니다.
*   **Vercel (버셀)**: "웹사이트 배포 도구"입니다. 우리가 만든 코드를 인터넷에서 누구나 볼 수 있는 주소(`https://...`)로 만들어줍니다.
*   **SQL**: 데이터베이스와 대화하는 언어입니다. 우리가 제공하는 `setup_full.sql` 파일을 실행하면 컴퓨터가 알아서 데이터베이스를 만들어줍니다.
*   **VAPID Key**: "신분증"입니다. 푸시 알림을 보낼 때 "이건 스팸이 아니라 내가 보내는 거야"라고 증명하는 암호 키입니다.

---

## 1. 준비물 챙기기

다음 사이트들에 미리 가입해두세요. (모두 무료로 시작할 수 있습니다)
1.  **GitHub**: 코드 저장소 (아이디/비밀번호 기억하기)
2.  **Vercel**: 웹사이트 배포 (GitHub 아이디로 로그인)
3.  **Firebase**: 데이터베이스 및 푸시 알림 (구글 아이디로 로그인)
4.  **Google Cloud Platform**: 구글 시트 연동 (구글 아이디로 로그인)

---

## 2. Firebase 프로젝트 설정

구독자 명단(토큰) 저장과 푸시 알림 전송을 위해 Firebase를 설정합니다.

1.  [Firebase Console](https://console.firebase.google.com/)에 접속하여 **"프로젝트 추가"**를 누릅니다.
2.  이름을 짓고 단계를 진행하여 프로젝트를 생성합니다.
3.  **Firestore Database** 메뉴로 이동하여 **"데이터베이스 만들기"**를 누릅니다.
    *   위치: 가까운 곳 (예: `asia-northeast3` 등)
    *   보안 규칙: **프로덕션 모드**에서 시작
4.  데이터베이스가 생성되면 **규칙** 탭으로 이동하여 아래 규칙을 복사해 붙여넣고 **게시**합니다.
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if false; // 기본적으로 외부 접근 차단 (서버에서만 접근)
        }
      }
    }
    ```
5.  **프로젝트 설정** (톱니바퀴 아이콘) > **서비스 계정** 탭으로 이동합니다.
6.  **"새 비공개 키 생성"** 버튼을 눌러 JSON 파일을 다운로드합니다. (이 안에 `PROJECT_ID`, `CLIENT_EMAIL`, `PRIVATE_KEY`가 다 들어있습니다.)

---

## 3. 데이터베이스 만들기 (Supabase)

일정 데이터를 저장할 데이터베이스를 만듭니다. 우리는 **Supabase**라는 아주 편리한 도구를 사용합니다.

1.  [Supabase](https://supabase.com)에 접속하여 회원가입/로그인합니다.
2.  **"New Project"**를 눌러 새 프로젝트를 만듭니다.
    *   Name: `hanavi-schedule` (자유)
    *   Database Password: **꼭 기억해두세요!** (혹은 "Generate a password" 사용)
    *   Region: `Seoul` (가까울수록 빠릅니다)
3.  프로젝트가 생성될 때까지 잠시 기다립니다. (약 1~2분)
4.  왼쪽 메뉴에서 **SQL Editor** 아이콘을 클릭합니다.
5.  이 프로젝트의 `supabase/setup_full.sql` 파일 내용을 복사해서, SQL Editor에 붙여넣고 **Run** 버튼을 누릅니다. (테이블과 설정이 자동으로 완료됩니다!)
6.  **Settings (톱니바퀴)** > **API** 메뉴로 이동합니다.
7.  여기에 있는 `Project URL`과 `anon public` 키, `service_role` 키를 나중에 사용할 것입니다.

---

## 4. 푸시 알림 키 만들기 (VAPID)

알림을 보내기 위한 신분증을 만드는 과정입니다.

1.  이 프로젝트를 컴퓨터에 다운로드했다면, 터미널(검은 화면)을 엽니다.
2.  아래 명령어를 입력하고 엔터를 칩니다.
    ```bash
    npx web-push generate-vapid-keys
    ```
3.  화면에 나온 `Public Key`와 `Private Key`를 메모장에 잘 적어두세요.

---

## 5. 웹사이트 배포하기 (Vercel)

이제 진짜 웹사이트를 인터넷에 올립니다.

1.  [Vercel](https://vercel.com)에 로그인하고 **"Add New..."** -> **"Project"**를 누릅니다.
2.  GitHub에 있는 이 프로젝트(`hanavi_schedule`)를 선택하고 **"Import"**를 누릅니다.
3.  **Environment Variables (환경 변수)** 섹션을 펼칩니다. 여기가 제일 중요합니다!
4.  아래 표를 보고 하나씩 입력하고 **Add**를 누르세요.

| 이름 (Key) | 값 (Value) | 설명 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Supabase 설정 > API 페이지 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public | Supabase 설정 > API 페이지 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role | Supabase 설정 > API 페이지 (⚠️ 절대 외부에 유출 금지) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 아까 만든 Public Key | 4번 단계에서 만든 것 |
| `FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | Firebase JSON의 `project_id` |
| `FIREBASE_CLIENT_EMAIL` | Firebase 서비스 계정 이메일 | Firebase JSON의 `client_email` |
| `FIREBASE_PRIVATE_KEY` | Firebase 서비스 계정 키 | Firebase JSON의 `private_key` (전체 복사) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase 클라이언트 설정 | 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase 클라이언트 설정 | 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 클라이언트 설정 | 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase 클라이언트 설정 | 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성 |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase 클라이언트 설정 | 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase 클라이언트 설정 | 프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성 |

5.  다 입력했으면 **"Deploy"** 버튼을 누릅니다.
6.  폭죽이 터지면 성공입니다! 🎉

---



---

## ❓ 자주 묻는 질문

**Q. 알림이 안 와요!**
A. 아이패드/아이폰은 홈 화면에 **"공유 -> 홈 화면에 추가"**를 해야만 알림이 옵니다. 앱을 설치하고 실행한 뒤 알림 권한을 허용해주세요.

**Q. 스케줄을 바꿨는데 바로 알림이 안 와요.**
A. 보통 즉시 오지만, 네트워크 상황에 따라 몇 초 정도 걸릴 수 있습니다.

**Q. "구독됨"이라고 뜨는데 알림이 안 와요.**
A. 키가 바뀌었을 수 있습니다. **[2. 강제 재구독]** 버튼을 눌러보세요.

