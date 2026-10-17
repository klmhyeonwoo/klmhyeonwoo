const contentReferenceId = /^[a-z0-9-]{1,64}$/;

export function isContentReferenceId(value: string) {
  return contentReferenceId.test(value);
}
