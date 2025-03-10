import time
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy import create_engine, text
from futu import *
from apscheduler.schedulers.blocking import BlockingScheduler
from config import DB_CONFIG, FUTU_CONFIG, STOCKS_TO_TRACK

# 创建数据库连接
def get_db_engine():
    conn_str = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    return create_engine(conn_str)

# 初始化数据库模式
def init_database(engine):
    with engine.connect() as conn:
        # 启用TimescaleDB扩展
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
        
        # 创建股票基础信息表
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS stock_info (
            id SERIAL PRIMARY KEY,
            code VARCHAR(20) NOT NULL,
            name VARCHAR(100),
            lot_size INTEGER,
            stock_type VARCHAR(50),             -- 改为VARCHAR
            stock_child_type VARCHAR(50),       -- 改为VARCHAR
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

# 更新股票数据（定时执行）
def update_stock_data():
    print(f"开始更新股票数据，时间: {datetime.now()}")
    
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
                    print(f"已更新 {stock_code} 数据")
                else:
                    print(f"{stock_code} 没有新数据")
            except Exception as e:
                print(f"更新 {stock_code} 时出错: {e}")
                
    finally:
        # 关闭Futu连接
        quote_ctx.close()
        
    print(f"股票数据更新完成，时间: {datetime.now()}")

# 初始化函数 - 系统启动时运行一次
def initialize():
    print("初始化股票数据系统...")
    
    # 连接到数据库并初始化模式
    engine = get_db_engine()
    init_database(engine)
    
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
            
            # 获取过去30天的数据
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            
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
            
    except Exception as e:
        print(f"初始化过程中出错: {e}")
        
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
    
    print("调度器已启动。按Ctrl+C退出。")
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("调度器已停止。")