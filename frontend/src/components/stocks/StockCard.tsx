// frontend/src/components/stocks/StockCard.tsx
import React from 'react';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  getRecommendationClass, 
  formatStockCodeName, 
  getActionColorClass 
} from '@/lib/utils';
import { RankedStock } from '@/lib/types';
import { BarChart2, Activity } from 'lucide-react';

interface StockCardProps {
  stock: RankedStock;
  stockNames: Record<string, string>;
}

export function StockCard({ stock, stockNames }: StockCardProps) {
  const levelClass = getRecommendationClass(stock.recommendation_level);
  const actionClass = getActionColorClass(stock.recommendation_text);
  
  return (
    <Card className={`stock-card ${levelClass} h-full`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          {formatStockCodeName(stock.code, stockNames)}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <p className="font-semibold">价格: {stock.price.toFixed(2)}</p>
          <p className={`${actionClass} font-bold`}>推荐: {stock.recommendation_text}</p>
          
          {stock.ma_relations && stock.ma_relations.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {stock.ma_relations.map((relation, idx) => (
                <span key={idx} className="ma-relation">{relation}</span>
              ))}
            </div>
          )}
          
          {stock.closest_ma && (
            <p className="text-sm text-muted-foreground">{stock.closest_ma}</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex w-full justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link href={`/analysis/${stock.code}`}>
              <BarChart2 className="mr-1 h-4 w-4" />
              分析
            </Link>
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            asChild
          >
            <Link href={`/analysis/${stock.code}`}>
              <Activity className="mr-1 h-4 w-4" />
              详情
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}