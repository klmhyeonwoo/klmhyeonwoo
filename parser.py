import feedparser
import datetime
import os
import json

feed_list = ["https://klmhyeonwooo.tistory.com?느릿느릿 프론트엔드", 
             "https://youngkdevlog.tistory.com?YoungKyu", 
             "https://v2.velog.io/rss/k-svelte-master?타락한스벨트전도사", 
             "https://v2.velog.io/rss/koomin1227?koomin",
             "https://v2.velog.io/rss/endmoseung?endmoseung",
             "https://v2.velog.io/rss/thd0427?송규빈",
             "https://v2.velog.io/rss/eunbinn?eunbinn",
             "https://v2.velog.io/rss/rorror1?Park Junha",
             "https://v2.velog.io/rss/jhbae0420?junhyeong",
             "https://v2.velog.io/rss/woogur29?우혁",
             "https://v2.velog.io/rss/imike?imike"
             "https://v2.velog.io/rss/teo?teo.v",
             "https://v2.velog.io/rss/kwonhl0211?Doeon Kwon 권도언",
             "https://v2.velog.io/rss/yeolyi1310?개발자 성열",
            ]

markdown_text = """
<div style="display: flex;">
  <img width="45%" src="https://raw.githubusercontent.com/klmhyeonwoo/Asset-Archieve./main/tumblr_426fdb2151ac09bc808e93d689a5e432_f7593a40_1280.gif" />
  <img width="45%" src="https://raw.githubusercontent.com/klmhyeonwoo/Asset-Archieve./main/%E1%84%86%E1%85%A1%E1%84%8B%E1%85%B5%E1%86%AB%E1%84%8F%E1%85%B3%E1%84%85%E1%85%A2%E1%84%91%E1%85%B3%E1%84%90%E1%85%B3.gif" />
</div>

## Hola ! Hej !

<span style="color:#4E5968; font-size:10px;">

### 회고를 주기적으로 진행해요
- [여러 프로덕트를 마주하며 느꼈던 프로덕트에 대한 고찰](https://klmhyeonwooo.tistory.com/172)<br>
- [프로젝트를 진행하면서 오너쉽을 가져야하는 이유들](https://klmhyeonwooo.tistory.com/149)<br>
- [개발자는 내가 만드는 제품에 대한 애정을 가져야한다](https://klmhyeonwooo.tistory.com/122)<br>
- [4월이 되서야 하는 프론트엔드 회고](https://klmhyeonwooo.tistory.com/167)<br>

### 블로그에서 다양한 내용들을 포스팅해요
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

markdown_text += """

### 활동
- **노션(notion) 코리아 서울** (2024.12 ~ Currently active)
- **데브챗** (2024.01 ~ Currently active)
- **디프만 16th 리더** (2024.10 ~ 2025.06)
- **디프만 15th** (2024.06 ~ 2024.10)
- **디프만 14th** (2023.11 ~ 2024.02)
- **멋쟁이사자처럼 11st 운영진** (2023.03 ~ 2024.10)
- **솝트(sopt) 21st** (2018.05 ~ 2018.12)
- **멋쟁이사자처럼 6th 리더** (2018.04 ~ 2018.12)
- **멋쟁이사자처럼 5th** (2017.06 ~ 2018.02)

### 커리어
- **AhnLab** — Frontend Developer (2024.01 ~ Currently employed)
- **JiranFamily** — Frontend / Editor Developer (2023.04 ~ 2024.01)

### 제 경험들이 궁금하시다면
- 이력 · http://bit.ly/3GBXpKD <br/>
- 포트폴리오 · http://bit.ly/4cPxTO7
"""

f = open("README.md", mode="w", encoding="utf-8")
f.write(markdown_text)
f.close()
print("성공")
