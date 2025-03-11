// frontend/src/app/database/page.tsx
'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Database, RefreshCw } from 'lucide-react';
import { useStoredStocks, useStockNames } from '@/hooks/useStocks';
import { StockTable } from '@/components/stocks/StockTable';
import { formatDate } from '@/lib/utils';

export default function DatabasePage() {
  const { 
    data: storedStocksData, 
    isLoading, 
    refetch,
    isRefetching
  } = useStoredStocks();
  
  const { data: stockNamesData } = useStockNames();
  
  const stockNames = stockNamesData?.stock_names || {};
  
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">数据库视图</h1>
            <p className="text-muted-foreground">
              查看系统中存储的所有股票数据
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
        </div>
      </section>
      
      <Card>
        <CardHeader>
          <CardTitle>数据库摘要</CardTitle>
          <CardDescription>
            系统中存储的股票数据概览
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-md bg-muted"></div>
            </div>
          ) : storedStocksData?.summary ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">股票数量</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {storedStocksData.summary.stock_count}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">总记录数</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {storedStocksData.summary.total_records.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">最早记录</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold">
                    {formatDate(storedStocksData.summary.earliest_date)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">最新记录</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold">
                    {formatDate(storedStocksData.summary.latest_date)}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>无法获取数据</AlertTitle>
              <AlertDescription>
                无法获取数据库摘要信息，请稍后再试。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>存储的股票数据</CardTitle>
          <CardDescription>
            所有股票的最新价格数据和记录统计
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-96 animate-pulse rounded-md bg-muted"></div>
          ) : storedStocksData?.stocks && storedStocksData.stocks.length > 0 ? (
            <StockTable 
              stocks={storedStocksData.stocks} 
              stockNames={stockNames} 
            />
          ) : (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertTitle>暂无数据</AlertTitle>
              <AlertDescription>
                数据库中暂无股票数据。请在管理页面添加要跟踪的股票。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <Alert>
        <Database className="h-4 w-4" />
        <AlertTitle>数据库说明</AlertTitle>
        <AlertDescription>
          本系统使用TimescaleDB存储历史股票数据，使用Redis进行实时数据缓存。数据会在每个交易日收盘后自动更新。
        </AlertDescription>
      </Alert>
    </div>
  );
}