import feedparser
import datetime

tistory_blog_uri = "https://klmhyeonwooo.tistory.com/"
feed = feedparser.parse(tistory_blog_uri+"/rss")

markdown_text = """

![dino.gif](./dino.gif)

<div align="center">
<img style="height:110px" src="https://user-images.githubusercontent.com/19422885/206861312-7dbd3708-98dc-4b97-82e9-96f25581bc94.gif"></img>
</div>

## 끊임없이 브랜딩하는 FE 개발자 👋🏻

<span style="color:#4E5968;">
**사용자의 편안한 UX와 UI를 중요시 하는 프론트엔드 개발자** **김현우**입니다.<br/>
소프트웨어 공학을 전공하고, 다채로운 사람이 되고자<br/>
개발 및 디자인과 기획 분야, 그리고 사람들이 소통하는 방법을 공부합니다.<br/>
사람들에게 편리함과 도움을 제공하는 매체에 관심이 많습니다.<br/>
때문에 다양한 부분을 도전하고, 탐구하며 다양한 프로젝트를 개발해왔습니다.</span>

<img src="https://komarev.com/ghpvc/?username=evan-moon&label=Profile%20views&color=0e75b6&style=flat" alt="evan-moon" />

### 최근 포스팅
"""
lst = []

for i in feed['entries']:
    # dt = datetime.datetime.strptime(
    #     i['published'], "%a, %d %b %Y %H:%M:%S %z").strftime("%b %d, %Y")
    markdown_text += f"- [{i['title']}]({i['link']})<br>\n"
    print("-", i['link'], i['title'])

f = open("README.md", mode="w", encoding="utf-8")
f.write(markdown_text)
f.close()
