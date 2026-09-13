// ============================================================
// CG ई खबर — Dashboard Logic
// ============================================================

// ============================================================
// INITIALIZE DASHBOARD
// ============================================================

async function initDashboard() {
    // ✅ Require auth (redirect if not logged in)
    const user = await requireAuth();
    if (!user) return;

    // Show user email
    document.getElementById('userEmail').textContent = user.email;

    // Load dashboard data
    await loadDashboardStats();
    await loadRecentAds();
}

// ============================================================
// LOAD DASHBOARD STATS
// ============================================================

async function loadDashboardStats() {
    try {
        // ✅ Fetch all ads
        const { data: ads, error } = await supabaseClient
            .from('advertisements')
            .select('id, active, start_date, end_date, impressions, clicks');

        if (error) {
            console.error('Error fetching ads:', error);
            return;
        }

        const now = new Date();

        // ✅ Calculate stats
        let totalAds = ads.length;
        let activeAds = 0;
        let scheduledAds = 0;
        let expiredAds = 0;
        let totalImpressions = 0;
        let totalClicks = 0;

        ads.forEach(ad => {
            const startDate = new Date(ad.start_date);
            const endDate = new Date(ad.end_date);

            totalImpressions += ad.impressions || 0;
            totalClicks += ad.clicks || 0;

            if (startDate > now) {
                // Future start date
                scheduledAds++;
            } else if (endDate < now) {
                // Past end date
                expiredAds++;
            } else if (ad.active) {
                // Active and within date range
                activeAds++;
            }
        });

        // ✅ Calculate CTR
        const ctr = totalImpressions > 0
            ? ((totalClicks / totalImpressions) * 100).toFixed(2)
            : '0.00';

        // ✅ Update UI
        document.getElementById('statTotalAds').textContent = totalAds;
        document.getElementById('statActiveAds').textContent = activeAds;
        document.getElementById('statScheduledAds').textContent = scheduledAds;
        document.getElementById('statExpiredAds').textContent = expiredAds;
        document.getElementById('statImpressions').textContent = formatNumber(totalImpressions);
        document.getElementById('statClicks').textContent = formatNumber(totalClicks);
        document.getElementById('statCTR').textContent = ctr + '%';

    } catch (error) {
        console.error('Dashboard stats error:', error);
    }
}

// ============================================================
// LOAD RECENT ADS
// ============================================================

async function loadRecentAds() {
    const tbody = document.getElementById('recentAdsBody');

    try {
        // ✅ Fetch recent 5 ads
        const { data: ads, error } = await supabaseClient
            .from('advertisements')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error fetching recent ads:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 32px; color: #EF4444;">
                        Error loading ads: ${error.message}
                    </td>
                </tr>
            `;
            return;
        }

        if (!ads || ads.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 32px; color: #666;">
                        कोई advertisement नहीं है। नया ad add करें।
                    </td>
                </tr>
            `;
            return;
        }

        // ✅ Render rows
        tbody.innerHTML = ads.map(ad => {
            const status = getAdStatus(ad);
            const statusBadge = getStatusBadge(status);

            return `
                <tr>
                    <td>
                        <img src="${ad.image_url}" alt="Banner" class="thumbnail"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                    </td>
                    <td>${escapeHtml(ad.advertiser_name)}</td>
                    <td>${escapeHtml(ad.campaign_name || '—')}</td>
                    <td>${getScreenDisplay(ad.screen)}</td>
                    <td>${ad.priority}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Recent ads error:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 32px; color: #EF4444;">
                    Error: ${error.message}
                </td>
            </tr>
        `;
    }
}

// ============================================================
// HELPER — Get Ad Status
// ============================================================

function getAdStatus(ad) {
    const now = new Date();
    const startDate = new Date(ad.start_date);
    const endDate = new Date(ad.end_date);

    // Paused
    if (!ad.active) {
        return 'paused';
    }

    // Scheduled (future)
    if (startDate > now) {
        return 'scheduled';
    }

    // Expired
    if (endDate < now) {
        return 'expired';
    }

    // Active
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

// ============================================================
// HELPERS
// ============================================================

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', initDashboard);