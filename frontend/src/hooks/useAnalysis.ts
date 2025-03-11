// frontend/src/hooks/useAnalysis.ts
import { useQuery } from '@tanstack/react-query';
import { getStockAnalysis, getRealtimeAnalysis } from '@/lib/api';

// 获取股票分析
export function useStockAnalysis(code: string, days: number = 30) {
  return useQuery({
    queryKey: ['stockAnalysis', code, days],
    queryFn: () => getStockAnalysis(code, days),
    enabled: !!code,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新获取
  });
}

// 获取实时分析
export function useRealtimeAnalysis(code: string) {
  return useQuery({
    queryKey: ['realtimeAnalysis', code],
    queryFn: () => getRealtimeAnalysis(code),
    enabled: !!code,
    staleTime: 1000 * 60, // 1分钟内不重新获取
  });
}