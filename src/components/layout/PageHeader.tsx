import type { ReactNode } from 'react';

interface Props {
  title: string;
  sub?: string;
  extra?: ReactNode;
  /** 家长端专用：深棕主题（对应原型 H5 #4A3420） */
  variant?: 'default' | 'parent';
  /** 标题栏左侧图标（可选） */
  icon?: ReactNode;
}

export default function PageHeader({ title, sub, extra, variant = 'default', icon }: Props) {
  return (
    <header className={`page-header page-header--${variant}`}>
      {icon && <span className="page-header__icon">{icon}</span>}
      <div className="page-header__title-wrap">
        <div className="page-header__title">{title}</div>
        {sub && <div className="page-header__sub">{sub}</div>}
      </div>
      <div className="page-header__spacer" />
      {extra}
    </header>
  );
}
