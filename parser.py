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

#### 사람들에게 도움을 주는 서비스들을 만들고, 그로스하는 과정을 좋아해요

[![Resume Badge](https://img.shields.io/badge/Resume-e5e5e5?logo=notion&logoColor=1a1a1a)](https://bit.ly/485bjRb)
[![Blog Badge](https://img.shields.io/badge/Blog-f4702e?logo=bloglovin&logoColor=white)](https://klmhyeonwooo.tistory.com/)
[![Linkdin Badge](https://img.shields.io/badge/LinkdIn-398af3?logo=logmein&logoColor=white)](www.linkedin.com/in/hyeonwoo-klm)

<span style="color:#4E5968; font-size:10px;">

##### 개발자 회고
- [마이그레이션을 진행하며 느꼈던 팀을 위한 소소한 팁](https://klmhyeonwooo.tistory.com/183)<br>
- [여러 프로덕트를 마주하며 느꼈던 프로덕트에 대한 고찰](https://klmhyeonwooo.tistory.com/172)<br>
- [프로젝트를 진행하면서 오너쉽을 가져야하는 이유들](https://klmhyeonwooo.tistory.com/149)<br>
- [개발자는 내가 만드는 제품에 대한 애정을 가져야한다](https://klmhyeonwooo.tistory.com/122)<br>
- [2년차 프론트엔드 회고](https://klmhyeonwooo.tistory.com/167)<br>

##### 테크 블로그
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

##### 패키지
<ul style="list-style: none; padding: 0; margin: 0; font-family: sans-serif; line-height: 1.8;">
  <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
    <img width="17" height="auto" alt="icon" src="https://github.com/user-attachments/assets/69ee1f1e-b92d-45b8-b534-941ee871efd4" />
    <a href="https://www.npmjs.com/package/crosseditor-react" style="text-decoration: none; color: #0366d6; font-weight: 600;">react-crosseditor</a>
    <span style="color: #6a737d; font-size: 14px;"> · React wrapper for WYSIWYG editor</span>
  </li>
  <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
    <img width="17" height="auto" alt="icon" src="https://github.com/user-attachments/assets/69ee1f1e-b92d-45b8-b534-941ee871efd4" />
    <a href="https://www.npmjs.com/package/jsdoc-builder" style="text-decoration: none; color: #0366d6; font-weight: 600;">jsdoc-builder</a>
    <span style="color: #6a737d; font-size: 14px;"> · CLI tool for automated JSDoc generation</span>
  </li>
  <li style="display: flex; align-items: center; gap: 8px;">
    <img width="17" height="auto" alt="icon" src="https://github.com/user-attachments/assets/69ee1f1e-b92d-45b8-b534-941ee871efd4" />
    <a href="https://www.npmjs.com/package/kr-corekit" style="text-decoration: none; color: #0366d6; font-weight: 600;">kr-corekit</a>
    <span style="color: #6a737d; font-size: 14px;"> · Utility functions library</span>
  </li>
</ul>

##### 익스텐션
<ul style="list-style: none; padding: 0; margin: 0; font-family: sans-serif; line-height: 1.8;">
  <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
    <img width="17" height="auto" alt="icon" src="https://lh3.googleusercontent.com/eTtZ8knd4vZNHki7EAPmjtpFYwGETSrP3fh6iGnX4tQy4-1Zb11ArU2zphDMZq1AU29smycrkv8ReS_vDMDdvGOZ=s120" />
    <a href="https://chromewebstore.google.com/detail/rework/mibhdihagebcbcmifindjenkaoikajim?hl=ko" style="text-decoration: none; color: #0366d6; font-weight: 600;">rework</a>
    <span style="color: #6a737d; font-size: 14px;"> · A Google extension that lets you easily manage your day's tasks.</span>
  </li>
</ul>

##### 유저들과 운영중인 서비스
<ul style="list-style: none; padding: 0; margin: 0; font-family: sans-serif; line-height: 1.8;">
  <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
    <img width="17" height="auto" alt="icon" src="https://raw.githubusercontent.com/klmhyeonwoo/Asset-Archieve./2bbd60dd4a0fe38d69ee454a33adecb0538a539c/nklcb.svg" />
    <a href="https://nklcb.kr" style="text-decoration: none; color: #0366d6; font-weight: 600;">nklcb</a>
    <span style="color: #6a737d; font-size: 14px;"> · A community service focused on big tech recruitment and employment.</span>
  </li>
  <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
    <img width="17" height="auto" alt="icon" src="https://raw.githubusercontent.com/klmhyeonwoo/Asset-Archieve./2bbd60dd4a0fe38d69ee454a33adecb0538a539c/white_layer.svg" />
    <a href="https://layerapp.io" style="text-decoration: none; color: #0366d6; font-weight: 600;">layer</a>
    <span style="color: #6a737d; font-size: 14px;"> · A service that provides easy retrospective writing and AI analysis.</span>
  </li>
</ul>
"""

f = open("README.md", mode="w", encoding="utf-8")
f.write(markdown_text)
f.close()
print("성공")
