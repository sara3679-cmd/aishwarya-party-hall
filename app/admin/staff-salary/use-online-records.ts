"use client";

import { useEffect, useRef, useState } from 'react';
import { emptyRecords, validRecords, type Records } from './model';

const endpoint = '/api/admin/staff-rent';
const legacyKey = 'aph-staff-rent-v1';
async function request(method: string, body?: unknown) {
  const response = await fetch(endpoint, { method, cache: 'no-store', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || 'Unable to access the database.');
  if (!validRecords(result.data) || !Number.isSafeInteger(result.revision)) throw Error('Invalid database response.');
  return result as { data: Records; revision: number };
}
export function useOnlineRecords() {
  const [data, setData] = useState<Records>(emptyRecords);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Loading database records…');
  const revision = useRef(0);
  const saving = useRef(false);
  const blocked = useRef(false);
  useEffect(() => {
    let active = true;
    (async () => {
      let result = await request('GET');
      let imported = false;
      const saved = localStorage.getItem(legacyKey);
      if (result.revision === 0 && saved) {
        const legacy = JSON.parse(saved);
        if (!validRecords(legacy)) throw Error('Browser records are invalid. Export a backup before continuing.');
        if (legacy.employees.length || legacy.halls.length || legacy.entries.length || legacy.bills.length) {
          result = await request('PUT', { data: legacy, revision: 0 });
          imported = true;
        }
      }
      if (!active) return;
      revision.current = result.revision;
      setData(result.data);
      setReady(true);
      setMessage(imported ? 'Browser records imported into the database. Your original browser backup is retained.' : 'Database connected. Changes are saved to the server.');
    })().catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);
  function save(next: Records, confirmation = 'Records saved.') {
    if (blocked.current) { setMessage('Reload this page before making more changes. The previous save was not confirmed.'); return false; }
    if (saving.current) { setMessage('A save is in progress. Please wait and try again.'); return false; }
    if (!validRecords(next)) { setMessage('Invalid records. Changes were not saved.'); return false; }
    saving.current = true;
    setMessage('Saving to database…');
    request('PUT', { data: next, revision: revision.current }).then(result => {
      revision.current = result.revision;
      setData(result.data);
      setMessage(`${confirmation} Saved to database.`);
    }).catch(error => {
      blocked.current = true;
      setMessage(`${error.message} Save was not confirmed. Reload to check database records before retrying.`);
    }).finally(() => { saving.current = false; });
    return true;
  }
  return { data, ready, message, setMessage, save };
}
