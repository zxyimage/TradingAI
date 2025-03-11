// frontend/src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

// Tailwind CSS类合并工具
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化日期
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  return format(new Date(dateString), 'yyyy-MM-dd');
}

// 格式化金额
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// 格式化百分比
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// 根据百分比获取颜色类
export function getPercentColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value >= 0 ? 'text-green-600' : 'text-red-600';
}

// 根据建议级别获取类名
export function getRecommendationClass(level: number): string {
  switch (level) {
    case 1: return 'recommendation-1';
    case 2: return 'recommendation-2';
    case 3: return 'recommendation-3';
    case 4: return 'recommendation-4';
    case 5: return 'recommendation-5';
    default: return 'recommendation-6';
  }
}

// 根据推荐文本获取颜色类
export function getActionColorClass(recommendationText: string): string {
  if (recommendationText.includes('强烈推荐') || recommendationText.includes('推荐')) {
    return 'text-green-600';
  } else if (recommendationText.includes('考虑买入')) {
    return 'text-blue-600';
  } else if (recommendationText.includes('关注')) {
    return 'text-gray-600';
  } else if (recommendationText.includes('不推荐')) {
    return 'text-red-600';
  }
  return '';
}

// 获取操作建议文本
export function getActionText(action: string): string {
  switch(action) {
    case 'BUY': return '买入';
    case 'SELL': return '卖出';
    case 'HOLD': return '观望';
    default: return action;
  }
}

// 获取风险水平文本
export function getRiskLevelText(level: string): string {
  switch(level) {
    case 'LOW': return '低风险';
    case 'MEDIUM': return '中等风险';
    case 'HIGH': return '高风险';
    default: return level;
  }
}

// 获取推荐级别文本
export function getRecommendationLevelText(level: number): string {
  switch(level) {
    case 1: return '强烈推荐 (低于60日均线)';
    case 2: return '推荐 (低于30日均线)';
    case 3: return '考虑买入 (低于20日均线)';
    case 4: return '关注 (低于10日均线)';
    case 5: return '轻度关注 (低于5日均线)';
    case 6: return '不推荐 (高于所有均线)';
    default: return '未知';
  }
}

// 计算移动平均线
export function calculateMovingAverage(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  // 填充前面的 null 值
  for (let i = 0; i < period - 1; i++) {
    result.push(null);
  }
  
  // 计算移动平均
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    let validCount = 0;
    
    for (let j = 0; j < period; j++) {
      const value = data[i - j];
      if (value !== null) {
        sum += value;
        validCount++;
      }
    }
    
    result.push(validCount > 0 ? sum / validCount : null);
  }
  
  return result;
}

// 股票代码与名称格式化
export function formatStockCodeName(code: string, stockNames: Record<string, string> = {}): string {
  const name = stockNames[code];
  if (name) {
    return `${code} - ${name}`;
  }
  return code;
}