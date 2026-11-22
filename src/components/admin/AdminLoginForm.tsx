"use client";

import React from 'react';
import controls from '../ScheduleHeader.module.css';
import styles from './AdminLoginForm.module.css';

interface AdminLoginFormProps {
  id: string;
  password: string;
  onIdChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function AdminLoginForm({
  id,
  password,
  onIdChange,
  onPasswordChange,
  onSubmit,
}: AdminLoginFormProps) {
  return (
    <div className={`${controls.theme} ${styles.page}`}>
      <form onSubmit={onSubmit} className={styles.card} aria-labelledby="admin-login-title">
        <h1 id="admin-login-title" className={styles.title}>관리자 로그인</h1>
        <label className={styles.field}>
          아이디
          <input
            type="text"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={id}
            onChange={(e) => onIdChange(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          비밀번호
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
        </label>
        <button type="submit" className={`${controls.button} ${styles.submit}`}>
          로그인
        </button>
      </form>
    </div>
  );
}
