// frontend/src/components/charts/MovingAverageChart.tsx
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
import { formatDate, calculateMovingAverage } from '@/lib/utils';

interface MovingAverageChartProps {
  data: StockData[];
  stockCode: string;
}

export function MovingAverageChart({ data, stockCode }: MovingAverageChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>移动均线图表</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  // 提取收盘价
  const closePrices = data.map(item => item.close);
  
  // 计算移动平均线
  const ma5Data = calculateMovingAverage(closePrices, 5);
  const ma10Data = calculateMovingAverage(closePrices, 10);
  const ma20Data = calculateMovingAverage(closePrices, 20);
  const ma30Data = calculateMovingAverage(closePrices, 30);
  const ma60Data = calculateMovingAverage(closePrices, 60);
  
  // 准备图表数据
  const chartData = data.map((item, index) => ({
    date: formatDate(item.time),
    close: item.close,
    ma5: ma5Data[index],
    ma10: ma10Data[index],
    ma20: ma20Data[index],
    ma30: ma30Data[index],
    ma60: ma60Data[index]
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{stockCode} 移动均线</CardTitle>
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
                return window.innerWidth < 768 ? value.slice(5) : value;
              }}
            />
            <YAxis 
              domain={['auto', 'auto']}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              labelFormatter={(value) => `日期: ${value}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#4f46e5"
              name="收盘价"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="ma5"
              stroke="#f59e0b"
              dot={false}
              strokeDasharray="5 5"
              name="5日均线"
            />
            <Line
              type="monotone"
              dataKey="ma10"
              stroke="#8b5cf6"
              dot={false}
              strokeDasharray="5 5"
              name="10日均线"
            />
            <Line
              type="monotone"
              dataKey="ma20"
              stroke="#f97316"
              dot={false}
              strokeDasharray="5 5"
              name="20日均线"
            />
            <Line
              type="monotone"
              dataKey="ma30"
              stroke="#06b6d4"
              dot={false}
              strokeDasharray="3 3"
              name="30日均线"
            />
            <Line
              type="monotone"
              dataKey="ma60"
              stroke="#ef4444"
              dot={false}
              strokeDasharray="3 3"
              name="60日均线"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}