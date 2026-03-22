import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([^#=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error loading .env:', err);
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     process.env.NEW_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                             process.env.NEW_SUPABASE_SERVICE_ROLE_KEY ||
                             process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                          process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const supabaseAnon = SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const BUCKETS = ['audio', 'avatars', 'track_covers', 'track_audio', 'marketing-assets'];

async function listAllFiles(bucketName, folder = '') {
  const { data: items, error } = await supabase.storage
    .from(bucketName)
    .list(folder, {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error) throw error;
  if (!items) return [];

  const files = [];
  for (const item of items) {
    const fullPath = folder ? `${folder}/${item.name}` : item.name;
    
    if (item.id === null) {
      // It's a folder, recurse
      const subFiles = await listAllFiles(bucketName, fullPath);
      files.push(...subFiles);
    } else {
      // It's a file
      files.push({ path: fullPath, size: item.metadata?.size, updated: item.updated_at });
    }
  }

  return files;
}

async function testFileDownload(bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, size: data.size };
}

async function testPublicUrl(bucket, path) {
  if (!supabaseAnon) return { success: false, error: 'No anon key' };
  
  const { data } = supabaseAnon.storage.from(bucket).getPublicUrl(path);
  const url = data.publicUrl;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return { 
      success: response.ok, 
      status: response.status,
      url,
      accessible: response.ok 
    };
  } catch (err) {
    return { success: false, error: err.message, url };
  }
}

async function testBucket(bucketName) {
  console.log(`\n📦 Testing bucket: ${bucketName}`);
  
  try {
    // List all files
    const files = await listAllFiles(bucketName);
    console.log(`   ✅ Found ${files.length} files`);
    
    if (files.length === 0) {
      return { success: true, count: 0, tested: 0 };
    }

    // Test downloading first 3 files
    const testFiles = files.slice(0, 3);
    let downloadSuccess = 0;
    let downloadErrors = [];
    
    for (const file of testFiles) {
      const result = await testFileDownload(bucketName, file.path);
      if (result.success) {
        downloadSuccess++;
        console.log(`   ✅ Download test: ${file.path} (${(result.size / 1024).toFixed(2)} KB)`);
      } else {
        downloadErrors.push({ path: file.path, error: result.error });
        console.log(`   ❌ Download test failed: ${file.path} - ${result.error}`);
      }
    }

    // Test public URL access for first file
    let publicUrlTest = null;
    if (files.length > 0 && supabaseAnon) {
      const firstFile = files[0];
      publicUrlTest = await testPublicUrl(bucketName, firstFile.path);
      if (publicUrlTest.success) {
        console.log(`   ✅ Public URL accessible: ${firstFile.path}`);
        console.log(`      URL: ${publicUrlTest.url}`);
      } else {
        console.log(`   ⚠️  Public URL test failed: ${firstFile.path} - ${publicUrlTest.error || `HTTP ${publicUrlTest.status}`}`);
      }
    }

    return {
      success: downloadSuccess === testFiles.length,
      count: files.length,
      tested: testFiles.length,
      downloadSuccess,
      downloadErrors: downloadErrors.length > 0 ? downloadErrors : undefined,
      publicUrlTest,
    };
  } catch (err) {
    return { success: false, count: 0, error: err.message };
  }
}

async function testDatabaseUrls() {
  console.log(`\n🔍 Testing URLs from database...`);
  
  try {
    // Get tracks with URLs
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id, title, artwork_url, full_audio_url, preview_audio_url')
      .limit(5);
    
    if (tracksError) {
      console.log(`   ❌ Error fetching tracks: ${tracksError.message}`);
      return { success: false, error: tracksError.message };
    }

    if (!tracks || tracks.length === 0) {
      console.log(`   ℹ️  No tracks found in database`);
      return { success: true, tested: 0 };
    }

    console.log(`   Found ${tracks.length} tracks with URLs`);
    
    let urlTests = [];
    for (const track of tracks) {
      const urls = [
        { type: 'artwork', url: track.artwork_url },
        { type: 'full_audio', url: track.full_audio_url },
        { type: 'preview_audio', url: track.preview_audio_url },
      ].filter(u => u.url);

      for (const { type, url } of urls) {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          const accessible = response.ok;
          urlTests.push({ track: track.title, type, url, accessible, status: response.status });
          
          if (accessible) {
            console.log(`   ✅ ${track.title} - ${type}: accessible (${response.status})`);
          } else {
            console.log(`   ⚠️  ${track.title} - ${type}: HTTP ${response.status}`);
          }
        } catch (err) {
          urlTests.push({ track: track.title, type, url, accessible: false, error: err.message });
          console.log(`   ❌ ${track.title} - ${type}: ${err.message}`);
        }
      }
    }

    const accessibleCount = urlTests.filter(t => t.accessible).length;
    return {
      success: accessibleCount === urlTests.length,
      tested: urlTests.length,
      accessible: accessibleCount,
      tests: urlTests,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('🧪 Testing Storage Migration');
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Using: Service Role Key`);

  const results = {};

  // Test each bucket
  for (const bucket of BUCKETS) {
    results[bucket] = await testBucket(bucket);
  }

  // Test database URLs
  const dbUrlTest = await testDatabaseUrls();
  results.databaseUrls = dbUrlTest;

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  let totalFiles = 0;
  let totalTested = 0;
  let totalDownloadSuccess = 0;
  
  for (const [bucket, result] of Object.entries(results)) {
    if (bucket === 'databaseUrls') continue;
    
    if (result.success) {
      console.log(`✅ ${bucket}: ${result.count} files, ${result.tested} tested, ${result.downloadSuccess} downloads OK`);
      totalFiles += result.count;
      totalTested += result.tested;
      totalDownloadSuccess += result.downloadSuccess;
    } else {
      console.log(`❌ ${bucket}: ${result.error || 'Test failed'}`);
    }
  }

  if (dbUrlTest.success !== undefined) {
    console.log(`\n📋 Database URLs: ${dbUrlTest.accessible || 0}/${dbUrlTest.tested || 0} accessible`);
  }
  
  console.log('='.repeat(60));
  console.log(`Total files: ${totalFiles}`);
  console.log(`Files tested: ${totalTested}`);
  console.log(`Downloads successful: ${totalDownloadSuccess}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
