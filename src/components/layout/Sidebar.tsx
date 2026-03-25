import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getStoredUser, isAdminUser, subscribeSessionChange } from '../../lib/session';

type NavItem = {
  label: string;
  to: string;
  group: string;
};

const navItems: NavItem[] = [
  { group: '메인', label: '대시보드', to: '/dashboard' },
  { group: '문서', label: '문서 작성', to: '/doc-create' },
  { group: '문서', label: '발행 이력', to: '/doc-history' },
  { group: '문서', label: '수주대장', to: '/order-book' },
  { group: '관리', label: '납품처 관리', to: '/master-client' },
  { group: '관리', label: '품목 관리', to: '/master-product' },
  { group: '관리', label: '공급자 관리', to: '/master-supplier' },
  { group: '관리자', label: '계정 관리', to: '/account' },
];

const groupedItems = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
  acc[item.group] ??= [];
  acc[item.group].push(item);
  return acc;
}, {});

export default function Sidebar() {
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => subscribeSessionChange(() => setUser(getStoredUser())), []);

  const visibleGroups = Object.entries(groupedItems).filter(([group]) =>
    group === '관리자' ? isAdminUser(user) : true,
  );

  return (
    <aside className="sidebar">
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
                {item.label}
              </NavLink>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}
