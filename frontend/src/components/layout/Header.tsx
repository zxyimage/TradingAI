
// frontend/src/components/layout/Header.tsx
"use client"
import React from 'react';
import Link from 'next/link';
import { MobileNav } from './MobileNav';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center">
          <MobileNav />
          <Link href="/" className="flex items-center space-x-2">
            <span className="hidden sm:inline-block font-bold text-xl">sAI分析系统</span>
            <span className="sm:hidden font-bold text-xl">sAI</span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <p className="text-sm text-muted-foreground">当前日期: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </header>
  );
}