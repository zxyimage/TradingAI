// frontend/src/components/stocks/RecommendationCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { AnalysisResult } from '@/lib/types';
import {
  formatNumber,
  getActionText,
  getRiskLevelText,
  getRecommendationLevelText
} from '@/lib/utils';

interface RecommendationCardProps {
  analysis: AnalysisResult;
  stockCode: string;
  stockName?: string;
}

export function RecommendationCard({ analysis, stockCode, stockName }: RecommendationCardProps) {
  const { analysis: technicalAnalysis, recommendations, timestamp } = analysis;
  
  // 根据建议动作设置样式
  let actionClass = 'text-yellow-600';
  if (recommendations.action === 'BUY') {
    actionClass = 'text-green-600';
  } else if (recommendations.action === 'SELL') {
    actionClass = 'text-red-600';
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>
          {stockCode} {stockName ? `- ${stockName}` : ''}
        </CardTitle>
        <CardDescription>
          更新时间: {new Date(timestamp).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">技术指标</h4>
            <div className="space-y-2">
              <div className="grid grid-cols-2">
                <span className="text-muted-foreground">最新价格</span>
                <span className="font-medium">{formatNumber(technicalAnalysis.latest_price)}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-muted-foreground">5日均线</span>
                <span className="font-medium">{formatNumber(technicalAnalysis.ma5 || technicalAnalysis.ema5)}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-muted-foreground">10日均线</span>
                <span className="font-medium">{formatNumber(technicalAnalysis.ma10 || technicalAnalysis.ema10)}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-muted-foreground">20日均线</span>
                <span className="font-medium">{formatNumber(technicalAnalysis.ma20 || technicalAnalysis.ema20)}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-muted-foreground">30日均线</span>
                <span className="font-medium">{formatNumber(technicalAnalysis.ma30 || technicalAnalysis.ema30)}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-muted-foreground">60日均线</span>
                <span className="font-medium">{formatNumber(technicalAnalysis.ma60 || technicalAnalysis.ema60)}</span>
              </div>
            </div>
            
            {technicalAnalysis.ma5_diff !== undefined && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">均线差异</h4>
                <div className="space-y-2">
                  {technicalAnalysis.ma5_diff !== undefined && (
                    <div className="grid grid-cols-2">
                      <span className="text-muted-foreground">相对MA5</span>
                      <span className={technicalAnalysis.ma5_diff >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {technicalAnalysis.ma5_diff >= 0 ? '+' : ''}{technicalAnalysis.ma5_diff.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {technicalAnalysis.ma10_diff !== undefined && (
                    <div className="grid grid-cols-2">
                      <span className="text-muted-foreground">相对MA10</span>
                      <span className={technicalAnalysis.ma10_diff >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {technicalAnalysis.ma10_diff >= 0 ? '+' : ''}{technicalAnalysis.ma10_diff.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {technicalAnalysis.ma20_diff !== undefined && (
                    <div className="grid grid-cols-2">
                      <span className="text-muted-foreground">相对MA20</span>
                      <span className={technicalAnalysis.ma20_diff >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {technicalAnalysis.ma20_diff >= 0 ? '+' : ''}{technicalAnalysis.ma20_diff.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div>
            <h4 className="font-medium mb-3">交易建议</h4>
            <div className="p-3 border rounded-md bg-muted/10 mb-4">
              <h3 className={`text-lg font-bold text-center ${actionClass}`}>
                建议：{getActionText(recommendations.action)}
              </h3>
              <p className="mt-2">置信度: <span className="font-semibold">{(recommendations.confidence * 100).toFixed(0)}%</span></p>
              <p>风险水平: <span className="font-semibold">{getRiskLevelText(recommendations.risk_level)}</span></p>
              {recommendations.recommendation_level !== undefined && (
                <p>推荐级别: <span className="font-semibold">{getRecommendationLevelText(recommendations.recommendation_level)}</span></p>
              )}
            </div>
            
            <h5 className="font-medium mb-2">建议理由</h5>
            <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
              {recommendations.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 border rounded-md bg-green-50 dark:bg-green-950/30">
                <p className="text-xs text-muted-foreground">支撑位</p>
                <p className="text-green-600 font-semibold">
                  {recommendations.support_level ? recommendations.support_level.toFixed(2) : '无数据'}
                </p>
              </div>
              
              <div className="p-2 border rounded-md bg-red-50 dark:bg-red-950/30">
                <p className="text-xs text-muted-foreground">阻力位</p>
                <p className="text-red-600 font-semibold">
                  {recommendations.resistance_level ? recommendations.resistance_level.toFixed(2) : '无数据'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          免责声明：以上分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。
        </p>
      </CardContent>
    </Card>
  );
}