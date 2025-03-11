// frontend/src/components/stocks/AnalysisResult.tsx
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { AnalysisResult } from '@/lib/types';
import {
  formatNumber,
  formatPercent,
  getPercentColorClass,
  getActionText,
  getRiskLevelText
} from '@/lib/utils';

interface AnalysisResultProps {
  analysis: AnalysisResult;
}

export function AnalysisResultComponent({ analysis }: AnalysisResultProps) {
  const { recommendations, analysis: technicalAnalysis } = analysis;
  
  // 根据建议动作设置样式
  let actionClass = 'text-yellow-600';
  if (recommendations.action === 'BUY') {
    actionClass = 'text-green-600';
  } else if (recommendations.action === 'SELL') {
    actionClass = 'text-red-600';
  }

  // 涨跌幅样式
  const changeClass = getPercentColorClass(technicalAnalysis.price_change_percent);
  
  return (
    <Tabs defaultValue="technical">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="technical">技术指标</TabsTrigger>
        <TabsTrigger value="recommendations">交易建议</TabsTrigger>
      </TabsList>
      
      <TabsContent value="technical">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>技术分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="grid grid-cols-2">
                  <span className="text-muted-foreground">最新收盘价</span>
                  <span className="font-medium">{formatNumber(technicalAnalysis.latest_price)}</span>
                </div>
                
                <div className="grid grid-cols-2">
                  <span className="text-muted-foreground">价格变动</span>
                  <span className={`font-medium ${changeClass}`}>
                    {formatNumber(technicalAnalysis.price_change)} ({formatPercent(technicalAnalysis.price_change_percent)})
                  </span>
                </div>
                
                <div className="grid grid-cols-2">
                  <span className="text-muted-foreground">5日均价</span>
                  <span className="font-medium">{formatNumber(technicalAnalysis.ema5)}</span>
                </div>
                
                <div className="grid grid-cols-2">
                  <span className="text-muted-foreground">10日均价</span>
                  <span className="font-medium">{formatNumber(technicalAnalysis.ema10)}</span>
                </div>
                
                <div className="grid grid-cols-2">
                  <span className="text-muted-foreground">20日均价</span>
                  <span className="font-medium">{formatNumber(technicalAnalysis.ema20)}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2">
                  <span className="text-muted-foreground">30日均价</span>
                  <span className="font-medium">{formatNumber(technicalAnalysis.ema30)}</span>
                </div>
                
                <div className="grid grid-cols-2">
                  <span className="text-muted-foreground">60日均价</span>
                  <span className="font-medium">{formatNumber(technicalAnalysis.ema60)}</span>
                </div>
                
                <div className="grid grid-cols-2">
                  <span className="text-muted-foreground">RSI(14)</span>
                  <span className="font-medium">{technicalAnalysis.rsi ? technicalAnalysis.rsi.toFixed(2) : '-'}</span>
                </div>
                
                <div className="grid grid-cols-2">
                  <span className="text-muted-foreground">MACD</span>
                  <span className="font-medium">{technicalAnalysis.macd ? technicalAnalysis.macd.toFixed(2) : '-'}</span>
                </div>
                
                <div className="grid grid-cols-2">
                  <span className="text-muted-foreground">成交量</span>
                  <span className="font-medium">{technicalAnalysis.volume ? technicalAnalysis.volume.toLocaleString() : '-'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="recommendations">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>交易建议</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col items-center p-4 border rounded-md bg-muted/20">
                <h3 className={`text-xl font-bold ${actionClass}`}>
                  {getActionText(recommendations.action)}
                </h3>
                <p className="mt-2">
                  置信度: <span className="font-semibold">{(recommendations.confidence * 100).toFixed(0)}%</span>
                </p>
                <p className="mt-1">
                  风险水平: <span className="font-semibold">{getRiskLevelText(recommendations.risk_level)}</span>
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">建议理由</h4>
                <ul className="list-disc pl-6 space-y-1">
                  {recommendations.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-md bg-green-50 dark:bg-green-950/30">
                  <p className="text-sm text-muted-foreground">支撑位</p>
                  <p className="text-green-600 font-bold">
                    {recommendations.support_level ? recommendations.support_level.toFixed(2) : '无数据'}
                  </p>
                </div>
                
                <div className="p-3 border rounded-md bg-red-50 dark:bg-red-950/30">
                  <p className="text-sm text-muted-foreground">阻力位</p>
                  <p className="text-red-600 font-bold">
                    {recommendations.resistance_level ? recommendations.resistance_level.toFixed(2) : '无数据'}
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                分析时间: {new Date(analysis.timestamp).toLocaleString()}
              </p>
              
              <p className="text-xs text-muted-foreground">
                免责声明：以上分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}