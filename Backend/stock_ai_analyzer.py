import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json

class StockAIAnalyzer:
    """股票AI分析器"""
    
    def __init__(self):
        """初始化分析器"""
        # 这里可以加载AI模型或其他资源
        pass
    
    def analyze_stock(self, stock_data):
        """
        分析股票数据并生成交易建议
        
        参数:
        stock_data (list): 包含股票价格数据的列表
        
        返回:
        dict: 包含分析结果和交易建议的字典
        """
        # 转换为pandas DataFrame进行分析
        df = pd.DataFrame(stock_data)
        
        # 确保时间列是datetime类型
        df['time'] = pd.to_datetime(df['time'])
        
        # 排序数据，确保按时间先后顺序
        df = df.sort_values('time')
        
        # 执行分析
        analysis = self._perform_technical_analysis(df)
        
        # 生成建议
        recommendations = self._generate_recommendations(df, analysis)
        
        # 结合分析和建议
        result = {
            'analysis': analysis,
            'recommendations': recommendations,
            'timestamp': datetime.now().isoformat()
        }
        
        return result
    
    def _perform_technical_analysis(self, df):
        """
        执行技术分析
        
        参数:
        df (DataFrame): 股票价格数据
        
        返回:
        dict: 技术分析结果
        """
        # 计算基本指标
        analysis = {}
        
        # 1. 移动平均线
        df['SMA5'] = df['close'].rolling(window=5).mean()
        df['SMA10'] = df['close'].rolling(window=10).mean()
        df['SMA20'] = df['close'].rolling(window=20).mean()
        
        # 2. 相对强弱指标(RSI)
        delta = df['close'].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        avg_gain = gain.rolling(window=14).mean()
        avg_loss = loss.rolling(window=14).mean()
        rs = avg_gain / avg_loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # 3. MACD
        df['EMA12'] = df['close'].ewm(span=12, adjust=False).mean()
        df['EMA26'] = df['close'].ewm(span=26, adjust=False).mean()
        df['MACD'] = df['EMA12'] - df['EMA26']
        df['Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
        df['Histogram'] = df['MACD'] - df['Signal']
        
        # 获取最新值
        latest = df.iloc[-1]
        analysis['latest_price'] = float(latest['close'])
        analysis['previous_price'] = float(df.iloc[-2]['close']) if len(df) > 1 else None
        analysis['price_change'] = float(latest['close'] - df.iloc[-2]['close']) if len(df) > 1 else 0
        analysis['price_change_percent'] = float((analysis['price_change'] / df.iloc[-2]['close']) * 100) if len(df) > 1 else 0
        
        # 技术指标
        analysis['sma5'] = float(latest['SMA5']) if not np.isnan(latest['SMA5']) else None
        analysis['sma10'] = float(latest['SMA10']) if not np.isnan(latest['SMA10']) else None
        analysis['sma20'] = float(latest['SMA20']) if not np.isnan(latest['SMA20']) else None
        analysis['rsi'] = float(latest['RSI']) if not np.isnan(latest['RSI']) else None
        analysis['macd'] = float(latest['MACD']) if not np.isnan(latest['MACD']) else None
        analysis['macd_signal'] = float(latest['Signal']) if not np.isnan(latest['Signal']) else None
        analysis['macd_histogram'] = float(latest['Histogram']) if not np.isnan(latest['Histogram']) else None
        
        # 成交量分析
        analysis['volume'] = int(latest['volume']) if 'volume' in latest else None
        if len(df) > 5:
            analysis['volume_5day_avg'] = float(df['volume'].rolling(window=5).mean().iloc[-1])
        
        return analysis
    
    def _generate_recommendations(self, df, analysis):
        """
        根据技术分析生成交易建议
        
        参数:
        df (DataFrame): 股票价格数据
        analysis (dict): 技术分析结果
        
        返回:
        dict: 交易建议
        """
        recommendations = {
            'action': 'HOLD',  # 默认建议：观望
            'confidence': 0.5,  # 置信度
            'reasons': [],      # 建议原因
            'risk_level': 'MEDIUM',  # 风险水平
            'support_level': None,   # 支撑位
            'resistance_level': None # 阻力位
        }
        
        # 简单动量策略
        if analysis['price_change_percent'] > 2:
            recommendations['reasons'].append("价格呈明显上涨趋势")
        elif analysis['price_change_percent'] < -2:
            recommendations['reasons'].append("价格呈明显下跌趋势")
        
        # SMA信号
        if (analysis['sma5'] and analysis['sma10'] and analysis['sma20']):
            # 金叉信号 (短期均线上穿长期均线)
            if (analysis['sma5'] > analysis['sma10'] > analysis['sma20'] and 
                analysis['latest_price'] > analysis['sma5']):
                recommendations['action'] = 'BUY'
                recommendations['confidence'] = 0.7
                recommendations['reasons'].append("均线呈多头排列，价格站上所有均线")
            
            # 死叉信号 (短期均线下穿长期均线)
            elif (analysis['sma5'] < analysis['sma10'] < analysis['sma20'] and 
                  analysis['latest_price'] < analysis['sma5']):
                recommendations['action'] = 'SELL'
                recommendations['confidence'] = 0.7
                recommendations['reasons'].append("均线呈空头排列，价格跌破所有均线")
        
        # RSI过买过卖
        if analysis['rsi']:
            if analysis['rsi'] > 70:
                if recommendations['action'] != 'SELL':
                    recommendations['action'] = 'SELL'
                    recommendations['confidence'] = 0.65
                else:
                    recommendations['confidence'] = min(0.85, recommendations['confidence'] + 0.15)
                recommendations['reasons'].append(f"RSI超买 ({analysis['rsi']:.2f})")
                recommendations['risk_level'] = 'HIGH'
            
            elif analysis['rsi'] < 30:
                if recommendations['action'] != 'BUY':
                    recommendations['action'] = 'BUY'
                    recommendations['confidence'] = 0.65
                else:
                    recommendations['confidence'] = min(0.85, recommendations['confidence'] + 0.15)
                recommendations['reasons'].append(f"RSI超卖 ({analysis['rsi']:.2f})")
                recommendations['risk_level'] = 'HIGH'
        
        # MACD信号
        if (analysis['macd'] is not None and analysis['macd_signal'] is not None):
            # 金叉 (MACD上穿信号线)
            if (analysis['macd'] > analysis['macd_signal'] and analysis['macd_histogram'] > 0):
                if recommendations['action'] != 'BUY':
                    recommendations['action'] = 'BUY'
                    recommendations['confidence'] = 0.6
                else:
                    recommendations['confidence'] = min(0.9, recommendations['confidence'] + 0.1)
                recommendations['reasons'].append("MACD金叉信号")
            
            # 死叉 (MACD下穿信号线)
            elif (analysis['macd'] < analysis['macd_signal'] and analysis['macd_histogram'] < 0):
                if recommendations['action'] != 'SELL':
                    recommendations['action'] = 'SELL'
                    recommendations['confidence'] = 0.6
                else:
                    recommendations['confidence'] = min(0.9, recommendations['confidence'] + 0.1)
                recommendations['reasons'].append("MACD死叉信号")
        
        # 计算支撑位和阻力位 (简化版本)
        price_data = df['close'].tolist()
        if len(price_data) >= 20:
            # 计算最近的支撑位 (近期低点)
            recent_lows = sorted(price_data[-20:])[:3]  # 最低的3个价格
            recommendations['support_level'] = sum(recent_lows) / len(recent_lows)
            
            # 计算最近的阻力位 (近期高点)
            recent_highs = sorted(price_data[-20:], reverse=True)[:3]  # 最高的3个价格
            recommendations['resistance_level'] = sum(recent_highs) / len(recent_highs)
        
        # 确保有理由
        if not recommendations['reasons']:
            recommendations['reasons'].append("技术指标无明显信号，建议观望")
        
        return recommendations

# 测试代码
if __name__ == "__main__":
    # 创建一些模拟数据
    mock_data = []
    base_price = 100.0
    volume = 10000
    
    # 生成30天的数据
    for i in range(30):
        date = (datetime.now() - timedelta(days=30-i)).isoformat()
        price_change = np.random.normal(0, 1) * 2  # 随机价格变动
        
        open_price = base_price
        close_price = base_price + price_change
        high_price = max(open_price, close_price) + abs(np.random.normal(0, 0.5))
        low_price = min(open_price, close_price) - abs(np.random.normal(0, 0.5))
        
        volume = int(volume * (1 + np.random.normal(0, 0.1)))  # 随机成交量变动
        
        mock_data.append({
            'time': date,
            'code': 'US.AAPL',
            'open': float(open_price),
            'close': float(close_price),
            'high': float(high_price),
            'low': float(low_price),
            'volume': volume,
            'turnover': float(volume * close_price)
        })
        
        base_price = close_price  # 下一天以今天收盘价为基础
    
    # 创建分析器并分析数据
    analyzer = StockAIAnalyzer()
    result = analyzer.analyze_stock(mock_data)
    
    # 打印结果
    print(json.dumps(result, indent=2))