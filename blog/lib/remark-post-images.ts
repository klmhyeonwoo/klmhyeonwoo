type TreeNode = { type?: string; name?: string | null; children?: TreeNode[] };

/** Route legacy JSX images through the same renderer as newly saved images. */
export function remarkPostImages() {
  return (tree: unknown) => {
    const visit = (node: TreeNode) => {
      if ((node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") && node.name === "img") node.name = "PostImage";
      node.children?.forEach(visit);
    };
    visit(tree as TreeNode);
  };
}
