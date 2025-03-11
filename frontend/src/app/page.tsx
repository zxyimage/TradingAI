

// frontend/src/app/page.tsx
'use client';

import React, { useState } from 'react';
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
import { DaySelector } from '@/components/forms/DaySelector';
import { StockSelector } from '@/components/forms/StockSelector';
import { StockPriceChart } from '@/components/charts/StockPriceChart';
import { MovingAverageChart } from '@/components/charts/MovingAverageChart';
import { VolumeChart } from '@/components/charts/VolumeChart';
import { useStockData, useStockNames } from '@/hooks/useStocks';
import { AnalysisResultComponent } from '@/components/stocks/AnalysisResult';
import { AlertCircle, BarChart2, TrendingUp } from 'lucide-react';
import { useRankedStocks } from '@/hooks/useRecommendations';
import { StockCard } from '@/components/stocks/StockCard';
import Link from 'next/link';

export default function DashboardPage() {
  const [selectedStock, setSelectedStock] = useState('');
  const [selectedDays, setSelectedDays] = useState(30);
  
  // 获取股票数据
  const { data: stockData, isLoading: isLoadingStock, error: stockError } = 
    useStockData(selectedStock, selectedDays);
  
  // 获取股票名称
  const { data: stockNamesData } = useStockNames();
  
  // 获取推荐股票
  const { 
    data: rankedStocksData, 
    isLoading: isLoadingRanked 
  } = useRankedStocks();
  
  // 获取股票名称映射
  const stockNames = stockNamesData?.stock_names || {};
  
  // 顶级推荐股票
  const topRecommendations = rankedStocksData?.stocks?.filter(
    stock => stock.recommendation_level <= 3
  ).slice(0, 3) || [];
  
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">仪表盘</h1>
        <p className="text-muted-foreground">
          欢迎使用sAI股票分析系统，帮助您做出更明智的投资决策
        </p>
      </section>
      
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">实时推荐</h2>
        {isLoadingRanked ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-[180px] animate-pulse">
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
        ) : topRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {topRecommendations.map(stock => (
              <StockCard 
                key={stock.code} 
                stock={stock} 
                stockNames={stockNames} 
              />
            ))}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>没有股票推荐</AlertTitle>
            <AlertDescription>
              目前没有符合推荐条件的股票，请稍后再查看。
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-end">
          <Button asChild variant="outline">
            <Link href="/recommendations">
              <TrendingUp className="mr-2 h-4 w-4" />
              查看全部推荐
            </Link>
          </Button>
        </div>
      </section>
      
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">快速分析</h2>
        <Card>
          <CardHeader>
            <CardTitle>选择股票查看分析</CardTitle>
            <CardDescription>
              选择股票和时间范围进行分析
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
            
            {!selectedStock ? (
              <div className="text-center py-12 text-muted-foreground">
                请选择股票查看分析
              </div>
            ) : isLoadingStock ? (
              <div className="space-y-4">
                <div className="h-[300px] animate-pulse rounded-md bg-muted"></div>
              </div>
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
                  没有找到 {selectedStock} 的数据。
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-8">
                <Tabs defaultValue="price" className="w-full">
                  <TabsList>
                    <TabsTrigger value="price">价格图表</TabsTrigger>
                    <TabsTrigger value="ma">均线图表</TabsTrigger>
                    <TabsTrigger value="volume">成交量</TabsTrigger>
                  </TabsList>
                  <TabsContent value="price">
                    <StockPriceChart 
                      data={stockData.data} 
                      stockCode={selectedStock} 
                    />
                  </TabsContent>
                  <TabsContent value="ma">
                    <MovingAverageChart 
                      data={stockData.data} 
                      stockCode={selectedStock} 
                    />
                  </TabsContent>
                  <TabsContent value="volume">
                    <VolumeChart 
                      data={stockData.data} 
                      stockCode={selectedStock} 
                    />
                  </TabsContent>
                </Tabs>
                
                {stockData.analysis && (
                  <AnalysisResultComponent analysis={stockData.analysis} />
                )}
                
                <div className="flex justify-end">
                  <Button asChild>
                    <Link href={`/analysis/${selectedStock}`}>
                      <BarChart2 className="mr-2 h-4 w-4" />
                      查看详细分析
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}