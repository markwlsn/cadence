/**
 * Comprehensive Automated Verification Suite for Cadence v0.2.1
 * Verifies all 10 priority bug fixes, security hardening, and load performance.
 */

import http from 'http';

const BASE = 'http://localhost:3000';

async function fetchJson(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, text, json };
}

async function runTests() {
  console.log('=== STARTING CADENCE QA RE-VERIFICATION SUITE ===\n');
  const results = [];

  // TEST 1: Health Check Endpoint
  {
    const res = await fetchJson('/api/health');
    const pass = res.status === 200 && res.json?.status === 'healthy';
    results.push({ name: 'T1: /api/health endpoint', pass, detail: res.json });
    console.log(`[T1] Health check: ${pass ? 'PASS' : 'FAIL'} (status: ${res.status})`);
  }

  // TEST 2: Security Headers Audit
  {
    const res = await fetchJson('/');
    const headers = res.headers;
    const hasHsts = headers.has('strict-transport-security');
    const hasCsp = headers.has('content-security-policy');
    const hasFrameOptions = headers.get('x-frame-options') === 'DENY';
    const hasNosniff = headers.get('x-content-type-options') === 'nosniff';
    const noPoweredBy = !headers.has('x-powered-by');

    const pass = hasHsts && hasCsp && hasFrameOptions && hasNosniff && noPoweredBy;
    results.push({
      name: 'T2: Security headers & X-Powered-By removal',
      pass,
      detail: { hasHsts, hasCsp, hasFrameOptions, hasNosniff, noPoweredBy },
    });
    console.log(`[T2] Security headers: ${pass ? 'PASS' : 'FAIL'}`);
  }

  // TEST 3: Server-Side Registration & Password Hashing
  let sessionCookie = '';
  const testEmail = `student_${Date.now()}@university.edu`;
  const testPass = 'CadenceSecret#2026';
  {
    const res = await fetchJson('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Marie Curie',
        email: testEmail,
        password: testPass,
        avatar: '🔬',
      }),
    });

    const setCookie = res.headers.get('set-cookie') || '';
    const hasHttpOnly = setCookie.includes('HttpOnly');
    const hasCookie = setCookie.includes('cadence_session=');
    sessionCookie = setCookie.split(';')[0];

    const pass = res.status === 201 && res.json?.success && hasHttpOnly && hasCookie;
    results.push({
      name: 'T3: Server-side registration & HTTP-only session cookie',
      pass,
      detail: { status: res.status, hasHttpOnly, hasCookie },
    });
    console.log(`[T3] Registration & session cookie: ${pass ? 'PASS' : 'FAIL'}`);
  }

  // TEST 4: Duplicate Registration Prevention
  {
    const res = await fetchJson('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Marie Curie',
        email: testEmail,
        password: testPass,
      }),
    });

    const pass = res.status === 409;
    results.push({ name: 'T4: Duplicate email rejection (HTTP 409)', pass, detail: res.json });
    console.log(`[T4] Duplicate email rejection: ${pass ? 'PASS' : 'FAIL'} (status: ${res.status})`);
  }

  // TEST 5: Server-Side Login & Password Verification
  {
    const res = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPass }),
    });

    const pass = res.status === 200 && res.json?.success && res.json?.user?.email === testEmail;
    results.push({ name: 'T5: Server-side login with password hash check', pass, detail: res.json });
    console.log(`[T5] Login with scrypt hash: ${pass ? 'PASS' : 'FAIL'}`);
  }

  // TEST 6: Authenticated Session Me Endpoint
  {
    const res = await fetchJson('/api/auth/me', {
      headers: { Cookie: sessionCookie },
    });

    const pass = res.status === 200 && res.json?.user?.email === testEmail;
    results.push({ name: 'T6: Authenticated session verification (/api/auth/me)', pass, detail: res.json });
    console.log(`[T6] Session retrieval: ${pass ? 'PASS' : 'FAIL'}`);
  }

  // TEST 7: Malicious File Ingestion Blocking (.exe and .php)
  {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const formBody =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="malware.exe"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n` +
      `MZThisIsFakeExecutableBytes\r\n` +
      `--${boundary}--\r\n`;

    const res = await fetchJson('/api/decks/test-deck/ingest', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: formBody,
    });

    const pass = res.status === 415;
    results.push({ name: 'T7: Block executable upload (HTTP 415)', pass, detail: { status: res.status, json: res.json } });
    console.log(`[T7] Executable upload blocking: ${pass ? 'PASS' : 'FAIL'} (status: ${res.status})`);
  }

  // TEST 8: Corrupt PDF Magic Byte Validation
  {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const formBody =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="corrupt.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n` +
      `NOT_A_REAL_PDF_HEADER\r\n` +
      `--${boundary}--\r\n`;

    const res = await fetchJson('/api/decks/test-deck/ingest', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: formBody,
    });

    const pass = res.status === 415;
    results.push({ name: 'T8: Invalid PDF magic byte check (HTTP 415)', pass, detail: { status: res.status, json: res.json } });
    console.log(`[T8] Corrupt PDF blocking: ${pass ? 'PASS' : 'FAIL'} (status: ${res.status})`);
  }

  // TEST 9: Unbounded Deck Title Input Validation (>120 chars)
  {
    const longTitle = 'A'.repeat(500);
    const res = await fetchJson('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ title: longTitle }),
    });

    const pass = res.status === 400;
    results.push({ name: 'T9: Max title length enforcement (HTTP 400 for >120 chars)', pass, detail: { status: res.status, json: res.json } });
    console.log(`[T9] Title length validation: ${pass ? 'PASS' : 'FAIL'} (status: ${res.status})`);
  }

  // TEST 10: Deck Double-Submit Deduplication
  let createdDeckId = '';
  {
    const title = `Organic Chemistry Test ${Date.now()}`;
    const p1 = fetchJson('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ title }),
    });
    const p2 = fetchJson('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ title }),
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    const pass = (r1.status === 201 || r1.status === 200) && (r2.status === 200 || r2.status === 201) && r1.json?.id === r2.json?.id;
    createdDeckId = r1.json?.id || r2.json?.id;
    results.push({ name: 'T10: Deck double-submit deduplication', pass, detail: { r1Id: r1.json?.id, r2Id: r2.json?.id } });
    console.log(`[T10] Double-submit deduplication: ${pass ? 'PASS' : 'FAIL'} (createdDeckId: ${createdDeckId})`);
  }

  // TEST 11: Rate Limiting Enforcement
  {
    const burstPromises = [];
    for (let i = 0; i < 65; i++) {
      burstPromises.push(
        fetchJson('/api/review/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: 'Test Q', correctAnswer: 'A' }),
        })
      );
    }
    const burstResponses = await Promise.all(burstPromises);
    const throttled = burstResponses.some((r) => r.status === 429);
    const pass = throttled;
    results.push({ name: 'T11: AI Endpoint sliding window rate limiting (HTTP 429)', pass });
    console.log(`[T11] Rate limiting: ${pass ? 'PASS' : 'FAIL'} (throttled: ${throttled})`);
  }

  // TEST 12: Atomic Concurrency Test on FSRS Review Submission (Zero Lost Updates)
  {
    const decksRes = await fetchJson('/api/decks');
    let targetCard = null;
    let targetDeckId = null;

    for (const d of decksRes.json || []) {
      const cRes = await fetchJson(`/api/decks/${d.id}/cards`);
      if (Array.isArray(cRes.json) && cRes.json.length > 0) {
        targetCard = cRes.json[0];
        targetDeckId = d.id;
        break;
      }
    }

    if (targetCard) {
      const initialReps = targetCard.reps;
      const NUM_CONCURRENT = 30;

      const promises = [];
      for (let i = 0; i < NUM_CONCURRENT; i++) {
        promises.push(
          fetchJson('/api/review/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: targetCard.id, rating: 'good' }),
          })
        );
      }

      await Promise.all(promises);

      // Re-fetch card from DB to inspect final reps
      const updatedCardsRes = await fetchJson(`/api/decks/${targetDeckId}/cards`);
      const updatedCard = updatedCardsRes.json?.find((c) => c.id === targetCard.id);
      const expectedReps = initialReps + NUM_CONCURRENT;
      const actualReps = updatedCard?.reps;

      const pass = actualReps === expectedReps;
      results.push({
        name: 'T12: FSRS atomic concurrency (zero lost updates across 30 rapid submits)',
        pass,
        detail: { initialReps, actualReps, expectedReps },
      });
      console.log(`[T12] Concurrency test: ${pass ? 'PASS' : 'FAIL'} (expected ${expectedReps}, got ${actualReps})`);
    } else {
      console.log('[T12] Warning: No cards found in any deck to test concurrency');
      results.push({ name: 'T12: FSRS concurrency test', pass: false, detail: 'No cards found' });
    }
  }

  // TEST 13: Dashboard SSR Performance (N+1 Query Elimination)
  {
    const times = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      const res = await fetchJson('/');
      const dur = Date.now() - start;
      if (res.status === 200) times.push(dur);
    }

    const avgMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const pass = avgMs < 100; // Expected < 100ms (down from 820ms)
    results.push({ name: 'T13: SSR Dashboard query batching latency (<100ms)', pass, detail: { avgMs, times } });
    console.log(`[T13] SSR Dashboard avg latency: ${avgMs}ms (${pass ? 'PASS' : 'FAIL'})`);
  }

  // TEST 14: Compliance Pages & Student Data Export
  {
    const [privacyRes, termsRes, exportRes] = await Promise.all([
      fetchJson('/privacy'),
      fetchJson('/terms'),
      fetchJson('/api/user/export', { headers: { Cookie: sessionCookie } }),
    ]);

    const pass = privacyRes.status === 200 && termsRes.status === 200 && exportRes.status === 200;
    results.push({
      name: 'T14: Compliance routes (/privacy, /terms, /api/user/export)',
      pass,
      detail: { privacy: privacyRes.status, terms: termsRes.status, export: exportRes.status },
    });
    console.log(`[T14] Compliance routes: ${pass ? 'PASS' : 'FAIL'}`);
  }

  console.log('\n=== VERIFICATION SUMMARY ===');
  const allPassed = results.every((r) => r.pass);
  console.log(`Total checks: ${results.length}`);
  console.log(`Passed: ${results.filter((r) => r.pass).length}`);
  console.log(`Failed: ${results.filter((r) => !r.pass).length}`);
  console.log(`Overall Result: ${allPassed ? '100% PASS' : 'FAILURES DETECTED'}`);

  return { results, allPassed };
}

runTests().then((res) => {
  process.exit(res.allPassed ? 0 : 1);
});
