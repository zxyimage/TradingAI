// frontend/src/components/forms/StockListForm.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useStocksList, useUpdateStocksList } from '@/hooks/useStocks';

export function StockListForm() {
  const { data: stocksData, isLoading: isLoadingStocks } = useStocksList();
  const updateStocksMutation = useUpdateStocksList();
  
  const [stocksInput, setStocksInput] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // 当数据加载完成后，初始化文本域
  React.useEffect(() => {
    if (stocksData?.stocks) {
      setStocksInput(stocksData.stocks.join(','));
    }
  }, [stocksData]);
  
  const handleUpdateStocks = async () => {
    try {
      const stocks = stocksInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s);
      
      const result = await updateStocksMutation.mutateAsync(stocks);
      
      setMessage({
        text: result.message,
        type: result.success ? 'success' : 'error'
      });
      
      // 5秒后清除消息
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        text: '更新股票列表失败，请稍后重试',
        type: 'error'
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>管理跟踪股票</CardTitle>
        <CardDescription>
          添加或删除要跟踪的股票。使用逗号分隔股票代码，如 US.AAPL,HK.00700
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {message.type === 'success' ? '操作成功' : '操作失败'}
            </AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}
      
        <div className="space-y-2">
          <label htmlFor="stocksList" className="text-sm font-medium">
            股票代码列表
          </label>
          <Textarea
            id="stocksList"
            rows={5}
            placeholder="输入股票代码，以逗号分隔（如 US.AAPL,HK.00700）"
            value={stocksInput}
            onChange={(e) => setStocksInput(e.target.value)}
            disabled={isLoadingStocks || updateStocksMutation.isPending}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleUpdateStocks}
          disabled={isLoadingStocks || updateStocksMutation.isPending}
        >
          {updateStocksMutation.isPending ? '更新中...' : '更新股票列表'}
        </Button>
      </CardFooter>
    </Card>
  );
}