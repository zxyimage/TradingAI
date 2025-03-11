from futu import *
quote_ctx = OpenQuoteContext(host='127.0.0.1', port=11111)

# 设置 pandas 显示选项，显示所有行
import pandas as pd
pd.set_option('display.max_rows', None)  # 显示所有行
pd.set_option('display.max_columns', None)  # 显示所有列
pd.set_option('display.width', None)  # 设置显示宽度为无限制

# 获取用户自选股列表
ret, data = quote_ctx.get_user_security("港股")
if ret == RET_OK:
    print("完整的自选股数据：")
    print(data)
    if data.shape[0] > 0:
        print("\n第一个股票代码：")
        print(data['code'][0])
        print("\n所有股票代码列表：")
        print(data['code'].values.tolist())
else:
    print('error:', data)
quote_ctx.close() # 结束后记得关闭当条连接，防止连接条数用尽
