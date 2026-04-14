const express = require("express");
const app = express();
app.use(express.json());

const FIREBASE_PROJECT = "club-casa-prime";
const FIREBASE_API_KEY = "AIzaSyDJu40V2UJuOKrvGu_GxukbY812c35xSW0";

async function salvarNoFirestore(colecao, dados) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${colecao}?key=${FIREBASE_API_KEY}`;

  const campos = {};
  for (const [chave, valor] of Object.entries(dados)) {
    if (typeof valor === "string") campos[chave] = { stringValue: valor };
    else if (typeof valor === "number") campos[chave] = { integerValue: valor };
    else if (typeof valor === "boolean") campos[chave] = { booleanValue: valor };
    else if (valor === null) campos[chave] = { nullValue: null };
    else campos[chave] = { stringValue: String(valor) };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: campos }),
  });

  return response.json();
}

function extrairMensagem(body) {
  // Detecta se é mensagem enviada por mim ou recebida
  const fromMe = body?.fromMe || body?.isFromMe || false;
  
  const phone =
    body?.phone ||
    body?.from ||
    body?.data?.phone ||
    body?.data?.from ||
    "desconhecido";

  const nome =
    body?.name ||
    body?.data?.name ||
    body?.pushName ||
    body?.data?.pushName ||
    phone;

  const timestamp = body?.momment
    ? new Date(body.momment).toISOString()
    : new Date().toISOString();

  // Tipo e conteúdo da mensagem
  let tipo = "texto";
  let texto = "";
  let mediaUrl = "";
  let mediaType = "";
  let caption = "";

  // Texto simples
  if (body?.text?.message) {
    texto = body.text.message;
    tipo = "texto";
  } else if (body?.message) {
    texto = body.message;
    tipo = "texto";
  }

  // Imagem
  if (body?.image || body?.data?.image) {
    const img = body.image || body.data?.image;
    tipo = "imagem";
    mediaUrl = img?.url || img?.imageUrl || img?.link || "";
    caption = img?.caption || img?.message || "";
    texto = caption || "📷 Imagem";
    mediaType = "image";
  }

  // Áudio / PTT
  if (body?.audio || body?.data?.audio || body?.ptt || body?.data?.ptt) {
    const aud = body.audio || body.data?.audio || body.ptt || body.data?.ptt;
    tipo = "audio";
    mediaUrl = aud?.url || aud?.audioUrl || aud?.link || "";
    texto = "🎤 Áudio";
    mediaType = "audio";
  }

  // Vídeo
  if (body?.video || body?.data?.video) {
    const vid = body.video || body.data?.video;
    tipo = "video";
    mediaUrl = vid?.url || vid?.videoUrl || vid?.link || "";
    caption = vid?.caption || "";
    texto = caption || "🎥 Vídeo";
    mediaType = "video";
  }

  // Documento / arquivo
  if (body?.document || body?.data?.document) {
    const doc = body.document || body.data?.document;
    tipo = "documento";
    mediaUrl = doc?.url || doc?.documentUrl || doc?.link || "";
    texto = doc?.fileName || doc?.title || "📄 Documento";
    mediaType = "document";
  }

  // Sticker
  if (body?.sticker || body?.data?.sticker) {
    tipo = "sticker";
    texto = "😊 Sticker";
  }

  // Localização
  if (body?.location || body?.data?.location) {
    const loc = body.location || body.data?.location;
    tipo = "localizacao";
    texto = `📍 Localização: ${loc?.latitude || ""}, ${loc?.longitude || ""}`;
  }

  // Contato
  if (body?.contact || body?.data?.contact) {
    tipo = "contato";
    texto = "👤 Contato compartilhado";
  }

  return {
    phone: String(phone),
    nome: String(nome),
    texto: String(texto),
    tipo,
    mediaUrl: String(mediaUrl),
    mediaType: String(mediaType),
    caption: String(caption),
    fromMe: String(fromMe),
    timestamp,
    origem: "whatsapp",
    lida: "false",
  };
}

app.post("/webhook", async (req, res) => {
  try {
