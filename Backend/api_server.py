from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import json
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from config import STOCKS_TO_TRACK, update_stocks_to_track, reload_configuration, DB_CONFIG
from stock_ai_analyzer import StockAIAnalyzer

# 创建FastAPI应用
app = FastAPI(
    title="股票AI分析系统API",
    description="提供股票数据查询和AI分析的API服务",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境应该限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化AI分析器
ai_analyzer = StockAIAnalyzer()

# 定义请求和响应模型
class StockItem(BaseModel):
    code: str

class StockListRequest(BaseModel):
    stocks: List[str]

class StockListResponse(BaseModel):
    success: bool
    message: str
    stocks: Optional[List[str]] = None

class StockDataResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    analysis: Optional[Dict[str, Any]] = None

class StockAnalysisResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    analysis: Optional[Dict[str, Any]] = None

class StocksSummary(BaseModel):
    stock_count: int
    total_records: int
    earliest_date: Optional[str] = None
    latest_date: Optional[str] = None

class LatestStockData(BaseModel):
    time: str
    open: Optional[float] = None
    close: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[int] = None
    turnover: Optional[float] = None
    change_percent: Optional[float] = None

class StockStats(BaseModel):
    record_count: int
    earliest_date: Optional[str] = None
    latest_date: Optional[str] = None

class StockDataItem(BaseModel):
    code: str
    latest_data: LatestStockData
    stats: StockStats

class StoredStocksResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    stocks: Optional[List[StockDataItem]] = None
    summary: Optional[StocksSummary] = None

class StockInfo(BaseModel):
    code: str
    name: Optional[str] = None
    lot_size: Optional[int] = None
    stock_type: Optional[str] = None
    stock_child_type: Optional[str] = None
    stock_owner: Optional[str] = None
    listing_date: Optional[str] = None

class StockAllDataResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    code: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    info: Optional[StockInfo] = None

# 创建数据库连接
def get_db_engine() -> Engine:
    conn_str = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
    return create_engine(conn_str)

# API端点: 获取当前跟踪的股票列表
@app.get("/api/stocks", response_model=StockListResponse, tags=["股票配置"])
async def get_stocks():
    """
    获取当前系统跟踪的所有股票代码列表
    """
    return {"success": True, "message": "获取成功", "stocks": STOCKS_TO_TRACK}

# API端点: 更新要跟踪的股票列表
@app.post("/api/stocks", response_model=StockListResponse, tags=["股票配置"])
async def update_stocks(stock_list: StockListRequest):
    """
    更新系统要跟踪的股票列表
    
    - **stocks**: 新的股票代码列表
    """
    success, message = update_stocks_to_track(stock_list.stocks)
    return {"success": success, "message": message, "stocks": STOCKS_TO_TRACK if success else None}

# API端点: 获取股票数据
@app.get("/api/stock_data", response_model=StockDataResponse, tags=["股票数据"])
async def get_stock_data(
    code: str = Query(..., description="股票代码，例如 US.AAPL 或 HK.00700"),
    days: int = Query(30, description="获取多少天的数据，默认30天")
):
    """
    获取指定股票的历史价格数据
    
    - **code**: 股票代码
    - **days**: 获取多少天的数据
    """
    try:
        engine = get_db_engine()
        with engine.connect() as conn:
            # 计算日期范围
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # 查询股票数据
            query = text("""
            SELECT time, code, open, close, high, low, volume, turnover
            FROM stock_price
            WHERE code = :code AND time BETWEEN :start_date AND :end_date
            ORDER BY time
            """)
            
            result = conn.execute(query, {"code": code, 
                                          "start_date": start_date, 
                                          "end_date": end_date})
            
            data = []
            for row in result:
                data.append({
                    'time': row.time.isoformat(),
                    'code': row.code,
                    'open': float(row.open) if row.open else None,
                    'close': float(row.close) if row.close else None,
                    'high': float(row.high) if row.high else None,
                    'low': float(row.low) if row.low else None,
                    'volume': row.volume,
                    'turnover': float(row.turnover) if row.turnover else None
                })
            
            if not data:
                return {"success": False, "message": "没有找到股票数据"}
            
            # 使用AI分析器生成分析结果
            analysis_result = ai_analyzer.analyze_stock(data)
            
            return {
                "success": True, 
                "data": data,
                "analysis": analysis_result
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取股票数据时出错: {str(e)}")

# API端点: 获取股票AI分析
@app.get("/api/stock_analysis", response_model=StockAnalysisResponse, tags=["股票分析"])
async def get_stock_analysis(
    code: str = Query(..., description="股票代码，例如 US.AAPL 或 HK.00700"),
    days: int = Query(30, description="分析多少天的数据，默认30天")
):
    """
    获取指定股票的AI分析结果
    
    - **code**: 股票代码
    - **days**: 分析多少天的数据
    """
    try:
        engine = get_db_engine()
        with engine.connect() as conn:
            # 计算日期范围
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # 查询股票数据
            query = text("""
            SELECT time, code, open, close, high, low, volume, turnover
            FROM stock_price
            WHERE code = :code AND time BETWEEN :start_date AND :end_date
            ORDER BY time
            """)
            
            result = conn.execute(query, {"code": code, 
                                          "start_date": start_date, 
                                          "end_date": end_date})
            
            data = []
            for row in result:
                data.append({
                    'time': row.time.isoformat(),
                    'code': row.code,
                    'open': float(row.open) if row.open else None,
                    'close': float(row.close) if row.close else None,
                    'high': float(row.high) if row.high else None,
                    'low': float(row.low) if row.low else None,
                    'volume': row.volume,
                    'turnover': float(row.turnover) if row.turnover else None
                })
            
            if not data:
                return {"success": False, "message": "没有找到股票数据"}
            
            # 使用AI分析器生成分析结果
            analysis_result = ai_analyzer.analyze_stock(data)
            
            return {
                "success": True, 
                "analysis": analysis_result
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取股票分析时出错: {str(e)}")

# API端点: 获取所有存储的股票数据
@app.get("/api/stored_stocks", response_model=StoredStocksResponse, tags=["股票数据"])
async def get_stored_stocks():
    """
    获取系统中所有存储的股票数据概览
    """
    try:
        engine = get_db_engine()
        with engine.connect() as conn:
            # 获取所有唯一的股票代码
            stock_codes_query = text("""
            SELECT DISTINCT code FROM stock_price
            ORDER BY code
            """)
            
            result = conn.execute(stock_codes_query)
            stock_codes = [row[0] for row in result]
            
            # 对每只股票获取最新的数据点和数据总量
            stocks_data = []
            for code in stock_codes:
                # 获取最新两天数据（用于计算涨跌幅）
                latest_query = text("""
                SELECT time, code, open, close, high, low, volume, turnover 
                FROM stock_price
                WHERE code = :code
                ORDER BY time DESC
                LIMIT 2
                """)
                
                latest_result = conn.execute(latest_query, {"code": code})
                latest_rows = latest_result.fetchall()
                latest_row = latest_rows[0] if latest_rows else None
                previous_row = latest_rows[1] if len(latest_rows) > 1 else None
                
                # 获取记录总数和日期范围
                stats_query = text("""
                SELECT 
                    COUNT(*) as record_count,
                    MIN(time) as earliest_date,
                    MAX(time) as latest_date
                FROM stock_price
                WHERE code = :code
                """)
                
                stats_result = conn.execute(stats_query, {"code": code})
                stats_row = stats_result.fetchone()
                
                if latest_row and stats_row:
                    # 计算涨跌幅
                    change_percent = None
                    if previous_row and latest_row.close and previous_row.close:
                        change = float(latest_row.close) - float(previous_row.close)
                        change_percent = (change / float(previous_row.close)) * 100
                    
                    stocks_data.append({
                        'code': latest_row.code,
                        'latest_data': {
                            'time': latest_row.time.isoformat(),
                            'open': float(latest_row.open) if latest_row.open else None,
                            'close': float(latest_row.close) if latest_row.close else None,
                            'high': float(latest_row.high) if latest_row.high else None,
                            'low': float(latest_row.low) if latest_row.low else None,
                            'volume': latest_row.volume,
                            'turnover': float(latest_row.turnover) if latest_row.turnover else None,
                            'change_percent': change_percent
                        },
                        'stats': {
                            'record_count': stats_row.record_count,
                            'earliest_date': stats_row.earliest_date.isoformat() if stats_row.earliest_date else None,
                            'latest_date': stats_row.latest_date.isoformat() if stats_row.latest_date else None
                        }
                    })
            
            # 获取总体统计信息
            summary_query = text("""
            SELECT 
                COUNT(DISTINCT code) as stock_count,
                COUNT(*) as total_records,
                MIN(time) as earliest_date,
                MAX(time) as latest_date
            FROM stock_price
            """)
            
            summary_result = conn.execute(summary_query)
            summary_row = summary_result.fetchone()
            
            summary_data = {
                'stock_count': summary_row.stock_count,
                'total_records': summary_row.total_records,
                'earliest_date': summary_row.earliest_date.isoformat() if summary_row.earliest_date else None,
                'latest_date': summary_row.latest_date.isoformat() if summary_row.latest_date else None
            }
            
            return {
                "success": True, 
                "stocks": stocks_data,
                "summary": summary_data
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取存储的股票数据时出错: {str(e)}")

# API端点: 获取单只股票的所有数据
@app.get("/api/stock_all_data", response_model=StockAllDataResponse, tags=["股票数据"])
async def get_stock_all_data(
    code: str = Query(..., description="股票代码，例如 US.AAPL 或 HK.00700")
):
    """
    获取指定股票的所有历史数据和基本信息
    
    - **code**: 股票代码
    """
    try:
        engine = get_db_engine()
        with engine.connect() as conn:
            # 查询所有数据
            query = text("""
            SELECT time, code, open, close, high, low, volume, turnover
            FROM stock_price
            WHERE code = :code
            ORDER BY time
            """)
            
            result = conn.execute(query, {"code": code})
            
            data = []
            for row in result:
                data.append({
                    'time': row.time.isoformat(),
                    'code': row.code,
                    'open': float(row.open) if row.open else None,
                    'close': float(row.close) if row.close else None,
                    'high': float(row.high) if row.high else None,
                    'low': float(row.low) if row.low else None,
                    'volume': row.volume,
                    'turnover': float(row.turnover) if row.turnover else None
                })
            
            # 获取股票基本信息
            info_query = text("""
            SELECT * FROM stock_info
            WHERE code = :code
            LIMIT 1
            """)
            
            info_result = conn.execute(info_query, {"code": code})
            info_row = info_result.fetchone()
            
            stock_info = None
            if info_row:
                stock_info = {
                    'code': info_row.code,
                    'name': info_row.name,
                    'lot_size': info_row.lot_size,
                    'stock_type': info_row.stock_type,
                    'stock_child_type': info_row.stock_child_type,
                    'stock_owner': info_row.stock_owner,
                    'listing_date': info_row.listing_date.isoformat() if info_row.listing_date else None
                }
            
            return {
                "success": True, 
                "code": code,
                "data": data,
                "info": stock_info
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取股票历史数据时出错: {str(e)}")

# 健康检查端点
@app.get("/health", tags=["系统"])
async def health_check():
    """
    系统健康检查API
    """
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# 系统信息端点
@app.get("/info", tags=["系统"])
async def system_info():
    """
    获取系统信息
    """
    return {
        "name": "股票AI分析系统",
        "version": "1.0.0",
        "api_version": "1.0.0",
        "tracked_stocks_count": len(STOCKS_TO_TRACK),
        "tracked_stocks": STOCKS_TO_TRACK
    }

# 如果直接运行此文件，启动Uvicorn服务器
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="0.0.0.0", port=5000, reload=True)