

// frontend/src/app/analysis/page.tsx
'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, BarChart2 } from 'lucide-react';
import { StockSelector } from '@/components/forms/StockSelector';
import { DaySelector } from '@/components/forms/DaySelector';
import Link from 'next/link';
import { useStocksList, useStockNames, useStoredStocks } from '@/hooks/useStocks';

export default function AnalysisPage() {
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<number>(30);
  
  const { data: stocksData } = useStocksList();
  const { data: stockNamesData } = useStockNames();
  const { data: storedStocksData, isLoading: isLoadingStored } = useStoredStocks();
  
  const stockNames = stockNamesData?.stock_names || {};
  
  const mostRecentStocks = React.useMemo(() => {
    if (!storedStocksData?.stocks) return [];
    
    // 按最新更新时间排序
    return [...storedStocksData.stocks]
      .sort((a, b) => {
        const dateA = new Date(a.latest_data.time).getTime();
        const dateB = new Date(b.latest_data.time).getTime();
        return dateB - dateA;
      })
      .slice(0, 8);
  }, [storedStocksData]);
  
  const handleViewAnalysis = () => {
    // 这个函数只是为了让按钮看起来有反应，实际导航由Link组件处理
  };
  
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">股票分析</h1>
        <p className="text-muted-foreground">
          选择股票进行详细技术分析，获取AI交易建议
        </p>
      </section>
      
      <Card>
        <CardHeader>
          <CardTitle>选择股票</CardTitle>
          <CardDescription>
            选择要分析的股票和时间范围
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StockSelector 
              selectedStock={selectedStock} 
              onSelectStock={setSelectedStock} 
            />
            <DaySelector 
              selectedDays={selectedDays} 
              onSelectDays={setSelectedDays} 
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleViewAnalysis}
            disabled={!selectedStock}
            asChild
          >
            <Link href={`/analysis/${selectedStock}`}>
              <BarChart2 className="mr-2 h-4 w-4" />
              查看分析
            </Link>
          </Button>
        </CardFooter>
      </Card>
      
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">最近更新股票</h2>
        
        {isLoadingStored ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="h-[140px] animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 w-3/4 rounded bg-muted"></div>
                    <div className="h-4 w-1/2 rounded bg-muted"></div>
                    <div className="h-4 w-2/3 rounded bg-muted"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : mostRecentStocks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mostRecentStocks.map(stock => {
              const changeClass = stock.latest_data.change_percent && stock.latest_data.change_percent > 0 
                ? 'text-green-600' 
                : stock.latest_data.change_percent && stock.latest_data.change_percent < 0 
                  ? 'text-red-600' 
                  : '';
              
              const changePercent = stock.latest_data.change_percent 
                ? (stock.latest_data.change_percent > 0 ? '+' : '') + stock.latest_data.change_percent.toFixed(2) + '%'
                : '-';
              
              return (
                <Card key={stock.code} className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {stockNames[stock.code] || stock.code}
                    </CardTitle>
                    <CardDescription>
                      {stock.code}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">最新价格</span>
                        <span className="font-medium">
                          {stock.latest_data.close?.toFixed(2) || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">涨跌幅</span>
                        <span className={`font-medium ${changeClass}`}>
                          {changePercent}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      asChild
                    >
                      <Link href={`/analysis/${stock.code}`}>
                        <BarChart2 className="mr-2 h-4 w-4" />
                        查看分析
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>暂无数据</AlertTitle>
            <AlertDescription>
              系统中还没有存储股票数据，请先在管理页面添加股票。
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}