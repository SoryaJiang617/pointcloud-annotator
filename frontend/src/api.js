const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://emw0d3wh46.execute-api.ap-southeast-2.amazonaws.com/Prod";

export async function apiGetAnnotations() {
  const r = await fetch(`${API_BASE}/`);
  if (!r.ok) throw new Error(`GET failed: ${r.status}`);
  const data = await r.json();
  return data.items ?? [];
}

// POST /
export async function apiCreateAnnotation(payload) {
  const body = {
    id: payload?.id ?? crypto.randomUUID(),          
    createdAt: payload?.createdAt ?? new Date().toISOString(),
    ...payload,
  };

  const r = await fetch(`${API_BASE}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`POST failed: ${r.status} ${txt}`);
  }

  return await r.json();
}

export async function apiDeleteAnnotation(id) {
  const r = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!r.ok) throw new Error(`DELETE failed: ${r.status}`);
  return await r.json();
}
