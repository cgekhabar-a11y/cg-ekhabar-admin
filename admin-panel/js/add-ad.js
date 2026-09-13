// ============================================================
// CG ई खबर — Add Advertisement Logic
// ============================================================

async function initAddAd() {
    // ✅ Require auth
    const user = await requireAuth();
    if (!user) return;

    // ✅ Set default dates
    setDefaultDates();

    // ✅ Attach listeners
    document.getElementById('bannerFile').addEventListener('change', handleFileSelect);
    document.getElementById('active').addEventListener('change', handleActiveToggle);
    document.getElementById('addAdForm').addEventListener('submit', handleSubmit);
}

// ============================================================
// SET DEFAULT DATES
// ============================================================

function setDefaultDates() {
    const now = new Date();

    // Start: आज
    const startDate = new Date(now);
    startDate.setMinutes(startDate.getMinutes() - startDate.getTimezoneOffset());
    document.getElementById('start_date').value = startDate.toISOString().slice(0, 16);

    // End: 30 दिन बाद
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);
    endDate.setMinutes(endDate.getMinutes() - endDate.getTimezoneOffset());
    document.getElementById('end_date').value = endDate.toISOString().slice(0, 16);
}

// ============================================================
// HANDLE FILE SELECT (Preview)
// ============================================================

function handleFileSelect(event) {
    const file = event.target.files[0];
    const statusEl = document.getElementById('uploadStatus');

    if (!file) {
        document.getElementById('bannerPreview').style.display = 'none';
        statusEl.textContent = '';
        return;
    }

    // Validate type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        statusEl.textContent = '❌ सिर्फ JPG, PNG, WebP allowed हैं';
        statusEl.style.color = '#EF4444';
        event.target.value = '';
        return;
    }

    // Validate size
    if (file.size > 5 * 1024 * 1024) {
        statusEl.textContent = `❌ File ${(file.size / (1024*1024)).toFixed(2)} MB है — 5 MB maximum`;
        statusEl.style.color = '#EF4444';
        event.target.value = '';
        return;
    }

    // Preview
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

    // ✅ Clear previous message
    formMessage.innerHTML = '';

    // ✅ Get values
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
    const bannerFile = document.getElementById('bannerFile').files[0];

    // ✅ Validate required fields
    if (!advertiserName || !title || !bannerFile || !startDate || !endDate || !screen || !placement) {
        showFormMessage('❌ सभी required fields (*) भरें', 'error');
        return;
    }

    // ✅ Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
        showFormMessage('❌ End date, Start date के बाद होनी चाहिए', 'error');
        return;
    }

    // ✅ Disable button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Uploading...';

    try {
        // ✅ Step 1: Upload image
        const uploadResult = await uploadBannerImage(bannerFile);
        console.log('Upload success:', uploadResult);

        submitBtn.innerHTML = '<span class="spinner"></span> Saving...';

        // ✅ Step 2: Insert into database
        const { data, error } = await supabaseClient
            .from('advertisements')
            .insert([{
                advertiser_name: advertiserName,
                campaign_name: campaignName || null,
                title: title,
                description: description || null,
                image_url: uploadResult.publicUrl,
                click_url: clickUrl || null,
                phone: phone || null,
                whatsapp: whatsapp || null,
                screen: screen,
                placement: placement,
                priority: priority,
                start_date: start,
                end_date: end,
                active: active
            }])
            .select()
            .single();

        if (error) {
            // ❌ Rollback: Delete uploaded image
            await deleteBannerImage(uploadResult.fileName);
            throw error;
        }

        console.log('Insert success:', data);

        // ✅ Success
        showFormMessage('✅ Advertisement successfully added! Redirecting...', 'success');

        setTimeout(() => {
            window.location.href = 'ads.html';
        }, 1500);

    } catch (error) {
        console.error('Save error:', error);

        let errorMessage = '❌ Save failed: ';

        if (error.message) {
            const msg = error.message.toLowerCase();

            if (msg.includes('new row violates row-level security')) {
                errorMessage += 'RLS permission denied। Admin check करें।';
            } else if (msg.includes('duplicate key')) {
                errorMessage += 'Duplicate entry';
            } else if (msg.includes('violates not-null constraint')) {
                errorMessage += 'Required field missing';
            } else if (msg.includes('upload')) {
                errorMessage += error.message;
            } else {
                errorMessage += error.message;
            }
        }

        showFormMessage(errorMessage, 'error');

        submitBtn.disabled = false;
        submitBtn.innerHTML = '✅ Save Advertisement';
    }
}

// ============================================================
// SHOW FORM MESSAGE
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
        ">
            ${message}
        </div>
    `;
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', initAddAd);