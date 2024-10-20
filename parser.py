import feedparser
import datetime
import os
import json

feed_list = ["https://klmhyeonwooo.tistory.com?klmhyeonwoo", 
             "https://youngkdevlog.tistory.com?YoungKyu", 
             "https://v2.velog.io/rss/k-svelte-master?타락한스벨트전도사", 
             "https://v2.velog.io/rss/koomin1227?koomin",
             "https://v2.velog.io/rss/handmk?HandMK",
             "https://v2.velog.io/rss/endmoseung?endmoseung",
             "https://v2.velog.io/rss/thd0427?송규빈",
             "https://v2.velog.io/rss/rorror1?Park Junha",
             "https://v2.velog.io/rss/jhbae0420?junhyeong",
             "https://v2.velog.io/rss/woogur29?우혁",
             "https://v2.velog.io/rss/imike?imike",
            ]

markdown_text = """
<div align="center">
  
<img src="https://render.gitanimals.org/lines/klmhyeonwoo?pet-id=590059497944971134" width="1000" height="240"/>

</div>

## klm hyeon woo

<span style="color:#4E5968; font-size:10px;">
네트워킹 좋아하고, 데브렐에 관심이 많은 삼평동 연구원입니다만 🫨

### 회고록
- [개발자는 내가 만드는 제품에 대한 애정을 가져야한다](https://klmhyeonwooo.tistory.com/122)<br>
- [그 동안 남의 시선에서 벗어나지 못했던 것 같다](https://klmhyeonwooo.tistory.com/65)<br>
- [정든 멋쟁이사자처럼을 떠나며](https://klmhyeonwooo.tistory.com/89)<br>
- [리크루팅을 위해 어플라이 사이트를 개발했다](https://klmhyeonwooo.tistory.com/74)<br>

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
    elif (BLOG_URL.find("medium") != -1):
        feed = feedparser.parse(BLOG_URL.split("?")[0]+"/feed")
    else:
        feed = feedparser.parse(BLOG_URL.split("?")[0]+"/rss")
      
    writer = BLOG_URL.split("?")[1]
    for i in feed['entries']:
        # print(i)
        if (BLOG_URL.find("velog.io") != -1 or BLOG_URL.find("medium") != -1):
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
