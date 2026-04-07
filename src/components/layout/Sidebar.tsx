import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { getStoredUser, isAdminUser, subscribeSessionChange } from '../../lib/session';

type NavItem = {
  label: string;
  to: string;
  group: string;
  icon: ReactNode;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { group: '메인', label: '대쉬보드', to: '/dashboard', icon: <SidebarIconDashboard /> },
  { group: '문서', label: '문서 작성', to: '/doc-create', icon: <SidebarIconPen /> },
  { group: '문서', label: '발행 이력', to: '/doc-history', icon: <SidebarIconHistory /> },
  { group: '문서', label: '수주대장', to: '/order-book', icon: <SidebarIconList /> },
  { group: '관리', label: '납품처 관리', to: '/master-client', icon: <SidebarIconUsers /> },
  { group: '관리', label: '품목 관리', to: '/master-product', icon: <SidebarIconBox /> },
  { group: '관리', label: '공급자 관리', to: '/master-supplier', icon: <SidebarIconStore /> },
  { group: '관리자', label: '계정 관리', to: '/account', icon: <SidebarIconSettings />, adminOnly: true },
];

const groupedItems = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
  acc[item.group] ??= [];
  acc[item.group].push(item);
  return acc;
}, {});

export default function Sidebar() {
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => subscribeSessionChange(() => setUser(getStoredUser())), []);

  const visibleGroups = Object.entries(groupedItems)
    .map(([group, items]) => [
      group,
      items.filter((item) => (!item.adminOnly ? true : isAdminUser(user))),
    ] as const)
    .filter(([, items]) => items.length > 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-nav">
        {visibleGroups.map(([group, items]) => (
          <section key={group} className="sidebar-section">
            <div className="sidebar-section-title">{group}</div>
            <div className="sidebar-links">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
                >
                  <span className="sidebar-link-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="sidebar-link-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="sidebar-user-card">
        <div className="sidebar-user-avatar">{(user?.name ?? '관').slice(0, 1)}</div>
        <div className="sidebar-user-meta">
          <strong>{user?.name ?? '관리자'}</strong>
          <span>{user?.rank || '업무 시스템'}</span>
        </div>
      </div>
    </aside>
  );
}

function SidebarIconDashboard() {
  return (
    <svg viewBox="0 0 24 24" className="sidebar-svg-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="4" width="6.5" height="9.5" rx="1.2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="16.5" width="6.5" height="3.5" rx="1.2" />
    </svg>
  );
}

function SidebarIconPen() {
  return (
    <svg viewBox="0 0 24 24" className="sidebar-svg-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20H5l1.2-4.2L15.6 6.4a1.8 1.8 0 0 1 2.5 0l1.5 1.5a1.8 1.8 0 0 1 0 2.5L10.2 19.8 12 20Z" />
      <path d="m14.5 7.5 2 2" />
    </svg>
  );
}

function SidebarIconHistory() {
  return (
    <svg viewBox="0 0 24 24" className="sidebar-svg-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 12a8.5 8.5 0 1 0 2.49-6.01" />
      <path d="M3.5 4.5v4h4" />
      <path d="M12 7.5V12l3 1.75" />
    </svg>
  );
}

function SidebarIconList() {
  return (
    <svg viewBox="0 0 24 24" className="sidebar-svg-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6.5h10" />
      <path d="M9 12h10" />
      <path d="M9 17.5h10" />
      <circle cx="5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SidebarIconUsers() {
  return (
    <svg viewBox="0 0 24 24" className="sidebar-svg-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M4.5 18.5a4.5 4.5 0 0 1 9 0" />
      <path d="M17 11a2.5 2.5 0 1 0 0-5" />
      <path d="M16 18.5a4 4 0 0 1 4-4" />
    </svg>
  );
}

function SidebarIconBox() {
  return (
    <svg viewBox="0 0 24 24" className="sidebar-svg-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3.8 7 3.7v8.9l-7 3.8-7-3.8V7.5l7-3.7Z" />
      <path d="m5.3 7.2 6.7 3.6 6.7-3.6" />
      <path d="M12 10.9v9" />
    </svg>
  );
}

function SidebarIconStore() {
  return (
    <svg viewBox="0 0 24 24" className="sidebar-svg-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 8.5 6 4.8h12l1.5 3.7" />
      <path d="M5 8.5h14v2a2 2 0 0 1-2 2h-1.5a2.5 2.5 0 0 1-2-1 2.5 2.5 0 0 1-4 0 2.5 2.5 0 0 1-2 1H7a2 2 0 0 1-2-2v-2Z" />
      <path d="M7.5 12.5v6.7h9v-6.7" />
    </svg>
  );
}

function SidebarIconSettings() {
  return (
    <svg viewBox="0 0 24 24" className="sidebar-svg-icon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 1.2 2.4 2.7.5-.8 2.6 1.9 2-1.9 2 .8 2.6-2.7.5L12 21l-1.2-2.4-2.7-.5.8-2.6-1.9-2 1.9-2-.8-2.6 2.7-.5L12 3Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

