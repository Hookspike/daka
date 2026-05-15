import os
import requests

SEND_KEY = os.environ.get('SERVERCHAN_SENDKEY')
title = os.environ.get('REMIND_TITLE', '打卡提醒')
content = os.environ.get('REMIND_DESP', '温馨提示：请记得打卡！')

def send_wechat_reminder():
    url = f"https://sctapi.ftqq.com/{SEND_KEY}.send"
    data = {
        'title': title,
        'desp': content
    }
    resp = requests.post(url, data=data)
    print(f"Response: {resp.status_code}, {resp.text}")

if __name__ == "__main__":
    send_wechat_reminder()
