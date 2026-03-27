import type { PropsWithChildren } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}

