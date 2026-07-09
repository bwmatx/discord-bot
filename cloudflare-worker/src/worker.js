// ============================================================
// DISCORD BOT - CLOUDFLARE WORKER
// Bot Asisten AI DeepSeek & Fitur Hiburan
// ============================================================

const GUILD_IDS = [
  "1523723353792319538", // Server utama
];

// Channel khusus untuk Tools
const CHANNEL_QR = "1524249405144829974";
const CHANNEL_ZODIAK = "1524250266701135922";
const CHANNEL_GAMBAR = "1524253720676663306";

function hexToUint8Array(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function verifyDiscordSignature(request, publicKey) {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  const body = await request.text();

  if (!signature || !timestamp) {
    return { isValid: false, body: null };
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToUint8Array(publicKey),
      { name: "Ed25519", namedCurve: "Ed25519" },
      false,
      ["verify"]
    );

    const encoder = new TextEncoder();
    const message = encoder.encode(timestamp + body);
    const sig = hexToUint8Array(signature);

    const isValid = await crypto.subtle.verify("Ed25519", key, sig, message);
    return { isValid, body };
  } catch (err) {
    console.error("Verification error:", err);
    return { isValid: false, body: null };
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname.startsWith("/register")) {
      return await registerCommands(env);
    }

    if (request.method !== "POST") {
      return new Response("Bot is running. This endpoint only accepts Discord Webhook POST requests.", { status: 200 });
    }

    const { isValid, body } = await verifyDiscordSignature(
      request,
      env.DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
      return new Response("Invalid request signature", { status: 401 });
    }

    const interaction = JSON.parse(body);

    if (interaction.type === 1) {
      return jsonResponse({ type: 1 });
    }

    if (interaction.type === 2) {
      const commandName = interaction.data.name;
      const interactionToken = interaction.token;
      const applicationId = interaction.application_id;

      // Command Lupa (Clear Memory)
      if (commandName === "lupa") {
        ctx.waitUntil(clearMemory(interaction.channel_id, env));
        return jsonResponse({
          type: 4, // Immediate response with message
          data: { content: "🧹 Ingatan di channel ini sudah saya hapus! Mari mulai topik baru tanpa beban masa lalu." },
        });
      }

      // Command QR
      if (commandName === "qr") {
        const userId = interaction.member?.user?.id || "";
        let teksQR = interaction.data.options?.find(opt => opt.name === "teks")?.value || "";
        if (interaction.channel_id !== CHANNEL_QR) {
          ctx.waitUntil(generateQR(teksQR, null, null, CHANNEL_QR, userId, env));
          return jsonResponse({ type: 4, data: { content: "Hasil dikirim ke <#" + CHANNEL_QR + ">", flags: 64 } });
        }
        ctx.waitUntil(generateQR(teksQR, applicationId, interactionToken, null, userId, env));
        return jsonResponse({ type: 5, data: { flags: 0 } });
      }

      // Command Zodiak
      if (commandName === "zodiak") {
        const userId = interaction.member?.user?.id || "";
        let tanggalLahir = interaction.data.options?.find(opt => opt.name === "tanggal")?.value || "";
        if (interaction.channel_id !== CHANNEL_ZODIAK) {
          ctx.waitUntil(prosesZodiak(tanggalLahir, null, null, CHANNEL_ZODIAK, userId, env));
          return jsonResponse({ type: 4, data: { content: "Hasil dikirim ke <#" + CHANNEL_ZODIAK + ">", flags: 64 } });
        }
        ctx.waitUntil(prosesZodiak(tanggalLahir, applicationId, interactionToken, null, userId, env));
        return jsonResponse({ type: 5, data: { flags: 0 } });
      }

      // Command Gambar
      if (commandName === "gambar") {
        const userId = interaction.member?.user?.id || "";
        let promptUser = interaction.data.options?.find(opt => opt.name === "prompt")?.value || "";
        if (interaction.channel_id !== CHANNEL_GAMBAR) {
          ctx.waitUntil(generateImage(promptUser, null, null, CHANNEL_GAMBAR, userId, env));
          return jsonResponse({ type: 4, data: { content: "Hasil dikirim ke <#" + CHANNEL_GAMBAR + ">", flags: 64 } });
        }
        ctx.waitUntil(generateImage(promptUser, applicationId, interactionToken, null, userId, env));
        return jsonResponse({ type: 5, data: { flags: 0 } });
      }

      // Command AI Teks (tanya, dosen, santai, roast)
      if (["tanya", "dosen", "santai", "roast"].includes(commandName)) {
        const toolChannels = [CHANNEL_QR, CHANNEL_ZODIAK, CHANNEL_GAMBAR];
        if (toolChannels.includes(interaction.channel_id)) {
          return jsonResponse({ type: 4, data: { content: "Command ini tidak bisa digunakan di channel ini.", flags: 64 } });
        }
        let userMessage = interaction.data.options?.find(opt => opt.name === "pesan")?.value || "";
        let attachmentUrl = null;
        let attachmentName = null;
        const fileOpt = interaction.data.options?.find(opt => opt.name === "file");
        
        if (fileOpt && interaction.data.resolved && interaction.data.resolved.attachments) {
          const attachmentId = fileOpt.value;
          const attachment = interaction.data.resolved.attachments[attachmentId];
          if (attachment) {
            attachmentUrl = attachment.url;
            attachmentName = attachment.filename;
          }
        }

        ctx.waitUntil(
          prosesAI(commandName, userMessage, attachmentUrl, attachmentName, applicationId, interactionToken, interaction, env, ctx)
        );

        return jsonResponse({ type: 5, data: { flags: 0 } });
      }
    }

    return new Response("Unknown interaction type", { status: 400 });
  },
};

// ============================================================
// LOGIKA FITUR-FITUR
// ============================================================

async function clearMemory(channelId, env) {
  if (env.CHAT_HISTORY) {
    await env.CHAT_HISTORY.delete(`history_${channelId}`);
  }
}

async function generateImage(prompt, appId, token, targetChannelId, userId, env) {
  try {
    // 1. PROMPT EXPANSION VIA DEEPSEEK
    let enhancedPrompt = prompt;
    try {
      const systemPromptImage = `Kamu adalah ahli prompt engineer untuk AI pencipta gambar. Tugasmu:
1. Terjemahkan input pengguna ke Bahasa Inggris.
2. Perkaya input dengan detail visual yang tajam.
3. ADAPTASI GAYA: Jika pengguna meminta poster, logo, anime, kartun, atau gaya khusus lainnya, sesuaikan prompt dengan gaya tersebut (jangan dipaksa fotorealistis).
4. TIPOGRAFI: Jika pengguna meminta tulisan/teks, pastikan teks tersebut ditegaskan dalam prompt (misal: typography, bold text "kata", poster design).
5. JIKA TIDAK ADA GAYA YANG DISEBUTKAN: Baru gunakan gaya default yang sinematik dan memukau.
6. JANGAN membalas dengan basa-basi, LANGSUNG berikan teks prompt akhirnya saja.`;

      const deepSeekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPromptImage },
            { role: "user", content: prompt }
          ],
        }),
      });

      const resJson = await deepSeekResponse.json();
      if (resJson.choices && resJson.choices[0]?.message?.content) {
        enhancedPrompt = resJson.choices[0].message.content.trim();
      }
    } catch (e) {
      console.error("Prompt expansion error:", e);
    }

    const randomSeed = Math.floor(Math.random() * 100000000);
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const urutanModel = ["ideogram-v4-turbo", "ideogram-v4-quality", "gptimage", "nanobanana"];
    let blob = null;

    for (const namaModel of urutanModel) {
      try {
        const response = await fetch(`https://image.pollinations.ai/prompt/${encodedPrompt}?model=${namaModel}&nologo=true&seed=${randomSeed}`);
        if (response.ok) {
          blob = await response.blob();
          break; 
        }
      } catch (e) {
        console.error(`Model ${namaModel} gagal, mencoba model berikutnya...`);
      }
    }

    if (!blob) {
      throw new Error("Semua model API sedang sibuk atau gagal.");
    }

    const mention = userId ? `<@${userId}>` : "";
    const content = `${mention} **Permintaan Paduka:** "${prompt}"`;
    const formData = new FormData();
    formData.append("payload_json", JSON.stringify({ content }));
    formData.append("files[0]", blob, "image.jpg");

    if (targetChannelId) {
      await sendToChannel(targetChannelId, formData, env);
    } else {
      const url = `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`;
      await fetch(url, {
        method: "PATCH",
        body: formData, 
      });
    }
  } catch (error) {
    console.error("Generate Image Error:", error);
    const errMsg = "⚠️ Maaf, gagal membuat gambar karena server API sedang sibuk. Silakan coba sebentar lagi.";
    if (targetChannelId) {
      await sendTextToChannel(targetChannelId, errMsg, env);
    } else {
      await editDiscordMessageText(appId, token, errMsg);
    }
  }
}

async function generateQR(teks, appId, token, targetChannelId, userId, env) {
  try {
    const encodedTeks = encodeURIComponent(teks);
    const qrUrl = `https://quickchart.io/qr?text=${encodedTeks}&size=400&margin=2`;
    const response = await fetch(qrUrl);

    if (!response.ok) throw new Error("Gagal membuat QR Code");
    const blob = await response.blob();

    const mention = userId ? `<@${userId}>` : "";
    const content = `${mention} **QR Code untuk:** "${teks}"`;
    const formData = new FormData();
    formData.append("payload_json", JSON.stringify({ content }));
    formData.append("files[0]", blob, "qrcode.png");

    if (targetChannelId) {
      await sendToChannel(targetChannelId, formData, env);
    } else {
      const url = `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`;
      await fetch(url, { method: "PATCH", body: formData });
    }
  } catch (error) {
    console.error("QR Error:", error);
    const errMsg = "Gagal membuat QR Code. Coba lagi nanti.";
    if (targetChannelId) {
      await sendTextToChannel(targetChannelId, errMsg, env);
    } else {
      await editDiscordMessageText(appId, token, errMsg);
    }
  }
}

async function prosesZodiak(inputUser, appId, token, targetChannelId, userId, env) {
  try {
    const now = new Date();
    const opsiWaktu = { timeZone: 'Asia/Jakarta', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const hariIni = new Intl.DateTimeFormat('id-ID', opsiWaktu).format(now);

    const systemPrompt = `Kamu adalah peramal zodiak Gen-Z yang gaul dan relatable. Tugasmu:
1. Tentukan zodiak pengguna dari input mereka (bisa berupa tanggal lahir dalam format apapun, nama bulan, atau bahkan teks bebas).
2. Berikan ramalan harian untuk zodiak tersebut.
3. Gunakan bahasa Indonesia gaul (lo/gue, slang internet).
4. Bahas: cinta, karir/kuliah, keuangan, dan mood hari ini.
5. Buat ramalannya terasa personal dan relatable untuk anak muda.
6. Jangan terlalu panjang, maksimal 3-4 paragraf pendek.
7. Awali jawabanmu dengan nama zodiaknya dalam format tebal.
8. Hari ini adalah: ${hariIni}.
9. Jika input tidak bisa ditentukan zodiaknya, minta pengguna mengetik ulang tanggal lahirnya.`;

    const deepSeekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Tanggal lahir saya: ${inputUser}. Berikan ramalan hari ini.` }
        ],
      }),
    });

    const resJson = await deepSeekResponse.json();
    let ramalan = resJson.choices?.[0]?.message?.content || "Gagal membaca bintang hari ini.";

    const mention = userId ? `<@${userId}>` : "";
    const header = `${mention} **Tanggal Lahir:** ${inputUser}\n\n`;
    const fullMsg = header + ramalan;

    if (targetChannelId) {
      await sendTextToChannel(targetChannelId, fullMsg, env);
    } else {
      await editDiscordMessageText(appId, token, fullMsg);
    }
  } catch (error) {
    console.error("Zodiak Error:", error);
    const errMsg = "Gagal membaca ramalan. Coba lagi nanti.";
    if (targetChannelId) {
      await sendTextToChannel(targetChannelId, errMsg, env);
    } else {
      await editDiscordMessageText(appId, token, errMsg);
    }
  }
}

async function prosesAI(mode, pesanUser, attachmentUrl, attachmentName, appId, token, interaction, env, ctx) {
  try {
    let finalPrompt = pesanUser;

    if (attachmentUrl) {
      try {
        const fileResponse = await fetch(attachmentUrl);
        const fileText = await fileResponse.text();
        const truncatedText = fileText.length > 10000 ? fileText.substring(0, 10000) + "\n...[DIPOTONG KARENA TERLALU PANJANG]" : fileText;
        finalPrompt = `${pesanUser}\n\n[ISI FILE DILAMPIRKAN: ${attachmentName}]\n${truncatedText}`;
      } catch (err) {
        finalPrompt = `${pesanUser}\n\n(Catatan: Gagal membaca lampiran.)`;
      }
    }

    const channelId = interaction.channel_id;
    const kvKey = `history_${channelId}`;
    let history = [];
    
    if (env.CHAT_HISTORY) {
      try {
        const data = await env.CHAT_HISTORY.get(kvKey, "json");
        if (data && Array.isArray(data)) history = data;
      } catch (e) {}
    }

    // Mendapatkan Waktu Real-time
    const now = new Date();
    const opsiWaktu = { timeZone: 'Asia/Jakarta', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' };
    const waktuSekarang = new Intl.DateTimeFormat('id-ID', opsiWaktu).format(now);

    const instruksiWaktu = `\n[PERINTAH MUTLAK DARI SISTEM: Kamu SEKARANG memiliki akses ke waktu real-time. Waktu saat ini di sistem adalah: ${waktuSekarang}. JANGAN PERNAH mengatakan bahwa kamu tidak tahu waktu, tidak memiliki akses waktu, atau menyuruh pengguna melihat kalender. Jika pengguna bertanya hari, tanggal, atau jam berapa sekarang, kamu WAJIB menjawab menggunakan informasi waktu ini secara natural.]\n`;

    // MENYUSUN SYSTEM PROMPT BERDASARKAN COMMAND
    let systemPrompt = "";

    if (mode === "dosen") {
      systemPrompt = `Kamu adalah dosen cerdas, tegas, profesional, dan berwawasan luas yang mengajar di Program Studi Pendidikan Bahasa Inggris dan Desain Komunikasi Visual (DKV).
Karakteristikmu:
- Evaluasi ide/tanyaan pengguna secara kritis, tajam, dan akademik (seperti pembimbing skripsi/tugas).
- Jangan hanya memuji; berikan feedback yang konstruktif dan tunjukkan kelemahannya jika ada.
- Gunakan bahasa akademik yang formal, baku, namun tidak kaku.
- Berikan referensi yang logis.
- Hindari candaan berlebih di mode ini.` + instruksiWaktu;
    } 
    else if (mode === "santai") {
      systemPrompt = `Kamu adalah teman nongkrong virtual di Discord yang asyik, gaul, receh, dan nyambung diajak bahas apa saja (game, film, musik, meme, curhat).
Karakteristikmu:
- JANGAN pakai bahasa formal/baku. Gunakan bahasa gaul kasual (seperti lo/gue, aku/kamu, bro, dll).
- Kamu sangat up-to-date dengan pop culture dan obrolan tongkrongan.
- Bersikaplah nyantai, boleh pakai emoji berlimpah, candaan, atau slang internet.
- Jangan bertingkah seperti dosen atau asisten AI kaku.` + instruksiWaktu;
    }
    else if (mode === "roast") {
      systemPrompt = `Kamu adalah stand-up comedian berlidah tajam dan raja sarkasme. Tugas utamamu adalah melakukan "roasting" (meledek/mengejek) pengguna atau topik yang mereka berikan.
Karakteristikmu:
- Gunakan sarkasme level tinggi, pedas, menohok ego, tapi tetap mengandung komedi (jangan bawa-bawa SARA ekstrem).
- JANGAN PERNAH bersikap sopan, jangan meminta maaf, dan jangan memberi solusi manis.
- Jatuhkan ego pengguna dengan elegan dan candaan gelap (dark/roast comedy).
- Pakai bahasa gaul/santai internet.` + instruksiWaktu;
    }
    else {
      // mode "tanya" (Default Assistant)
      systemPrompt = `Kamu adalah asisten AI multifungsi.
Karakteristikmu:
- Jawablah SECARA SINGKAT, PADAT, dan TEPAT SASARAN (maksimal 2-3 paragraf kecuali diminta panjang).
- Ramah, sopan, dan membantu.
- Jika ditanya soal coding, berikan blok kode langsung tanpa basa-basi panjang.` + instruksiWaktu;
    }

    const messagesPayload = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: finalPrompt }
    ];

    const deepSeekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messagesPayload,
      }),
    });

    const resJson = await deepSeekResponse.json();
    let jawabanAI = resJson.choices[0]?.message?.content || "Maaf, AI tidak memberikan jawaban.";

    const chunks = splitMessage(jawabanAI);
    await editDiscordMessageText(appId, token, chunks[0]);
    for (let i = 1; i < chunks.length; i++) {
      await sendFollowupMessage(appId, token, chunks[i]);
    }

    if (env.CHAT_HISTORY) {
      let userHistoryText = pesanUser;
      if (attachmentName) userHistoryText += `\n[Membaca file lampiran: ${attachmentName}]`;

      history.push({ role: "user", content: userHistoryText });
      history.push({ role: "assistant", content: jawabanAI });
      if (history.length > 8) history = history.slice(history.length - 8);
      ctx.waitUntil(env.CHAT_HISTORY.put(kvKey, JSON.stringify(history), { expirationTtl: 86400 }));
    }
  } catch (error) {
    console.error("AI Error:", error);
    await editDiscordMessageText(appId, token, "⚠️ Maaf, ada kendala teknis dari server DeepSeek. Coba lagi ya!");
  }
}

async function editDiscordMessageText(appId, token, content) {
  const url = `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`;
  await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "DiscordBot (https://github.com/discord, 1.0)",
    },
    body: JSON.stringify({ content }),
  });
}

async function sendToChannel(channelId, formData, env) {
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
    },
    body: formData,
  });
}

async function sendTextToChannel(channelId, content, env) {
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function splitMessage(text, maxLength = 1950) {
  if (text.length <= maxLength) return [text];
  const chunks = [];
  let currentText = text;
  while (currentText.length > maxLength) {
    let splitIndex = currentText.lastIndexOf('\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength - 500) splitIndex = currentText.lastIndexOf(' ', maxLength);
    if (splitIndex === -1) splitIndex = maxLength;
    chunks.push(currentText.substring(0, splitIndex).trim());
    currentText = currentText.substring(splitIndex).trim();
  }
  if (currentText.length > 0) chunks.push(currentText);
  return chunks;
}

async function sendFollowupMessage(appId, token, content) {
  const url = `https://discord.com/api/v10/webhooks/${appId}/${token}`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "DiscordBot (https://github.com/discord, 1.0)",
    },
    body: JSON.stringify({ content }),
  });
}

// ============================================================
// PENDAFTARAN SLASH COMMAND KE DISCORD
// ============================================================
async function registerCommands(env) {
  const optionsTextBase = [
    { name: "pesan", description: "Tuliskan apa yang ingin kamu sampaikan", type: 3, required: true },
    { name: "file", description: "Lampirkan file (TXT/MD) jika butuh dianalisis", type: 11, required: false }
  ];

  const commands = [
    { name: "tanya", description: "Tanya apa saja ke asisten cerdas", options: optionsTextBase },
    { name: "dosen", description: "Diskusi akademik dengan persona Dosen kritis", options: optionsTextBase },
    { name: "santai", description: "Ngobrol receh layaknya di tongkrongan", options: optionsTextBase },
    { name: "roast", description: "Minta di-roasting / diejek habis-habisan oleh AI", options: optionsTextBase },
    { name: "lupa", description: "Menghapus ingatan bot di channel ini (Mulai topik baru)", options: [] },
    {
      name: "gambar",
      description: "Generate gambar gratis menggunakan AI Flux",
      options: [
        { name: "prompt", description: "Deskripsikan gambarnya (dalam bahasa inggris lebih direkomendasikan)", type: 3, required: true }
      ]
    },
    {
      name: "qr",
      description: "Buat QR Code dari teks atau link",
      options: [
        { name: "teks", description: "Teks atau link yang ingin dijadikan QR Code", type: 3, required: true }
      ]
    },
    {
      name: "zodiak",
      description: "Ramalan zodiak hari ini berdasarkan tanggal lahir",
      options: [
        { name: "tanggal", description: "Tanggal lahir kamu (format: DD-MM, contoh: 15-03)", type: 3, required: true }
      ]
    }
  ];

  const results = [];
  for (const guildId of GUILD_IDS) {
    const url = `https://discord.com/api/v10/applications/${env.APPLICATION_ID}/guilds/${guildId}/commands`;
    try {
      // Menggunakan metode PUT untuk me-replace seluruh list command di Discord sekaligus
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "DiscordBot (https://github.com/discord, 1.0)",
        },
        body: JSON.stringify(commands),
      });

      const result = await response.json();
      results.push({ guildId, status: response.status, result });
    } catch (error) {
      results.push({ guildId, status: "error", result: error.message });
    }
  }

  return jsonResponse({
    message: "Semua slash commands baru telah di-register secara paksa (PUT)!",
    results,
  });
}
