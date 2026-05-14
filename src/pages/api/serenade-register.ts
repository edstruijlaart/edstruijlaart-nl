import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()
  const apiUrl = import.meta.env.SERENADE_API_URL
  const res = await fetch(`${apiUrl}/api/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
