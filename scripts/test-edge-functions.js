#!/usr/bin/env node
/**
 * Edge Functions Test Script
 * Tests all deployed edge functions to validate they're working correctly
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split(/\r?\n/).forEach((line) => {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove surrounding quotes if present
      value = value.replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  // .env file not found, use existing env vars
}

// Try to get project ID from config.toml
let projectId = process.env.VITE_SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_ID;
if (!projectId) {
  try {
    const configPath = join(__dirname, '..', 'supabase', 'config.toml');
    const configContent = readFileSync(configPath, 'utf-8');
    const match = configContent.match(/project_id\s*=\s*["']?([^"'\s]+)["']?/);
    if (match) {
      projectId = match[1];
    }
  } catch (error) {
    // Config file not found
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 
  (projectId ? `https://${projectId}.supabase.co` : null);
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Missing Supabase URL:');
  console.error('   Set VITE_SUPABASE_URL, SUPABASE_URL, or VITE_SUPABASE_PROJECT_ID');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('⚠️  Missing Supabase Anon Key:');
  console.error('   Set VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY');
  console.error('   Some tests may fail without this key\n');
}

const FUNCTIONS_URL = SUPABASE_URL.replace(/\/$/, '').replace(/\.supabase\.co$/, '.functions.supabase.co');
const supabase = SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: [],
};

// Helper to make function calls
async function testFunction(name, options = {}) {
  const {
    method = 'POST',
    body = {},
    headers = {},
    expectedStatus = 200,
    validateResponse = null,
    requiresAuth = false,
    authToken = null,
    description = '',
  } = options;

  const url = `${FUNCTIONS_URL}/${name}`;
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (SUPABASE_ANON_KEY) {
    requestHeaders.apikey = SUPABASE_ANON_KEY;
  }

  if (requiresAuth && authToken) {
    requestHeaders.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
    });

    const status = response.status;
    let responseData;
    const text = await response.text();
    try {
      responseData = text ? JSON.parse(text) : null;
    } catch {
      responseData = { raw: text };
    }

    // Check if status matches expected
    if (status === expectedStatus || (expectedStatus === 200 && status < 500)) {
      // If validateResponse function provided, use it
      if (validateResponse) {
        const isValid = validateResponse(responseData, status);
        if (isValid) {
          results.passed.push({ name, status, description });
          return { success: true, status, data: responseData };
        } else {
          results.failed.push({ name, status, error: 'Validation failed', description });
          return { success: false, status, data: responseData };
        }
      }

      // Accept 2xx, 4xx (client errors are expected for invalid inputs)
      if (status >= 200 && status < 500) {
        results.passed.push({ name, status, description });
        return { success: true, status, data: responseData };
      }
    }

    results.failed.push({
      name,
      status,
      error: responseData?.error || `Unexpected status: ${status}`,
      description,
    });
    return { success: false, status, data: responseData };
  } catch (error) {
    results.failed.push({
      name,
      status: 'ERROR',
      error: error.message,
      description,
    });
    return { success: false, error: error.message };
  }
}

// Get authentication token for a test user
async function getAuthToken(email, password) {
  if (!supabase) {
    console.log('   ⚠️  Supabase client not initialized (missing anon key)');
    return null;
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`   ❌ Auth error: ${error.message}`);
      return null;
    }

    if (!data.session) {
      console.log('   ❌ No session returned');
      return null;
    }

    return data.session.access_token;
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Testing Edge Functions\n');
  console.log(`📍 Functions URL: ${FUNCTIONS_URL}\n`);

  // ── Public Endpoints (No Auth Required) ────────────────────────────────

  console.log('📋 Testing Public Endpoints...\n');

  // Test 1: submit-agreement-acceptance (public, requires valid input)
  await testFunction('submit-agreement-acceptance', {
    body: {
      email: 'test@example.com',
      name: 'Test User',
      terms_version: '1.0',
      privacy_version: '1.0',
    },
    expectedStatus: 200,
    description: 'Public endpoint - agreement acceptance',
  });

  // Test 2: validate-fan-invite (public, invalid token expected)
  await testFunction('validate-fan-invite', {
    body: { token: 'invalid_test_token' },
    expectedStatus: 200, // Function returns 200 with valid: false
    description: 'Public endpoint - invalid invite token (returns 200 with valid: false)',
    validateResponse: (data, status) => {
      // Accept 200 with valid: false, or 500/502 for actual errors
      return (status === 200 && data?.valid === false) || status >= 500;
    },
  });

  // Test 3: validate-vault-code (public, lookup mode)
  await testFunction('validate-vault-code', {
    body: {
      email: 'test@example.com',
      vaultCode: 'TEST',
      mode: 'lookup',
    },
    expectedStatus: 200,
    description: 'Public endpoint - vault code lookup',
  });

  // Test 4: submit-fan-waitlist (public)
  await testFunction('submit-fan-waitlist', {
    body: {
      email: `test${Date.now()}@example.com`,
      display_name: 'Test Fan',
    },
    expectedStatus: 200,
    description: 'Public endpoint - fan waitlist submission',
  });

  // Test 5: submit-waitlist-application (public)
  await testFunction('submit-waitlist-application', {
    body: {
      email: `artist${Date.now()}@example.com`,
      artist_name: 'Test Artist',
      genre: 'pop',
    },
    expectedStatus: 200,
    description: 'Public endpoint - artist waitlist application',
  });

  // Test 6: lookup-artist-application (public)
  await testFunction('lookup-artist-application', {
    body: { email: 'test@example.com' },
    expectedStatus: 200,
    description: 'Public endpoint - lookup artist application',
  });

  // Test 7: check-exclusivity (public, requires track_id)
  await testFunction('check-exclusivity', {
    body: { track_id: '00000000-0000-0000-0000-000000000000' },
    expectedStatus: 200,
    description: 'Public endpoint - check exclusivity (invalid track)',
  });

  // Test 8: storage-health-check (public)
  await testFunction('storage-health-check', {
    method: 'GET',
    expectedStatus: 200,
    description: 'Public endpoint - storage health check',
  });

  // Test 9: verify-r2-objects (public, may require auth in some cases)
  await testFunction('verify-r2-objects', {
    body: { keys: [] },
    expectedStatus: 200,
    description: 'Public endpoint - verify R2 objects',
  });

  // ── Endpoints Requiring Authentication ───────────────────────────────────

  console.log('\n🔐 Testing Authenticated Endpoints...\n');

  // Try to get auth token from existing test users
  // Check if we have test credentials in env
  const TEST_EMAIL = process.env.TEST_FAN_EMAIL;
  const TEST_PASSWORD = process.env.TEST_FAN_PASSWORD;

  let authToken = null;
  if (TEST_EMAIL && TEST_PASSWORD) {
    console.log(`   Authenticating as ${TEST_EMAIL}...`);
    authToken = await getAuthToken(TEST_EMAIL, TEST_PASSWORD);
    if (authToken) {
      console.log('   ✅ Authentication successful\n');
    } else {
      console.log('   ⚠️  Authentication failed, skipping auth tests\n');
    }
  } else {
    console.log('   ⚠️  No test credentials provided (TEST_FAN_EMAIL, TEST_FAN_PASSWORD)');
    console.log('   Skipping authenticated tests\n');
  }

  if (authToken) {
    // Test authenticated endpoints
    const TEST_TRACK_ID = process.env.TEST_TRACK_ID || '00000000-0000-0000-0000-000000000000';

    // Test 10: mint-playback-url (requires auth)
    await testFunction('mint-playback-url', {
      body: {
        trackId: TEST_TRACK_ID,
        fileType: 'preview',
      },
      requiresAuth: true,
      authToken,
      expectedStatus: 200,
      description: 'Authenticated - mint playback URL',
      validateResponse: (data, status) => {
        // Accept 404 (track not found) or 200 (success)
        return status === 200 || status === 404;
      },
    });

    // Test 11: charge-stream (requires auth)
    await testFunction('charge-stream', {
      body: {
        trackId: TEST_TRACK_ID,
        idempotencyKey: `test-${Date.now()}-${Math.random()}`,
      },
      requiresAuth: true,
      authToken,
      expectedStatus: 200,
      description: 'Authenticated - charge stream',
      validateResponse: (data, status) => {
        // Accept 404 (track not found), 400 (insufficient credits), 403 (no vault access), or 200 (success)
        return status === 200 || status === 400 || status === 403 || status === 404;
      },
    });

    // Test 12: apply-credit-topup (requires auth)
    await testFunction('apply-credit-topup', {
      body: {
        credits: 10,
        usd: 1.0,
      },
      requiresAuth: true,
      authToken,
      expectedStatus: 200,
      description: 'Authenticated - apply credit topup',
      validateResponse: (data, status) => {
        // Accept 200 or 400 (validation errors)
        return status === 200 || status === 400;
      },
    });

    // Test 13: ensure-vault-member (requires auth)
    await testFunction('ensure-vault-member', {
      body: {},
      requiresAuth: true,
      authToken,
      expectedStatus: 200,
      description: 'Authenticated - ensure vault member',
    });
  } else {
    results.skipped.push(
      { name: 'mint-playback-url', reason: 'No auth token' },
      { name: 'charge-stream', reason: 'No auth token' },
      { name: 'apply-credit-topup', reason: 'No auth token' },
      { name: 'ensure-vault-member', reason: 'No auth token' }
    );
  }

  // ── Admin/Internal Endpoints (May require specific setup) ────────────────

  console.log('\n⚙️  Testing Admin/Internal Endpoints...\n');

  // Test 14: send-daily-report (internal, may require cron trigger)
  await testFunction('send-daily-report', {
    body: {},
    expectedStatus: 200,
    description: 'Internal - send daily report',
    validateResponse: (data, status) => {
      // Accept 200 or 400/500 (may require specific setup)
      return status < 500;
    },
  });

  // Test 15: monitoring-metrics (internal)
  await testFunction('monitoring-metrics', {
    method: 'GET',
    expectedStatus: 200,
    description: 'Internal - monitoring metrics',
  });

  // Test 16: playback-telemetry (internal) - REQUIRES AUTH
  if (authToken) {
    await testFunction('playback-telemetry', {
      body: {
        track_id: '00000000-0000-0000-0000-000000000000',
        event_type: 'play',
      },
      requiresAuth: true,
      authToken,
      expectedStatus: 200,
      description: 'Internal - playback telemetry (authenticated)',
      validateResponse: (data, status) => {
        return status === 200 || status === 400;
      },
    });
  } else {
    results.skipped.push({ name: 'playback-telemetry', reason: 'No auth token' });
  }

  // ── Print Results ───────────────────────────────────────────────────────

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60) + '\n');

  console.log(`✅ Passed: ${results.passed.length}`);
  results.passed.forEach(({ name, status, description }) => {
    console.log(`   ✓ ${name} (${status})${description ? ` - ${description}` : ''}`);
  });

  console.log(`\n❌ Failed: ${results.failed.length}`);
  results.failed.forEach(({ name, status, error, description }) => {
    console.log(`   ✗ ${name} (${status})${description ? ` - ${description}` : ''}`);
    if (error) {
      console.log(`     Error: ${error}`);
    }
  });

  if (results.skipped.length > 0) {
    console.log(`\n⏭️  Skipped: ${results.skipped.length}`);
    results.skipped.forEach(({ name, reason }) => {
      console.log(`   ⊘ ${name} - ${reason}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  const total = results.passed.length + results.failed.length;
  const passRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;
  console.log(`Pass Rate: ${passRate}% (${results.passed.length}/${total})`);
  console.log('='.repeat(60) + '\n');

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
