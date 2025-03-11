// frontend/frontend/src/components/charts/VolumeChart.tsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockData } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface VolumeChartProps {
  data: StockData[];
  stockCode: string;
}

// 定义图表数据项的接口
interface ChartDataItem {
  date: string;
  volume: number | null;
  trend: 'up' | 'down' | 'neutral';
}

export function VolumeChart({ data, stockCode }: VolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>成交量图表</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  // 准备图表数据
  const chartData: ChartDataItem[] = data.map(item => ({
    date: formatDate(item.time),
    volume: item.volume,
    // 根据价格变动设置颜色
    trend: item.close && item.open 
      ? (item.close > item.open ? 'up' : 'down') 
      : 'neutral',
  }));

  // 定义趋势对应的颜色
  const getColorByTrend = (trend: 'up' | 'down' | 'neutral'): string => {
    switch (trend) {
      case 'up': return '#10b981'; // 绿色
      case 'down': return '#ef4444'; // 红色
      default: return '#6b7280'; // 灰色
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{stockCode} 成交量</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value: string) => {
                return window.innerWidth < 768 ? value.slice(5) : value;
              }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(1)}k`;
                } else {
                  return value.toString();
                }
              }}
            />
            <Tooltip 
              labelFormatter={(value: string) => `日期: ${value}`}
              formatter={(value: any, name: string) => {
                // 格式化成交量显示
                if (typeof value === 'number') {
                  if (value >= 1000000) {
                    return [`${(value / 1000000).toFixed(2)}M`, '成交量'];
                  } else if (value >= 1000) {
                    return [`${(value / 1000).toFixed(2)}k`, '成交量'];
                  }
                }
                return [value, '成交量'];
              }}
            />
            <Bar 
              dataKey="volume" 
              name="成交量"
              fill="#6b7280" // 默认填充颜色
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorByTrend(entry.trend)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}