
删除原来的
```bash
cd /etc/nginx/sites-available
ls -a
rm superaihub

cd /etc/nginx/sites-enabled/
rm superaihub
```

复制新的
```bash
cp /root/TradingAI/nginx/superaihub /etc/nginx/sites-available/

```

```bash
cp /etc/nginx/sites-available/superaihub /etc/nginx/sites-enabled/

```

测试您的 Nginx 配置文件是否正确：

```bash
sudo nginx -t
```
重启 Nginx:
	如果没有错误，重启 Nginx 使更改生效：
```bash
sudo systemctl restart nginx
```
