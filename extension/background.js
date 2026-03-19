let API_URL = '';
chrome.storage.sync.get(['apiUrl'], r => { API_URL = r.apiUrl || ''; });
chrome.storage.onChanged.addListener(c => { if (c.apiUrl) API_URL = c.apiUrl.newValue; });

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'describeImage', title: 'Describe this image (Visual Assistant)', contexts: ['image'] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'describeImage')
    chrome.tabs.sendMessage(tab.id, { action: 'analyzeImageUrl', imageUrl: info.srcUrl, apiUrl: API_URL });
});

const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };

chrome.runtime.onConnect.addListener(port => {
  port.onMessage.addListener(async msg => {

    if (msg.action === 'fetchHealth') {
      const url = (msg.apiUrl || API_URL).replace(/\/$/,'');
      try {
        const res = await fetch(url+'/health',{method:'GET',headers:HEADERS,signal:AbortSignal.timeout(10000)});
        const ct = res.headers.get('content-type')||'';
        if (!ct.includes('application/json')) { port.postMessage({ok:false,error:'Non-JSON: '+(await res.text()).substring(0,100)}); return; }
        port.postMessage({ok:true,data:await res.json()});
      } catch(e) { port.postMessage({ok:false,error:e.message}); }
    }

    if (msg.action === 'fetchAnalyzeUrl') {
      const url = (msg.apiUrl || API_URL).replace(/\/$/,'');
      try {
        const hb = setInterval(()=>{ try{port.postMessage({heartbeat:true});}catch(e){clearInterval(hb);} },5000);
        const res = await fetch(url+'/analyze_image',{method:'POST',headers:HEADERS,body:JSON.stringify({image_url:msg.imageUrl})});
        clearInterval(hb);
        const ct = res.headers.get('content-type')||'';
        if (!ct.includes('application/json')) { port.postMessage({ok:false,error:'Non-JSON: '+(await res.text()).substring(0,100)}); return; }
        port.postMessage({ok:true,data:await res.json()});
      } catch(e) { port.postMessage({ok:false,error:e.message}); }
    }

    if (msg.action === 'fetchAskVoice') {
      const url = (msg.apiUrl || API_URL).replace(/\/$/,'');
      try {
        const hb = setInterval(()=>{ try{port.postMessage({heartbeat:true});}catch(e){clearInterval(hb);} },5000);
        const res = await fetch(url+'/ask_voice',{method:'POST',headers:HEADERS,body:JSON.stringify({audio_base64:msg.audioBase64})});
        clearInterval(hb);
        const ct = res.headers.get('content-type')||'';
        if (!ct.includes('application/json')) { port.postMessage({ok:false,error:'Non-JSON: '+(await res.text()).substring(0,100)}); return; }
        port.postMessage({ok:true,data:await res.json()});
      } catch(e) { port.postMessage({ok:false,error:e.message}); }
    }

  });
});
