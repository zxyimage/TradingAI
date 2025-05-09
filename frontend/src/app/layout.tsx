// frontend/src/app/layout.tsx - 修改后的版本
import React from 'react';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { Providers } from './providers';

import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AI股票分析系统',
  description: '股票AI分析系统，帮助用户分析股票数据，辅助做决策',
};

// 在适当位置添加导入
import { Toaster } from "@/components/ui/toaster";

// 在 return 语句中的适当位置添加 Toaster 组件
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex-1 container grid gap-12 md:grid-cols-[200px_1fr] py-6">
              <aside className="hidden md:block">
                <AppNavigation />
              </aside>
              <main className="w-full">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}