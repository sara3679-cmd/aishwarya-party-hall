import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const compile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const model = { exports: {} };
vm.runInNewContext(compile('app/admin/staff-salary/model.ts'), { exports: model.exports });

function mount(path, fetch, date = '2026-09-22') {
  const states = [], listeners = {};
  let cursor = 0, effect;
  const exports = {};
  vm.runInNewContext(compile(path), {
    exports, fetch,
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [`${date}T12:00:00`])); } },
    localStorage: { getItem() { throw Error('Reminders must not read the stale browser backup'); } },
    window: {
      addEventListener: (event, callback) => { listeners[event] = callback; },
      removeEventListener: event => { delete listeners[event]; },
      setInterval: () => 1, clearInterval() {},
    },
    require: id => id === 'react' ? {
      useState: initial => { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; },
      useEffect: callback => { effect ??= callback; },
    } : id.endsWith('/model') ? model.exports
      : id.endsWith('/date-format') ? { formatDate: value => value } : require(id),
  });
  const render = () => { cursor = 0; return renderToStaticMarkup(React.createElement(exports.AdminReminders)); };
  render();
  const cleanup = effect();
  return { render, cleanup, listeners };
}
const records = amount => ({ version: 1, employees: [], entries: [], halls: [], bills: [{
  id: 'salary', entity: 'staff', name: 'Vasudevan', location: 'Padi', month: '2026-01', kind: 'Salary',
  basic: 1387, leave: 0, recovery: 0, debit: 0, extra: 0, total: 1387,
  payments: amount ? [{ id: 'payment', date: '2026-01-31', amount, method: 'Cash', reference: '' }] : [],
}] });
const settle = () => new Promise(resolve => setImmediate(resolve));

for (const path of ['app/admin/admin-reminders.tsx', 'deploy/godaddy-full-app/app/admin/admin-reminders.tsx']) {
  test(`${path}: renewal reminder starts one calendar month before renewal`, async () => {
    for (const [renewal, date, expected] of [
      ['2026-10-22', '2026-09-21', 'No pending reminders'],
      ['2026-10-22', '2026-09-22', 'Hall agreement renewal due'],
      ['2026-10-22', '2026-10-22', 'Hall agreement renewal due'],
      ['2026-10-22', '2026-10-23', 'Hall agreement renewal overdue'],
      ['2027-01-15', '2026-12-15', 'Hall agreement renewal due'],
      ['2027-03-31', '2027-02-27', 'No pending reminders'],
      ['2027-03-31', '2027-02-28', 'Hall agreement renewal due'],
      ['2028-03-31', '2028-02-29', 'Hall agreement renewal due'],
    ]) {
      const data = { version: 1, employees: [], entries: [], bills: [], halls: [{
        id: 'hall', location: 'Padi', address: '', owner: '', phone: '', rent: 1000,
        deposit: 0, start: date, renewal, agreementEnd: '2020-01-01',
      }] };
      const view = mount(path, async () => ({ ok: true, json: async () => ({ data }) }), date);
      await settle(); assert.ok(view.render().includes(expected), `${renewal} on ${date}`);
      view.cleanup();
    }
  });
  test(`${path}: rent starts next month and becomes overdue after the tenth`, async () => {
    for (const [month, date, expected] of [
      ['2026-09', '2026-09-30', 'No pending reminders'],
      ['2026-09', '2026-10-01', 'Hall rent payment due'],
      ['2026-09', '2026-10-10', 'Hall rent payment due'],
      ['2026-09', '2026-10-11', 'Hall rent payment overdue'],
      ['2026-12', '2027-01-01', 'Hall rent payment due'],
    ]) {
      const data = records(0); data.bills[0].kind = 'Rent'; data.bills[0].month = month;
      const view = mount(path, async () => ({ ok: true, json: async () => ({ data }) }), date);
      await settle(); assert.ok(view.render().includes(expected), `${month} on ${date}`);
      data.bills[0].payments = records(1387).bills[0].payments;
      await view.listeners.focus(); assert.match(view.render(), /No pending reminders/);
      view.cleanup();
    }
  });
  test(`${path}: server payment clears stale unpaid reminder, partial payment remains due`, async () => {
    let data = records(0);
    const view = mount(path, async (url, options) => {
      assert.equal(url, '/api/admin/staff-rent'); assert.equal(options.cache, 'no-store');
      return { ok: true, json: async () => ({ data }) };
    });
    assert.match(view.render(), /Loading reminders/);
    await settle(); assert.match(view.render(), /1,387 unpaid/);
    data = records(1000); await view.listeners.focus();
    assert.match(view.render(), /387 unpaid/);
    data = records(1387); await view.listeners.focus();
    assert.doesNotMatch(view.render(), /payment due|unpaid/);
    assert.match(view.render(), /No pending reminders/);
    view.cleanup();
  });
  test(`${path}: failed refresh hides outdated reminders`, async () => {
    let ok = true;
    const view = mount(path, async () => ({ ok, json: async () => ({ data: records(0) }) }));
    await settle(); assert.match(view.render(), /unpaid/);
    ok = false; await view.listeners.focus();
    assert.match(view.render(), /Unable to load current/);
    assert.doesNotMatch(view.render(), /unpaid|No pending reminders/);
    view.cleanup();
  });
}
