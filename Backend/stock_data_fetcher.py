import time
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from futu import *
from apscheduler.schedulers.blocking import BlockingScheduler
from config import DB_CONFIG, FUTU_CONFIG, STOCKS_TO_TRACK, REDIS_CONFIG
import redis
import json
import threading
import traceback

# 创建Redis连接
try:
    redis_client = redis.Redis(
        host=REDIS_CONFIG["host"], 
        port=REDIS_CONFIG["port"], 
        db=REDIS_CONFIG["db"], 
        decode_responses=REDIS_CONFIG["decode_responses"]
    )
    print(f"成功连接到Redis: {REDIS_CONFIG['host']}:{REDIS_CONFIG['port']}")
except Exception as e:
    print(f"Redis连接错误: {e}")
    redis_client = None

# 创建数据库连接
def get_db_engine():
    conn_str = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    return create_engine(
        conn_str,
        pool_size=5,               # 设置连接池初始大小
        max_overflow=10,           # 允许的最大溢出连接数
        pool_timeout=30,           # 获取连接的超时时间
        pool_recycle=1800,         # 回收连接的时间(秒)
        pool_pre_ping=True         # 使用前 ping 检查连接是否有效
    )


# 初始化数据库模式
def init_database(engine):
    with engine.connect() as conn:
        # 启用TimescaleDB扩展
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
        
        # 创建股票基础信息表 - 添加 UNIQUE 约束到 code 字段
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS stock_info (
            id SERIAL PRIMARY KEY,
            code VARCHAR(20) NOT NULL UNIQUE,  -- 添加 UNIQUE 约束
            name VARCHAR(100),
            lot_size INTEGER,
            stock_type VARCHAR(50),
            stock_child_type VARCHAR(50),
            stock_owner VARCHAR(20),
            listing_date TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """))
        
        # 创建股票价格表
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS stock_price (
            time TIMESTAMP NOT NULL,
            code VARCHAR(20) NOT NULL,
            open NUMERIC(19, 4),
            close NUMERIC(19, 4),
            high NUMERIC(19, 4),
            low NUMERIC(19, 4),
            volume BIGINT,
            turnover NUMERIC(19, 4),
            PRIMARY KEY (time, code)
        );
        """))
        
        # 将stock_price转换为超表(hypertable)
        try:
            conn.execute(text("""
            SELECT create_hypertable('stock_price', 'time', if_not_exists => TRUE);
            """))
        except Exception as e:
            print(f"注意: {e}")
        
        conn.commit()

# 添加到 stock_data_fetcher.py 文件中

def ensure_code_unique_constraint(engine):
    """
    确保 stock_info 表中的 code 字段有唯一约束
    """
    print("检查并确保 stock_info 表的 code 字段有唯一约束...")
    
    with engine.connect() as conn:
        # 检查是否已经存在唯一约束
        check_query = text("""
        SELECT COUNT(*) FROM pg_constraint 
        WHERE conrelid = 'stock_info'::regclass 
        AND contype = 'u' 
        AND conkey @> ARRAY[
            (SELECT attnum FROM pg_attribute 
             WHERE attrelid = 'stock_info'::regclass AND attname = 'code')
        ]::smallint[]
        """)
        
        try:
            result = conn.execute(check_query).scalar()
            
            if result == 0:
                print("stock_info 表的 code 字段没有唯一约束，正在添加...")
                
                # 首先处理可能的重复记录
                # 获取所有重复的代码
                dupes_query = text("""
                SELECT code, COUNT(*) 
                FROM stock_info 
                GROUP BY code 
                HAVING COUNT(*) > 1
                """)
                
                dupes = conn.execute(dupes_query).fetchall()
                
                if dupes:
                    print(f"发现 {len(dupes)} 个有重复记录的股票代码，正在清理...")
                    
                    for code, count in dupes:
                        # 对于每个重复的代码，保留最新的一条记录
                        delete_query = text("""
                        DELETE FROM stock_info
                        WHERE id IN (
                            SELECT id FROM stock_info
                            WHERE code = :code
                            ORDER BY updated_at DESC
                            OFFSET 1
                        )
                        """)
                        
                        conn.execute(delete_query, {"code": code})
                    
                    print("重复记录清理完成")
                
                # 添加唯一约束
                alter_query = text("""
                ALTER TABLE stock_info ADD CONSTRAINT stock_info_code_key UNIQUE (code)
                """)
                
                conn.execute(alter_query)
                conn.commit()
                
                print("唯一约束添加成功")
            else:
                print("stock_info 表的 code 字段已有唯一约束，无需修改")
                
        except Exception as e:
            print(f"检查或添加唯一约束时出错: {e}")
            traceback.print_exc()
            conn.rollback()




# 实时行情处理类
class StockQuoteHandler(StockQuoteHandlerBase):
    def __init__(self):
        super().__init__()
        
    def on_recv_rsp(self, rsp_pb):
        """
        实时报价回调处理
        """
        ret_code, data = super().on_recv_rsp(rsp_pb)
        if ret_code != RET_OK:
            print(f"StockQuoteHandler: 接收数据失败 - {data}")
            return RET_ERROR, data
            
        for index, row in data.iterrows():
            stock_code = row['code']
            last_price = row['last_price']
            
            # 存储实时价格到Redis
            if redis_client:
                try:
                    # 存储最新价格
                    redis_client.hset(f"stock:realtime:{stock_code}", "price", last_price)
                    redis_client.hset(f"stock:realtime:{stock_code}", "time", datetime.now().isoformat())
                    
                    # 获取历史数据计算均线
                    calculate_and_store_moving_averages(stock_code)
                    
                    # 记录日志
                    #print(f"已更新 {stock_code} 实时价格: {last_price}")
                except Exception as e:
                    print(f"存储实时数据时出错: {e}")
        
        return RET_OK, data

# K线处理类
class KLineHandler(CurKlineHandlerBase):
    def __init__(self):
        super().__init__()
    
    def on_recv_rsp(self, rsp_pb):
        """
        实时K线回调处理
        """
        ret_code, data = super().on_recv_rsp(rsp_pb)
        if ret_code != RET_OK:
            print(f"KLineHandler: 接收K线数据失败 - {data}")
            return RET_ERROR, data
            
        if data is not None and not data.empty:
            for index, row in data.iterrows():
                stock_code = row['code']
                close_price = row['close']
                k_time = row['time_key']
                
                # 存储K线数据到Redis
                if redis_client:
                    try:
                        # 将当前K线数据存入Redis
                        kline_data = {
                            'code': stock_code,
                            'time': k_time,
                            'open': float(row['open']),
                            'close': float(close_price),
                            'high': float(row['high']),
                            'low': float(row['low']),
                            'volume': int(row['volume']),
                            'turnover': float(row['turnover'])
                        }
                        
                        # 将K线数据保存为列表
                        redis_client.rpush(f"stock:kline:{stock_code}", json.dumps(kline_data))
                        # 保留最近100条K线数据
                        redis_client.ltrim(f"stock:kline:{stock_code}", -100, -1)
                        
                        #print(f"已更新 {stock_code} K线数据, 时间: {k_time}, 收盘价: {close_price}")
                    except Exception as e:
                        print(f"存储K线数据时出错: {e}")
                        traceback.print_exc()
                
                # 尝试保存到数据库（如果是完整的日K）
                engine = get_db_engine()
                try:
                    # 将时间字符串转换为日期
                    k_date = datetime.strptime(k_time, "%Y-%m-%d %H:%M:%S")
                    
                    # 如果是日K的最后一条记录(下午收盘时间附近)，保存到数据库
                    now = datetime.now()
                    if k_date.hour >= 15 and k_date.minute >= 0:
                        # 创建DataFrame并存储
                        df = pd.DataFrame([{
                            'time_key': k_time,
                            'open': row['open'],
                            'close': close_price,
                            'high': row['high'],
                            'low': row['low'],
                            'volume': row['volume'],
                            'turnover': row['turnover']
                        }])
                        store_stock_prices(engine, df, stock_code)
                except Exception as e:
                    print(f"保存完整K线数据到数据库时出错: {e}")
        
        return RET_OK, data

# 计算并存储移动平均线
def calculate_and_store_moving_averages(stock_code):
    """
    计算股票的各种移动平均线并存储到Redis
    """
    if not redis_client:
        return
        
    try:
        # 从数据库获取历史数据
        engine = get_db_engine()
        with engine.connect() as conn:
            # 获取过去60天的数据用于计算均线
            end_date = datetime.now()
            start_date = end_date - timedelta(days=60)
            
            query = text("""
            SELECT time, close
            FROM stock_price
            WHERE code = :code AND time BETWEEN :start_date AND :end_date
            ORDER BY time
            """)
            
            result = conn.execute(query, {"code": stock_code, 
                                        "start_date": start_date, 
                                        "end_date": end_date})
            
            # 转换为DataFrame
            data = []
            for row in result:
                data.append({
                    'time': row.time.isoformat(),
                    'close': float(row.close) if row.close else None
                })
            
            if not data:
                print(f"没有找到 {stock_code} 的历史数据")
                return
                
            df = pd.DataFrame(data)
            
            # 确保close数据为数值类型
            df['close'] = pd.to_numeric(df['close'], errors='coerce')
            
            # 计算移动平均线
            df['MA5'] = df['close'].rolling(window=5).mean()
            df['MA10'] = df['close'].rolling(window=10).mean()
            df['MA20'] = df['close'].rolling(window=20).mean()
            df['MA30'] = df['close'].rolling(window=30).mean()
            df['MA60'] = df['close'].rolling(window=60).mean()
            
            # 获取最新的移动平均线值
            latest = df.iloc[-1]
            
            # 存储到Redis
            ma_data = {
                'MA5': float(latest['MA5']) if not np.isnan(latest['MA5']) else None,
                'MA10': float(latest['MA10']) if not np.isnan(latest['MA10']) else None,
                'MA20': float(latest['MA20']) if not np.isnan(latest['MA20']) else None,
                'MA30': float(latest['MA30']) if not np.isnan(latest['MA30']) else None,
                'MA60': float(latest['MA60']) if not np.isnan(latest['MA60']) else None,
                'updated_at': datetime.now().isoformat()
            }
            
            # 将均线数据保存到Redis
            redis_client.hmset(f"stock:ma:{stock_code}", {k: str(v) if v is not None else "null" for k, v in ma_data.items()})
            
            # 获取实时价格
            current_price = redis_client.hget(f"stock:realtime:{stock_code}", "price")
            if current_price:
                current_price = float(current_price)
                
                # 计算推荐级别
                recommendation_level = calculate_recommendation_level(current_price, ma_data)
                
                # 存储推荐级别
                redis_client.hset(f"stock:realtime:{stock_code}", "recommendation_level", recommendation_level)
                
                #print(f"{stock_code} 均线计算完成，当前价格: {current_price}，推荐级别: {recommendation_level}")
                
    except Exception as e:
        print(f"计算 {stock_code} 均线时出错: {e}")
        traceback.print_exc()

# 计算推荐级别
def calculate_recommendation_level(current_price, ma_data):
    """
    根据当前价格与均线的关系计算推荐级别
    
    返回值:
    1 - 最优先推荐（价格低于MA60）
    2 - 次优先推荐（价格低于MA30）
    3 - 第三推荐（价格低于MA20）
    4 - 第四推荐（价格低于MA10）
    5 - 第五推荐（价格低于MA5）
    6 - 不推荐（价格高于所有均线）
    """
    try:
        ma60 = ma_data.get('MA60')
        ma30 = ma_data.get('MA30')
        ma20 = ma_data.get('MA20')
        ma10 = ma_data.get('MA10')
        ma5 = ma_data.get('MA5')
        
        # 检查均线值是否有效
        if ma60 is not None and ma60 != "null" and float(ma60) > 0 and current_price < float(ma60):
            return 1
        elif ma30 is not None and ma30 != "null" and float(ma30) > 0 and current_price < float(ma30):
            return 2
        elif ma20 is not None and ma20 != "null" and float(ma20) > 0 and current_price < float(ma20):
            return 3
        elif ma10 is not None and ma10 != "null" and float(ma10) > 0 and current_price < float(ma10):
            return 4
        elif ma5 is not None and ma5 != "null" and float(ma5) > 0 and current_price < float(ma5):
            return 5
        else:
            return 6
    except Exception as e:
        print(f"计算推荐级别时出错: {e}")
        return 6  # 默认不推荐

# 将股票价格数据存储到数据库
def store_stock_prices(engine, price_df, code):
    # 重命名列以匹配我们的数据库模式
    columns_map = {
        'time_key': 'time',
        'open': 'open',
        'close': 'close',
        'high': 'high',
        'low': 'low',
        'volume': 'volume',
        'turnover': 'turnover'
    }
    
    # 选择并重命名列
    df = price_df[list(columns_map.keys())].rename(columns=columns_map)
    df['code'] = code
    
    # 存储数据到数据库
    df.to_sql('stock_price', engine, if_exists='append', index=False, method='multi')
    print(f"已存储 {len(df)} 条 {code} 的价格记录")

# 检查股票名称是否存在于数据库中
def check_stock_names(engine, stock_codes):
    """
    检查股票代码是否有对应的股票名称存储在数据库中
    
    参数:
    engine: 数据库引擎
    stock_codes: 股票代码列表
    
    返回:
    dict: 包含股票代码和是否有名称的字典
    """
    result = {}
    
    with engine.connect() as conn:
        for code in stock_codes:
            query = text("""
            SELECT name FROM stock_info
            WHERE code = :code AND name IS NOT NULL
            LIMIT 1
            """)
            
            db_result = conn.execute(query, {"code": code})
            row = db_result.fetchone()
            
            if row and row[0]:  # 如果有名称且非空
                result[code] = True
            else:
                result[code] = False
    
    return result

# 使用get_market_state获取股票名称
def get_stock_names(quote_ctx, stock_codes):
    """
    使用get_market_state接口获取股票名称
    
    参数:
    quote_ctx: FutuAPI上下文
    stock_codes: 股票代码列表
    
    返回:
    dict: 股票代码到名称的映射
    """
    result = {}
    
    # 由于API限制，每次最多请求10个股票，分批处理
    batch_size = 10
    for i in range(0, len(stock_codes), batch_size):
        batch = stock_codes[i:i+batch_size]
        try:
            ret, data = quote_ctx.get_market_state(batch)
            if ret == RET_OK:
                for index, row in data.iterrows():
                    code = row['code']
                    name = row.get('stock_name', '')
                    if name:
                        result[code] = name
                        print(f"获取到股票名称: {code} - {name}")
            else:
                print(f"获取股票市场状态失败: {data}")
            
            # 限制API请求速率
            if i + batch_size < len(stock_codes):
                print(f"等待30秒后请求下一批股票名称...")
                time.sleep(30)
        except Exception as e:
            print(f"获取股票市场状态时出错: {e}")
    
    return result

# 更新股票名称到数据库
def update_stock_names(engine, stock_names):
    """
    更新股票名称到数据库
    
    参数:
    engine: 数据库引擎
    stock_names: 股票代码到名称的映射
    """
    try:
        with engine.connect() as conn:
            for code, name in stock_names.items():
                query = text("""
                INSERT INTO stock_info (code, name, updated_at)
                VALUES (:code, :name, :updated_at)
                ON CONFLICT (code) 
                DO UPDATE SET name = :name, updated_at = :updated_at
                """)
                
                conn.execute(query, {
                    "code": code,
                    "name": name,
                    "updated_at": datetime.now()
                })
            
            conn.commit()
            print(f"已更新 {len(stock_names)} 支股票的名称到数据库")
    except Exception as e:
        print(f"更新股票名称到数据库时出错: {e}")
        traceback.print_exc()

# 更新股票名称（定时执行）
def update_missing_stock_names():
    """
    更新数据库中缺少名称的股票信息
    """
    print("开始获取缺失的股票名称...")
    
    # 连接到数据库
    engine = get_db_engine()
    
    # 获取所有跟踪的股票
    stock_codes = STOCKS_TO_TRACK
    
    # 检查哪些股票在数据库中没有名称
    name_status = check_stock_names(engine, stock_codes)
    missing_names = [code for code, has_name in name_status.items() if not has_name]
    
    if not missing_names:
        print("所有股票都已有名称，无需更新")
        return
    
    print(f"发现 {len(missing_names)} 支股票缺少名称，即将获取...")
    
    try:
        # 连接到Futu API获取名称
        quote_ctx = connect_futu_api()
        
        try:
            # 获取股票名称
            stock_names = get_stock_names(quote_ctx, missing_names)
            
            # 更新到数据库
            if stock_names:
                update_stock_names(engine, stock_names)
        finally:
            # 确保关闭Futu连接
            quote_ctx.close()
    except Exception as e:
        print(f"获取股票名称时发生错误: {e}")
        traceback.print_exc()
    
    print("股票名称更新完成")

# 连接到Futu OpenAPI 并订阅实时数据
def subscribe_realtime_data():
    """
    订阅实时股票数据
    """
    try:
        quote_ctx = OpenQuoteContext(host=FUTU_CONFIG["host"], port=FUTU_CONFIG["port"])
        
        # 设置回调处理
        quote_handler = StockQuoteHandler()
        quote_ctx.set_handler(quote_handler)
        
        kline_handler = KLineHandler()
        quote_ctx.set_handler(kline_handler)
        
        # 订阅实时报价
        print(f"正在订阅股票实时报价: {STOCKS_TO_TRACK}")
        ret, data = quote_ctx.subscribe(STOCKS_TO_TRACK, [SubType.QUOTE], is_first_push=True)
        if ret != RET_OK:
            print(f"订阅实时报价失败: {data}")
        else:
            print(f"已成功订阅 {len(STOCKS_TO_TRACK)} 支股票的实时报价")
            
        # 订阅日K线
        ret, data = quote_ctx.subscribe(STOCKS_TO_TRACK, [SubType.K_DAY], is_first_push=True)
        if ret != RET_OK:
            print(f"订阅日K线失败: {data}")
        else:
            print(f"已成功订阅 {len(STOCKS_TO_TRACK)} 支股票的日K线")
            
        # 初始计算所有股票的均线
        for stock_code in STOCKS_TO_TRACK:
            calculate_and_store_moving_averages(stock_code)
            
        # 保持连接
        print("实时数据订阅成功，保持连接...")
        while True:
            time.sleep(60)  # 每分钟检查一次
            
    except Exception as e:
        print(f"实时数据订阅出错: {e}")
        traceback.print_exc()
    finally:
        if 'quote_ctx' in locals():
            quote_ctx.close()
            print("已关闭Futu API连接")

# 获取股票基本信息
def get_stock_info(quote_ctx, market):
    try:
        ret, data = quote_ctx.get_stock_basicinfo(market, SecurityType.STOCK)
        if ret != RET_OK:
            print(f"获取股票信息时出错: {data}")
            return None
        
        if data is None or data.empty:
            print(f"未获取到 {market} 市场的股票信息")
            return None
            
        print(f"成功获取 {market} 市场的 {len(data)} 支股票信息")
        
        # 过滤只保留用户关注的股票
        interested_stocks = [code for code in STOCKS_TO_TRACK if code.startswith(market)]
        if interested_stocks:
            filtered_data = data[data['code'].isin(interested_stocks)]
            print(f"过滤后只保留 {len(filtered_data)} 支关注的 {market} 市场股票")
            return filtered_data
        else:
            print(f"在关注列表中没有找到 {market} 市场的股票")
            return None
    except Exception as e:
        print(f"获取 {market} 市场股票信息时发生异常: {e}")
        return None

# 获取历史K线数据
def get_kline_data(quote_ctx, code, start_date, end_date, ktype=KLType.K_DAY):
    try:
        # 查阅文档修正API调用
        ret_code, ret_data, req_id = quote_ctx.request_history_kline(
            code, start=start_date, end=end_date, ktype=ktype
        )
        if ret_code != RET_OK:
            print(f"获取K线数据时出错: {ret_data}, 请求ID: {req_id}")
            return None
            
        if ret_data is None or ret_data.empty:
            print(f"未获取到 {code} 的K线数据")
            return None
            
        print(f"成功获取 {code} 的 {len(ret_data)} 条K线数据")
        return ret_data
    except Exception as e:
        print(f"获取 {code} 的K线数据时发生异常: {e}")
        print("异常类型:", type(e).__name__)
        import traceback
        print("详细traceback:", traceback.format_exc())
        return None

# 将股票信息存储到数据库
def store_stock_info(engine, stock_info_df):
    if stock_info_df is None or stock_info_df.empty:
        print("警告: 没有股票信息可存储")
        return
        
    # 打印实际收到的列以便调试
    print(f"收到的数据列: {stock_info_df.columns.tolist()}")
    
    # 重命名列以匹配我们的数据库模式
    columns_map = {
        'code': 'code',
        'name': 'name',
        'lot_size': 'lot_size',
        'stock_type': 'stock_type',
        'stock_child_type': 'stock_child_type',
        'listing_date': 'listing_date'
    }
    
    # 只包含存在的列
    available_columns = [col for col in columns_map.keys() if col in stock_info_df.columns]
    filtered_map = {k: columns_map[k] for k in available_columns}
    
    # 选择并重命名列
    df = stock_info_df[available_columns].rename(columns=filtered_map)
    df['updated_at'] = datetime.now()
    
    # 如果某些必要列不存在，添加默认值
    if 'stock_owner' not in df.columns:
        df['stock_owner'] = None
    
    # 存储数据到数据库
    df.to_sql('stock_info', engine, if_exists='append', index=False)
    print(f"已存储 {len(df)} 条股票信息记录")

# 更新股票数据（定时执行）
def update_stock_data():
    #print(f"开始更新股票数据，时间: {datetime.now()}")
    
    # 连接到数据库
    engine = get_db_engine()
    
    # 连接到Futu API
    quote_ctx = connect_futu_api()
    
    try:
        # 获取今天和昨天的日期
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        # 更新每只股票的价格数据
        for stock_code in STOCKS_TO_TRACK:
            try:
                stock_data = get_kline_data(quote_ctx, stock_code, start_date, end_date)
                if stock_data is not None and not stock_data.empty:
                    store_stock_prices(engine, stock_data, stock_code)
                    #print(f"已更新 {stock_code} 数据")
                else:
                    print(f"{stock_code} 没有新数据")
            except Exception as e:
                print(f"更新 {stock_code} 时出错: {e}")
        
        # 更新缺失的股票名称
        update_missing_stock_names()
                
    finally:
        # 关闭Futu连接
        quote_ctx.close()
        
    print(f"股票数据更新完成，时间: {datetime.now()}")

# 连接到Futu OpenAPI
def connect_futu_api():
    """
    通过FutuOpenD连接到Futu OpenAPI。
    确保在调用此函数前FutuOpenD已运行并可访问。
    """
    try:
        quote_ctx = OpenQuoteContext(host=FUTU_CONFIG["host"], port=FUTU_CONFIG["port"])
        # 测试连接
        ret, data = quote_ctx.get_global_state()
        if ret != RET_OK:
            print(f"获取全局状态失败: {data}")
            raise ConnectionError(f"无法连接到FutuOpenD: {data}")
        
        print("已成功连接到FutuOpenD行情服务")
        return quote_ctx
    except Exception as e:
        print(f"连接到FutuOpenD时出错: {e}")
        print("请确保FutuOpenD正在运行并且可以访问。")
        raise

# 初始化函数 - 系统启动时运行一次
def initialize():
    print("初始化股票数据系统...")
    
    # 连接到数据库并初始化模式
    engine = get_db_engine()
    init_database(engine)
    
    # 确保 code 字段有唯一约束
    ensure_code_unique_constraint(engine)
    
    try:
        # 连接到Futu API - 获取基本信息
        quote_ctx = connect_futu_api()
        
        try:
            # 获取股票基本信息
            print("获取股票基本信息...")
            
            # 获取香港股票信息
            hk_stocks = get_stock_info(quote_ctx, Market.HK)
            if hk_stocks is not None:
                store_stock_info(engine, hk_stocks)
            
            # 获取美国股票信息
            us_stocks = get_stock_info(quote_ctx, Market.US)
            if us_stocks is not None:
                store_stock_info(engine, us_stocks)
                
        except Exception as e:
            print(f"获取股票基本信息时出错: {e}")
        finally:
            # 关闭第一个连接
            quote_ctx.close()
            
        # 重新连接以获取历史数据
        print("重新连接以获取历史数据...")
        quote_ctx = connect_futu_api()
        
        try:
            # 初始数据加载
            print("获取初始历史数据...")
            
            # 获取过去60天的数据（增加到60天用于计算所有均线）
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
            
            for stock_code in STOCKS_TO_TRACK:
                try:
                    stock_data = get_kline_data(quote_ctx, stock_code, start_date, end_date)
                    if stock_data is not None:
                        store_stock_prices(engine, stock_data, stock_code)
                        print(f"已加载 {stock_code} 的初始数据")
                except Exception as e:
                    print(f"加载 {stock_code} 的初始数据时出错: {e}")
                
        except Exception as e:
            print(f"获取历史数据时出错: {e}")
        finally:
            # 关闭Futu连接
            quote_ctx.close()
            
        # 启动实时数据订阅线程
        realtime_thread = threading.Thread(target=subscribe_realtime_data)
        realtime_thread.daemon = True
        realtime_thread.start()
        print("已启动实时数据订阅")
            
    except Exception as e:
        print(f"初始化过程中出错: {e}")
    
    # 无论前面的步骤是否成功，都确保更新一次股票名称
    try:
        print("强制更新缺失的股票名称...")
        update_missing_stock_names()
    except Exception as e:
        print(f"强制更新股票名称时出错: {e}")
        
    print("初始化完成")

if __name__ == "__main__":
    # 运行初始化
    initialize()
    
    # 设置调度器
    scheduler = BlockingScheduler()
    
    # 为美国市场设置更新（美国东部时间下午4:00）
    scheduler.add_job(update_stock_data, 'cron', hour=16, minute=0, timezone='US/Eastern', 
                     id='us_market_update', name='美国市场更新')
    
    # 为香港市场设置更新（香港时间下午4:00）
    scheduler.add_job(update_stock_data, 'cron', hour=16, minute=0, timezone='Asia/Hong_Kong',
                     id='hk_market_update', name='香港市场更新')
    
    # 每天早上定时更新缺失的股票名称
    scheduler.add_job(update_missing_stock_names, 'cron', hour=9, minute=30, 
                     id='stock_names_update', name='股票名称更新')
                     
    # 立即运行一次股票名称更新（系统启动时）
    scheduler.add_job(update_missing_stock_names, 'date', 
                     run_date=datetime.now() + timedelta(seconds=10),
                     id='stock_names_initial_update', name='初始股票名称更新')
    
    print("调度器已启动。按Ctrl+C退出。")
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("调度器已停止。")