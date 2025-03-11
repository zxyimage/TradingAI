

// frontend/src/app/management/page.tsx
'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, ServerIcon } from 'lucide-react';
import { StockListForm } from '@/components/forms/StockListForm';

export default function ManagementPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">股票管理</h1>
        <p className="text-muted-foreground">
          管理要跟踪的股票列表，添加或删除股票。
        </p>
      </section>
      
      <div className="grid gap-6 md:grid-cols-2">
        <StockListForm />
        
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">股票代码格式</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>港股: <code>HK.{'{代码}'}</code> 例如 <code>HK.00700</code></li>
                <li>美股: <code>US.{'{代码}'}</code> 例如 <code>US.AAPL</code></li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">注意事项</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>股票代码必须严格按照格式输入，否则无法获取数据</li>
                <li>由于API限制，建议每次最多添加50支股票</li>
                <li>股票代码之间使用英文逗号分隔</li>
                <li>添加新股票后，可能需要等待数据更新才能在分析中看到</li>
              </ul>
            </div>
            
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>数据更新说明</AlertTitle>
              <AlertDescription>
                系统会在交易日收盘后自动更新股票数据。香港市场数据在香港时间16:00后更新，美国市场数据在美东时间16:00后更新。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
      
      <Alert>
        <ServerIcon className="h-4 w-4" />
        <AlertTitle>后端系统</AlertTitle>
        <AlertDescription>
          本系统使用FastAPI作为后端服务，通过Futu OpenD接口获取股票数据。数据存储在TimescaleDB中，使用Redis进行实时数据缓存。
        </AlertDescription>
      </Alert>
    </div>
  );
}