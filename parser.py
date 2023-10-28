import feedparser
import datetime
import os
import json

tistory_blog_uri = "https://klmhyeonwooo.tistory.com/"
feed = feedparser.parse(tistory_blog_uri+"/rss")

markdown_text = """
<div align="center">
  
![dino.gif](./dino.gif)

</div>

## 배움을 즐거워하고 브랜딩하는 프론트엔드 개발자 🦄

<span style="color:#4E5968; font-size:10px;">
<strong>사용자의 편안한 UX와 UI를 중요시 하는 프론트엔드 개발자</strong>입니다.<br/>
소프트웨어 공학을 전공하고, 다채로운 사람이 되고자<br/>
개발 및 디자인과 기획 분야, 그리고 사람들이 소통하는 방법을 공부합니다.<br/>
사람들에게 편리함과 도움을 제공하는 매체에 관심이 많습니다.<br/>
때문에 다양한 부분을 도전하고, 탐구하며 다양한 프로젝트를 개발해왔습니다.</span>

### 개발 회고록
- [정든 멋쟁이사자처럼을 떠나며](https://klmhyeonwooo.tistory.com/89)<br>
- [경험의 미학](https://klmhyeonwooo.tistory.com/80)<br>
- [리크루팅을 위해 어플라이 사이트를 개발했다](https://klmhyeonwooo.tistory.com/74)<br>
- [그 동안 남의 시선에서 벗어나지 못했던 것 같다](https://klmhyeonwooo.tistory.com/65)<br>

### 최근 포스팅
"""

lst = []
parsing_data = {}
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
print(BASE_DIR)
uniqueKey = 0

for i in feed['entries']:
    # dt = datetime.datetime.strptime(
    #     i['published'], "%a, %d %b %Y %H:%M:%S %z").strftime("%b %d, %Y")
    markdown_text += f"- [{i['title']}]({i['link']})<br>\n"
    parsing_data["post_" + str(uniqueKey)] = {
      "title" : i['title'],
      "link" : i['link'],
      "date" : datetime.datetime.strptime(i['published'], "%a, %d %b %Y %H:%M:%S %z").strftime("%b %d, %Y")
    }
    print("-", i['link'], i['title'])
    uniqueKey += 1
  
with open(os.path.join(BASE_DIR, 'news.json'), 'w+',encoding='utf-8') as json_file:
    json.dump(parsing_data, json_file, ensure_ascii = False, indent='\t')
f = open("README.md", mode="w", encoding="utf-8")
f.write(markdown_text)
f.close()
