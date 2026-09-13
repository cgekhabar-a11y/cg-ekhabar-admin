// ============================================================
// CG ई खबर — Admin Panel Config
// ============================================================

const SUPABASE_URL = 'https://puxjxteozmbsfuwmihul.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ozEY9GNlPd8kDi8vyCrS1A_HpfzmoGr';

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// App Constants
const APP_NAME = 'CG ई खबर';
const APP_SUBTITLE = 'Direct Advertisement Manager';

// Screens
const SCREENS = [
    'HOME',
    'LATEST_NEWS',
    'CATEGORY',
    'DISTRICT_NEWS',
    'SEARCH',
    'NEWS_DETAIL',
    'PROFILE'
];

// Placements
const PLACEMENTS = ['TOP', 'MIDDLE', 'BOTTOM'];

// Get screen display name
function getScreenDisplay(screen) {
    const map = {
        'HOME': 'होम',
        'LATEST_NEWS': 'ताज़ा खबरें',
        'CATEGORY': 'श्रेणी',
        'DISTRICT_NEWS': 'जिला समाचार',
        'SEARCH': 'खोज',
        'NEWS_DETAIL': 'खबर विवरण',
        'PROFILE': 'प्रोफाइल'
    };
    return map[screen] || screen;
}

// Get placement display name
function getPlacementDisplay(placement) {
    const map = {
        'TOP': 'ऊपर',
        'MIDDLE': 'बीच में',
        'BOTTOM': 'नीचे'
    };
    return map[placement] || placement;
}