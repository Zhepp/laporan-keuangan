// =======================================================
// ** PENTING: GANTI DENGAN KUNCI PROYEK SUPABASE ANDA **
// =======================================================
const SUPABASE_URL = 'https://fidnopdmhakcueyqppma.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZG5vcGRtaGFrY3VleXFwcG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzI4OTEsImV4cCI6MjA3NTE0ODg5MX0.2JJE0aLE4_anUIaCj5H5edpPpzAqpeUCL0Ic6cpoFUk'; 
// =======================================================

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const transaksiForm = document.getElementById('transaksiForm');
const transaksiList = document.getElementById('transaksiList');
const totalSaldoElement = document.getElementById('totalSaldo');
const logoutButton = document.getElementById('logoutButton');
const userEmailElement = document.getElementById('userEmail');
const exportCsvButton = document.getElementById('exportCsvButton');
const exportPdfButton = document.getElementById('exportPdfButton');

let currentUserId = null;


// --- Fungsi Otentikasi & Redirect ---
supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
        // Jika belum login, redirect ke halaman login
        window.location.href = 'login.html';
    } else {
        // Jika sudah login
        currentUserId = session.user.id;
        userEmailElement.textContent = `Masuk sebagai: ${session.user.email}`;
        loadTransaksi(); // Muat data setelah ID user didapat
    }
});

// Aksi Logout
logoutButton.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert('Logout Gagal:', error.message);
});

// --- Fungsionalitas Utama (Sama seperti sebelumnya, tapi kini ada RLS) ---

const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

// Mencatat Transaksi (Supabase akan otomatis mengisi user_id)
transaksiForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // ... (Logika validasi jumlah tetap sama) ...
    const jenis = document.getElementById('jenis').value;
    const deskripsi = document.getElementById('deskripsi').value;
    const jumlah = parseFloat(document.getElementById('jumlah').value);
    const tanggal = document.getElementById('tanggal').value;

    const { error } = await supabase
        .from('transaksi')
        .insert([
            { jenis, deskripsi, jumlah, tanggal }
        ]);

    if (error) {
        console.error('Error saat mencatat transaksi:', error.message);
        alert('Gagal mencatat. Pastikan RLS Policy sudah diatur dengan benar!');
    } else {
        alert('Transaksi berhasil dicatat!');
        transaksiForm.reset();
        loadTransaksi();
    }
});


// Memuat Transaksi (RLS memastikan hanya data user ini yang diambil)
async function loadTransaksi() {
    // Dengan RLS yang sudah diatur, kita cukup SELECT *
    // Supabase akan otomatis memfilter berdasarkan ID user yang login (auth.uid())
    const { data: transaksi, error } = await supabase
        .from('transaksi')
        .select('*')
        .order('tanggal', { ascending: false }); 

    if (error) {
        console.error('Error saat memuat data:', error.message);
        transaksiList.innerHTML = '<tr><td colspan="4">Gagal memuat data. (Error RLS/Network)</td></tr>';
        return;
    }

    transaksiList.innerHTML = ''; 
    let totalSaldo = 0;

    if (transaksi.length === 0) {
        transaksiList.innerHTML = '<tr><td colspan="4">Belum ada catatan transaksi.</td></tr>';
    }

    transaksi.forEach(item => {
        if (item.jenis === 'Pemasukan') {
            totalSaldo += item.jumlah;
        } else {
            totalSaldo -= item.jumlah;
        }

        const row = transaksiList.insertRow();
        const tanggalLokal = new Date(item.tanggal).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
        row.insertCell().textContent = tanggalLokal;
        row.insertCell().textContent = item.deskripsi;
        row.insertCell().textContent = item.jenis;

        const jumlahCell = row.insertCell();
        jumlahCell.textContent = formatRupiah(item.jumlah);
        jumlahCell.classList.add(item.jenis === 'Pemasukan' ? 'pemasukan' : 'pengeluaran');
    });

    totalSaldoElement.textContent = formatRupiah(totalSaldo);
    totalSaldoElement.style.color = totalSaldo < 0 ? '#dc3545' : '#28a745';
}


// --- Fungsionalitas Export ---

// Aksi Export ke CSV (Bisa dibuka dengan Excel)
exportCsvButton.addEventListener('click', async () => {
    const { data: transaksi, error } = await supabase
        .from('transaksi')
        .select('tanggal, jenis, deskripsi, jumlah')
        .order('tanggal', { ascending: false });

    if (error || transaksi.length === 0) {
        alert('Tidak ada data yang dapat diekspor.');
        return;
    }

    // Buat header CSV
    let csv = 'Tanggal,Jenis,Deskripsi,Jumlah\n';

    // Tambahkan data
    transaksi.forEach(item => {
        const row = [
            item.tanggal,
            item.jenis,
            `"${item.deskripsi.replace(/"/g, '""')}"`, // Mengatasi koma di deskripsi
            item.jumlah
        ].join(',');
        csv += row + '\n';
    });

    // Buat file dan download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'laporan_keuangan_transparan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Data berhasil di-export ke CSV! (Buka dengan Excel)');
});

// Aksi Export ke PDF (Menggunakan fungsi print browser)
exportPdfButton.addEventListener('click', () => {
    // Sembunyikan form dan tombol yang tidak perlu dicetak
    document.getElementById('inputForm').style.display = 'none';
    logoutButton.style.display = 'none';
    exportCsvButton.style.display = 'none';
    exportPdfButton.style.display = 'none';

    // Panggil dialog print browser (yang bisa menyimpan sebagai PDF)
    window.print();

    // Tampilkan kembali setelah print
    document.getElementById('inputForm').style.display = 'block';
    logoutButton.style.display = 'inline';
    exportCsvButton.style.display = 'inline';
    exportPdfButton.style.display = 'inline';
});

// Catatan: loadTransaksi() dipanggil di onAuthStateChange