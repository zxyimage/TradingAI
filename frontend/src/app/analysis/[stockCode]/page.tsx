// frontend/src/app/analysis/[stockCode]/page.tsx
'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, RefreshCw, TrendingUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatStockCodeName } from '@/lib/utils';
import { DaySelector } from '@/components/forms/DaySelector';
import { useStockData, useStockAllData, useStockNames } from '@/hooks/useStocks';
import { useRealtimeAnalysis } from '@/hooks/useAnalysis';
import { StockPriceChart } from '@/components/charts/StockPriceChart';
import { MovingAverageChart } from '@/components/charts/MovingAverageChart';
import { VolumeChart } from '@/components/charts/VolumeChart';
import { AnalysisResultComponent } from '@/components/stocks/AnalysisResult';
import { RecommendationCard } from '@/components/stocks/RecommendationCard';

export default function StockAnalysisPage() {
  const params = useParams();
  const stockCode = params.stockCode as string;
  
  const [selectedDays, setSelectedDays] = useState(30);
  const [activeTab, setActiveTab] = useState('price');
  
  // 获取股票数据
  const { 
    data: stockData, 
    isLoading: isLoadingStock, 
    error: stockError,
    refetch: refetchStockData,
    isRefetching: isRefetchingStock 
  } = useStockData(stockCode, selectedDays);
  
  // 获取所有股票数据和基本信息
  const { 
    data: allStockData, 
    isLoading: isLoadingAllStock 
  } = useStockAllData(stockCode);
  
  // 获取实时分析
  const { 
    data: realtimeAnalysis, 
    isLoading: isLoadingRealtime,
    refetch: refetchRealtime,
    isRefetching: isRefetchingRealtime
  } = useRealtimeAnalysis(stockCode);
  
  // 获取股票名称
  const { data: stockNamesData } = useStockNames();
  const stockNames = stockNamesData?.stock_names || {};
  
  // 股票名称
  const stockName = stockNames[stockCode];
  
  // 处理刷新
  const handleRefresh = () => {
    refetchStockData();
    refetchRealtime();
  };
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Link href="/analysis" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-3xl font-bold">
              {formatStockCodeName(stockCode, stockNames)}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {allStockData?.info?.stock_type} 
            {allStockData?.info?.stock_child_type ? ` / ${allStockData.info.stock_child_type}` : ''}
            {allStockData?.info?.listing_date ? ` • 上市日期: ${formatDate(allStockData.info.listing_date)}` : ''}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <DaySelector 
            selectedDays={selectedDays} 
            onSelectDays={setSelectedDays} 
            label="时间范围"
          />
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isRefetchingStock || isRefetchingRealtime}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetchingStock || isRefetchingRealtime ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>价格图表</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStock ? (
                <div className="h-[300px] animate-pulse rounded-md bg-muted"></div>
              ) : stockError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>加载失败</AlertTitle>
                  <AlertDescription>
                    无法加载股票数据，请稍后再试。
                  </AlertDescription>
                </Alert>
              ) : !stockData?.data || stockData.data.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>没有数据</AlertTitle>
                  <AlertDescription>
                    没有找到 {stockCode} 的数据。
                  </AlertDescription>
                </Alert>
              ) : (
                <Tabs 
                  defaultValue="price" 
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList>
                    <TabsTrigger value="price">价格图表</TabsTrigger>
                    <TabsTrigger value="ma">均线图表</TabsTrigger>
                    <TabsTrigger value="volume">成交量</TabsTrigger>
                  </TabsList>
                  <TabsContent value="price">
                    <StockPriceChart 
                      data={stockData.data} 
                      stockCode={stockCode} 
                    />
                  </TabsContent>
                  <TabsContent value="ma">
                    <MovingAverageChart 
                      data={stockData.data} 
                      stockCode={stockCode} 
                    />
                  </TabsContent>
                  <TabsContent value="volume">
                    <VolumeChart 
                      data={stockData.data} 
                      stockCode={stockCode} 
                    />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
          
          {stockData?.data && stockData.data.length > 0 && stockData.analysis && (
            <Card>
              <CardHeader>
                <CardTitle>历史数据分析</CardTitle>
                <CardDescription>
                  基于历史数据的技术分析和交易建议
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalysisResultComponent analysis={stockData.analysis} />
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>实时分析</CardTitle>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>
                基于实时价格数据的AI分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRealtime ? (
                <div className="space-y-4">
                  <div className="h-24 animate-pulse rounded-md bg-muted"></div>
                  <div className="h-48 animate-pulse rounded-md bg-muted"></div>
                </div>
              ) : !realtimeAnalysis?.success || !realtimeAnalysis.analysis ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>无实时数据</AlertTitle>
                  <AlertDescription>
                    {realtimeAnalysis?.message || '暂无实时分析数据，请稍后再试。'}
                  </AlertDescription>
                </Alert>
              ) : (
                <RecommendationCard 
                  analysis={realtimeAnalysis.analysis} 
                  stockCode={stockCode}
                  stockName={stockName}
                />
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>股票信息</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAllStock ? (
                <div className="space-y-4">
                  <div className="h-24 animate-pulse rounded-md bg-muted"></div>
                </div>
              ) : !allStockData?.info ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>无股票信息</AlertTitle>
                  <AlertDescription>
                    暂无股票基本信息。
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2">
                    <span className="text-muted-foreground">股票代码</span>
                    <span className="font-medium">{allStockData.info.code}</span>
                  </div>
                  
                  <div className="grid grid-cols-2">
                    <span className="text-muted-foreground">股票名称</span>
                    <span className="font-medium">{allStockData.info.name || '-'}</span>
                  </div>
                  
                  <div className="grid grid-cols-2">
                    <span className="text-muted-foreground">每手股数</span>
                    <span className="font-medium">{allStockData.info.lot_size || '-'}</span>
                  </div>
                  
                  <div className="grid grid-cols-2">
                    <span className="text-muted-foreground">股票类型</span>
                    <span className="font-medium">
                      {allStockData.info.stock_type || '-'} 
                      {allStockData.info.stock_child_type && ` / ${allStockData.info.stock_child_type}`}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2">
                    <span className="text-muted-foreground">上市日期</span>
                    <span className="font-medium">
                      {allStockData.info.listing_date ? formatDate(allStockData.info.listing_date) : '-'}
                    </span>
                  </div>
                  
                  {allStockData.data && (
                    <div className="grid grid-cols-2">
                      <span className="text-muted-foreground">历史数据量</span>
                      <span className="font-medium">{allStockData.data.length} 条记录</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>免责声明</AlertTitle>
            <AlertDescription>
              以上分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}