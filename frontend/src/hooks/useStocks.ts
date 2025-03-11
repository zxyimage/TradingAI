// frontend/src/hooks/useStocks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStocksList, updateStocksList, getStockData, getStockAllData, getStockNames, getStoredStocks } from '@/lib/api';

// 获取所有跟踪的股票列表
export function useStocksList() {
  return useQuery({
    queryKey: ['stocks'],
    queryFn: getStocksList,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新获取
  });
}

// 更新股票列表
export function useUpdateStocksList() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (stocks: string[]) => updateStocksList(stocks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
  });
}

// 获取股票名称映射
export function useStockNames() {
  return useQuery({
    queryKey: ['stockNames'],
    queryFn: getStockNames,
    staleTime: 1000 * 60 * 60, // 1小时内不重新获取
  });
}

// 获取股票数据
export function useStockData(code: string, days: number = 30) {
  return useQuery({
    queryKey: ['stockData', code, days],
    queryFn: () => getStockData(code, days),
    enabled: !!code,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新获取
  });
}

// 获取完整股票数据
export function useStockAllData(code: string) {
  return useQuery({
    queryKey: ['stockAllData', code],
    queryFn: () => getStockAllData(code),
    enabled: !!code,
    staleTime: 1000 * 60 * 5,
  });
}

// 获取存储的股票数据摘要
export function useStoredStocks() {
  return useQuery({
    queryKey: ['storedStocks'],
    queryFn: getStoredStocks,
    staleTime: 1000 * 60 * 5,
  });
}
