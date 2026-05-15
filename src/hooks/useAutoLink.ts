"use client";

import { useState } from 'react';
import { WeeklySchedule, CharacterSchedule } from '@/types/schedule';

export type AutoLinkStatus = 'idle' | 'loading' | 'success' | 'detail';

export interface AutoLinkState {
  autoLinkStatus: AutoLinkStatus;
  autoLinkResult: string;
  autoLinkLogs: string[];
  runAutoLink: (editSchedule: WeeklySchedule, currentDate: Date, onScheduleUpdate: (s: WeeklySchedule) => void) => Promise<void>;
}

export function useAutoLink(): AutoLinkState {
  const [autoLinkStatus, setAutoLinkStatus] = useState<AutoLinkStatus>('idle');
  const [autoLinkResult, setAutoLinkResult] = useState('');
  const [autoLinkLogs, setAutoLinkLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setAutoLinkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runAutoLink = async (
    editSchedule: WeeklySchedule,
    currentDate: Date,
    onScheduleUpdate: (s: WeeklySchedule) => void
  ) => {
    setAutoLinkLogs([]);
    setAutoLinkStatus('loading');
    addLog('자동 연결 작업을 시작합니다...');

    let linkedCount = 0;

    const weekDates: { [key: string]: string } = {};
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    days.forEach((day, index) => {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + index);
      const yy = d.getFullYear().toString().slice(2);
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      const dd = d.getDate().toString().padStart(2, '0');
      weekDates[day] = `${yy}${mm}${dd}`;
    });

    addLog(`이번 주 날짜 범위를 계산했습니다. (${Object.values(weekDates)[0]} ~ ${Object.values(weekDates)[6]})`);

    const newSchedule = structuredClone(editSchedule);
    let hasChanges = false;

    for (const char of newSchedule.characters) {
      if (!char.youtubeChannelId) continue;

      addLog(`[${char.name}] 최근 영상을 조회합니다...`);

      try {
        const res = await fetch(`/api/youtube/videos?channelId=${char.youtubeChannelId}`);
        const data = await res.json();

        if (data.videos) {
          addLog(`[${char.name}] ${data.videos.length}개의 최신 영상을 가져왔습니다.`);

          for (const video of data.videos) {
            const title: string = video.title;
            const dateRegex = /(?:20)?(\d{2})[\.\-\/]?(\d{1,2})[\.\-\/]?(\d{2})/;
            const match = title.match(dateRegex);

            if (match) {
              const yy = match[1];
              const mm = match[2].padStart(2, '0');
              const dd = match[3].padStart(2, '0');
              const dateString = `${yy}${mm}${dd}`;

              addLog(`  - [분석] 제목: "${title}" -> 날짜: ${dateString}`);

              const targetDay = Object.keys(weekDates).find(day => weekDates[day] === dateString);

              if (targetDay && char.schedule[targetDay]) {
                let isUpdated = false;
                const updateLog: string[] = [];

                if (char.schedule[targetDay].videoUrl !== video.url) {
                  char.schedule[targetDay].videoUrl = video.url;
                  isUpdated = true;
                  updateLog.push('영상 연결');
                }

                if (!char.schedule[targetDay].content || char.schedule[targetDay].content.trim() === '') {
                  char.schedule[targetDay].content = title;
                  isUpdated = true;
                  updateLog.push('내용 입력');
                }

                if (isUpdated) {
                  hasChanges = true;
                  linkedCount++;
                  const logMsg = `[수정됨] ${targetDay}(${dateString}): ${title} (${updateLog.join(', ')})`;
                  addLog(`✅ ${logMsg}`);
                } else {
                  addLog(`    - 이미 최신 상태입니다.`);
                }
              }
            }
          }
        } else {
          addLog(`[${char.name}] 영상을 가져오지 못했습니다. (데이터 없음)`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        addLog(`[오류] ${char.name} 영상 조회 실패: ${message}`);
      }
    }

    if (hasChanges) {
      onScheduleUpdate(newSchedule);
      setAutoLinkResult(`${linkedCount}개 연결됨 (저장 필요)`);
      addLog(`🎉 완료! ${linkedCount}개의 영상을 새로 연결했습니다. 저장 버튼을 눌러 적용하세요.`);
    } else {
      const resultMsg = '연결할 새로운 영상이 없습니다.';
      setAutoLinkResult(resultMsg);
      addLog(`ℹ️ ${resultMsg}`);
    }
    setAutoLinkStatus('success');
  };

  return {
    autoLinkStatus,
    autoLinkResult,
    autoLinkLogs,
    runAutoLink,
  };
}
