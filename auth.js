// auth.js
const SUPABASE_URL = 'https://fidnopdmhakcueyqppma.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZG5vcGRtaGFrY3VleXFwcG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzI4OTEsImV4cCI6MjA3NTE0ODg5MX0.2JJE0aLE4_anUIaCj5H5edpPpzAqpeUCL0Ic6cpoFUk'; 
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const toggleLink = document.getElementById('toggleLink');
const loginHeader = document.getElementById('loginHeader');  

// --- OTENTIKASI DAN REDIRECT ---
// Cek status saat halaman dimuat
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        // Jika sudah login, redirect ke halaman utama (dashboard)
        window.location.href = 'index.html'; 
    }
});

// --- TRANSISI FORM LOGIN/DAFTAR ---
// Tampilkan form Daftar
showSignup.addEventListener('click', (e) => {
    e.preventDefault(); 
    console.log('Tombol Daftar Sekarang diklik!'); // <-- Tambahkan ini
    
    if (loginHeader) loginHeader.style.display = 'none'; // <-- Tambahan
    loginForm.style.display = 'none';    
    if (toggleLink) toggleLink.style.display = 'none';
    signupForm.style.display = 'block';

});

// Tampilkan form Login
showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Aksi: Sembunyikan Signup Form
    signupForm.style.display = 'none';
    
    // Aksi: Tampilkan Login Form dan Tautan Ganda
    if (loginHeader) loginHeader.style.display = 'block';
    loginForm.style.display = 'block';
    if (toggleLink) toggleLink.style.display = 'block'; // Tampilkan kembali tautan
});

// --- AKSI LOGIN ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Login Gagal: ' + error.message);
    } else {
        alert('Login Berhasil! Mengalihkan ke dashboard.');
        // Redirect otomatis terjadi via onAuthStateChange
    }
});

// --- AKSI DAFTAR ---
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
        alert('Pendaftaran Gagal: ' + error.message);
    } else {
        // Supabase mengirim email konfirmasi. User harus cek email.
        alert('Pendaftaran Berhasil! Cek email Anda untuk konfirmasi. Silahkan login setelah konfirmasi.');
        signupForm.reset();
        if (loginHeader) loginHeader.style.display = 'block';
        if (toggleLink) toggleLink.style.display = 'block';
        // Kembali ke tampilan Login
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    }
});

// --- FUNGSI TOGGLE PASSWORD ---
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function() {
        // Ambil ID input password dari atribut data-target (password / signupPassword)
        const targetId = this.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);

        // Ubah tipe input
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            this.textContent = '🔒'; // Ikon gembok terbuka
        } else {
            passwordInput.type = 'password';
            this.textContent = '👁️'; // Ikon mata
        }
    });
});