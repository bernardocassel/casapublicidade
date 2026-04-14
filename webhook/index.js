const express = require('express');
const app = express();
app.use(express.json());

const PROJECT_ID = 'club-casa-prime';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function fsAdd(col, docId, sub, data) {
  const fields = {};
  for(const [k,v] of Object.entries(data)) {
    if(typeof v === 'string') fields[k] = {stringValue: v};
    else if(typeof v === 'number') fields[k] = {integerValue: String(v)};
  }
  const r = await fetch(`${FIRESTORE_URL}/${col}/${docId}/${sub}`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({fields})
  });
  return r.json();
}

app.post('/webhook', async (req, res) => {
  try {
    const b = req.body;
    console.log('Webhook recebido:', b.type, b.phone);
    if(!['ReceivedCallback','SentCallback'].includes(b.type)) return res.json({ok:true});
    const phone = (b.phone||b.from||'').replace(/\D/g,'').replace(/^55/,'');
    const text = b.text?.message || b.body || b.caption || '';
    if(!phone||!text) return res.json({ok:true,skip:'no data'});
    const dir = b.fromMe ? 'out' : 'in';
    const ts = b.momment ? b.momment*1000 : Date.now();
    const leadId = `wpp_${phone}`;
    await fsAdd('conversas', leadId, 'mensagens', {text, dir, ts, phone});
    await fetch(`${FIRESTORE_URL}/leads/${leadId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({fields:{
        name:{stringValue: b.senderName||phone},
        phone:{stringValue: phone},
        status:{stringValue:'novo'},
        ori:{stringValue:'WhatsApp Direto'},
        lastMessage:{stringValue:text},
        lastTs:{integerValue:String(ts)}
      }})
    });
    res.json({ok:true, leadId});
  } catch(e) {
    console.error(e);
    res.status(500).json({error:e.message});
  }
});

app.get('/', (req,res) => res.json({status:'Club Casa Prime Webhook ✓'}));
app.listen(process.env.PORT||3000, () => console.log('Webhook online'));
