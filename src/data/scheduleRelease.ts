// 공개 What's New와 관리자 빌드 정보가 공유하는 서비스 릴리즈.
export const SCHEDULE_RELEASE_VERSION = '2.1.1';

export const SCHEDULE_BUILD_ID = process.env.NEXT_PUBLIC_SCHEDULE_BUILD_ID
    || (process.env.NODE_ENV === 'development' ? '로컬 개발' : '미제공');
