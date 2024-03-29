import feedparser
import datetime
import os
import json

feed_list = ["https://klmhyeonwooo.tistory.com?5기 김현우", "https://minwoo-it-factory.tistory.com?11기 김민우", "https://apape1225.tistory.com?11기 성창규", "https://starlikedh.tistory.com?6기 정다혜", "https://v2.velog.io/rss/handmk?11기 손민기", "https://v2.velog.io/rss/yunh03?11기 전윤환", "https://ub775.tistory.com?11기 강명균"]

markdown_text = """
<div align="center">
  
![dino.gif](./dino.gif)

</div>

## klm hyeon woo

<span style="color:#4E5968; font-size:10px;">
브랜딩을 좋아하는 개발자입니다 🦄

### 회고록
- [정든 멋쟁이사자처럼을 떠나며](https://klmhyeonwooo.tistory.com/89)<br>
- [경험의 미학](https://klmhyeonwooo.tistory.com/80)<br>
- [리크루팅을 위해 어플라이 사이트를 개발했다](https://klmhyeonwooo.tistory.com/74)<br>
- [그 동안 남의 시선에서 벗어나지 못했던 것 같다](https://klmhyeonwooo.tistory.com/65)<br>

### 최근 포스팅
"""

lst = []
parsing_data = {}
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR += "/data"
print(BASE_DIR)
uniqueKey = 0

for BLOG_URL in feed_list:
    if (BLOG_URL.find("velog.io") != -1):
        feed = feedparser.parse(BLOG_URL.split("?")[0])
    else:
        feed = feedparser.parse(BLOG_URL.split("?")[0]+"/rss")
      
    writer = BLOG_URL.split("?")[1]
    for i in feed['entries']:
        # print(i)
        if (BLOG_URL.find("velog.io") != -1):
          parsing_data["feed-" + str(uniqueKey)] = { 
              "title" : i['title'],
              "link" : i['link'],
              "date" : datetime.datetime.strptime(i['published'], '%a, %d %b %Y %H:%M:%S %Z').strftime("%b %d, %Y"),
              "writer" : writer,
          }
        else:
            parsing_data["feed-" + str(uniqueKey)] = { 
              "title" : i['title'],
              "link" : i['link'],
              "date" : datetime.datetime.strptime(i['published'], "%a, %d %b %Y %H:%M:%S %z").strftime("%b %d, %Y"),
              "writer" : writer,
            }
        print("-", i['link'], i['title'])
        uniqueKey += 1

parsing_data = dict(sorted(parsing_data.items(), key=lambda item: datetime.datetime.strptime(item[1]['date'], '%b %d, %Y'), reverse=True))

feed = feedparser.parse(feed_list[0].split("?")[0]+"/rss")
for i in feed['entries']:
    # print(i)
    markdown_text += f"- [{i['title']}]({i['link']})<br>\n"
  
with open(os.path.join(BASE_DIR, 'feed.json'), 'w+',encoding='utf-8') as json_file:
    json.dump(parsing_data, json_file, ensure_ascii = False, indent='\t')

print(parsing_data)
f = open("README.md", mode="w", encoding="utf-8")
f.write(markdown_text)
f.close()
print("성공")
