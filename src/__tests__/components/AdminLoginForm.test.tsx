// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import { resolveLoginCredentials } from '@/utils/adminLogin';

describe('AdminLoginForm browser autofill', () => {
  it('exposes standard field names and autocomplete hints', () => {
    render(
      <AdminLoginForm
        id=""
        password=""
        onIdChange={() => undefined}
        onPasswordChange={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(screen.getByPlaceholderText('아이디').getAttribute('name')).toBe('username');
    expect(screen.getByPlaceholderText('아이디').getAttribute('autocomplete')).toBe('username');
    expect(screen.getByPlaceholderText('비밀번호').getAttribute('name')).toBe('password');
    expect(screen.getByPlaceholderText('비밀번호').getAttribute('autocomplete')).toBe('current-password');
  });

  it('uses values inserted directly into the form by a password manager', () => {
    const form = document.createElement('form');
    const username = document.createElement('input');
    const password = document.createElement('input');
    username.name = 'username';
    username.value = 'autofilled-admin';
    password.name = 'password';
    password.value = 'autofilled-password';
    form.append(username, password);

    expect(resolveLoginCredentials(form, { id: '', password: '' })).toEqual({
      id: 'autofilled-admin',
      password: 'autofilled-password',
    });
  });

  it('falls back to React state when the submitted fields are empty', () => {
    const form = document.createElement('form');
    const username = document.createElement('input');
    const password = document.createElement('input');
    username.name = 'username';
    password.name = 'password';
    form.append(username, password);

    expect(resolveLoginCredentials(form, { id: 'state-admin ', password: 'state-password' })).toEqual({
      id: 'state-admin',
      password: 'state-password',
    });
  });
});
