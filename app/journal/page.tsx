import { use } from 'react'

export default function JournalPage({ searchParams }: { searchParams: Promise<{ uid?: string, email?: string, name?: string }> }) {
  const params = use(searchParams)
  const uid = params.uid || ''
  const email = params.email || ''
  const name = params.name || ''
  
  const query = new URLSearchParams()
  if (uid) query.set('uid', uid)
  if (email) query.set('email', email)
  if (name) query.set('name', name)
  
  const src = `/journal.html${query.toString() ? '?' + query.toString() : ''}`
  
  return (
    <iframe
      src={src}
      style={{ width: '100%', height: '100vh', border: 'none' }}
    />
  )
}