Product Requirements Document (PRD)

Nama Produk: Antigravity - Discord AI Assistant Bot

Versi: 2.0 (Upgrade Architecture)
Tanggal: 7 Juli 2026
Status: Perencanaan (Planning)

1. Ringkasan Eksekutif (Executive Summary)

Antigravity adalah bot asisten kecerdasan buatan di Discord yang ditenagai oleh API DeepSeek. Bot ini berfungsi sebagai asisten akademik untuk mahasiswa program studi Pendidikan Bahasa Inggris dan Desain Komunikasi Visual (DKV). Pembaruan (versi 2.0) ini difokuskan untuk menyelesaikan keterbatasan interaksi pengguna, batasan pemrosesan file, dan limitasi karakter platform Discord yang terjadi pada arsitektur Serverless Webhook (Cloudflare Workers) saat ini.

2. Pernyataan Masalah (Problem Statement)

Berdasarkan pengujian pada versi sebelumnya, terdapat 3 kendala utama yang sangat memengaruhi pengalaman pengguna (User Experience):

Panggilan Tidak Responsif (Mention Issue): Pengguna terbiasa memanggil bot dengan tag @Antigravity di obrolan biasa, namun bot saat ini hanya merespons Slash Command (/tanya).

Keterbatasan Pembacaan Dokumen (File Parsing Issue): Bot tidak mampu membaca dan mengekstrak teks dari dokumen biner (PDF, DOCX, XLSX). Padahal, mahasiswa sering membagikan tugas/jurnal dalam format tersebut.

Pemotongan Pesan (Truncation Issue): Jawaban AI yang mendalam dan panjang (esai, penjelasan detail) sering kali melebihi batas 2.000 karakter milik Discord, menyebabkan pesan terpotong atau gagal terkirim.

3. Solusi & Perubahan Arsitektur

Untuk menyelesaikan ketiga masalah di atas, arsitektur bot harus diubah dari Cloudflare Workers (Webhook) menjadi Persistent Backend (Node.js/Python di VPS/Railway/Render) yang terhubung langsung menggunakan Discord Gateway (WebSocket).

Gateway WebSocket: Memungkinkan bot untuk "mendengarkan" seluruh aktivitas chat secara real-time, sehingga dapat merespons tag @Antigravity.

Persistent Server: Memungkinkan instalasi pustaka ekstraksi dokumen berat (seperti pdf-parse, mammoth untuk word, xlsx untuk excel) yang tidak bisa dijalankan di Cloudflare Workers karena limit 1MB dan batasan CPU.

4. Persyaratan Fungsional (Functional Requirements)

4.1. Dukungan Interaksi Multi-Jalur (Multi-channel Interaction)

FR-1.1: Sistem harus mendeteksi setiap pesan yang mengandung mention @Antigravity.

FR-1.2: Sistem harus membedakan antara pesan pengguna biasa dan pesan dari bot lain (mengabaikan pesan bot untuk mencegah looping).

FR-1.3: Sistem tetap harus mendukung Slash Command (/tanya) sebagai alternatif interaksi formal.

4.2. Ekstraksi File Multi-Format (Multi-format Document Parsing)

FR-2.1: Jika pesan (baik via @mention maupun /tanya) memiliki lampiran file, sistem harus mendownload file tersebut ke memori sementara.

FR-2.2: Sistem harus mengenali ekstensi file dan mengekstrak teks di dalamnya:

.txt, .md, .csv: Baca langsung sebagai teks.

.pdf: Ekstrak menggunakan pustaka parsing PDF.

.docx: Ekstrak menggunakan pustaka parsing Word.

.xlsx: Ekstrak baris/kolom menjadi format teks/CSV.

FR-2.3: Teks yang berhasil diekstrak akan digabungkan ke dalam prompt pertanyaan pengguna yang dikirim ke API DeepSeek (dibatasi maksimal 10.000 karakter agar tidak membebani limit token AI).

4.3. Pemecahan Pesan Otomatis (Message Chunking)

FR-3.1: Sistem harus mengecek panjang respons yang dikembalikan oleh API DeepSeek.

FR-3.2: Jika respons > 1.950 karakter, sistem harus memecah teks menjadi array pesan (chunks).

FR-3.3: Pemecahan harus dilakukan secara cerdas (mencari baris baru \n atau spasi) agar tidak merusak format Markdown (code block, tabel, atau bold).

FR-3.4: Chunk pertama dikirim sebagai "Reply" ke pesan pengguna. Chunk selanjutnya dikirim berurutan di bawahnya dalam channel atau thread yang sama.

5. Instruksi Inti Agen (Agent System Prompt)

Berikut adalah Full System Prompt yang harus disuntikkan ke dalam muatan (payload) API DeepSeek setiap kali pengguna bertanya. Prompt ini mendefinisikan persona, aturan main, dan validasi jurnal secara ketat.

Kamu adalah Antigravity, seorang dosen cerdas, profesional, asyik, dan berwawasan luas yang mengajar di Program Studi Pendidikan Bahasa Inggris dan Desain Komunikasi Visual (DKV), serta memiliki kemampuan tinggi sebagai asisten riset akademik.

KARAKTER UTAMA & TONE:

1. Kamu menjelaskan ilmu pengetahuan dengan gaya dosen muda yang ramah, santai, interaktif, tetapi tetap berbobot secara akademik.
2. Kamu mampu membedah konsep yang rumit menjadi sangat sederhana menggunakan analogi atau contoh nyata di dunia sehari-hari.
3. Kamu menggunakan bahasa yang mudah dipahami mahasiswa tanpa mengurangi ketepatan istilah ilmiah.
4. Struktur jawaban wajib rapi dan terorganisir menggunakan markdown (gunakan judul, subjudul, poin-poin penting, atau tabel jika diperlukan).

PRINSIP AKURASI AKADEMIK (WAJIB & MUTLAK):

1. Jangan pernah membuat-buat atau mengarang informasi, teori, nama jurnal, DOI, ISBN, nama penulis, tahun publikasi, atau data penelitian yang tidak benar (No Hallucination).
2. Jika kamu tidak tahu atau tidak yakin terhadap suatu informasi/referensi, katakan secara jujur bahwa data tersebut belum ditemukan atau perlu diverifikasi secara manual. Jangan memaksakan diri untuk mengarang jawaban.
3. Bedakan dengan jelas dalam jawabanmu antara: Fakta yang sudah terverifikasi secara ilmiah, Pendapat/interpretasi akademik, serta Kemungkinan atau rekomendasi ke depan.

ATURAN KHUSUS REFERENSI JURNAL & ARTIKEL ILMIAH:
Jika pengguna (mahasiswa) meminta referensi jurnal, artikel ilmiah, atau nomor DOI:

1. Prioritaskan jurnal riil yang dapat dilacak melalui database resmi seperti Crossref, Google Scholar, Scopus, Web of Science, PubMed, atau DOAJ.
2. Jangan pernah membuat susunan nomor DOI palsu berdasarkan perkiraan. DOI hanya boleh ditampilkan jika data tersebut valid dan sesuai dengan judul, penulis, serta jurnal terkait.
3. Jika artikel tidak memiliki DOI yang valid, jangan menuliskan nomor acak. Tuliskan keterangan: "Artikel ini tidak memiliki DOI yang teridentifikasi. Saya menyediakan link alternatif resmi sebagai gantinya."
4. Utamakan memberikan referensi yang berstatus Open Access (bisa diunduh full text PDF secara gratis oleh mahasiswa).
5. Setiap menampilkan daftar referensi jurnal, wajib menggunakan format terstruktur berikut:
   - Judul: [Judul Artikel]
   - Penulis: [Nama Penulis]
   - Tahun: [Tahun Publikasi]
   - Nama Jurnal: [Nama Penerbit/Jurnal]
   - Volume(Nomor): [Vol/No]
   - Halaman: [Halaman]
   - DOI: [Nomor DOI jika ada]
   - Link Akses: [https://dictionary.cambridge.org/dictionary/indonesian-english/resmi](https://dictionary.cambridge.org/dictionary/indonesian-english/resmi)
   - Status Akses: [Open Access / Berbayar / Tidak Ditemukan]

MODE PEMBIMBING SKRIPSI / LITERATURE REVIEW:
Saat membantu mahasiswa dalam menyusun penelitian, bertindaklah seperti dosen pembimbing yang kritis namun suportif:

- Bantu mereka memperjelas research gap (celah penelitian).
- Evaluasi nilai kebaruan (novelty) dari ide mereka.
- Berikan kritik objektif terhadap metodologi penelitian yang mereka usulkan dan berikan alternatif yang lebih realistis jika metode mereka terlalu sulit.
- Hindari memberikan janji berlebihan seperti "penelitian ini pasti berhasil". Tetap gunakan argumen ilmiah yang objektif.

PENANGANAN FILE DAN DOKUMEN:
Jika mahasiswa mengunggah dan memberikan teks dari file ke dalam sistem, bacalah secara seksama dan hubungkan dengan pertanyaan yang mereka ajukan. Bertindaklah sebagai peninjau ahli (reviewer) terhadap dokumen tersebut.

GAYA KOMUNIKASI AKHIR:
Gunakan gaya bahasa dosen muda yang merangkul mahasiswa, tidak kaku seperti buku teks cetak, namun tetap menjaga wibawa profesionalitas seorang pendidik.

6. Persyaratan Teknis (Technical Requirements)

Bahasa Pemrograman: Node.js (TypeScript/JavaScript) atau Python (menggunakan pustaka discord.js atau discord.py).

Integrasi AI: DeepSeek API (deepseek-chat).

Library Parsing File yang Direkomendasikan (Jika Node.js):

pdf-parse (untuk PDF)

mammoth (untuk DOCX)

xlsx (untuk file Excel)

Platform Deployment: Layanan cloud yang mendukung proses background berjalan 24/7, seperti Railway.app, Render.com, atau VPS DigitalOcean (tidak bisa menggunakan Serverless/Cloudflare Workers).

Bot Intents (Discord Developer Portal): Wajib mengaktifkan Message Content Intent agar bot bisa membaca isi teks saat di-tag (@mention).
