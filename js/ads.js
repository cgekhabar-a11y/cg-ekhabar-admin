// ============================================================
// CG ई खबर — Ads Management Logic
// ============================================================

let allAds = [];
let filteredAds = [];
let adToDelete = null;

// ============================================================
// INITIALIZE
// ============================================================

async function initAds() {
    // ✅ Require auth
    const user = await requireAuth();
    if (!user) return;

    // ✅ Read URL params (filter from query string)
    const urlParams = new URLSearchParams(window.location.search);
    const filterFromUrl = urlParams.get('filter');

    if (filterFromUrl) {
        document.getElementById('filterSelect').value = filterFromUrl;
        updateActiveNavItem(filterFromUrl);
        updatePageTitle(filterFromUrl);
    }

    // ✅ Attach listeners
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filterSelect').addEventListener('change', applyFilters);
    document.getElementById('screenFilter').addEventListener('change', applyFilters);

    // ✅ Load ads
    await loadAds();
}

// ============================================================
// LOAD ADS FROM SUPABASE
// ============================================================

async function loadAds() {
    const tbody = document.getElementById('adsTableBody');

    try {
        const { data, error } = await supabaseClient
            .from('advertisements')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading ads:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 32px; color: #EF4444;">
                        Error: ${error.message}
                    </td>
                </tr>
            `;
            return;
        }

        allAds = data || [];
        applyFilters();

    } catch (error) {
        console.error('Load ads exception:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 32px; color: #EF4444;">
                    Error: ${error.message}
                </td>
            </tr>
        `;
    }
}

// ============================================================
// APPLY FILTERS + SEARCH
// ============================================================

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const statusFilter = document.getElementById('filterSelect').value;
    const screenFilter = document.getElementById('screenFilter').value;

    filteredAds = allAds.filter(ad => {
        // ✅ Search filter
        if (searchTerm) {
            const searchable = [
                ad.advertiser_name || '',
                ad.campaign_name || '',
                ad.title || ''
            ].join(' ').toLowerCase();

            if (!searchable.includes(searchTerm)) {
                return false;
            }
        }

        // ✅ Status filter
        if (statusFilter !== 'all') {
            const status = getAdStatus(ad);
            if (status !== statusFilter) {
                return false;
            }
        }

        // ✅ Screen filter
        if (screenFilter !== 'all') {
            if (ad.screen !== screenFilter) {
                return false;
            }
        }

        return true;
    });

    // ✅ Update count
    document.getElementById('adsCount').textContent =
        `📢 ${filteredAds.length} of ${allAds.length} advertisements`;

    // ✅ Render table
    renderAdsTable();
}

// ============================================================
// RENDER ADS TABLE
// ============================================================

function renderAdsTable() {
    const tbody = document.getElementById('adsTableBody');

    if (filteredAds.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 32px; color: #666;">
                    कोई advertisement match नहीं हुआ।
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredAds.map(ad => {
        const status = getAdStatus(ad);
        const statusBadge = getStatusBadge(status);

        const startDate = formatDate(ad.start_date);
        const endDate = formatDate(ad.end_date);

        const toggleId = `toggle-${ad.id}`;

        return `
            <tr>
                <td>
                    <img src="${ad.image_url}" alt="Banner" class="thumbnail"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                </td>
                <td>${escapeHtml(ad.advertiser_name)}</td>
                <td>${escapeHtml(ad.campaign_name || '—')}</td>
                <td>${getScreenDisplay(ad.screen)}</td>
                <td>${getPlacementDisplay(ad.placement)}</td>
                <td>${ad.priority}</td>
                <td>${startDate}</td>
                <td>${endDate}</td>
                <td>${statusBadge}</td>
                <td>
                    <label class="toggle-switch">
                        <input type="checkbox" 
                               id="${toggleId}"
                               ${ad.active ? 'checked' : ''}
                               onchange="toggleAdStatus('${ad.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-small btn-edit" onclick="editAd('${ad.id}')">
                            ✏️
                        </button>
                        <button class="btn-small btn-delete" onclick="deleteAd('${ad.id}')">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// TOGGLE AD STATUS (ON/OFF)
// ============================================================

async function toggleAdStatus(adId, newStatus) {
    try {
        const { error } = await supabaseClient
            .from('advertisements')
            .update({ active: newStatus })
            .eq('id', adId);

        if (error) {
            console.error('Toggle error:', error);
            alert('❌ Status update failed: ' + error.message);
            // Revert toggle
            await loadAds();
            return;
        }

        // ✅ Update local state
        const ad = allAds.find(a => a.id === adId);
        if (ad) {
            ad.active = newStatus;
        }

        // ✅ Show success
        showToast(newStatus ? '✅ Ad activated' : '⏸️ Ad paused');

    } catch (error) {
        console.error('Toggle exception:', error);
        alert('❌ Error: ' + error.message);
        await loadAds();
    }
}

// ============================================================
// EDIT AD
// ============================================================

function editAd(adId) {
    // Redirect to edit page
    window.location.href = `edit-ad.html?id=${adId}`;
}

// ============================================================
// DELETE AD
// ============================================================

function deleteAd(adId) {
    adToDelete = adId;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    adToDelete = null;
    document.getElementById('deleteModal').style.display = 'none';
}

async function confirmDelete() {
    if (!adToDelete) return;

    const adId = adToDelete;
    const ad = allAds.find(a => a.id === adId);

    if (!ad) {
        closeDeleteModal();
        return;
    }

    try {
        // ✅ Step 1: Delete from Storage (if image exists)
        if (ad.image_url && ad.image_url.includes('advertisements/')) {
            try {
                const fileName = extractFileNameFromUrl(ad.image_url);
                if (fileName) {
                    await supabaseClient.storage
                        .from('advertisements')
                        .remove([fileName]);
                }
            } catch (storageError) {
                console.warn('Storage delete failed:', storageError);
                // Continue with DB delete even if storage fails
            }
        }

        // ✅ Step 2: Delete from Database
        const { error } = await supabaseClient
            .from('advertisements')
            .delete()
            .eq('id', adId);

        if (error) {
            throw error;
        }

        // ✅ Success
        showToast('🗑️ Advertisement deleted');
        closeDeleteModal();

        // Reload ads
        await loadAds();

    } catch (error) {
        console.error('Delete error:', error);
        alert('❌ Delete failed: ' + error.message);
    }
}

function extractFileNameFromUrl(url) {
    try {
        // URL format: .../advertisements/filename.jpg
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
// HELPERS
// ============================================================

function getAdStatus(ad) {
    const now = new Date();
    const startDate = new Date(ad.start_date);
    const endDate = new Date(ad.end_date);

    if (!ad.active) return 'paused';
    if (startDate > now) return 'scheduled';
    if (endDate < now) return 'expired';
    return 'active';
}

function getStatusBadge(status) {
    const badges = {
        'active': '<span class="badge badge-active">Active</span>',
        'scheduled': '<span class="badge badge-scheduled">Scheduled</span>',
        'expired': '<span class="badge badge-expired">Expired</span>',
        'paused': '<span class="badge badge-paused">Paused</span>'
    };
    return badges[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterSelect').value = 'all';
    document.getElementById('screenFilter').value = 'all';
    applyFilters();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function updateActiveNavItem(filter) {
    // Remove active from all sub-items
    document.querySelectorAll('.nav-sub').forEach(el => {
        el.classList.remove('active');
    });
    // Add active to selected
    const navItem = document.getElementById('nav-' + filter);
    if (navItem) navItem.classList.add('active');
}

function updatePageTitle(filter) {
    const titles = {
        'active': 'Active Advertisements',
        'scheduled': 'Scheduled Advertisements',
        'expired': 'Expired Advertisements',
        'paused': 'Paused Advertisements'
    };
    document.getElementById('pageTitle').textContent = titles[filter] || 'All Advertisements';
}

function showToast(message) {
    // Simple toast
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #10B981;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 600;
        z-index: 10000;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', initAds);