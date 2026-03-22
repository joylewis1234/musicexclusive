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

// Old Supabase (Lovable Cloud)
const OLD_SUPABASE_URL = 'https://yjytuglxpvdkyvjsdyfk.supabase.co';
// Try anon key first, fallback to service role if provided
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_ANON_KEY || 
                         process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || 
                         process.env.SUPABASE_ANON_KEY;

// New Supabase
const NEW_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 
                         process.env.SUPABASE_URL || 
                         process.env.NEW_SUPABASE_URL;
const NEW_SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                 process.env.NEW_SUPABASE_SERVICE_ROLE_KEY ||
                                 process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!OLD_SUPABASE_KEY) {
  console.error('❌ Missing OLD_SUPABASE_ANON_KEY or OLD_SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('   Add to .env: OLD_SUPABASE_ANON_KEY=your-old-anon-key');
  process.exit(1);
}

if (!NEW_SUPABASE_URL) {
  console.error('❌ Missing NEW_SUPABASE_URL in .env');
  console.error('   Set one of: VITE_SUPABASE_URL, SUPABASE_URL, or NEW_SUPABASE_URL');
  console.error('   Current env vars:', {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'set' : 'missing',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'missing',
    NEW_SUPABASE_URL: process.env.NEW_SUPABASE_URL ? 'set' : 'missing',
  });
  process.exit(1);
}

if (!NEW_SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('   Set one of: SUPABASE_SERVICE_ROLE_KEY, NEW_SUPABASE_SERVICE_ROLE_KEY, or VITE_SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Current env vars:', {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
    NEW_SUPABASE_SERVICE_ROLE_KEY: process.env.NEW_SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
    VITE_SUPABASE_SERVICE_ROLE_KEY: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing',
  });
  process.exit(1);
}

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);
const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY);

const BUCKETS = ['audio', 'avatars', 'track_covers', 'track_audio', 'marketing-assets'];

async function downloadFile(bucket, path) {
  const { data, error } = await oldSupabase.storage.from(bucket).download(path);
  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
  return data;
}

async function uploadFile(bucket, path, file) {
  const { data, error } = await newSupabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  });
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  return data;
}

async function listAllFiles(bucketName, folder = '') {
  const { data: items, error } = await oldSupabase.storage
    .from(bucketName)
    .list(folder, {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error) {
    if (error.message.includes('permission') || error.message.includes('policy')) {
      console.error(`   ⚠️  Permission denied (RLS may be blocking). Try with service role key.`);
    }
    throw error;
  }

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
      files.push(fullPath);
    }
  }

  return files;
}

async function migrateBucket(bucketName) {
  console.log(`\n📦 Migrating bucket: ${bucketName}`);
  
  try {
    const allFiles = await listAllFiles(bucketName);
    console.log(`   Found ${allFiles.length} files`);

    if (allFiles.length === 0) {
      return { success: true, count: 0 };
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < allFiles.length; i++) {
      const filePath = allFiles[i];
      const progress = `[${i + 1}/${allFiles.length}]`;
      
      try {
        console.log(`   ${progress} Downloading: ${filePath}`);
        const fileData = await downloadFile(bucketName, filePath);

        console.log(`   ${progress} Uploading: ${filePath}`);
        await uploadFile(bucketName, filePath, fileData);

        successCount++;
        console.log(`   ✅ ${progress} Migrated: ${filePath}`);
      } catch (err) {
        errorCount++;
        const errorMsg = `${filePath}: ${err.message}`;
        errors.push(errorMsg);
        console.error(`   ❌ ${progress} Failed: ${errorMsg}`);
      }
    }

    return {
      success: errorCount === 0,
      count: successCount,
      errors: errorCount > 0 ? errors : undefined,
    };
  } catch (err) {
    return { success: false, count: 0, error: err.message };
  }
}

async function main() {
  console.log('🚀 Starting Storage Migration');
  console.log(`   Old: ${OLD_SUPABASE_URL}`);
  console.log(`   New: ${NEW_SUPABASE_URL}`);
  console.log(`   Using key type: ${OLD_SUPABASE_KEY.startsWith('eyJ') ? 'Anon' : 'Service Role'}`);

  const results = {};

  for (const bucket of BUCKETS) {
    const { data: buckets } = await newSupabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.id === bucket);
    
    if (!bucketExists) {
      console.log(`\n⚠️  Bucket ${bucket} doesn't exist in new Supabase. Creating...`);
      const { data, error } = await newSupabase.storage.createBucket(bucket, {
        public: true,
      });
      if (error) {
        console.error(`   ❌ Failed to create bucket: ${error.message}`);
        results[bucket] = { success: false, error: `Bucket creation failed: ${error.message}` };
        continue;
      }
      console.log(`   ✅ Created bucket: ${bucket}`);
    }

    results[bucket] = await migrateBucket(bucket);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  
  let totalFiles = 0;
  let totalErrors = 0;
  
  for (const [bucket, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✅ ${bucket}: ${result.count} files migrated`);
      totalFiles += result.count;
    } else {
      console.log(`❌ ${bucket}: Failed - ${result.error || 'Unknown error'}`);
      if (result.errors) {
        totalErrors += result.errors.length;
        console.log(`   Errors: ${result.errors.length}`);
      }
    }
  }
  
  console.log('='.repeat(60));
  console.log(`Total files migrated: ${totalFiles}`);
  if (totalErrors > 0) {
    console.log(`Total errors: ${totalErrors}`);
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
