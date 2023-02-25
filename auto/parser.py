import feedparser
import datetime

tistory_blog_uri = "https://klmhyeonwooo.tistory.com/"
feed = feedparser.parse(tistory_blog_uri+"/rss")

markdown_text = """

![dino.gif](./dino.gif)

<div align="center">
<img style="height:110px" src="https://user-images.githubusercontent.com/19422885/206861312-7dbd3708-98dc-4b97-82e9-96f25581bc94.gif"></img>
</div>

## 👋🏻

끊임없이 브랜딩하는 FE 개발자입니다!

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
