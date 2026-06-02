import type { Post, PostInput } from './types'

export type SelectedPostInput = {
  id: string
  input: PostInput
}

export function postToInput(post: Post): PostInput {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    sourceLanguage: post.sourceLanguage,
    coverUrl: post.coverUrl,
    status: post.status,
    featured: post.featured,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    categoryIds: post.categories.map((item) => item.id),
    tagIds: post.tags.map((item) => item.id),
    publishedAt: post.publishedAt,
  }
}

export function postInputWithStatus(post: Post, status: Post['status']): PostInput {
  return {
    ...postToInput(post),
    status,
    publishedAt: status === 'published' ? post.publishedAt : null,
  }
}

export function postInputWithFeatured(post: Post, featured: boolean): PostInput {
  return {
    ...postToInput(post),
    featured,
  }
}

export async function selectedPostInputs(
  selectedIds: string[],
  currentPosts: Post[],
  loadPost: (id: string) => Promise<Post>,
  toInput: (post: Post) => PostInput,
): Promise<SelectedPostInput[]> {
  const currentPostById = new Map(currentPosts.map((post) => [post.id, post]))
  return Promise.all(
    selectedIds.map(async (id) => {
      const post = currentPostById.get(id) ?? (await loadPost(id))
      return { id, input: toInput(post) }
    }),
  )
}
