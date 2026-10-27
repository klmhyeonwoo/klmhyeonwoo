type Attribute = { type?: string; name?: string; value?: string | null | { type?: string; value?: string } };
type TreeNode = { type?: string; name?: string | null; attributes?: Attribute[]; children?: TreeNode[] };
const imageNumbers = new Set(["width", "focusX", "focusY", "zoom"]);
const carouselNumbers = new Set(["slidesPerView"]);

/** Route legacy JSX images through the same renderer as newly saved images. */
export function remarkPostImages() {
  return (tree: unknown) => {
    const visit = (node: TreeNode) => {
      if ((node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") && node.name === "img") node.name = "PostImage";
      // next-mdx-remote blocks JSX expressions by default. Convert only numeric
      // literals on our known components before its safety plugin strips them.
      const allowed = node.name === "PostImage" ? imageNumbers : node.name === "PostCarousel" ? carouselNumbers : null;
      for (const attr of node.attributes ?? []) {
        if (attr.type !== "mdxJsxAttribute" || !attr.name || !allowed?.has(attr.name) || !attr.value || typeof attr.value === "string" || attr.value.type !== "mdxJsxAttributeValueExpression") continue;
        const value = attr.value.value?.trim() ?? "";
        if (/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) && Number.isFinite(Number(value))) attr.value = value;
      }
      node.children?.forEach(visit);
    };
    visit(tree as TreeNode);
  };
}
