import React from 'react'
import NextLink from 'next/link'

export default function SearchResults({ items, onClose }: { items: any[]; onClose?: () => void }) {
  return (
    <div style={{ background: 'white', border: '1px solid #eee', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      {items.map((it) => (
        <div key={it.id} style={{ padding: 12, borderBottom: '1px solid #f6f6f6' }}>
          <NextLink href={it.slug} passHref>
            <a onClick={() => onClose && onClose()} style={{ color: '#111', fontWeight: 600 }}>{it.title}</a>
          </NextLink>
          {it.excerpt && <div style={{ color: '#666', fontSize: 13 }}>{it.excerpt.slice(0, 120)}</div>}
        </div>
      ))}
      {items.length === 0 && <div style={{ padding: 12 }}>Không có kết quả</div>}
    </div>
  )
}
