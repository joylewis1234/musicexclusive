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

const OLD_SUPABASE_URL = 'https://yjytuglxpvdkyvjsdyfk.supabase.co';
const NEW_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 
                         process.env.SUPABASE_URL || 
                         process.env.NEW_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                             process.env.NEW_SUPABASE_SERVICE_ROLE_KEY ||
                             process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!NEW_SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing NEW_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(NEW_SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Function to replace old URL with new URL
function replaceUrl(oldUrl) {
  if (!oldUrl || typeof oldUrl !== 'string') return oldUrl;
  
  // Replace old project ID with new one
  return oldUrl.replace(/yjytuglxpvdkyvjsdyfk\.supabase\.co/g, NEW_SUPABASE_URL.replace('https://', '').replace('http://', ''));
}

async function updateTracks() {
  console.log('\n📀 Updating tracks table...');
  
  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('id, title, artwork_url, full_audio_url, preview_audio_url');
  
  if (error) {
    console.error(`   ❌ Error fetching tracks: ${error.message}`);
    return { updated: 0, errors: [error.message] };
  }

  if (!tracks || tracks.length === 0) {
    console.log(`   ℹ️  No tracks found`);
    return { updated: 0 };
  }

  console.log(`   Found ${tracks.length} tracks`);
  
  let updated = 0;
  let errors = [];
  
  for (const track of tracks) {
    const updates = {};
    let needsUpdate = false;
    
    if (track.artwork_url && track.artwork_url.includes('yjytuglxpvdkyvjsdyfk')) {
      updates.artwork_url = replaceUrl(track.artwork_url);
      needsUpdate = true;
    }
    
    if (track.full_audio_url && track.full_audio_url.includes('yjytuglxpvdkyvjsdyfk')) {
      updates.full_audio_url = replaceUrl(track.full_audio_url);
      needsUpdate = true;
    }
    
    if (track.preview_audio_url && track.preview_audio_url.includes('yjytuglxpvdkyvjsdyfk')) {
      updates.preview_audio_url = replaceUrl(track.preview_audio_url);
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('tracks')
        .update(updates)
        .eq('id', track.id);
      
      if (updateError) {
        errors.push(`Track ${track.title} (${track.id}): ${updateError.message}`);
        console.log(`   ❌ Failed to update: ${track.title}`);
      } else {
        updated++;
        console.log(`   ✅ Updated: ${track.title}`);
      }
    }
  }
  
  return { updated, errors: errors.length > 0 ? errors : undefined };
}

async function updateArtistProfiles() {
  console.log('\n👤 Updating artist_profiles table...');
  
  const { data: artists, error } = await supabase
    .from('artist_profiles')
    .select('id, artist_name, avatar_url');
  
  if (error) {
    console.error(`   ❌ Error fetching artist profiles: ${error.message}`);
    return { updated: 0, errors: [error.message] };
  }

  if (!artists || artists.length === 0) {
    console.log(`   ℹ️  No artist profiles found`);
    return { updated: 0 };
  }

  console.log(`   Found ${artists.length} artist profiles`);
  
  let updated = 0;
  let errors = [];
  
  for (const artist of artists) {
    if (artist.avatar_url && artist.avatar_url.includes('yjytuglxpvdkyvjsdyfk')) {
      const newUrl = replaceUrl(artist.avatar_url);
      
      const { error: updateError } = await supabase
        .from('artist_profiles')
        .update({ avatar_url: newUrl })
        .eq('id', artist.id);
      
      if (updateError) {
        errors.push(`Artist ${artist.artist_name} (${artist.id}): ${updateError.message}`);
        console.log(`   ❌ Failed to update: ${artist.artist_name}`);
      } else {
        updated++;
        console.log(`   ✅ Updated: ${artist.artist_name}`);
      }
    }
  }
  
  return { updated, errors: errors.length > 0 ? errors : undefined };
}

async function updateMarketingAssets() {
  console.log('\n📸 Updating marketing_assets table...');
  
  const { data: assets, error } = await supabase
    .from('marketing_assets')
    .select('id, promo_image_url');
  
  if (error) {
    console.error(`   ❌ Error fetching marketing assets: ${error.message}`);
    return { updated: 0, errors: [error.message] };
  }

  if (!assets || assets.length === 0) {
    console.log(`   ℹ️  No marketing assets found`);
    return { updated: 0 };
  }

  console.log(`   Found ${assets.length} marketing assets`);
  
  let updated = 0;
  let errors = [];
  
  for (const asset of assets) {
    if (asset.promo_image_url && asset.promo_image_url.includes('yjytuglxpvdkyvjsdyfk')) {
      const newUrl = replaceUrl(asset.promo_image_url);
      
      const { error: updateError } = await supabase
        .from('marketing_assets')
        .update({ promo_image_url: newUrl })
        .eq('id', asset.id);
      
      if (updateError) {
        errors.push(`Asset ${asset.id}: ${updateError.message}`);
        console.log(`   ❌ Failed to update: ${asset.id}`);
      } else {
        updated++;
        console.log(`   ✅ Updated: ${asset.id}`);
      }
    }
  }
  
  return { updated, errors: errors.length > 0 ? errors : undefined };
}

async function main() {
  console.log('🔄 Updating Storage URLs');
  console.log(`   Old: ${OLD_SUPABASE_URL}`);
  console.log(`   New: ${NEW_SUPABASE_URL}`);
  
  const results = {
    tracks: await updateTracks(),
    artistProfiles: await updateArtistProfiles(),
    marketingAssets: await updateMarketingAssets(),
  };
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Update Summary');
  console.log('='.repeat(60));
  
  let totalUpdated = 0;
  let totalErrors = 0;
  
  console.log(`✅ Tracks: ${results.tracks.updated} updated`);
  totalUpdated += results.tracks.updated;
  if (results.tracks.errors) {
    totalErrors += results.tracks.errors.length;
    console.log(`   Errors: ${results.tracks.errors.length}`);
  }
  
  console.log(`✅ Artist Profiles: ${results.artistProfiles.updated} updated`);
  totalUpdated += results.artistProfiles.updated;
  if (results.artistProfiles.errors) {
    totalErrors += results.artistProfiles.errors.length;
    console.log(`   Errors: ${results.artistProfiles.errors.length}`);
  }
  
  console.log(`✅ Marketing Assets: ${results.marketingAssets.updated} updated`);
  totalUpdated += results.marketingAssets.updated;
  if (results.marketingAssets.errors) {
    totalErrors += results.marketingAssets.errors.length;
    console.log(`   Errors: ${results.marketingAssets.errors.length}`);
  }
  
  console.log('='.repeat(60));
  console.log(`Total records updated: ${totalUpdated}`);
  if (totalErrors > 0) {
    console.log(`Total errors: ${totalErrors}`);
  }
  console.log('='.repeat(60));
  
  // Show sample of updated URLs
  if (totalUpdated > 0) {
    console.log('\n📋 Sample updated URLs:');
    const { data: sampleTrack } = await supabase
      .from('tracks')
      .select('title, artwork_url, full_audio_url')
      .not('artwork_url', 'is', null)
      .limit(1)
      .single();
    
    if (sampleTrack) {
      if (sampleTrack.artwork_url) {
        console.log(`   Artwork: ${sampleTrack.artwork_url.substring(0, 80)}...`);
      }
      if (sampleTrack.full_audio_url) {
        console.log(`   Audio: ${sampleTrack.full_audio_url.substring(0, 80)}...`);
      }
    }
  }
}

main().catch(console.error);
