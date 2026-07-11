// server/utils/supabase.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'vaultfs';

// ── Supabase Quota Limit ──────────────────────────────────────────────────────
const SUPABASE_QUOTA_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('[Supabase] Missing credentials. Using local storage fallback.');
}

// Admin client - bypasses RLS
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// ── Get User Storage Usage from Supabase ──────────────────────────────────
const getUserStorageUsage = async (userId) => {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured.');
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .list(`${userId}/`);

    if (error) throw error;

    let totalSize = 0;
    if (data && data.length > 0) {
      for (const file of data) {
        // Get file metadata to get size
        const { data: fileInfo, error: infoError } = await supabaseAdmin.storage
          .from(SUPABASE_BUCKET)
          .info(`${userId}/${file.name}`);

        if (!infoError && fileInfo) {
          totalSize += fileInfo.metadata?.size || file.metadata?.size || 0;
        }
      }
    }
    return totalSize;
  } catch (err) {
    console.warn('[Supabase] Failed to get user storage usage:', err.message);
    return 0; // Return 0 on error to allow upload
  }
};

// ── Check if user has enough Supabase quota ──────────────────────────────────
const checkSupabaseQuota = async (userId, fileSize) => {
  const used = await getUserStorageUsage(userId);
  const remaining = SUPABASE_QUOTA_BYTES - used;
  
  return {
    hasQuota: remaining >= fileSize,
    used,
    remaining,
    quota: SUPABASE_QUOTA_BYTES,
  };
};

// ── Upload File ──────────────────────────────────────────────────────────────
const uploadFile = async (userId, fileBuffer, originalName, mimetype) => {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured.');
  }

  // ── Check quota before upload ──────────────────────────────────────────────
  const quotaCheck = await checkSupabaseQuota(userId, fileBuffer.length);
  if (!quotaCheck.hasQuota) {
    throw new Error(`Supabase storage limit exceeded. Used: ${quotaCheck.used} bytes, Limit: ${SUPABASE_QUOTA_BYTES} bytes. Free: ${quotaCheck.remaining} bytes.`);
  }

  const timestamp = Date.now();
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${userId}/${timestamp}-${safeName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(SUPABASE_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: mimetype,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabaseAdmin.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(filePath);

  return {
    path: filePath,
    url: urlData.publicUrl,
    ...data,
  };
};

// ── Get Signed URL ──────────────────────────────────────────────────────────
const getSignedUrl = async (userId, filePath, expiresIn = 3600) => {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabaseAdmin.storage
    .from(SUPABASE_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
};

// ── Delete File ──────────────────────────────────────────────────────────────
const deleteFile = async (filePath) => {
  if (!supabaseAdmin) return;

  const { error } = await supabaseAdmin.storage
    .from(SUPABASE_BUCKET)
    .remove([filePath]);

  if (error) throw error;
};

// ── Delete All User Files ────────────────────────────────────────────────────
const deleteUserFiles = async (userId) => {
  if (!supabaseAdmin) return;

  const { data, error } = await supabaseAdmin.storage
    .from(SUPABASE_BUCKET)
    .list(`${userId}/`);

  if (error) throw error;

  if (data && data.length > 0) {
    const paths = data.map(file => `${userId}/${file.name}`);
    await supabaseAdmin.storage.from(SUPABASE_BUCKET).remove(paths);
  }
};

// ── Get File Info ────────────────────────────────────────────────────────────
const getFileInfo = async (filePath) => {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(SUPABASE_BUCKET)
    .info(filePath);

  if (error) throw error;
  return data;
};

module.exports = {
  supabaseAdmin,
  uploadFile,
  getSignedUrl,
  deleteFile,
  deleteUserFiles,
  getFileInfo,
  getUserStorageUsage,
  checkSupabaseQuota,
  SUPABASE_QUOTA_BYTES,
  SUPABASE_BUCKET,
};