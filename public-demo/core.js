/* Pure, deterministic rules for a public browser-only simulation. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KurtDemo = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STORAGE_KEY = 'gormolzavod-public-simulation-v1';
  const TEST_CODES = Object.freeze(Array.from({length: 8}, (_, i) => 'KURT-DEMO-' + String(i + 1).padStart(2, '0')));
  const POINTS_PER_CODE = 10;
  const REWARD_COST = 40;
  function fresh() { return {version: 1, redeemed: [], claimed: 0}; }
  function validate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (Object.keys(value).some(key => !['version', 'redeemed', 'claimed'].includes(key))) return null;
    if (value.version !== 1 || !Array.isArray(value.redeemed) || value.redeemed.length > TEST_CODES.length) return null;
    if (!value.redeemed.every(code => typeof code === 'string' && TEST_CODES.includes(code))) return null;
    if (new Set(value.redeemed).size !== value.redeemed.length) return null;
    if (!Number.isInteger(value.claimed) || value.claimed < 0 || value.claimed > Math.floor(value.redeemed.length / 4)) return null;
    return {version: 1, redeemed: value.redeemed.slice(), claimed: value.claimed};
  }
  function normalize(code) {
    return typeof code === 'string' && code.length <= 64 ? code.trim().toUpperCase().replace(/\s+/g, '') : '';
  }
  function points(state) {
    const safe = validate(state);
    return safe ? safe.redeemed.length * POINTS_PER_CODE - safe.claimed * REWARD_COST : 0;
  }
  function redeem(state, entered) {
    const safe = validate(state);
    if (!safe) return {ok: false, error: 'storage_invalid', state: fresh()};
    const code = normalize(entered);
    if (!TEST_CODES.includes(code)) return {ok: false, error: 'invalid_code', state: safe};
    if (safe.redeemed.includes(code)) return {ok: false, error: 'used_code', state: safe};
    safe.redeemed.push(code);
    return {ok: true, state: safe, code, awarded: POINTS_PER_CODE};
  }
  function claim(state) {
    const safe = validate(state);
    if (!safe) return {ok: false, error: 'storage_invalid', state: fresh()};
    if (points(safe) < REWARD_COST) return {ok: false, error: 'insufficient_points', state: safe};
    safe.claimed += 1;
    return {ok: true, state: safe, claimId: 'DEMO-GIFT-' + String(safe.claimed).padStart(2, '0'), spent: REWARD_COST};
  }
  function load(storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === null) return {state: fresh(), status: 'fresh'};
      if (typeof raw !== 'string' || raw.length > 2048) throw new Error('invalid');
      const safe = validate(JSON.parse(raw));
      if (!safe) throw new Error('invalid');
      return {state: safe, status: 'loaded'};
    } catch (error) {
      try { storage.removeItem(STORAGE_KEY); } catch (_) { return {state: fresh(), status: 'unavailable'}; }
      return {state: fresh(), status: 'invalid'};
    }
  }
  function save(storage, state) {
    const safe = validate(state);
    if (!safe) return false;
    try { storage.setItem(STORAGE_KEY, JSON.stringify(safe)); return true; }
    catch (_) { return false; }
  }
  function reset(storage) {
    try { storage.removeItem(STORAGE_KEY); return {state: fresh(), persisted: true}; }
    catch (_) { return {state: fresh(), persisted: false}; }
  }
  return Object.freeze({STORAGE_KEY, TEST_CODES, POINTS_PER_CODE, REWARD_COST, fresh, validate, normalize, points, redeem, claim, load, save, reset});
});
