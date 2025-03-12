# Backend/config.py
import os
import json
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

# Redis配置
REDIS_CONFIG = {
    "host": os.getenv("REDIS_HOST", "localhost"),
    "port": int(os.getenv("REDIS_PORT", "6379")),
    "db": 0,
    "decode_responses": True
}

# Futu API配置
FUTU_CONFIG = {
    "host": os.getenv("FUTU_HOST", "127.0.0.1"),
    "port": int(os.getenv("FUTU_PORT", "11111"))
}

# 从JSON文件读取要跟踪的股票
def load_stocks_from_json(json_file_path='stocks_config.json'):
    try:
        with open(json_file_path, 'r') as file:
            config = json.load(file)
            return config.get('stocks_to_track', [])
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"无法读取股票配置文件: {e}")
        # 使用默认值作为后备
        return os.getenv("STOCKS_TO_TRACK", "US.AAPL,US.MSFT,HK.00700").split(",")

# 获取要跟踪的股票列表
STOCKS_TO_TRACK = load_stocks_from_json()

# 提供函数用于更新跟踪的股票列表
def update_stocks_to_track(stocks_list, json_file_path='stocks_config.json'):
    try:
        config = {'stocks_to_track': stocks_list}
        with open(json_file_path, 'w') as file:
            json.dump(config, file, indent=2)
        global STOCKS_TO_TRACK
        STOCKS_TO_TRACK = stocks_list
        return True, "股票配置已更新"
    except Exception as e:
        return False, f"更新股票配置时出错: {e}"

# 提供函数用于重新加载配置（API调用可使用）
def reload_configuration():
    global STOCKS_TO_TRACK
    STOCKS_TO_TRACK = load_stocks_from_json()
    return STOCKS_TO_TRACK