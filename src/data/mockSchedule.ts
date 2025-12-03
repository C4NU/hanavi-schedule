import { WeeklySchedule } from '@/types/schedule';

export const MOCK_SCHEDULE: WeeklySchedule = {
    weekRange: "11.24 - 11.30",
    characters: [
        {
            id: "varessa",
            name: "바레사",
            colorTheme: "varessa",
            avatarUrl: "/avatars/baresa.png",
            schedule: {
                MON: { time: "8:00", content: "MBTI 테스트" },
                TUE: { time: "8:00", content: "이스케이프 프롬 타르코프" },
                WED: { time: "8:00", content: "바레사의 모닝 라디오" },
                THU: { time: "14:00", content: "메이비 합방: 야단법석 쥐스토랑" },
                FRI: { time: "8:00", content: "언더스탠드: 과거에서 온 편지" },
                SAT: { time: "8:00", content: "투더문" },
                SUN: { time: "", content: "바레사 휴방", type: "off" },
            }
        },
        {
            id: "nemu",
            name: "네무",
            colorTheme: "nemu",
            avatarUrl: "/avatars/nemu.png",
            schedule: {
                MON: { time: "", content: "네무 휴방", type: "off" },
                TUE: { time: "12:00", content: "저챗을 가장한 네무 그림뱅" },
                WED: { time: "12:00", content: "60 MINUTES TO EXTINCTION" },
                THU: { time: "12:00", content: "니케 스토리 보기" },
                FRI: { time: "", content: "네무 휴방", type: "off" },
                SAT: { time: "12:00", content: "마크 - 해적이 되자" },
                SUN: { time: "14:00", content: "네무 신의상 공개" },
            }
        },
        {
            id: "maroka",
            name: "마로카",
            colorTheme: "maroka",
            avatarUrl: "/avatars/maroka.png",
            schedule: {
                MON: { time: "14:00", content: "마로카의 노래뱅" },
                TUE: { time: "14:00", content: "MBTI 테스트" },
                WED: { time: "14:00", content: "동물의 숲" },
                THU: { time: "14:00", content: "메이비 합방: 야단법석 쥐스토랑" },
                FRI: { time: "14:00", content: "말랑말랑 두뇌학원" },
                SAT: { time: "14:00", content: "클로버 핏" },
                SUN: { time: "", content: "마로카 휴방", type: "off" },
            }
        },
        {
            id: "mirai",
            name: "미라이",
            colorTheme: "mirai",
            avatarUrl: "/avatars/mirai.png",
            schedule: {
                MON: { time: "", content: "미라이 휴방", type: "off" },
                TUE: { time: "15:00", content: "디지몬 스토리 타임스트레인저" },
                WED: { time: "15:00", content: "디지몬 스토리 타임스트레인저" },
                THU: { time: "", content: "미라이 휴방", type: "off" },
                FRI: { time: "15:00", content: "산나비 DLC" },
                SAT: { time: "15:00", content: "뚜따" },
                SUN: { time: "15:00", content: "미라이 신의상 공개" },
            }
        },
        {
            id: "ruvi",
            name: "루비",
            colorTheme: "ruvi",
            avatarUrl: "/avatars/ruvi.png",
            schedule: {
                MON: { time: "19:00", content: "저챗" },
                TUE: { time: "19:00", content: "저챗" },
                WED: { time: "", content: "루비 휴방", type: "off" },
                THU: { time: "19:00", content: "저챗" },
                FRI: { time: "19:00", content: "저챗" },
                SAT: { time: "", content: "루비 휴방", type: "off" },
                SUN: { time: "16:00", content: "루비 신의상 공개" },
            }
        },
        {
            id: "iriya",
            name: "이리야",
            colorTheme: "iriya",
            avatarUrl: "/avatars/iriya.png",
            schedule: {
                MON: { time: "24:00", content: "음식 월드컵" },
                TUE: { time: "", content: "이리야 휴방", type: "off" },
                WED: { time: "24:00", content: "저챗챗" },
                THU: { time: "14:00", content: "메이비 합방: 야단법석 쥐스토랑" },
                FRI: { time: "24:00", content: "오니기리 샵 시뮬레이터" },
                SAT: { time: "24:00", content: "팔로우 더 미닝" },
                SUN: { time: "", content: "이리야 휴방", type: "off" },
            }
        }
    ]
};
