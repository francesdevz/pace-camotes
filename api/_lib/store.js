// Data access. Everything goes through the Supabase service-role key, which stays on the server:
// the browser never talks to the database directly, and row level security blocks all other access.
import { createClient } from '@supabase/supabase-js';

let client;
function sb() {
  if (!client) {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      const e = new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set');
      e.code = 'not_configured';
      throw e;
    }
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

function check({ data, error }) {
  if (error) { const e = new Error(error.message); e.code = error.code; throw e; }
  return data;
}

const supabaseStore = {
  // Pending (pencil booked) and approved rows hold a slot.
  async activeBetween(from, to) {
    return check(await sb().from('bookings').select('id,date,time,status,kind')
      .in('status', ['pending', 'approved']).gte('date', from).lte('date', to));
  },
  async activeAt(date, time) {
    return check(await sb().from('bookings').select('id,status,kind')
      .in('status', ['pending', 'approved']).eq('date', date).eq('time', time));
  },
  async approvedAt(date, time) {
    return check(await sb().from('bookings').select('id,court')
      .eq('status', 'approved').eq('date', date).eq('time', time));
  },
  async countActiveForContact(phone, fromDate) {
    const { count, error } = await sb().from('bookings').select('id', { count: 'exact', head: true })
      .eq('phone', phone).in('status', ['pending', 'approved']).gte('date', fromDate);
    if (error) throw Object.assign(new Error(error.message), { code: error.code });
    return count || 0;
  },
  async insert(row) {
    return check(await sb().from('bookings').insert(row).select('*').single());
  },
  async byIds(ids) {
    if (!ids.length) return [];
    return check(await sb().from('bookings').select('*').in('id', ids));
  },
  async byId(id) {
    return check(await sb().from('bookings').select('*').eq('id', id).maybeSingle());
  },
  // Updates only while the row is still in one of `fromStatuses`; resolves null otherwise.
  // A unique-index clash (court already taken) rejects with code 23505.
  async update(id, patch, fromStatuses) {
    let q = sb().from('bookings').update(patch).eq('id', id);
    if (fromStatuses) q = q.in('status', fromStatuses);
    return check(await q.select('*').maybeSingle());
  },
  async listFrom(fromDate) {
    return check(await sb().from('bookings').select('*').gte('date', fromDate)
      .order('date', { ascending: true }).order('time', { ascending: true }).limit(3000));
  },
  async remove(id) {
    check(await sb().from('bookings').delete().eq('id', id));
  },
};

// Tests can swap in an in-memory store; production always uses Supabase.
export const store = () => globalThis.__PACE_STORE__ || supabaseStore;
