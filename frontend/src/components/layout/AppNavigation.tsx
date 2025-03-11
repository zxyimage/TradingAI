// frontend/src/components/layout/AppNavigation.tsx
"use client"
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BarChart3, TrendingUp, Settings, Database, LineChart } from 'lucide-react';

const navItems = [
  {
    name: '仪表盘',
    href: '/',
    icon: BarChart3
  },
  {
    name: '实时推荐',
    href: '/recommendations',
    icon: TrendingUp
  },
  {
    name: '股票管理',
    href: '/management',
    icon: Settings
  },
  {
    name: '分析',
    href: '/analysis',
    icon: LineChart
  },
  {
    name: '数据库',
    href: '/database',
    icon: Database
  }
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex flex-col space-y-1 w-full">
      {navItems.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== '/' && pathname?.startsWith(item.href));
          
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center py-2 px-4 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}