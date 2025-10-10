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
        // Tampilan untuk Pemasukan (Deskripsi & Jumlah)
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
        // Tampilan untuk Pengeluaran (Nama Barang, Harga, Kuantitas)
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


// --- FUNGSI DELETE TRANSAKSI BARU (BARU) ---
async function deleteTransaksi(transaksiId) {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini? Aksi ini tidak dapat dibatalkan!")) {
        return;
    }
    
    // Panggil fungsi delete Supabase
    const { error } = await supabase
        .from('transaksi')
        .delete()
        .eq('id', transaksiId); // Hapus baris dengan ID yang sesuai

    if (error) {
        console.error('Error saat menghapus transaksi:', error.message);
        alert('Gagal menghapus! Pastikan RLS Policy DELETE sudah diatur.');
    } else {
        alert('Transaksi berhasil dihapus.');
        loadTransaksi(); // Muat ulang data setelah hapus
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
        deskripsi = document.getElementById('deskripsi').value;
        jumlah = parseFloat(document.getElementById('jumlah').value);

    } else if (jenis === 'Pengeluaran') {
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
        deskripsi = `${namaBarang} (x${kuantitas})`; 
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
        renderDynamicInputs(jenisSelect.value); 
    }
});


// --- FUNGSI MEMUAT DATA (Diperbarui untuk tombol Hapus) ---

async function loadTransaksi() {
    // Dengan RLS yang sudah diatur, kita cukup SELECT *
    const { data: transaksi, error } = await supabase
        .from('transaksi')
        .select('*')
        .order('tanggal', { ascending: false }); 

    if (error) {
        // ... (Error handling tetap sama) ...
        return;
    }

    transaksiList.innerHTML = ''; 
    let totalSaldo = 0;

    if (transaksi.length === 0) {
        transaksiList.innerHTML = '<tr><td colspan="5">Belum ada catatan transaksi.</td></tr>'; // Ubah colspan
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

        // TAMBAHKAN TOMBOL HAPUS
        const actionCell = row.insertCell();
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Hapus';
        deleteButton.className = 'btn-delete';
        // Simpan ID transaksi di data-attribute
        deleteButton.setAttribute('data-id', item.id); 
        
        // Tambahkan event listener untuk memanggil fungsi deleteTransaksi
        deleteButton.onclick = () => deleteTransaksi(item.id); 
        actionCell.appendChild(deleteButton);
    });

    totalSaldoElement.textContent = formatRupiah(totalSaldo);
    totalSaldoElement.style.color = totalSaldo < 0 ? '#e74c3c' : '#27ae60'; 
}


// --- FUNGSI EXPORT DATA (Tetap Sama) ---
// ... (exportCsvButton.addEventListener dan exportPdfButton.addEventListener) ...


// --- OTENTIKASI DAN INISIALISASI ---

// Cek status otentikasi saat halaman dimuat
supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
        window.location.href = 'login.html';
    } else {
        currentUserId = session.user.id;
        userEmailElement.textContent = `${session.user.email}`;
        loadTransaksi();
    }
});

// Panggil fungsi render dynamic inputs saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    if (jenisSelect && jenisSelect.value) {
        renderDynamicInputs(jenisSelect.value); 
    }
});
