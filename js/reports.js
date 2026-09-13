// ============================================================
// CG ई खबर — Reports Logic
// ============================================================

async function initReports() {
    const user = await requireAuth();
    if (!user) return;

    await loadReports();
}

async function loadReports() {
    const tbody = document.getElementById('reportsTableBody');

    try {
        const { data: ads, error } = await supabaseClient
            .from('advertisements')
            .select('*')
            .order('impressions', { ascending: false });

        if (error) {
            console.error('Reports error:', error);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #EF4444; padding: 32px;">Error: ${error.message}</td></tr>`;
            return;
        }

        if (!ads || ads.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: #666;">कोई advertisement नहीं है।</td></tr>`;
            return;
        }

        // ✅ Calculate totals
        let totalImpressions = 0;
        let totalClicks = 0;

        ads.forEach(ad => {
            totalImpressions += ad.impressions || 0;
            totalClicks += ad.clicks || 0;
        });

        const ctr = totalImpressions > 0
            ? ((totalClicks / totalImpressions) * 100).toFixed(2)
            : '0.00';

        document.getElementById('reportImpressions').textContent = formatNumber(totalImpressions);
        document.getElementById('reportClicks').textContent = formatNumber(totalClicks);
        document.getElementById('reportCTR').textContent = ctr + '%';

        // ✅ Render table
        tbody.innerHTML = ads.map(ad => {
            const adCtr = ad.impressions > 0
                ? ((ad.clicks / ad.impressions) * 100).toFixed(2)
                : '0.00';

            const status = getAdStatus(ad);
            const statusBadge = getStatusBadge(status);

            return `
                <tr>
                    <td>${escapeHtml(ad.advertiser_name)}</td>
                    <td>${escapeHtml(ad.campaign_name || '—')}</td>
                    <td>${getScreenDisplay(ad.screen)}</td>
                    <td>${formatNumber(ad.impressions || 0)}</td>
                    <td>${formatNumber(ad.clicks || 0)}</td>
                    <td><strong>${adCtr}%</strong></td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Reports exception:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #EF4444; padding: 32px;">Error: ${error.message}</td></tr>`;
    }
}

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

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
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

document.addEventListener('DOMContentLoaded', initReports);