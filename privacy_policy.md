# Privacy Policy (Kebijakan Privasi)
**Terakhir Diperbarui:** 7 Juli 2026

Kebijakan Privasi ini menjelaskan bagaimana bot Discord **Antigravity** ("Bot", "Kami") mengumpulkan, menggunakan, dan melindungi data kamu saat kamu menggunakan layanan kami di server Discord.

## 1. Data Apa yang Kami Kumpulkan?
Saat kamu menggunakan perintah (Slash Command) `/tanya`, Bot akan menerima dan memproses data berikut dari Discord:
- **ID Pengguna (User ID):** Untuk mengidentifikasi siapa yang mengirim perintah.
- **ID Saluran (Channel ID):** Untuk memisahkan konteks percakapan antar ruangan (channel).
- **Isi Pesan (Teks):** Pertanyaan yang kamu ketikkan pada kolom perintah.
- **Lampiran File:** Jika kamu mengunggah dokumen teks (TXT, MD, CSV), bot akan membaca teks di dalam dokumen tersebut.

**Penting:** Bot *tidak* membaca atau merekam pesan obrolan biasa kamu di luar penggunaan perintah `/tanya`.

## 2. Bagaimana Kami Menggunakan Data Tersebut?
- **Memproses Jawaban:** Teks pertanyaan dan lampiran file dikirim ke **DeepSeek API** (Penyedia Layanan AI Pihak Ketiga) secara real-time untuk dianalisis dan dijawab.
- **Memori Konteks (Cloudflare KV):** Untuk membuat percakapan berkesinambungan, Bot menyimpan riwayat percakapan terakhir (maksimal 4 tanya-jawab terakhir per *channel*) ke dalam pangkalan data sementara Cloudflare KV. 

## 3. Pembagian Data Pihak Ketiga
Untuk dapat berfungsi, Bot harus mengirimkan teks *prompt* pertanyaan kamu ke penyedia layanan AI:
- **DeepSeek:** Layanan yang menghasilkan respons AI. Silakan merujuk pada [Kebijakan Privasi DeepSeek](https://www.deepseek.com/) terkait bagaimana mereka menangani data API.
Kami tidak menjual, menyewakan, atau memberikan data pribadi kamu kepada pihak ketiga lainnya untuk tujuan komersial.

## 4. Retensi dan Penghapusan Data
- Memori percakapan yang disimpan di Cloudflare KV memiliki batas waktu kedaluwarsa otomatis (TTL) selama **24 Jam**. Setelah lewat 24 jam dari waktu pertanyaan terakhir, data percakapan tersebut akan otomatis terhapus dan hilang secara permanen dari server.

## 5. Hubungi Kami
Jika kamu memiliki pertanyaan tentang kebijakan ini atau ingin meminta penghapusan data secara manual sebelum 24 jam, silakan hubungi Administrator atau Pengembang di server Discord tempat bot ini beroperasi.
