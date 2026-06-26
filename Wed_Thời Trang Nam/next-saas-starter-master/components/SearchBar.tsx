import React, { useState } from 'react'
import SearchResults from './SearchResults'

export default function SearchBar() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  async function doSearch(value: string) {
    setQ(value)
    if (!value || value.trim() === '') {
      setResults([])
      return
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`)
      const json = await res.json()
      setResults(json.results || [])
      setOpen(true)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        aria-label="Search"
        placeholder="Tìm kiếm bài viết, video..."
        value={q}
        onChange={(e) => doSearch(e.target.value)}
        onFocus={() => q && setOpen(true)}
        style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}
      />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 40, width: 320 }}>
          <SearchResults items={results} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
