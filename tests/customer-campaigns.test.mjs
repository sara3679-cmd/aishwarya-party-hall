import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import * as helpers from '../lib/customer-campaigns.ts';

const booking = (id, date, mobile, location = 'Padi') => ({ id, bookingDate: date, mobile, location, customerName: `Customer ${id}`, functionName: 'Birthday', status: 'confirmed' });
const fixtures = [booking(1, '2021-03-28', '9876543210'), booking(2, '2026-09-20', '+91 98765 43210', 'Korattur'), booking(3, '2024-05-01', '8765432109'), { ...booking(4, '2024-05-02', '7654321098'), status: 'cancelled' }, booking(5, '2025-01-02', '123')];

test('full-history audience deduplicates phones and retains matching past and future bookings', () => {
  const customers = helpers.groupCustomers(fixtures);
  assert.equal(customers.length, 2);
  const filters = { today: '2026-09-15', search: '', until: '', location: 'Padi', period: 'Past' };
  assert.equal(helpers.filterCustomers(customers, filters).length, 2);
  assert.equal(helpers.filterCustomers(customers, { ...filters, location: 'Korattur', period: 'Upcoming' }).length, 1);
  assert.equal(helpers.filterCustomers(customers, { ...filters, location: 'Korattur', period: 'Past' }).length, 0);
  assert.equal(helpers.filterCustomers(customers, { ...filters, until: '2022-01-01' }).length, 1);
  assert.equal(helpers.normalizePhone('09876543210'), '919876543210');
  assert.equal(helpers.normalizePhone('1234567890'), '');
  assert.equal(helpers.normalizePhone('919876543210999'), '');
});

test('contact downloads escape line breaks and WhatsApp links keep Tamil and symbols intact', () => {
  const card = helpers.makeVcards([{ customerName: 'Tamil;Name\nTEL:123', number: '919876543210' }]);
  assert.equal(card.match(/BEGIN:VCARD/g).length, 1);
  assert.equal(card.match(/\r\nTEL;/g).length, 1);
  assert.ok(card.includes('Tamil\\;Name\\nTEL:123'));
  const message = 'வணக்கம் 🙏 & offer + image';
  const link = new URL(helpers.whatsappLink('919876543210', message));
  assert.equal(link.searchParams.get('text'), message);
  assert.equal(link.pathname, '/919876543210');
});

const routeSource = (await readFile(new URL('../app/api/admin/greetings/route.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '').replace(/export async function/g, 'async function');
const compiled = ts.transpileModule(routeSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const createRoutes = new Function('env', 'getStaffSession', 'campaignContent', 'greetingImage', 'brandImage', `${compiled}\nreturn {GET, POST};`);

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE bookings(id INTEGER,customer_name TEXT,mobile TEXT,location TEXT,booking_date TEXT,function_name TEXT,status TEXT)');
  for (const b of fixtures) db.prepare('INSERT INTO bookings VALUES(?,?,?,?,?,?,?)').run(b.id,b.customerName,b.mobile,b.location,b.bookingDate,b.functionName,b.status);
  function prepare(sql, args = []) {
    const statement = db.prepare(sql);
    return {
      bind: (...values) => prepare(sql, values),
      first: async () => statement.get(...args) ?? null,
      all: async () => ({ results: statement.all(...args) }),
      run: async () => statement.run(...args),
      execute: () => /^(SELECT|PRAGMA)/i.test(sql) ? { results: statement.all(...args) } : statement.run(...args),
    };
  }
  const DB = { prepare, batch: async statements => {
    db.exec('BEGIN');
    try { const result = statements.map(s => s.execute()); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } };
  const routes = createRoutes({ DB }, async req => ({ role: req.headers.get('x-test-role') ?? 'admin' }), helpers.campaignContent, helpers.greetingImage, helpers.brandImage);
  const post = (payload, headers = {}) => routes.POST(new Request('http://localhost:3010/api/admin/greetings', { method: 'POST', headers: { origin: 'http://localhost:3010', 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload) }));
  return { db, post, get: (role = 'admin') => routes.GET(new Request('http://localhost:3010/api/admin/greetings', { headers: { 'x-test-role': role } })) };
}

test('campaign API includes old bookings and excludes cancelled and confidential fields', async () => {
  const { db, get } = setup();
  const response = await get();
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.bookings.length, 4);
  assert.ok(data.bookings.some(b => b.bookingDate === '2021-03-28'));
  assert.equal(data.sendingAvailable, false);
  assert.deepEqual(Object.keys(data.bookings[0]).sort(), ['bookingDate','customerName','functionName','id','location','mobile','status']);
  assert.equal((await get('viewer')).status, 403);
  db.close();
});

test('approval gates manual records, editing revokes approval, sent campaigns retain their records', async () => {
  const { db, post, get } = setup();
  const draft = { ...helpers.newCampaign('advertisement'), recipients: ['919876543210', '919876543210'] };
  let response = await post(draft);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).draft.approvedAt, null);
  assert.equal((await post({ id: draft.id, number: '919876543210', action: 'markSent' })).status, 409);
  assert.equal((await post({ ...draft, action: 'approve' })).status, 400);
  response = await post({ ...draft, action: 'approve', recipientConsent: true });
  let approved = (await response.json()).draft;
  assert.ok(approved.approvedAt);
  assert.equal(approved.recipients.length, 1);
  assert.equal((await post({ id: draft.id, action: 'markSent', number: '918765432109', expectedApproval: approved.approvedAt })).status, 400);
  assert.equal((await post({ id: draft.id, action: 'markSent', number: '919876543210', expectedApproval: 'old-approval' })).status, 409);
  response = await post({ ...approved, message: 'Updated offer', action: 'save' });
  assert.equal((await response.json()).draft.approvedAt, null);
  assert.equal((await post({ id: draft.id, action: 'markSent', number: '919876543210', expectedApproval: approved.approvedAt })).status, 409);
  response = await post({ ...approved, message: 'Updated offer', action: 'approve', recipientConsent: true });
  approved = (await response.json()).draft;
  response = await post({ id: draft.id, action: 'markSent', number: '919876543210', expectedApproval: approved.approvedAt });
  assert.equal(response.status, 200);
  const sent = (await response.json()).draft;
  assert.ok(sent.sent['919876543210']);
  assert.equal((await post({ ...sent, message: 'Different campaign' })).status, 409);
  assert.ok((await (await get()).json()).drafts[0].sent['919876543210']);
  response = await post({ ...sent, id: crypto.randomUUID(), message: 'New campaign copy', action: 'save' });
  const copy = (await response.json()).draft;
  assert.deepEqual(copy.sent, {});
  assert.equal(copy.approvedAt, null);
  response = await post({ id: draft.id, action: 'undoSent', number: '919876543210', expectedApproval: approved.approvedAt });
  assert.deepEqual((await response.json()).draft.sent, {});
  db.close();
});

test('campaign writes reject unauthorised requests, malformed data and remote images', async () => {
  const { db, post } = setup();
  const draft = helpers.newCampaign();
  assert.equal((await post(draft, { 'x-test-role': 'viewer' })).status, 403);
  assert.equal((await post(draft, { origin: 'https://outside.example' })).status, 403);
  assert.equal((await post(null)).status, 400);
  assert.equal((await post({ ...draft, recipients: ['bad'] })).status, 400);
  assert.equal((await post({ ...draft, image: 'https://outside.example/tracker.png' })).status, 400);
  assert.equal((await post({ ...draft, action: 'approve', recipientConsent: true })).status, 400);
  db.close();
});
