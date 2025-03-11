
// frontend/src/lib/types.ts

// 股票行情数据
export interface StockData {
    time: string;
    code: string;
    open: number | null;
    close: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;
    turnover: number | null;
  }
  
  // 技术分析结果
  export interface TechnicalAnalysis {
    latest_price: number;
    previous_price?: number;
    price_change: number;
    price_change_percent: number;
    ma5?: number;  // 添加 ma5
    ma10?: number; // 添加 ma10
    ma20?: number; // 添加 ma20
    ma30?: number; // 添加 ma30
    ma60?: number; // 添加 ma60
    ma5_diff?: number;  // 与均线的差异百分比
    ma10_diff?: number; // 与均线的差异百分比
    ma20_diff?: number; // 与均线的差异百分比
    ma30_diff?: number; // 与均线的差异百分比
    ma60_diff?: number; // 与均线的差异百分比
    ema5?: number;
    ema10?: number;
    ema20?: number;
    ema30?: number;
    ema60?: number;
    rsi?: number;
    macd?: number;
    macd_signal?: number;
    macd_histogram?: number;
    volume?: number;
    volume_5day_avg?: number;
  }
  
  // 交易建议
  export interface TradeRecommendation {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasons: string[];
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    support_level?: number;
    resistance_level?: number;
    recommendation_level?: number;
  }
  
  // AI分析结果
  export interface AnalysisResult {
    analysis: TechnicalAnalysis;
    recommendations: TradeRecommendation;
    timestamp: string;
  }
  
  // 股票响应
  export interface StockDataResponse {
    success: boolean;
    message?: string;
    data?: StockData[];
    analysis?: AnalysisResult;
  }
  
  // 股票分析响应
  export interface StockAnalysisResponse {
    success: boolean;
    message?: string;
    analysis?: AnalysisResult;
  }
  
  // 实时分析响应
  export interface RealtimeAnalysisResponse {
    success: boolean;
    message?: string;
    analysis?: AnalysisResult;
  }
  
  // 实时推荐股票
  export interface RankedStock {
    code: string;
    price: number;
    recommendation_level: number;
    recommendation_text: string;
    ma_relations: string[];
    closest_ma?: string;
    updated_at: string;
  }
  
  // 排名股票响应
  export interface RankedStocksResponse {
    success: boolean;
    message?: string;
    stocks?: RankedStock[];
    updated_at?: string;
  }
  
  // 最新股票数据
  export interface LatestStockData {
    time: string;
    open?: number;
    close?: number;
    high?: number;
    low?: number;
    volume?: number;
    turnover?: number;
    change_percent?: number;
  }
  
  // 股票统计
  export interface StockStats {
    record_count: number;
    earliest_date?: string;
    latest_date?: string;
  }
  
  // 存储的股票数据
  export interface StoredStock {
    code: string;
    latest_data: LatestStockData;
    stats: StockStats;
  }
  
  // 数据库摘要
  export interface DatabaseSummary {
    stock_count: number;
    total_records: number;
    earliest_date?: string;
    latest_date?: string;
  }
  
  // 存储的股票响应
  export interface StoredStocksResponse {
    success: boolean;
    message?: string;
    stocks?: StoredStock[];
    summary?: DatabaseSummary;
  }
  
  // 股票信息
  export interface StockInfo {
    code: string;
    name?: string;
    lot_size?: number;
    stock_type?: string;
    stock_child_type?: string;
    stock_owner?: string;
    listing_date?: string;
  }
  
  // 股票完整数据响应
  export interface StockAllDataResponse {
    success: boolean;
    message?: string;
    code?: string;
    data?: StockData[];
    info?: StockInfo;
  }
  
  // 股票名称映射响应
  export interface StockNamesResponse {
    success: boolean;
    stock_names?: Record<string, string>;
  }
  
  // 股票列表响应
  export interface StockListResponse {
    success: boolean;
    message: string;
    stocks?: string[];
  }