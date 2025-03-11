// frontend/src/components/charts/StockPriceChart.tsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockData } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface StockPriceChartProps {
  data: StockData[];
  stockCode: string;
}

export function StockPriceChart({ data, stockCode }: StockPriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>股票价格图表</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  // 准备图表数据
  const chartData = data.map(item => ({
    ...item,
    date: formatDate(item.time),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{stockCode} 价格图表</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
              tickFormatter={(value) => {
                // 在小屏幕上显示更短的日期格式
                return window.innerWidth < 768 ? value.slice(5) : value;
              }}
            />
            <YAxis 
              domain={['auto', 'auto']}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              labelFormatter={(value) => `日期: ${value}`}
              formatter={(value, name) => {
                const formattedName = name === 'close' ? '收盘价' :
                                      name === 'open' ? '开盘价' :
                                      name === 'high' ? '最高价' :
                                      name === 'low' ? '最低价' : name;
                return [value, formattedName];
              }}
            />
            <Legend 
              formatter={(value) => {
                return value === 'close' ? '收盘价' :
                       value === 'open' ? '开盘价' :
                       value === 'high' ? '最高价' :
                       value === 'low' ? '最低价' : value;
              }}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#4f46e5"
              activeDot={{ r: 8 }}
              name="收盘价"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="high"
              stroke="#ef4444"
              dot={false}
              name="最高价"
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke="#3b82f6"
              dot={false}
              name="最低价"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

