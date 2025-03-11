

//frontend/src/components/stocks/StockTable.tsx
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { StoredStock } from '@/lib/types';
import { 
  formatDate, 
  formatNumber, 
  formatPercent, 
  getPercentColorClass,
  formatStockCodeName
} from '@/lib/utils';
import { BarChart2, Eye } from 'lucide-react';

interface StockTableProps {
  stocks: StoredStock[];
  stockNames: Record<string, string>;
}

export function StockTable({ stocks, stockNames }: StockTableProps) {
  if (!stocks || stocks.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        暂无股票数据
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>股票代码</TableHead>
            <TableHead>最新日期</TableHead>
            <TableHead>最新收盘价</TableHead>
            <TableHead>涨跌幅</TableHead>
            <TableHead>最高价</TableHead>
            <TableHead>最低价</TableHead>
            <TableHead>成交量</TableHead>
            <TableHead>记录数量</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.map((stock) => {
            const changeClass = getPercentColorClass(stock.latest_data.change_percent);
            
            return (
              <TableRow key={stock.code}>
                <TableCell className="font-medium">
                  {formatStockCodeName(stock.code, stockNames)}
                </TableCell>
                <TableCell>{formatDate(stock.latest_data.time)}</TableCell>
                <TableCell>{formatNumber(stock.latest_data.close)}</TableCell>
                <TableCell className={changeClass}>
                  {formatPercent(stock.latest_data.change_percent)}
                </TableCell>
                <TableCell>{formatNumber(stock.latest_data.high)}</TableCell>
                <TableCell>{formatNumber(stock.latest_data.low)}</TableCell>
                <TableCell>
                  {stock.latest_data.volume ? stock.latest_data.volume.toLocaleString() : '-'}
                </TableCell>
                <TableCell>{stock.stats.record_count}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/analysis/${stock.code}`}>
                        <BarChart2 className="mr-1 h-3 w-3" />
                        图表
                      </Link>
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/analysis/${stock.code}`}>
                        <Eye className="mr-1 h-3 w-3" />
                        详情
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}