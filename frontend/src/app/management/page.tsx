

// frontend/src/app/management/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InfoIcon, ServerIcon, Trash2, Plus, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// 修改导入，使用 api.ts 中的函数
import { getStocksList, updateStocksList } from '@/lib/api';
import { useStockNames } from '@/hooks/useStocks';

export default function ManagementPage() {
  const [stocks, setStocks] = useState<string[]>([]);
  const [newStock, setNewStock] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { data: stockNamesData } = useStockNames();
  const stockNames = stockNamesData?.stock_names || {};

  // 获取当前跟踪的股票列表
  useEffect(() => {
    const fetchStocks = async () => {
      setIsLoading(true);
      try {
        // 使用 api.ts 中的 getStocksList 函数
        const response = await getStocksList();
        
        if (response.success && response.stocks) {
          setStocks(response.stocks);
        }
      } catch (error) {
        console.error('获取股票列表失败:', error);
        toast({
          title: '获取股票列表失败',
          description: '无法从服务器获取股票列表，请稍后再试。',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStocks();
  }, [toast]);

  // 添加新股票 (保持不变)
  const handleAddStock = () => {
    if (!newStock.trim()) return;
    
    // 验证股票代码格式
    const stockPattern = /^(HK\.\d{5}|US\.[A-Z]+)$/;
    if (!stockPattern.test(newStock)) {
      toast({
        title: '格式错误',
        description: '股票代码格式不正确，请使用正确的格式（如HK.00700或US.AAPL）',
        variant: 'destructive'
      });
      return;
    }
    
    // 检查是否已存在
    if (stocks.includes(newStock)) {
      toast({
        title: '股票已存在',
        description: `${newStock} 已在列表中`,
        variant: 'destructive'
      });
      return;
    }
    
    setStocks([...stocks, newStock]);
    setNewStock('');
  };

  // 删除股票 (保持不变)
  const handleDeleteStock = (stockToDelete: string) => {
    setStocks(stocks.filter(stock => stock !== stockToDelete));
  };

  // 保存股票列表
  const handleSaveStocks = async () => {
    setIsSaving(true);
    try {
      // 使用 api.ts 中的 updateStocksList 函数
      const response = await updateStocksList(stocks);
      
      if (response.success) {
        toast({
          title: '保存成功',
          description: '股票列表已成功更新',
        });
      } else {
        toast({
          title: '保存失败',
          description: response.message || '更新股票列表时出错',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('保存股票列表失败:', error);
      toast({
        title: '保存失败',
        description: '无法保存股票列表，请稍后再试',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">股票管理</h1>
        <p className="text-muted-foreground">
          管理要跟踪的股票列表，添加或删除股票。
        </p>
      </section>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>股票列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex space-x-2">
                  <Input
                    placeholder="输入股票代码 (如 HK.00700)"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
                  />
                  <Button onClick={handleAddStock}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加
                  </Button>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>股票代码</TableHead>
                        <TableHead>股票名称</TableHead>
                        <TableHead className="w-[80px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stocks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            暂无股票，请添加
                          </TableCell>
                        </TableRow>
                      ) : (
                        stocks.map((stock) => (
                          <TableRow key={stock}>
                            <TableCell className="font-medium">{stock}</TableCell>
                            <TableCell>{stockNames[stock] || '-'}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteStock(stock)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveStocks} 
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    保存更改
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">股票代码格式</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>港股: <code>HK.{'{代码}'}</code> 例如 <code>HK.00700</code></li>
                <li>美股: <code>US.{'{代码}'}</code> 例如 <code>US.AAPL</code></li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">注意事项</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>股票代码必须严格按照格式输入，否则无法获取数据</li>
                <li>由于API限制，建议每次最多添加50支股票</li>
                <li>添加或删除股票后，必须点击"保存更改"才会生效</li>
                <li>添加新股票后，可能需要等待数据更新才能在分析中看到</li>
              </ul>
            </div>
            
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>数据更新说明</AlertTitle>
              <AlertDescription>
                系统会在交易日收盘后自动更新股票数据。香港市场数据在香港时间16:00后更新，美国市场数据在美东时间16:00后更新。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
      
      <Alert>
        <ServerIcon className="h-4 w-4" />
        <AlertTitle>后端系统</AlertTitle>
        <AlertDescription>
          本系统使用FastAPI作为后端服务，通过Futu OpenD接口获取股票数据。数据存储在TimescaleDB中，使用Redis进行实时数据缓存。
        </AlertDescription>
      </Alert>
    </div>
  );
}