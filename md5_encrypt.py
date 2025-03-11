#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import hashlib
import sys

def md5_encrypt(text):
    """将明文转换为32位MD5加密的十六进制字符串"""
    md5 = hashlib.md5()
    md5.update(text.encode('utf-8'))
    return md5.hexdigest()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # 从命令行参数获取明文
        plaintext = sys.argv[1]
        encrypted = md5_encrypt(plaintext)
        print(f"明文: {plaintext}")
        print(f"MD5加密后: {encrypted}")
    else:
        # 交互式输入
        plaintext = input("请输入需要加密的明文密码: ")
        encrypted = md5_encrypt(plaintext)
        print(f"明文: {plaintext}")
        print(f"MD5加密后: {encrypted}")
        
        # 提示如何在FutuOpenD.xml中使用
        print("\n在FutuOpenD.xml中使用:")
        print(f"<login_pwd_md5>{encrypted}</login_pwd_md5>")