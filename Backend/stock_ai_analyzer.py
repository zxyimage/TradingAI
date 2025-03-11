import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import redis
import traceback
# 在 stock_data_fetcher.py 文件顶部的导入部分，添加:
from config import DB_CONFIG, FUTU_CONFIG, STOCKS_TO_TRACK, REDIS_CONFIG
# 在 stock_ai_analyzer.py 文件顶部的导入部分，添加:
from config import REDIS_CONFIG

class StockAIAnalyzer:
    """股票AI分析器"""
    
    def __init__(self):
        """初始化分析器"""
        # 尝试连接Redis
        try:
            self.redis_client = redis.Redis(
                host=REDIS_CONFIG["host"], 
                port=REDIS_CONFIG["port"], 
                db=REDIS_CONFIG["db"], 
                decode_responses=REDIS_CONFIG["decode_responses"]
            )
            print(f"AI分析器已连接到Redis: {REDIS_CONFIG['host']}:{REDIS_CONFIG['port']}")
        except Exception as e:
            print(f"AI分析器Redis连接错误: {e}")
            self.redis_client = None
    
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
    
    def analyze_realtime_stock(self, stock_code):
        """
        分析实时股票数据
        
        参数:
        stock_code (str): 股票代码
        
        返回:
        dict: 包含实时分析结果的字典
        """
        if not self.redis_client:
            return {"error": "Redis连接不可用"}
        
        try:
            # 从Redis获取实时数据
            realtime_data = self.redis_client.hgetall(f"stock:realtime:{stock_code}")
            ma_data = self.redis_client.hgetall(f"stock:ma:{stock_code}")
            
            if not realtime_data or not ma_data:
                return {"error": f"没有找到 {stock_code} 的实时数据"}
            
            # 解析数据
            current_price = float(realtime_data.get('price', 0))
            recommendation_level = int(realtime_data.get('recommendation_level', 6))
            
            # 转换均线数据为浮点数
            ma5 = float(ma_data.get('MA5', 0)) if ma_data.get('MA5') and ma_data.get('MA5') != "null" else None
            ma10 = float(ma_data.get('MA10', 0)) if ma_data.get('MA10') and ma_data.get('MA10') != "null" else None
            ma20 = float(ma_data.get('MA20', 0)) if ma_data.get('MA20') and ma_data.get('MA20') != "null" else None
            ma30 = float(ma_data.get('MA30', 0)) if ma_data.get('MA30') and ma_data.get('MA30') != "null" else None
            ma60 = float(ma_data.get('MA60', 0)) if ma_data.get('MA60') and ma_data.get('MA60') != "null" else None
            
            # 构建分析结果
            analysis = {
                'latest_price': current_price,
                'ma5': ma5,
                'ma10': ma10,
                'ma20': ma20,
                'ma30': ma30,
                'ma60': ma60,
                'updated_at': realtime_data.get('time', datetime.now().isoformat())
            }
            
            # 计算价格与均线的差异
            ma_diffs = {}
            if ma5:
                ma_diffs['ma5_diff'] = (current_price / ma5 - 1) * 100  # 百分比差异
            if ma10:
                ma_diffs['ma10_diff'] = (current_price / ma10 - 1) * 100
            if ma20:
                ma_diffs['ma20_diff'] = (current_price / ma20 - 1) * 100
            if ma30:
                ma_diffs['ma30_diff'] = (current_price / ma30 - 1) * 100
            if ma60:
                ma_diffs['ma60_diff'] = (current_price / ma60 - 1) * 100
                
            analysis.update(ma_diffs)
            
            # 生成建议
            recommendations = self._generate_realtime_recommendations(analysis, recommendation_level)
            
            return {
                'analysis': analysis,
                'recommendations': recommendations,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"分析实时数据时出错: {e}")
            traceback.print_exc()
            return {"error": f"分析出错: {str(e)}"}
    
    def get_ranked_stocks(self):
        """
        获取根据均线策略排序的股票列表
        
        返回:
        list: 排序后的股票列表
        """
        if not self.redis_client:
            return []
        
        try:
            # 获取所有股票的实时数据
            all_stocks = []
            keys = self.redis_client.keys("stock:realtime:*")
            
            for key in keys:
                stock_code = key.split(":")[-1]
                realtime_data = self.redis_client.hgetall(key)
                ma_data = self.redis_client.hgetall(f"stock:ma:{stock_code}")
                
                if not realtime_data or not ma_data:
                    continue
                
                # 解析数据
                try:
                    current_price = float(realtime_data.get('price', 0))
                    recommendation_level = int(realtime_data.get('recommendation_level', 6))
                    updated_at = realtime_data.get('time', '')
                    
                    # 转换均线数据
                    ma5 = float(ma_data.get('MA5', 0)) if ma_data.get('MA5') and ma_data.get('MA5') != "null" else None
                    ma10 = float(ma_data.get('MA10', 0)) if ma_data.get('MA10') and ma_data.get('MA10') != "null" else None
                    ma20 = float(ma_data.get('MA20', 0)) if ma_data.get('MA20') and ma_data.get('MA20') != "null" else None
                    ma30 = float(ma_data.get('MA30', 0)) if ma_data.get('MA30') and ma_data.get('MA30') != "null" else None
                    ma60 = float(ma_data.get('MA60', 0)) if ma_data.get('MA60') and ma_data.get('MA60') != "null" else None
                    
                    # 添加到列表
                    all_stocks.append({
                        'code': stock_code,
                        'price': current_price,
                        'recommendation_level': recommendation_level,
                        'ma5': ma5,
                        'ma10': ma10,
                        'ma20': ma20,
                        'ma30': ma30,
                        'ma60': ma60,
                        'updated_at': updated_at
                    })
                except Exception as e:
                    print(f"处理 {stock_code} 数据时出错: {e}")
                    continue
            
            # 根据推荐级别排序
            sorted_stocks = sorted(all_stocks, key=lambda x: (x['recommendation_level'], x['code']))
            
            # 格式化结果
            result = []
            for stock in sorted_stocks:
                # 计算与均线的关系
                relations = []
                if stock['ma5'] and stock['price'] < stock['ma5']:
                    relations.append("低于5日均线")
                if stock['ma10'] and stock['price'] < stock['ma10']:
                    relations.append("低于10日均线")
                if stock['ma20'] and stock['price'] < stock['ma20']:
                    relations.append("低于20日均线")
                if stock['ma30'] and stock['price'] < stock['ma30']:
                    relations.append("低于30日均线")
                if stock['ma60'] and stock['price'] < stock['ma60']:
                    relations.append("低于60日均线")
                
                # 计算与最接近的均线的差距
                closest_ma = None
                closest_diff = float('inf')
                ma_names = ['ma5', 'ma10', 'ma20', 'ma30', 'ma60']
                
                for ma_name in ma_names:
                    ma_value = stock.get(ma_name)
                    if ma_value:
                        diff = abs(stock['price'] - ma_value)
                        if diff < closest_diff:
                            closest_diff = diff
                            closest_ma = ma_name
                
                closest_ma_text = ""
                if closest_ma:
                    ma_label = closest_ma.upper()
                    diff_percent = (stock['price'] / stock[closest_ma] - 1) * 100
                    closest_ma_text = f"距{ma_label}: {diff_percent:.2f}%"
                
                # 构建结果
                result.append({
                    'code': stock['code'],
                    'price': stock['price'],
                    'recommendation_level': stock['recommendation_level'],
                    'recommendation_text': self._get_recommendation_text(stock['recommendation_level']),
                    'ma_relations': relations,
                    'closest_ma': closest_ma_text,
                    'updated_at': stock['updated_at']
                })
            
            return result
            
        except Exception as e:
            print(f"获取排序股票时出错: {e}")
            traceback.print_exc()
            return []
    
    def _get_recommendation_text(self, level):
        """根据推荐级别获取文本描述"""
        if level == 1:
            return "强烈推荐"
        elif level == 2:
            return "推荐"
        elif level == 3:
            return "考虑买入"
        elif level == 4:
            return "关注"
        elif level == 5:
            return "轻度关注"
        else:
            return "不推荐"
    
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
        df['SMA30'] = df['close'].rolling(window=30).mean()  # 添加30日均线
        df['SMA60'] = df['close'].rolling(window=60).mean()  # 添加60日均线
        
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
        analysis['sma30'] = float(latest['SMA30']) if not np.isnan(latest['SMA30']) else None
        analysis['sma60'] = float(latest['SMA60']) if not np.isnan(latest['SMA60']) else None
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
        
        # 新的基于均线的策略 - 价格低于均线表示买入机会
        ma_signals = []
        
        # 检查价格与各均线的关系
        if analysis['latest_price'] and analysis['sma60'] and analysis['latest_price'] < analysis['sma60']:
            ma_signals.append(("最新价格低于60日均线", 0.8, "BUY"))
        elif analysis['latest_price'] and analysis['sma30'] and analysis['latest_price'] < analysis['sma30']:
            ma_signals.append(("最新价格低于30日均线", 0.75, "BUY"))
        elif analysis['latest_price'] and analysis['sma20'] and analysis['latest_price'] < analysis['sma20']:
            ma_signals.append(("最新价格低于20日均线", 0.7, "BUY"))
        elif analysis['latest_price'] and analysis['sma10'] and analysis['latest_price'] < analysis['sma10']:
            ma_signals.append(("最新价格低于10日均线", 0.65, "BUY"))
        elif analysis['latest_price'] and analysis['sma5'] and analysis['latest_price'] < analysis['sma5']:
            ma_signals.append(("最新价格低于5日均线", 0.6, "BUY"))
        elif analysis['latest_price'] and analysis['sma5'] and analysis['latest_price'] > analysis['sma5']:
            ma_signals.append(("最新价格高于所有均线", 0.6, "HOLD"))
            recommendations['reasons'].append("价格已高于所有均线，建议观望或考虑卖出")
        
        # 如果有均线信号，根据最强的信号设置操作
        if ma_signals:
            strongest_signal = max(ma_signals, key=lambda x: x[1])
            recommendations['reasons'].append(strongest_signal[0])
            if strongest_signal[2] != "HOLD":
                recommendations['action'] = strongest_signal[2]
                recommendations['confidence'] = strongest_signal[1]
        
        # SMA信号 (保留现有逻辑)
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
    
    def _generate_realtime_recommendations(self, analysis, recommendation_level):
        """
        根据实时分析数据生成交易建议
        
        参数:
        analysis (dict): 实时分析数据
        recommendation_level (int): 推荐级别 (1-6)
        
        返回:
        dict: 交易建议
        """
        recommendations = {
            'action': 'HOLD',  # 默认建议：观望
            'confidence': 0.5,  # 置信度
            'reasons': [],      # 建议原因
            'risk_level': 'MEDIUM',  # 风险水平
            'support_level': None,   # 支撑位
            'resistance_level': None, # 阻力位
            'recommendation_level': recommendation_level  # 原始推荐级别
        }
        
        # 根据推荐级别设置操作和置信度
        if recommendation_level == 1:
            recommendations['action'] = 'BUY'
            recommendations['confidence'] = 0.9
            recommendations['reasons'].append("价格低于60日均线，提供很好的买入机会")
            recommendations['risk_level'] = 'LOW'
        elif recommendation_level == 2:
            recommendations['action'] = 'BUY'
            recommendations['confidence'] = 0.8
            recommendations['reasons'].append("价格低于30日均线，提供较好的买入机会")
            recommendations['risk_level'] = 'LOW'
        elif recommendation_level == 3:
            recommendations['action'] = 'BUY'
            recommendations['confidence'] = 0.7
            recommendations['reasons'].append("价格低于20日均线，可考虑买入")
            recommendations['risk_level'] = 'MEDIUM'
        elif recommendation_level == 4:
            recommendations['action'] = 'BUY'
            recommendations['confidence'] = 0.6
            recommendations['reasons'].append("价格低于10日均线，可关注")
            recommendations['risk_level'] = 'MEDIUM'
        elif recommendation_level == 5:
            recommendations['action'] = 'HOLD'
            recommendations['confidence'] = 0.55
            recommendations['reasons'].append("价格低于5日均线，可轻度关注")
            recommendations['risk_level'] = 'MEDIUM'
        else:
            recommendations['action'] = 'HOLD'
            recommendations['confidence'] = 0.5
            recommendations['reasons'].append("价格高于所有均线，建议观望")
            recommendations['risk_level'] = 'HIGH'
        
        # 添加具体的均线差异信息
        ma_diffs = []
        if 'ma5_diff' in analysis:
            ma_diffs.append(f"当前价格较5日均线: {analysis['ma5_diff']:.2f}%")
        if 'ma10_diff' in analysis:
            ma_diffs.append(f"当前价格较10日均线: {analysis['ma10_diff']:.2f}%")
        if 'ma20_diff' in analysis:
            ma_diffs.append(f"当前价格较20日均线: {analysis['ma20_diff']:.2f}%")
        if 'ma30_diff' in analysis:
            ma_diffs.append(f"当前价格较30日均线: {analysis['ma30_diff']:.2f}%")
        if 'ma60_diff' in analysis:
            ma_diffs.append(f"当前价格较60日均线: {analysis['ma60_diff']:.2f}%")
        
        # 将均线差异添加到理由中
        recommendations['reasons'].extend(ma_diffs)
        
        # 基于均线估算支撑位和阻力位
        all_mas = [v for k, v in analysis.items() if k.startswith('ma') and not k.endswith('_diff') and v is not None]
        
        if all_mas:
            all_mas.sort()
            # 找到低于当前价格的最高均线作为支撑位
            lower_mas = [ma for ma in all_mas if ma < analysis['latest_price']]
            if lower_mas:
                recommendations['support_level'] = max(lower_mas)
            
            # 找到高于当前价格的最低均线作为阻力位
            higher_mas = [ma for ma in all_mas if ma > analysis['latest_price']]
            if higher_mas:
                recommendations['resistance_level'] = min(higher_mas)
        
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