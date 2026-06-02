import type { Comment } from './types'

export type CommentNode = Comment & {
  children: CommentNode[]
}

function byCreatedAt(a: CommentNode, b: CommentNode) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}

export function buildCommentTree(comments: Comment[]) {
  const nodes = new Map<string, CommentNode>()
  comments.forEach((comment) => {
    nodes.set(comment.id, { ...comment, children: [] })
  })

  const roots: CommentNode[] = []
  nodes.forEach((node) => {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent && parent.id !== node.id) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sortBranch = (items: CommentNode[]) => {
    items.sort(byCreatedAt)
    items.forEach((item) => sortBranch(item.children))
  }
  sortBranch(roots)
  return roots
}
