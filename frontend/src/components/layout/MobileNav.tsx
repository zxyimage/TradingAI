

// frontend/src/components/layout/MobileNav.tsx
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  TrendingUp, 
  Settings, 
  Database, 
  LineChart, 
  Menu,
  X
} from 'lucide-react';

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

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center p-2 text-muted-foreground"
        aria-label="Toggle Menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="flex flex-col h-full p-4">
            <div className="flex justify-end mb-8">
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-muted-foreground"
                aria-label="Close Menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname?.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center py-3 px-4 rounded-md text-base font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
