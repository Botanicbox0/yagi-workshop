type ThreadMessageVisibilityInput = {
  author_id: string;
  visibility: string;
};

export function isThreadMessageVisibleInContext(
  message: ThreadMessageVisibilityInput,
  isStudioContext: boolean,
  viewerId: string,
) {
  if (isStudioContext) return true;

  // Thread messages use "shared" for client-visible content. Annotation rows
  // use a separate "client" visibility value.
  return message.visibility === "shared" || message.author_id === viewerId;
}

export function filterVisibleThreadMessages<T extends ThreadMessageVisibilityInput>(
  messages: T[],
  isStudioContext: boolean,
  viewerId: string,
) {
  return messages.filter((message) =>
    isThreadMessageVisibleInContext(message, isStudioContext, viewerId),
  );
}
