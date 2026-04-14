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

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("Webhook recebido:", JSON.stringify(body, null, 2));

    const phone =
      body?.phone ||
      body?.from ||
      body?.data?.phone ||
      body?.data?.from ||
      "desconhecido";

    const texto =
      body?.text?.message ||
      body?.message ||
      body?.data?.text?.message ||
      body?.data?.message ||
      "";

    const nome =
      body?.name ||
      body?.data?.name ||
      body?.pushName ||
      body?.data?.pushName ||
      phone;

    const timestamp = new Date().toISOString();

    const resultado = await salvarNoFirestore("conversas", {
      phone,
      nome,
      texto,
      timestamp,
      origem: "whatsapp",
      lida: "false",
    });

    console.log("Salvo no Firestore:", resultado?.name || "ok");
    res.status(200).json({ status: "ok", saved: true });
  } catch (err) {
    console.error("Erro no webhook:", err);
    res.status(500).json({ status: "erro", message: err.message });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "online", servico: "Club Casa Prime Webhook" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Webhook rodando na porta " + PORT);
});
