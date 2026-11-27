"use client";

import { replayPlatform, replayWriteColumn } from '@/utils/scheduleReplay';
import { useState } from 'react';
import { WeeklySchedule } from '@/types/schedule';
import type { ReplayCandidate } from '@/types/replay';
import { updateScheduleItem, updateSchedulePart } from '@/utils/scheduleEditor';

export type AutoLinkStatus = 'idle' | 'loading' | 'success' | 'detail';

export interface AutoLinkState {
  autoLinkStatus: AutoLinkStatus;
  autoLinkResult: string;
  autoLinkLogs: string[];
  previewCandidates: ReplayCandidate[] | null;
  runAutoLink: (editSchedule: WeeklySchedule, currentDate: Date, accessToken: string, onScheduleUpdate: (s: WeeklySchedule) => void, preview?: boolean) => Promise<void>;
}

export function useAutoLink(): AutoLinkState {
  const [autoLinkStatus, setAutoLinkStatus] = useState<AutoLinkStatus>('idle');
  const [autoLinkResult, setAutoLinkResult] = useState('');
  const [autoLinkLogs, setAutoLinkLogs] = useState<string[]>([]);
  const [previewCandidates, setPreviewCandidates] = useState<ReplayCandidate[] | null>(null);

  const addLog = (message: string) => {
    setAutoLinkLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runAutoLink = async (
    editSchedule: WeeklySchedule,
    currentDate: Date,
    accessToken: string,
    onScheduleUpdate: (s: WeeklySchedule) => void,
    preview = false,
  ) => {
    setAutoLinkLogs([]);
    setPreviewCandidates(null);
    const candidates: ReplayCandidate[] = [];
    setAutoLinkStatus('loading');
    addLog(preview ? '저장 없이 연결 후보를 확인합니다.' : '자동 연결 작업을 시작합니다...');

    let linkedCount = 0;
    let failedCount = 0;
    let fetchedCount = 0;

    const weekDates: Record<string, string> = {};
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    days.forEach((day, index) => {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + index);
      const year = d.getFullYear();
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      const dd = d.getDate().toString().padStart(2, '0');
      weekDates[day] = `${year}-${mm}-${dd}`;
    });

    addLog(`이번 주 날짜 범위를 계산했습니다. (${Object.values(weekDates)[0]} ~ ${Object.values(weekDates)[6]})`);

    let newSchedule = structuredClone(editSchedule);
    let hasChanges = false;

    for (const char of newSchedule.characters) {
      if (!char.youtubeChannelId || char.status === 'graduated') continue;

      addLog(`[${char.name}] 최근 영상을 조회합니다...`);

      try {
        const query = new URLSearchParams({ channelId: char.youtubeChannelId });
        const res = await fetch(`/api/youtube/videos?${query}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.videos)) {
          throw new Error(data.error || '영상 조회에 실패했습니다.');
        }

        fetchedCount++;
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

            const targetDay = Object.keys(weekDates).find(day => weekDates[day].slice(2).replaceAll('-', '') === dateString);

            if (targetDay && char.schedule[targetDay]) {
              const updateLog: string[] = [];
              const currentCharacter = newSchedule.characters.find((candidate) => candidate.id === char.id);
              const currentItem = currentCharacter?.schedule[targetDay];
              if (!currentItem || currentItem.type === 'off' || replayPlatform(video.url) !== 'youtube') continue;
              const candidatesForDay = currentItem.parts?.flatMap((part, index) =>
                part.type !== 'off' && !part.placeholder ? [{ part, index }] : []
              ) ?? [{ part: currentItem, index: 0 }];
              if (candidatesForDay.some(({ part }) => part.videoUrl === video.url || part.alternateVideoUrl === video.url)) continue;
              const candidate = candidatesForDay.length === 1
                ? candidatesForDay[0]
                : candidatesForDay.find(({ part }) => !part.videoUrl && !part.alternateVideoUrl);
              if (!candidate) continue;
              const { part: target, index: partIndex } = candidate;
              const column = replayWriteColumn({
                video_url: target.videoUrl ?? null,
                alternate_video_url: target.alternateVideoUrl || null,
              }, video.url);
              if (!column) continue;
              const field = column === 'video_url' ? 'videoUrl' : 'alternateVideoUrl';
              newSchedule = currentItem.parts?.length
                ? updateSchedulePart(newSchedule, char.id, targetDay, partIndex, field, video.url)
                : updateScheduleItem(newSchedule, char.id, targetDay, field, video.url);
              updateLog.push('다시보기 링크');

              const updatedCharacter = newSchedule.characters.find((candidate) => candidate.id === char.id);
              const updatedItem = updatedCharacter?.schedule[targetDay];
              const updatedPart = updatedItem?.parts?.[partIndex];
              if (!(updatedPart?.content ?? updatedItem?.content)?.trim()) {
                newSchedule = updatedItem?.parts?.length
                  ? updateSchedulePart(newSchedule, char.id, targetDay, partIndex, 'content', title)
                  : updateScheduleItem(newSchedule, char.id, targetDay, 'content', title);
                updateLog.push('빈 방송 제목 채우기');
              }

              hasChanges = true;
              linkedCount++;
              candidates.push({
                member: char.name,
                date: weekDates[targetDay],
                scheduleTitle: target.content,
                videoTitle: title,
                url: video.url,
                changes: updateLog,
              });
              const logMsg = `[${preview ? '후보' : '수정됨'}] ${targetDay}(${dateString}): ${title} (${updateLog.join(', ')})`;
              addLog(`✅ ${logMsg}`);
            }
          }
        }
      } catch (err: unknown) {
        failedCount++;
        const message = err instanceof Error ? err.message : String(err);
        addLog(`[오류] ${char.name} 영상 조회 실패: ${message}`);
      }
    }

    if (preview) {
      if (fetchedCount || !failedCount) {
        setPreviewCandidates(candidates.sort((a, b) => a.date.localeCompare(b.date)));
        setAutoLinkResult(`저장 없이 연결 후보 ${linkedCount}개를 찾았습니다.`);
      }
    } else if (hasChanges) {
      onScheduleUpdate(newSchedule);
      setAutoLinkResult(`${linkedCount}개 연결됨 (저장 필요)`);
      addLog(`🎉 완료! ${linkedCount}개의 영상을 새로 연결했습니다. 저장 버튼을 눌러 적용하세요.`);
    } else if (!failedCount) {
      const resultMsg = '연결할 새로운 영상이 없습니다.';
      setAutoLinkResult(resultMsg);
      addLog(`ℹ️ ${resultMsg}`);
    }
    if (failedCount) {
      const message = `영상 조회에 실패한 채널 ${failedCount}개가 있습니다. 위 로그를 확인해 주세요.`;
      addLog(message);
      if (!hasChanges) setAutoLinkResult(message);
    }
    setAutoLinkStatus('success');
  };

  return {
    autoLinkStatus,
    autoLinkResult,
    autoLinkLogs,
    previewCandidates,
    runAutoLink,
  };
}
