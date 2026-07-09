// ==========================================
// CONFIGURATION (ISI DENGAN DATA KAMU)
// ==========================================
const DISCORD_BOT_TOKEN = "YOUR_DISCORD_BOT_TOKEN_HERE";
const DEEPSEEK_API_KEY = "YOUR_DEEPSEEK_API_KEY_HERE";
const APPLICATION_ID = "1523733920758239314";

// MASUKKAN KEDUA ID SERVER DISCORD KAMU DI SINI
const GUILD_IDS = [
  "1523723362642296836", // Contoh: Server yang ada #welcome
  "1523729696963956736", // Contoh: Server yang ada #tyas-room
];

// ==========================================
// 1. ENGINE UTAMA BOT (Menerima & Membalas Chat)
// ==========================================
function doPost(e) {
  const contents = JSON.parse(e.postData.contents);

  // WAJIB: Verifikasi keamanan (Handshake) otomatis dari Discord
  if (contents.type === 1) {
    return ContentService.createTextOutput(
      JSON.stringify({ type: 1 }),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // Memproses ketika perintah /tanya digunakan oleh mahasiswa
  if (contents.type === 2) {
    const userMessage = contents.data.options[0].value;
    const interactionToken = contents.token;
    const applicationId = contents.application_id;

    // Kirim status loading duluan ke Discord agar tidak kena timeout 3 detik
    kirimResponAwal(applicationId, interactionToken);

    // Tembak API DeepSeek di latar belakang, lalu edit status loading tadi dengan jawaban asli
    prosesDanKirimJawaban(userMessage, applicationId, interactionToken);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ status: "success" }),
  ).setMimeType(ContentService.MimeType.JSON);
}

// Fungsi internal untuk menampilkan efek "Bot sedang memikirkan jawaban..."
function kirimResponAwal(appId, token) {
  const url = `https://discord.com/api/v10/interactions/${appId}/${token}/callback`;
  const payload = {
    type: 5,
    data: { flags: 0 },
  };

  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      "User-Agent": "DiscordBot (https://github.com/discord/discord-api-docs, 1.0)",
    },
    payload: JSON.stringify(payload),
  });
}

// Fungsi internal untuk mengolah AI DeepSeek dan menembakkannya kembali ke Discord
function prosesDanKirimJawaban(pesanUser, appId, token) {
  try {
    const deepSeekUrl = "https://api.deepseek.com/v1/chat/completions";
    const deepSeekPayload = {
      model: "deepseek-chat", // Ganti dengan "deepseek-reasoner" jika ingin versi DeepSeek-R1
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah asisten dosen cerdas yang ramah, membantu, dan menjawab dengan ringkas menggunakan markdown.",
        },
        { role: "user", content: pesanUser },
      ],
    };

    const deepSeekOptions = {
      method: "post",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(deepSeekPayload),
      muteHttpExceptions: true,
    };

    const res = UrlFetchApp.fetch(deepSeekUrl, deepSeekOptions);
    const resJson = JSON.parse(res.getContentText());
    const jawabanAI = resJson.choices[0].message.content;

    // Edit pesan loading di Discord menggunakan metode PATCH
    const discordEditUrl = `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`;

    UrlFetchApp.fetch(discordEditUrl, {
      method: "patch",
      contentType: "application/json",
      headers: {
        "User-Agent": "DiscordBot (https://github.com/discord/discord-api-docs, 1.0)",
      },
      payload: JSON.stringify({ content: jawabanAI }),
    });
  } catch (error) {
    const discordEditUrl = `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`;
    UrlFetchApp.fetch(discordEditUrl, {
      method: "patch",
      contentType: "application/json",
      headers: {
        "User-Agent": "DiscordBot (https://github.com/discord/discord-api-docs, 1.0)",
      },
      payload: JSON.stringify({
        content:
          "Maaf, server DeepSeek sedang penuh atau ada kendala teknis. Coba lagi ya!",
      }),
    });
  }
}

// ==========================================
// 2. MENU PENDAFTARAN SLASH COMMAND /TANYA (LOOPING MULTI-SERVER)
// ==========================================
function daftarkanSlashCommand() {
  const commandData = {
    name: "tanya",
    description: "Tanyakan apa saja ke Asisten AI DeepSeek",
    options: [
      {
        name: "pertanyaan",
        description: "Tulis pertanyaan kuliahmu di sini",
        type: 3,
        required: true,
      },
    ],
  };

  // Melakukan perulangan pendaftaran untuk setiap ID server yang kamu daftarkan di atas
  GUILD_IDS.forEach(function (guildId) {
    const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${guildId}/commands`;

    const options = {
      method: "post",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "DiscordBot (https://github.com/discord/discord-api-docs, 1.0)",
      },
      payload: JSON.stringify(commandData),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(url, options);
    Logger.log(
      "Hasil Pendaftaran untuk Server ID (" +
        guildId +
        "): " +
        response.getContentText(),
    );
  });
}
