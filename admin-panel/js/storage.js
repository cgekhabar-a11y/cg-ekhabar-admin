// ============================================================
// CG ई खबर — Storage (Image Upload) Logic
// ============================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ============================================================
// UPLOAD IMAGE TO SUPABASE STORAGE
// ============================================================

async function uploadBannerImage(file) {
    // ✅ Validate file
    if (!file) {
        throw new Error('कोई file select नहीं की गई');
    }

    // ✅ Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('सिर्फ JPG, PNG, या WebP images allowed हैं');
    }

    // ✅ Check file size
    if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        throw new Error(`File बहुत बड़ी है (${sizeMB} MB)। Maximum 5 MB allowed है।`);
    }

    // ✅ Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop().toLowerCase();
    const fileName = `banner-${timestamp}-${randomString}.${extension}`;

    console.log('Uploading:', fileName);

    // ✅ Upload to Supabase Storage
    const { data, error } = await supabaseClient.storage
        .from('advertisements')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Upload error:', error);
        throw new Error('Image upload failed: ' + error.message);
    }

    // ✅ Get public URL
    const { data: urlData } = supabaseClient.storage
        .from('advertisements')
        .getPublicUrl(fileName);

    if (!urlData || !urlData.publicUrl) {
        throw new Error('Could not generate image URL');
    }

    console.log('Image uploaded:', urlData.publicUrl);

    return {
        fileName: fileName,
        publicUrl: urlData.publicUrl
    };
}

// ============================================================
// DELETE IMAGE FROM STORAGE
// ============================================================

async function deleteBannerImage(fileName) {
    if (!fileName) return;

    try {
        const { error } = await supabaseClient.storage
            .from('advertisements')
            .remove([fileName]);

        if (error) {
            console.warn('Delete image error:', error);
            return false;
        }

        return true;

    } catch (error) {
        console.warn('Delete image exception:', error);
        return false;
    }
}

// ============================================================
// EXTRACT FILENAME FROM URL
// ============================================================

function extractFileNameFromStorageUrl(url) {
    try {
        // URL format: .../advertisements/banner-123.jpg
        const parts = url.split('/advertisements/');
        if (parts.length > 1) {
            return decodeURIComponent(parts[1].split('?')[0]);
        }
    } catch (e) {
        console.warn('Could not extract filename:', e);
    }
    return null;
}

// ============================================================
// PREVIEW IMAGE
// ============================================================

function previewImage(file, previewElementId) {
    const previewEl = document.getElementById(previewElementId);

    if (!file) {
        previewEl.style.display = 'none';
        previewEl.src = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        previewEl.src = e.target.result;
        previewEl.style.display = 'block';
    };
    reader.readAsDataURL(file);
}