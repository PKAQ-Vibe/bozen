import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  Gift,
  GraduationCap,
  History,
  House,
  Layers,
  Leaf,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { getActiveProfile, getRankByPoints } from '@/services';
import ProfileSwitcher from './ProfileSwitcher';
import './AppLayout.css';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: '今日仪表盘', icon: House, end: true },
  { to: '/calendar', label: '学习日历', icon: CalendarDays },
  { to: '/tasks', label: '选课中心', icon: BookOpen },
  { to: '/history', label: '任务历史', icon: History },
  { to: '/subjects', label: '学科中心', icon: GraduationCap },
  { to: '/resources', label: '学习资源', icon: Layers },
  { to: '/shop', label: '积分商城', icon: Gift },
  { to: '/parent', label: '家长管理端', icon: Shield },
];

export default function AppLayout() {
  const { user } = useUser();
  const location = useLocation();
  const onFocus = location.pathname.startsWith('/focus/');
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const profile = getActiveProfile();

  // 专注模式：去掉 Sidebar，全屏沉浸
  if (onFocus) {
    return <Outlet />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__logo">
          <Leaf size={26} color="#5BAD52" />
          <span>学习岛</span>
        </div>
        <div className="sidebar__divider" />
        <nav className="sidebar__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sb-nav-item ${isActive ? 'sb-nav-item--active' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={17} color={isActive ? '#5BAD52' : '#7AAF92'} />
                  <span style={{ color: isActive ? '#E8F5EE' : '#7AAF92' }}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__spacer" />
        <div className="sidebar__divider" />
        <button
          type="button"
          className="sidebar__profile sidebar__profile--btn"
          onClick={() => setSwitcherOpen(true)}
          title="切换孩子档案"
        >
          <div className="sidebar__avatar">{profile.emoji}</div>
          <div className="sidebar__profile-info">
            <div className="sidebar__profile-name">{profile.name}</div>
            <div className="sidebar__profile-rank">
              {getRankByPoints(user.points).label} · {user.points.toLocaleString()} pts
            </div>
          </div>
        </button>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <ProfileSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
}
