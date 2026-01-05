/**
 * Script to update Gemini API keys in environment
 * This script helps set the API keys for production testing
 */

import * as fs from 'fs';
import * as path from 'path';

const API_KEYS = {
  GEMINI_API_KEY_1: 'AIzaSyCerBDRRk032K9lV5xgN5yTQAvFWH_WjfI',
  GEMINI_API_KEY_2: 'AIzaSyDpCl7mZHxlY9jXR6OR38Q2_4AWk_U5y3A',
  GEMINI_API_KEY: 'AIzaSyDgmZ8jDycPhgEiwQ2dk4ZmQDLZIlZDcDE',
};

function updateEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');

  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env file not found. Creating from .env.example if available...');
    
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ Created .env from .env.example');
    } else {
      // Create a basic .env file
      fs.writeFileSync(envPath, '# FinaPilot Environment Variables\n\n');
      console.log('✅ Created new .env file');
    }
  }

  // Read existing .env
  let envContent = fs.readFileSync(envPath, 'utf-8');

  // Update or add API keys
  const lines = envContent.split('\n');
  const newLines: string[] = [];
  const keysToAdd = new Set(Object.keys(API_KEYS));

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments (we'll add them back)
    if (!trimmed || trimmed.startsWith('#')) {
      newLines.push(line);
      continue;
    }

    // Check if this line contains any of our API keys
    let found = false;
    for (const key of Object.keys(API_KEYS)) {
      if (trimmed.startsWith(`${key}=`)) {
        // Update existing key
        newLines.push(`${key}=${API_KEYS[key as keyof typeof API_KEYS]}`);
        keysToAdd.delete(key);
        found = true;
        break;
      }
    }

    if (!found) {
      newLines.push(line);
    }
  }

  // Add any keys that weren't found
  if (keysToAdd.size > 0) {
    newLines.push('');
    newLines.push('# Gemini API Keys');
    for (const key of Array.from(keysToAdd)) {
      newLines.push(`${key}=${API_KEYS[key as keyof typeof API_KEYS]}`);
    }
  }

  // Write back
  fs.writeFileSync(envPath, newLines.join('\n'));

  console.log('\n✅ Updated .env file with Gemini API keys:');
  console.log(`   GEMINI_API_KEY_1: ${API_KEYS.GEMINI_API_KEY_1.substring(0, 20)}...`);
  console.log(`   GEMINI_API_KEY_2: ${API_KEYS.GEMINI_API_KEY_2.substring(0, 20)}...`);
  console.log(`   GEMINI_API_KEY: ${API_KEYS.GEMINI_API_KEY.substring(0, 20)}...`);
  console.log('\n⚠️  Note: You may need to restart your backend server for changes to take effect.\n');
}

// Also update process.env for immediate use
Object.entries(API_KEYS).forEach(([key, value]) => {
  process.env[key] = value;
});

updateEnvFile();

