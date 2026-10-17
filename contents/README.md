# GitHub block blog

노션처럼 글을 작성하지만, 글의 원본은 GitHub에 남는 개인 기술 블로그입니다.

## 시작하기

1. 이 폴더를 본인의 빈 GitHub 저장소에 push합니다.
2. `.env.example`을 `.env.local`로 복사해 값을 채웁니다.
3. `npm install` 후 `npm run dev`를 실행합니다.
4. `http://localhost:3000/admin`에서 `ADMIN_PASSWORD`로 로그인해 글을 발행합니다.

발행하면 GitHub 저장소에 다음 두 파일이 커밋됩니다.

- `editor-data/<slug>.json`: BlockNote 편집 원본
- `content/posts/<slug>.mdx`: 공개 페이지에서 렌더링하는 MDX

`GITHUB_TOKEN`에는 대상 저장소에 **Contents: Read and write** 권한이 있는 fine-grained personal access token을 넣으세요. 이 토큰은 `NEXT_PUBLIC_` 접두사 없이 서버 환경변수로만 설정해야 합니다. 이미지 URL은 GitHub raw URL을 사용하므로 저장소는 public이어야 합니다.

## 배포

이 저장소를 Vercel에 연결하고 `.env.local`의 환경변수를 Vercel 프로젝트 설정에도 등록하세요. `/admin`은 서버에서 GitHub 토큰을 사용하므로 정적 GitHub Pages 단독 배포가 아닌 서버 기능이 있는 배포 환경이 필요합니다. GitHub에 새 글이 커밋되면 Vercel이 자동으로 다시 배포합니다.

## 편집 기능

편집기에서 `/image`를 입력하면 이미지를 넣을 수 있고, 업로드된 파일은 `public/uploads`에 GitHub 커밋으로 저장됩니다. `/admin` 하단의 글 목록에서 기존 글을 열면 블록 원본 JSON을 다시 불러와 수정할 수 있습니다.
