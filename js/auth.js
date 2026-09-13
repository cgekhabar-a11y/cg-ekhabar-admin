// ============================================================
// CG ई खबर — Authentication Logic
// ============================================================

// ============================================================
// LOGIN FUNCTION
// ============================================================

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    const loginBtn = document.getElementById('loginBtn');

    // Clear previous messages
    errorMsg.textContent = '';
    errorMsg.className = 'error-msg';

    // Validate
    if (!email || !password) {
        errorMsg.textContent = 'कृपया Email और Password भरें';
        return;
    }

    // Disable button + show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span> Logging in...';

    try {
        // Supabase Auth Login
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        if (!data.user) {
            throw new Error('Login failed. Please try again.');
        }

        // ✅ Check if user is admin
        const isAdmin = await checkAdminStatus(data.user.id);

        if (!isAdmin) {
            // Not an admin - sign out
            await supabaseClient.auth.signOut();
            errorMsg.textContent = 'आप Admin नहीं हैं। कृपया Admin account से login करें।';
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
            return;
        }

        // ✅ Admin confirmed - Redirect to dashboard
        errorMsg.className = 'success-msg';
        errorMsg.textContent = 'Login successful! Redirecting...';

        // Save session info
        localStorage.setItem('admin_email', email);
        localStorage.setItem('admin_id', data.user.id);

        // Redirect
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 800);

    } catch (error) {
        console.error('Login error:', error);

        let errorMessage = 'Login failed';

        if (error.message) {
            const msg = error.message.toLowerCase();

            if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
                errorMessage = '❌ गलत Email या Password';
            } else if (msg.includes('email not confirmed')) {
                errorMessage = '❌ Email verify नहीं हुआ';
            } else if (msg.includes('too many requests')) {
                errorMessage = '⏳ बहुत ज्यादा attempts। कृपया कुछ देर बाद try करें';
            } else {
                errorMessage = '❌ ' + error.message;
            }
        }

        errorMsg.textContent = errorMessage;
        errorMsg.className = 'error-msg';

        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login';
    }
}

// ============================================================
// CHECK IF USER IS ADMIN
// ============================================================

async function checkAdminStatus(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('admin_users')
            .select('id, email, role')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Admin check error:', error);
            return false;
        }

        return data !== null && data.role === 'admin';

    } catch (error) {
        console.error('Admin check exception:', error);
        return false;
    }
}

// ============================================================
// CHECK SESSION (Auto-login)
// ============================================================

async function checkSessionAndRedirect() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error || !data.session) {
            // No session - stay on login page
            attachLoginListener();
            return;
        }

        // Session exists - check if admin
        const isAdmin = await checkAdminStatus(data.session.user.id);

        if (isAdmin) {
            // Already logged in - redirect to dashboard
            console.log('Session active, redirecting to dashboard...');
            window.location.href = 'dashboard.html';
        } else {
            // Not admin - sign out
            await supabaseClient.auth.signOut();
            attachLoginListener();
        }

    } catch (error) {
        console.error('Session check error:', error);
        attachLoginListener();
    }
}

// ============================================================
// ATTACH LOGIN LISTENER
// ============================================================

function attachLoginListener() {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

// ============================================================
// LOGOUT FUNCTION
// ============================================================

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        localStorage.removeItem('admin_email');
        localStorage.removeItem('admin_id');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
    }
}

// ============================================================
// REQUIRE AUTH (For protected pages)
// ============================================================

async function requireAuth() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error || !data.session) {
            window.location.href = 'index.html';
            return null;
        }

        const isAdmin = await checkAdminStatus(data.session.user.id);

        if (!isAdmin) {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
            return null;
        }

        return data.session.user;

    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'index.html';
        return null;
    }
}