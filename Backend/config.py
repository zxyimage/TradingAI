import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 数据库配置
DB_CONFIG = {
    "user": os.getenv("DB_USER", "stockuser"),
    "password": os.getenv("DB_PASSWORD", "stockpassword"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "stockdb")
}

# Futu API配置
FUTU_CONFIG = {
    "host": os.getenv("FUTU_HOST", "127.0.0.1"),
    "port": int(os.getenv("FUTU_PORT", "11111"))
}

# 要跟踪的股票
STOCKS_TO_TRACK = os.getenv("STOCKS_TO_TRACK", "US.AAPL,US.MSFT,HK.00700").split(",")