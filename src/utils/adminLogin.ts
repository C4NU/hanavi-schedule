export interface LoginCredentials {
  id: string;
  password: string;
}

export function resolveLoginCredentials(
  form: HTMLFormElement,
  fallback: LoginCredentials,
): LoginCredentials {
  const formData = new FormData(form);
  const submittedId = formData.get('username');
  const submittedPassword = formData.get('password');

  return {
    id: typeof submittedId === 'string' && submittedId !== ''
      ? submittedId.trim()
      : fallback.id.trim(),
    password: typeof submittedPassword === 'string' && submittedPassword !== ''
      ? submittedPassword
      : fallback.password,
  };
}
