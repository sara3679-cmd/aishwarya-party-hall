import { staffRentStore } from '../../../../db';
import { getStaffSession } from '../../../admin-auth';
import { validRecords } from '../../../admin/staff-salary/model';

export const dynamic = 'force-dynamic';
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: Request) {
  if ((await getStaffSession(request))?.role !== 'admin') return json({ error: 'Administrator access required' }, 403);
  try { return json(await (await staffRentStore()).read()); }
  catch { return json({ error: 'Database unavailable. Please try again.' }, 503); }
}
export async function PUT(request: Request) {
  if ((await getStaffSession(request))?.role !== 'admin') return json({ error: 'Administrator access required' }, 403);
  const origin = request.headers.get('origin');
  // The hosting proxy forwards an internal URL; allow the public site origin explicitly.
  const allowedOrigins = new Set([new URL(request.url).origin, 'https://www.aishwaryapartyhall.in', 'https://aishwaryapartyhall.in']);
  if (origin && !allowedOrigins.has(origin)) return json({ error: 'Invalid request origin' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!body || !validRecords(body.data) || !Number.isSafeInteger(body.revision) || body.revision < 0) return json({ error: 'Invalid salary or rent records' }, 400);
  try {
    const store = await staffRentStore();
    if (!await store.write(body.data, body.revision)) return json({ error: 'Records changed in another session. Reload before saving.' }, 409);
    return json({ data: body.data, revision: body.revision + 1 });
  } catch { return json({ error: 'Database save failed. Please try again.' }, 503); }
}
