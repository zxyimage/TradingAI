

// frontend/src/components/forms/StockSelector.tsx
import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatStockCodeName } from '@/lib/utils';
import { useStocksList, useStockNames } from '@/hooks/useStocks';

interface StockSelectorProps {
  selectedStock: string;
  onSelectStock: (code: string) => void;
  label?: string;
}

export function StockSelector({ selectedStock, onSelectStock, label = '股票代码' }: StockSelectorProps) {
  const { data: stocksData, isLoading: isLoadingStocks } = useStocksList();
  const { data: stockNamesData } = useStockNames();
  
  const stockNames = stockNamesData?.stock_names || {};
  
  return (
    <div className="space-y-2">
      <Label htmlFor="stock-selector">{label}</Label>
      <Select
        value={selectedStock}
        onValueChange={onSelectStock}
        disabled={isLoadingStocks}
      >
        <SelectTrigger id="stock-selector">
          <SelectValue placeholder="选择股票代码" />
        </SelectTrigger>
        <SelectContent>
          {stocksData?.stocks?.map((stock) => (
            <SelectItem key={stock} value={stock}>
              {formatStockCodeName(stock, stockNames)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}