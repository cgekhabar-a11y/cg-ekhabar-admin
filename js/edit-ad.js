// ============================================================
// CG ई खबर — Edit Advertisement Logic
// ============================================================

let currentAd = null;
let currentImageUrl = null;

async function initEditAd() {
    // ✅ Require auth
    const user = await requireAuth();
    if (!user) return;

    // ✅ Get ad ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const adId = urlParams.get('id');

    if (!adId) {
        alert('❌ Advertisement ID missing');
        window.location.href = 'ads.html';
        return;
    }

    document.getElementById('adId').value = adId;

    // ✅ Load ad data
    await loadAdData(adId);

    // ✅ Attach listeners
    document.getElementById('bannerFile').addEventListener('change', handleFileSelect);
    document.getElementById('active').addEventListener('change', handleActiveToggle);
    document.getElementById('editAdForm').addEventListener('submit', handleSubmit);
}

// ============================================================
// LOAD AD DATA
// ============================================================

async function loadAdData(adId) {
    try {
        const { data, error } = await supabaseClient
            .from('advertisements')
            .select('*')
            .eq('id', adId)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            alert('❌ Advertisement not found');
            window.location.href = 'ads.html';
            return;
        }

        currentAd = data;
        currentImageUrl = data.image_url;

        // ✅ Fill form
        document.getElementById('advertiser_name').value = data.advertiser_name || '';
        document.getElementById('campaign_name').value = data.campaign_name || '';
        document.getElementById('title').value = data.title || '';
        document.getElementById('description').value = data.description || '';
        document.getElementById('click_url').value = data.click_url || '';
        document.getElementById('phone').value = data.phone || '';
        document.getElementById('whatsapp').value = data.whatsapp || '';
        document.getElementById('start_date').value = toLocalDateTime(data.start_date);
        document.getElementById('end_date').value = toLocalDateTime(data.end_date);
        document.getElementById('screen').value = data.screen || '';
        document.getElementById('placement').value = data.placement || '';
        document.getElementById('priority').value = data.priority || 0;
        document.getElementById('active').checked = data.active;

        // ✅ Show current banner
        document.getElementById('currentBanner').src = data.image_url;

        // ✅ Update active label
        handleActiveToggle({ target: { checked: data.active } });

    } catch (error) {
        console.error('Load error:', error);
        alert('❌ Failed to load: ' + error.message);
        window.location.href = 'ads.html';
    }
}

// ============================================================
// HELPER: Convert ISO date to datetime-local format
// ============================================================

function toLocalDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
}

// ============================================================
// HANDLE FILE SELECT
// ============================================================

function handleFileSelect(event) {
    const file = event.target.files[0];
    const statusEl = document.getElementById('uploadStatus');

    if (!file) {
        document.getElementById('bannerPreview').style.display = 'none';
        statusEl.textContent = '';
        return;
    }

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        statusEl.textContent = '❌ सिर्फ JPG, PNG, WebP allowed हैं';
        statusEl.style.color = '#EF4444';
        event.target.value = '';
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        statusEl.textContent = `❌ File ${(file.size / (1024*1024)).toFixed(2)} MB — 5 MB maximum`;
        statusEl.style.color = '#EF4444';
        event.target.value = '';
        return;
    }

    previewImage(file, 'bannerPreview');

    statusEl.textContent = `✅ ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
    statusEl.style.color = '#10B981';
}

// ============================================================
// HANDLE ACTIVE TOGGLE
// ============================================================

function handleActiveToggle(event) {
    const label = document.getElementById('activeLabel');
    if (event.target.checked) {
        label.textContent = 'Active';
        label.style.color = '#10B981';
    } else {
        label.textContent = 'Paused';
        label.style.color = '#F59E0B';
    }
}

// ============================================================
// HANDLE FORM SUBMIT
// ============================================================

async function handleSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');

    formMessage.innerHTML = '';

    const adId = document.getElementById('adId').value;
    const advertiserName = document.getElementById('advertiser_name').value.trim();
    const campaignName = document.getElementById('campaign_name').value.trim();
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const clickUrl = document.getElementById('click_url').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const startDate = document.getElementById('start_date').value;
    const endDate = document.getElementById('end_date').value;
    const screen = document.getElementById('screen').value;
    const placement = document.getElementById('placement').value;
    const priority = parseInt(document.getElementById('priority').value) || 0;
    const active = document.getElementById('active').checked;
    const newBannerFile = document.getElementById('bannerFile').files[0];

    // Validate required
    if (!advertiserName || !title || !startDate || !endDate || !screen || !placement) {
        showFormMessage('❌ सभी required fields (*) भरें', 'error');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
        showFormMessage('❌ End date, Start date के बाद होनी चाहिए', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Saving...';

    try {
        let imageUrl = currentImageUrl;
        let oldFileNameToDelete = null;

        // ✅ Step 1: Upload new image if selected
        if (newBannerFile) {
            submitBtn.innerHTML = '<span class="spinner"></span> Uploading image...';

            const uploadResult = await uploadBannerImage(newBannerFile);
            imageUrl = uploadResult.publicUrl;

            // Mark old image for deletion
            if (currentImageUrl && currentImageUrl.includes('advertisements/')) {
                oldFileNameToDelete = extractFileNameFromStorageUrl(currentImageUrl);
            }

            submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
        }

        // ✅ Step 2: Update database
        const { error } = await supabaseClient
            .from('advertisements')
            .update({
                advertiser_name: advertiserName,
                campaign_name: campaignName || null,
                title: title,
                description: description || null,
                image_url: imageUrl,
                click_url: clickUrl || null,
                phone: phone || null,
                whatsapp: whatsapp || null,
                screen: screen,
                placement: placement,
                priority: priority,
                start_date: start,
                end_date: end,
                active: active
            })
            .eq('id', adId);

        if (error) {
            // ❌ Rollback: Delete newly uploaded image
            if (newBannerFile && imageUrl !== currentImageUrl) {
                const newFileName = extractFileNameFromStorageUrl(imageUrl);
                if (newFileName) {
                    await deleteBannerImage(newFileName);
                }
            }
            throw error;
        }

        // ✅ Step 3: Delete old image (if changed)
        if (oldFileNameToDelete) {
            await deleteBannerImage(oldFileNameToDelete);
        }

        showFormMessage('✅ Advertisement updated! Redirecting...', 'success');

        setTimeout(() => {
            window.location.href = 'ads.html';
        }, 1500);

    } catch (error) {
        console.error('Update error:', error);
        showFormMessage('❌ Update failed: ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '✅ Save Changes';
    }
}

// ============================================================
// SHOW MESSAGE
// ============================================================

function showFormMessage(message, type) {
    const formMessage = document.getElementById('formMessage');
    const colors = {
        'success': { bg: '#D1FAE5', color: '#065F46', border: '#10B981' },
        'error': { bg: '#FEE2E2', color: '#991B1B', border: '#EF4444' }
    };
    const c = colors[type] || colors.error;

    formMessage.innerHTML = `
        <div style="
            padding: 16px;
            background: ${c.bg};
            color: ${c.color};
            border-left: 4px solid ${c.border};
            border-radius: 8px;
            font-weight: 600;
        ">${message}</div>
    `;
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', initEditAd);