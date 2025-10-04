// =======================================================
// ** PENTING: GANTI DENGAN KUNCI PROYEK SUPABASE ANDA **
// =======================================================
const SUPABASE_URL = 'https://fidnopdmhakcueyqppma.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZG5vcGRtaGFrY3VleXFwcG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzI4OTEsImV4cCI6MjA3NTE0ODg5MX0.2JJE0aLE4_anUIaCj5H5edpPpzAqpeUCL0Ic6cpoFUk'; 
// =======================================================

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Inisialisasi Elemen Dashboard
const transaksiForm = document.getElementById('transaksiForm');
const transaksiList = document.getElementById('transaksiList');
const totalSaldoElement = document.getElementById('totalSaldo');
const logoutButton = document.getElementById('logoutButton');
const userEmailElement = document.getElementById('userEmail');
const exportCsvButton = document.getElementById('exportCsvButton');
const exportPdfButton = document.getElementById('exportPdfButton');

// Elemen Input Dinamis
const jenisSelect = document.getElementById('jenis');
const dynamicInputsContainer = document.getElementById('dynamic-inputs'); 

let currentUserId = null;


// --- FUNGSI UTILITY ---

const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

// --- RENDER INPUT DINAMIS ---
function renderDynamicInputs(jenis) {
    dynamicInputsContainer.innerHTML = ''; // Bersihkan input lama

    if (jenis === 'Pemasukan') {
        // Pemasukan: Deskripsi & Jumlah
        dynamicInputsContainer.innerHTML = `
            <div class="form-group">
                <label for="deskripsi">Deskripsi</label>
                <input type="text" id="deskripsi" placeholder="Ex: Kiriman Mama, Gaji Freelance" required>
            </div>
            <div class="form-group">
                <label for="jumlah">Jumlah (Rp)</label>
                <input type="number" id="jumlah" placeholder="Ex: 500000" min="1" required>
            </div>
        `;
    } else if (jenis === 'Pengeluaran') {
        // Pengeluaran: Nama Barang, Harga Satuan, Kuantitas
        dynamicInputsContainer.innerHTML = `
            <div class="form-group">
                <label for="namaBarang">Nama Barang</label>
                <input type="text" id="namaBarang" placeholder="Ex: Buku Tulis, Makan Siang" required>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label for="harga">Harga Satuan (Rp)</label>
                    <input type="number" id="harga" placeholder="Ex: 15000" min="1" required>
                </div>
                <div class="form-group">
                    <label for="kuantitas">Kuantitas</label>
                    <input type="number" id="kuantitas" placeholder="Ex: 2" min="1" required>
                </div>
            </div>
        `;
    }
}


// --- EVENT LISTENERS ---

// Event Listener untuk Jenis Transaksi
jenisSelect.addEventListener('change', (e) => {
    renderDynamicInputs(e.target.value);
});

// Aksi Logout
logoutButton.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert('Logout Gagal:', error.message);
});

// Aksi Submit Transaksi (dengan Logika Perhitungan Baru)
transaksiForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const jenis = jenisSelect.value;
    const tanggal = document.getElementById('tanggal').value; 
    let deskripsi, jumlah;

    // Logika Pengambilan Data dan Perhitungan
    if (jenis === 'Pemasukan') {
        // Ambil data dari input yang dirender untuk Pemasukan
        const deskripsiInput = document.getElementById('deskripsi');
        const jumlahInput = document.getElementById('jumlah');
        
        if (!deskripsiInput || !jumlahInput) {
             alert("Error: Input Deskripsi atau Jumlah tidak ditemukan. Coba ganti Jenis Transaksi.");
             return;
        }
        
        deskripsi = deskripsiInput.value;
        jumlah = parseFloat(jumlahInput.value);

    } else if (jenis === 'Pengeluaran') {
        // Ambil data dari input yang dirender untuk Pengeluaran
        const namaBarang = document.getElementById('namaBarang').value;
        const harga = parseFloat(document.getElementById('harga').value);
        const kuantitas = parseFloat(document.getElementById('kuantitas').value);

        // Validasi Harga dan Kuantitas
        if (isNaN(harga) || isNaN(kuantitas) || harga <= 0 || kuantitas <= 0) {
            alert("Harga dan Kuantitas harus berupa angka positif!");
            return;
        }

        // Hitung total jumlah dan buat deskripsi gabungan
        jumlah = harga * kuantitas;
        deskripsi = `${namaBarang} (x${kuantitas})`; // Contoh: Buku Tulis (x2)
    }

    if (isNaN(jumlah) || jumlah <= 0) {
        alert("Jumlah transaksi harus berupa angka positif!");
        return;
    }

    // Mengirim data ke tabel 'transaksi' di Supabase
    const { error } = await supabase
        .from('transaksi')
        .insert([
            { jenis, deskripsi, jumlah, tanggal }
        ]);

    if (error) {
        console.error('Error saat mencatat transaksi:', error.message);
        alert('Gagal mencatat. Pastikan RLS Policy sudah diatur dengan benar!');
    } else {
        alert('Transaksi berhasil dicatat! 🎉');
        transaksiForm.reset();
        loadTransaksi();
        // Render kembali input default setelah reset
        renderDynamicInputs(jenisSelect.value); 
    }
});


// --- FUNGSI MEMUAT DATA ---

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
    totalSaldoElement.style.color = totalSaldo < 0 ? '#e74c3c' : '#27ae60'; // Warna dari style.css baru
}


// --- FUNGSI EXPORT DATA ---

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
    document.getElementById('logoutButton').style.display = 'none';
    document.getElementById('exportSection').style.display = 'none'; // Sembunyikan card export

    // Panggil dialog print browser (yang bisa menyimpan sebagai PDF)
    window.print();

    // Tampilkan kembali setelah print
    setTimeout(() => {
        document.getElementById('inputForm').style.display = 'block';
        document.getElementById('logoutButton').style.display = 'inline-block';
        document.getElementById('exportSection').style.display = 'block';
    }, 500);
});


// --- OTENTIKASI DAN INISIALISASI ---

// Cek status otentikasi saat halaman dimuat
supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
        // Jika belum login, redirect ke halaman login
        window.location.href = 'login.html';
    } else {
        // Jika sudah login
        currentUserId = session.user.id;
        userEmailElement.textContent = `${session.user.email}`;
        loadTransaksi(); // Muat data setelah ID user didapat
    }
});

// Panggil fungsi render dynamic inputs saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    if (jenisSelect && jenisSelect.value) {
        renderDynamicInputs(jenisSelect.value); 
    }
});
