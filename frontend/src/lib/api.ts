// frontend/src/lib/api.ts

import axios from 'axios';
import {
  StockDataResponse,
  StockAnalysisResponse,
  RealtimeAnalysisResponse,
  RankedStocksResponse,
  StoredStocksResponse,
  StockAllDataResponse,
  StockNamesResponse,
  StockListResponse
} from './types';

// 获取环境变量（加入调试日志）
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const apiKey = process.env.NEXT_PUBLIC_API_KEY;

console.log('[DEBUG] API Base URL:', apiBaseUrl);
console.log('[DEBUG] API Key configured:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No');

// 创建axios实例
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey || 'your-secret-api-key' // 提供后备值
  }
});

// 请求拦截器 - 添加日志
api.interceptors.request.use(request => {
  console.log('[DEBUG] API Request:', request.method, request.url);
  console.log('[DEBUG] Request Headers:', request.headers);
  return request;
}, error => {
  console.error('[ERROR] API Request Error:', error);
  return Promise.reject(error);
});

// 响应拦截器 - 添加日志
api.interceptors.response.use(response => {
  console.log('[DEBUG] API Response Status:', response.status);
  return response;
}, error => {
  console.error('[ERROR] API Response Error:', error.response?.status, error.response?.data || error.message);
  return Promise.reject(error);
});

// 获取股票列表
export const getStocksList = async (): Promise<StockListResponse> => {
  const response = await api.get('/stocks');
  return response.data;
};

// 更新股票列表
export const updateStocksList = async (stocks: string[]): Promise<StockListResponse> => {
  const response = await api.post('/stocks', { stocks });
  return response.data;
};

// 获取股票数据
export const getStockData = async (code: string, days: number = 30): Promise<StockDataResponse> => {
  const response = await api.get('/stock_data', {
    params: { code, days }
  });
  return response.data;
};

// 获取股票分析
export const getStockAnalysis = async (code: string, days: number = 30): Promise<StockAnalysisResponse> => {
  const response = await api.get('/stock_analysis', {
    params: { code, days }
  });
  return response.data;
};

// 获取实时分析
export const getRealtimeAnalysis = async (code: string): Promise<RealtimeAnalysisResponse> => {
  const response = await api.get('/realtime_analysis', {
    params: { code }
  });
  return response.data;
};

// 获取排序的股票
export const getRankedStocks = async (): Promise<RankedStocksResponse> => {
  const response = await api.get('/ranked_stocks');
  return response.data;
};

// 获取存储的股票数据摘要
export const getStoredStocks = async (): Promise<StoredStocksResponse> => {
  const response = await api.get('/stored_stocks');
  return response.data;
};

// 获取单只股票的所有数据
export const getStockAllData = async (code: string): Promise<StockAllDataResponse> => {
  const response = await api.get('/stock_all_data', {
    params: { code }
  });
  return response.data;
};

// 获取股票名称
export const getStockNames = async (): Promise<StockNamesResponse> => {
  const response = await api.get('/stock_names');
  return response.data;
};