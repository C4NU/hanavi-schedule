"use client";

import { useEffect, useRef, type ComponentProps } from 'react';
import { SCHEDULE_BUILD_ID, SCHEDULE_RELEASE_VERSION } from '@/data/scheduleRelease';
import type { CharacterSchedule } from '@/types/schedule';
import { MenuIcon } from '../MobileScheduleMenu';
import controls from '../ScheduleHeader.module.css';
import styles from './AdminSideMenu.module.css';

type Character = CharacterSchedule;

interface AdminSideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  role: string;
  filterMemberId: string | null;
  characters: Character[];
  loggedInChar: Character | undefined;
  onOpenRegularHoliday: () => void;
  onOpenAddMember: () => void;
  onOpenRemoveMember: () => void;
  onFilterMember: (id: string | null) => void;
  onEditMember: (char: Character) => void;
  onOpenPassword: () => void;
  onOpenEmail: () => void;
  onLogout: () => void;
}

function MenuAction({ label, icon, onClick, destructive }: {
  label: string;
  icon: ComponentProps<typeof MenuIcon>['name'];
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button className={styles.row} type="button" onClick={onClick} data-destructive={destructive || undefined}>
      <MenuIcon name={icon} size={16} />
      {label}
    </button>
  );
}

export default function AdminSideMenu({
  isOpen,
  onClose,
  role,
  filterMemberId,
  characters,
  loggedInChar,
  onOpenRegularHoliday,
  onOpenAddMember,
  onOpenRemoveMember,
  onFilterMember,
  onEditMember,
  onOpenPassword,
  onOpenEmail,
  onLogout,
}: AdminSideMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isAdmin = role === 'admin';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const runAndClose = (action: () => void) => {
    dialogRef.current?.close();
    onClose();
    action();
  };

  return (
    <dialog
      id="admin-side-menu"
      ref={dialogRef}
      className={`${controls.theme} ${styles.sidebar}`}
      aria-labelledby="admin-side-menu-title"
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.heading}>
        <h2 id="admin-side-menu-title">관리 메뉴</h2>
        <button
          type="button"
          className={`${controls.button} ${controls.iconButton}`}
          aria-label="관리 메뉴 닫기"
          onClick={onClose}
        >
          <MenuIcon name="close" size={16} />
        </button>
      </div>

      <div className={styles.sidebarBody}>
        {isAdmin && (
          <section className={styles.section} aria-label="멤버 필터">
            <h3>멤버 필터</h3>
            <button
              className={styles.row}
              type="button"
              aria-pressed={!filterMemberId}
              onClick={() => runAndClose(() => onFilterMember(null))}
            >
              <MenuIcon name="people" size={16} />
              전체 보기
            </button>
            <div className={styles.memberGrid}>
              {characters.map(char => (
                <div className={styles.memberRow} key={char.id}>
                  <button
                    className={styles.row}
                    type="button"
                    aria-pressed={filterMemberId === char.id}
                    onClick={() => runAndClose(() => onFilterMember(char.id))}
                  >
                    {char.name}
                  </button>
                  <button
                    className={styles.editMember}
                    type="button"
                    aria-label={`${char.name} 정보 수정`}
                    onClick={() => runAndClose(() => onEditMember(char))}
                  >
                    <MenuIcon name="edit" size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section} aria-label="시간표">
          <h3>시간표</h3>
          <MenuAction label="정기 휴방 관리" icon="calendar" onClick={() => runAndClose(onOpenRegularHoliday)} />
        </section>

        <section className={styles.section} aria-label="멤버 관리">
          <h3>멤버 관리</h3>
          <MenuAction label="멤버 추가" icon="people" onClick={() => runAndClose(onOpenAddMember)} />
          <MenuAction label="멤버 제거" icon="close" onClick={() => runAndClose(onOpenRemoveMember)} destructive />
          {!isAdmin && loggedInChar && (
            <MenuAction label="내 정보 수정" icon="edit" onClick={() => runAndClose(() => onEditMember(loggedInChar))} />
          )}
        </section>

        <section className={styles.section} aria-label="계정">
          <h3>계정</h3>
          <MenuAction label="비밀번호 변경" icon="edit" onClick={() => runAndClose(onOpenPassword)} />
          {isAdmin && <MenuAction label="문의 이메일 변경" icon="message" onClick={() => runAndClose(onOpenEmail)} />}
          <MenuAction label="로그아웃" icon="logout" onClick={onLogout} destructive />
        </section>
        <footer className={styles.buildInfo}>
          <span>버전 <b>{SCHEDULE_RELEASE_VERSION}</b></span>
          <span>빌드 <b>{SCHEDULE_BUILD_ID}</b></span>
        </footer>
      </div>
    </dialog>
  );
}
