import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="contents [font-family:var(--font-pretendard),sans-serif]">{children}</div>;
}
