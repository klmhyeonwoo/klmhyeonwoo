# GitHub block blog

노션처럼 글을 작성하지만, 글의 원본은 GitHub에 남는 개인 기술 블로그입니다.

## 시작하기

1. 이 폴더를 본인의 GitHub 저장소에 push합니다.
2. `.env.example`을 `.env.local`로 복사해 값을 채웁니다.
3. `pnpm install` 후 `pnpm dev`를 실행합니다.
4. `http://localhost:3000/ykk`에서 `ADMIN_PASSWORD`로 로그인해 글을 작성합니다.

발행하면 GitHub 저장소에 다음 두 파일이 커밋됩니다.

- `blog/editor-data/<uuid>.json`: BlockNote 편집 원본
- `blog/content/posts/<uuid>.mdx`: 공개 페이지에서 렌더링하는 MDX

`GITHUB_TOKEN`에는 대상 저장소에 **Contents: Read and write** 권한이 있는 fine-grained personal access token을 넣으세요. 이 토큰은 `NEXT_PUBLIC_` 접두사 없이 서버 환경변수로만 설정해야 합니다.

## 배포

이 저장소를 Vercel에 연결하고 `.env.local`의 환경변수를 Vercel 프로젝트 설정에도 등록하세요. GitHub에 새 글이 커밋되면 Vercel이 자동으로 다시 배포합니다.

## 편집 기능

관리자 로그인 후 글을 수정·삭제하거나 임시 저장할 수 있습니다. 비밀번호 보호 글은 홈 목록에는 보이지만 사이트에서 본문을 열기 전에 비밀번호를 받습니다. 저장소가 public이면 GitHub 원문은 별도로 읽을 수 있으므로, 실제 비밀글이 필요하다면 저장소를 private로 유지하세요.
