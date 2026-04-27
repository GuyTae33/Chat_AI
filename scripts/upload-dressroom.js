/**
 * 드레스룸 이미지 → Supabase Storage 업로드 + dressroom_images 테이블 등록
 * 실행: node scripts/upload-dressroom.js
 *
 * 사전 준비: Supabase SQL Editor에서 아래 실행
 *   CREATE TABLE IF NOT EXISTS dressroom_images (
 *     id bigserial primary key,
 *     url text not null,
 *     shape text,
 *     units int,
 *     options jsonb default '[]'
 *   );
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const BUCKET    = 'dressroom';
const LOCAL_DIR = path.join(__dirname, '..', '드레스룸');

// 파일 경로에서 shape / units / options 파싱
// 예: 드레스룸/ㄱ자/4칸/ㄱ자4칸(거울장,3단서랍).jpg
function parseMeta(storagePath) {
  const parts = storagePath.split('/');
  const shape = parts[1] || null;                           // ㄱ자, ㄷ자 ...
  const unitsDir = parts[2] || '';
  const unitsMatch = unitsDir.match(/^(\d+)칸$/);
  const units = unitsMatch ? parseInt(unitsMatch[1]) : null;

  const filename = parts[parts.length - 1];
  const optMatch = filename.match(/\(([^)]+)\)/);
  const options  = optMatch
    ? optMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return { shape, units, options };
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some(b => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw new Error('버킷 생성 실패: ' + error.message);
    console.log(`✅ 버킷 '${BUCKET}' 생성`);
  } else {
    console.log(`✅ 버킷 '${BUCKET}' 존재 확인`);
  }
}

function collectFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel  = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) {
      files = files.concat(collectFiles(full, rel));
    } else if (/\.(jpg|jpeg|png)$/i.test(e.name)) {
      files.push({ fullPath: full, relPath: rel });
    }
  }
  return files;
}

async function upload() {
  await ensureBucket();

  const files = collectFiles(LOCAL_DIR);
  console.log(`\n📁 총 ${files.length}개 이미지 처리 시작...\n`);

  let success = 0, fail = 0;
  const dbRows = [];

  for (let i = 0; i < files.length; i++) {
    const { fullPath, relPath } = files[i];
    const storagePath = relPath.replace(/\\/g, '/');
    const fileBuffer  = fs.readFileSync(fullPath);
    const contentType = /\.png$/i.test(relPath) ? 'image/png' : 'image/jpeg';

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, { contentType, upsert: true });

    if (error) {
      console.error(`❌ [${i+1}/${files.length}] ${storagePath}: ${error.message}`);
      fail++;
      continue;
    }

    // 공개 URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const meta = parseMeta(storagePath);
    dbRows.push({ url: publicUrl, ...meta });
    success++;

    if (success % 30 === 0 || i === files.length - 1) {
      console.log(`  ✔ ${i+1}/${files.length} (성공:${success} 실패:${fail})`);
    }
  }

  // dressroom_images 테이블에 upsert
  console.log(`\n📊 DB 등록 중 (${dbRows.length}건)...`);
  const chunkSize = 100;
  let dbFail = 0;
  for (let i = 0; i < dbRows.length; i += chunkSize) {
    const chunk = dbRows.slice(i, i + chunkSize);
    const { error } = await supabase.from('dressroom_images').upsert(chunk, { onConflict: 'url' });
    if (error) {
      console.error(`DB 저장 오류 (${i}~${i+chunkSize}):`, error.message);
      dbFail += chunk.length;
    }
  }

  console.log(`\n🎉 완료 — 스토리지: 성공 ${success} / 실패 ${fail}`);
  console.log(`       DB 등록: 성공 ${dbRows.length - dbFail} / 실패 ${dbFail}`);
}

upload().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
