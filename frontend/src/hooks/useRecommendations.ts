// frontend/src/hooks/useRecommendations.ts
import { useQuery } from '@tanstack/react-query';
import { getRankedStocks } from '@/lib/api';

// 获取推荐股票
export function useRankedStocks() {
  return useQuery({
    queryKey: ['rankedStocks'],
    queryFn: getRankedStocks,
    staleTime: 1000 * 60, // 1分钟内不重新获取
    refetchInterval: 1000 * 60 * 5, // 每5分钟自动刷新一次
  });
}