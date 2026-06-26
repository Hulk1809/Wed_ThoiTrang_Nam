import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import lunr from 'lunr'

type Hit = {
  id: string
  title: string
  excerpt?: string
  slug: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = (req.query.q || '') as string

  // Load posts from /posts
  const postsDir = path.join(process.cwd(), 'posts')
  let files: string[] = []
  try {
    files = fs.readdirSync(postsDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
  } catch (e) {
    return res.status(500).json({ error: 'Posts directory not found' })
  }

  const docs: { id: string; title: string; body: string; slug: string; excerpt?: string }[] = files.map((fileName) => {
    const fullPath = path.join(postsDir, fileName)
    const raw = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(raw)
    const title = (data.title as string) || fileName.replace(/\.mdx?$/, '')
    const slug = '/blog/' + fileName.replace(/\.mdx?$/, '')
    const excerpt = (data.excerpt as string) || content.slice(0, 200)
    return { id: fileName, title, body: content, slug, excerpt }
  })

  // Build lunr index
  const idx = lunr(function () {
    this.ref('id')
    this.field('title')
    this.field('body')

    docs.forEach(function (doc) {
      this.add(doc)
    }, this)
  })

  if (!q || q.trim().length === 0) {
    // return latest posts if empty query
    const latest = docs.slice(0, 10).map(d => ({ id: d.id, title: d.title, excerpt: d.excerpt, slug: d.slug }))
    return res.status(200).json({ results: latest })
  }

  const results = idx.search(q + '*').slice(0, 20).map(r => {
    const doc = docs.find(d => d.id === r.ref)!
    return { id: doc.id, title: doc.title, excerpt: doc.excerpt, slug: doc.slug }
  })

  res.status(200).json({ results })
}
