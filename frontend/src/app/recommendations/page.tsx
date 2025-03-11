// frontend/src/app/recommendations/page.tsx
'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useRankedStocks } from '@/hooks/useRecommendations';
import { useStockNames } from '@/hooks/useStocks';
import { StockCard } from '@/components/stocks/StockCard';
import { RankedStock } from '@/lib/types';

export default function RecommendationsPage() {
  const { 
    data: rankedStocksData, 
    isLoading: isLoadingRanked,
    refetch,
    isRefetching
  } = useRankedStocks();
  
  const { data: stockNamesData } = useStockNames();
  const stockNames = stockNamesData?.stock_names || {};
  
  const [filter, setFilter] = useState<string>('all');
  
  // 格式化更新时间
  const formattedUpdateTime = rankedStocksData?.updated_at 
    ? new Date(rankedStocksData.updated_at).toLocaleString()
    : '';
  
  // 过滤股票
  const filteredStocks = React.useMemo(() => {
    if (!rankedStocksData?.stocks) return [];
    
    let stocks = [...rankedStocksData.stocks];
    
    if (filter === 'recommended') {
      // 只显示推荐级别 1-3 的股票
      stocks = stocks.filter(stock => stock.recommendation_level <= 3);
    } else if (filter === 'watchlist') {
      // 只显示推荐级别 4-5 的股票
      stocks = stocks.filter(stock => stock.recommendation_level >= 4 && stock.recommendation_level <= 5);
    } else if (filter === 'not-recommended') {
      // 只显示不推荐的股票
      stocks = stocks.filter(stock => stock.recommendation_level === 6);
    }
    
    return stocks;
  }, [rankedStocksData, filter]);
  
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">实时推荐</h1>
            <p className="text-muted-foreground">
              基于均线策略的实时股票推荐
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>实时股票推荐</CardTitle>
              <CardDescription>
                {formattedUpdateTime 
                  ? `更新时间: ${formattedUpdateTime}` 
                  : '数据加载中...'}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="filter-select" className="text-sm">筛选:</Label>
              <Select
                value={filter}
                onValueChange={setFilter}
              >
                <SelectTrigger id="filter-select" className="w-[180px]">
                  <SelectValue placeholder="选择筛选条件" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部股票</SelectItem>
                  <SelectItem value="recommended">推荐买入 (1-3级)</SelectItem>
                  <SelectItem value="watchlist">建议关注 (4-5级)</SelectItem>
                  <SelectItem value="not-recommended">不推荐 (6级)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRanked ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
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
          ) : filteredStocks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStocks.map(stock => (
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
              <AlertTitle>没有符合条件的股票</AlertTitle>
              <AlertDescription>
                当前没有符合筛选条件的股票，请尝试更改筛选条件或稍后再查看。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">推荐级别说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="recommendation-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">强烈推荐 (1级)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>当前价格低于60日均线，提供很好的买入机会。风险水平较低。</p>
            </CardContent>
          </Card>
          
          <Card className="recommendation-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">推荐 (2级)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>当前价格低于30日均线，提供较好的买入机会。风险水平较低。</p>
            </CardContent>
          </Card>
          
          <Card className="recommendation-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">考虑买入 (3级)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>当前价格低于20日均线，可考虑买入。风险水平中等。</p>
            </CardContent>
          </Card>
          
          <Card className="recommendation-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">关注 (4级)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>当前价格低于10日均线，建议关注。风险水平中等。</p>
            </CardContent>
          </Card>
          
          <Card className="recommendation-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">轻度关注 (5级)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>当前价格低于5日均线，可轻度关注。风险水平中等。</p>
            </CardContent>
          </Card>
          
          <Card className="recommendation-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">不推荐 (6级)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>当前价格高于所有均线，建议观望。风险水平较高。</p>
            </CardContent>
          </Card>
        </div>
      </section>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>免责声明</AlertTitle>
        <AlertDescription>
          以上分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。
        </AlertDescription>
      </Alert>
    </div>
  );
}