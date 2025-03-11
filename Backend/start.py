import threading
import time
import uvicorn
import stock_data_fetcher

def run_data_fetcher():
    """运行股票数据获取器"""
    stock_data_fetcher.initialize()
    
    # 设置并启动调度器
    scheduler = stock_data_fetcher.BlockingScheduler()
    
    # 为美国市场设置更新（美国东部时间下午4:00）
    scheduler.add_job(stock_data_fetcher.update_stock_data, 'cron', 
                     hour=16, minute=0, timezone='US/Eastern', 
                     id='us_market_update', name='美国市场更新')
    
    # 为香港市场设置更新（香港时间下午4:00）
    scheduler.add_job(stock_data_fetcher.update_stock_data, 'cron', 
                     hour=16, minute=0, timezone='Asia/Hong_Kong',
                     id='hk_market_update', name='香港市场更新')
    
    # # 每天早上定时更新缺失的股票名称
    # scheduler.add_job(stock_data_fetcher.update_missing_stock_names, 'cron', hour=9, minute=30, 
    #                  id='stock_names_update', name='股票名称更新')
                     
    # # 立即运行一次股票名称更新（系统启动时）
    # scheduler.add_job(stock_data_fetcher.update_missing_stock_names, 'date', 
    #                  run_date=datetime.now() + timedelta(seconds=10),
    #                  id='stock_names_initial_update', name='初始股票名称更新')
    
    print("数据获取调度器已启动")
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("数据获取调度器已停止")

def run_api_server():
    """运行API服务器 - 使用uvicorn而不是app.run()"""
    print("启动FastAPI服务器...")
    uvicorn.run("api_server:app", host="0.0.0.0", port=5000, log_level="info")

if __name__ == "__main__":
    # 创建并启动数据获取线程
    data_thread = threading.Thread(target=run_data_fetcher)
    data_thread.daemon = True
    data_thread.start()
    
    # 在主线程中运行API服务器
    run_api_server()