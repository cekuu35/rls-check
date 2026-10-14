#!/usr/bin/env node
// rls-check — Instant Supabase RLS security scan
// Usage: npx rls-check [path-to-sql] (defaults to current directory)
const fs = require('fs');
const path = require('path');

// Find SQL files
const args = process.argv.slice(2);
const scanDir = args[0] || '.';

function findSQL(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && !['node_modules', '.git', 'dist'].includes(item.name)) {
      files.push(...findSQL(full));
    } else if (item.name.endsWith('.sql')) {
      files.push(full);
    }
  }
  return files;
}

const sqlFiles = findSQL(scanDir).slice(0, 10);
if (sqlFiles.length === 0) {
  console.log('❌ No SQL files found in', path.resolve(scanDir));
  console.log('   Run this in your project root where supabase/migrations/ lives.');
  process.exit(1);
}

console.log('🔍 Found', sqlFiles.length, 'SQL files');
console.log('');

// Read and combine
let allSQL = '';
for (const f of sqlFiles) {
  const content = fs.readFileSync(f, 'utf8');
  if (/policy|grant|rls|security/i.test(content)) {
    allSQL += `-- FILE: ${path.basename(f)}\n${content.slice(0, 5000)}\n\n`;
  }
}

if (!allSQL) {
  console.log('✅ No RLS/policy/grant SQL found — nothing to scan.');
  process.exit(0);
}

// Check for NVIDIA key
const key = process.env.NVIDIA_API_KEY || fs.readFileSync(
  path.join(process.env.USERPROFILE, 'Desktop/opencode/nim-agent/.env'), 'utf8'
).match(/NVIDIA_API_KEY=(\S+)/)?.[1];

if (!key) {
  console.log('⚠️  Set NVIDIA_API_KEY environment variable (free at build.nvidia.com)');
  console.log('   export NVIDIA_API_KEY=nvapi-...');
  process.exit(1);
}

console.log('🤖 Analyzing with NVIDIA AI...\n');

// Call NVIDIA
(async () => {
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'meta/llama-3.2-11b-vision-instruct',
        messages: [
          { role: 'system', content: `You are a Supabase RLS security auditor. Return JSON only. Schema:
{
  "safe": true/false,
  "issues": [{"severity":"CRITICAL|HIGH|MEDIUM|LOW","table":"","policy":"","problem":"","fix_sql":""}],
  "summary": ""
}` },
          { role: 'user', content: 'Audit these Supabase SQL files:\n\n' + allSQL }
        ],
        max_tokens: 4000,
        temperature: 0.1
      })
    });
    
    if (!response.ok) {
      console.log('❌ API error:', response.status);
      const err = await response.text();
      console.log(err.slice(0, 200));
      process.exit(1);
    }
    
    const data = await response.json();
    let content = data.choices[0].message.content;
    if (!content) {
      console.log('⚠️  Model returned empty response. Try again.');
      process.exit(1);
    }
    
    // Parse
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(cleaned);
    
    // Display
    if (result.safe || result.issues.length === 0) {
      console.log('✅ ' + (result.summary || 'No security issues found.'));
      console.log('');
      console.log('   Your RLS policies look properly scoped.');
      return;
    }
    
    console.log('⚠️  Found', result.issues.length, 'potential issues:\n');
    
    for (const issue of result.issues) {
      const icon = issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'HIGH' ? '🟠' : '🟡';
      console.log(icon, `[${issue.severity}] ${issue.table}`);
      console.log('   Policy:', issue.policy);
      console.log('   Problem:', issue.problem);
      console.log('   Fix:', issue.fix_sql);
      console.log('');
    }
    
    console.log('━'.repeat(50));
    console.log('📋 ' + result.summary);
    console.log('');
    console.log('Need help fixing these?');
    console.log('  • Migration Kit: https://cengokurtoglu.gumroad.com/l/supabase-oct30-migration-kit');
    console.log('  • Full Audit ($99): cnkkurtoglu@gmail.com');
    console.log('  • Free MCP checker: https://github.com/cekuu35/alexa-mcp-server');
    
  } catch(e) {
    console.log('❌ Error:', e.message);
  }
})();
