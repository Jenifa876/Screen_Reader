let currentAudio=null,mediaRecorder=null,audioChunks=[],isRecording=false,apiBaseUrl='';
chrome.storage.sync.get(['apiUrl'],r=>{apiBaseUrl=r.apiUrl||'';});
chrome.storage.onChanged.addListener(c=>{if(c.apiUrl)apiBaseUrl=c.apiUrl.newValue;});

function announceToNVDA(text){
  let r=document.getElementById('va-nvda-live');
  if(!r){r=document.createElement('div');r.id='va-nvda-live';
    r.setAttribute('aria-live','assertive');r.setAttribute('aria-atomic','true');r.setAttribute('role','status');
    r.style.cssText='position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(r);}
  r.textContent='';setTimeout(()=>{r.textContent=text;},50);
}

function playAudioBase64(b64){
  try{
    if(currentAudio){currentAudio.pause();currentAudio=null;}
    const bytes=atob(b64),arr=new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
    currentAudio=new Audio(URL.createObjectURL(new Blob([arr],{type:'audio/mp3'})));
    currentAudio.play().catch(e=>console.error('[VA]',e));
  }catch(e){console.error('[VA] playAudio:',e);}
}

function updatePanel(text,state){
  const el=document.getElementById('va-status');if(!el)return;
  el.style.background=({ready:'#0d0d1a',processing:'#1a2a00',recording:'#2a0000',error:'#3a0000'})[state]||'#0d0d1a';
  el.textContent=text;
}

function sendViaPort(message,onResult){
  const port=chrome.runtime.connect({name:'va-request'});
  let settled=false;
  port.onMessage.addListener(r=>{
    if(r.heartbeat)return;
    if(!settled){settled=true;port.disconnect();onResult(r);}
  });
  port.onDisconnect.addListener(()=>{if(!settled){settled=true;onResult({ok:false,error:'Background disconnected.'});}});
  port.postMessage(message);
}

function analyzeImage(imageUrl){
  if(!apiBaseUrl){announceToNVDA('Set API URL in popup first.');updatePanel('Set API URL in popup first.','error');return;}
  announceToNVDA('Analyzing image, please wait about 30 seconds.');
  updatePanel('Analyzing image... Please wait 30-60 seconds.','processing');
  sendViaPort({action:'fetchAnalyzeUrl',imageUrl,apiUrl:apiBaseUrl},r=>{
    if(!r.ok){announceToNVDA('Error: '+r.error);updatePanel('Error: '+r.error,'error');return;}
    if(r.data.error){announceToNVDA('Error: '+r.data.error);updatePanel('Error: '+r.data.error,'error');return;}
    announceToNVDA(r.data.description);updatePanel(r.data.description,'ready');playAudioBase64(r.data.audio_base64);
  });
}

async function startVoiceRecording(){
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    audioChunks=[];mediaRecorder=new MediaRecorder(stream);
    mediaRecorder.ondataavailable=e=>{if(e.data.size>0)audioChunks.push(e.data);};
    mediaRecorder.onstop=sendVoiceQuestion;mediaRecorder.start();isRecording=true;
    announceToNVDA('Recording. Press Alt Shift Q to stop.');
    updatePanel('Recording... press Alt+Shift+Q to stop','recording');
    const btn=document.getElementById('va-mic');if(btn)btn.textContent='Stop';
  }catch(e){announceToNVDA('Mic denied.');updatePanel('Mic denied.','error');}
}

function stopVoiceRecording(){
  if(mediaRecorder&&isRecording){
    mediaRecorder.stop();mediaRecorder.stream.getTracks().forEach(t=>t.stop());isRecording=false;
    updatePanel('Processing... (30-60 seconds)','processing');
    const btn=document.getElementById('va-mic');if(btn)btn.textContent='Ask';
  }
}

function sendVoiceQuestion(){
  const reader=new FileReader();
  reader.onloadend=()=>{
    sendViaPort({action:'fetchAskVoice',audioBase64:reader.result.split(',')[1],apiUrl:apiBaseUrl},r=>{
      if(!r.ok){announceToNVDA('Error: '+r.error);updatePanel('Error: '+r.error,'error');return;}
      if(r.data.error){announceToNVDA('Error: '+r.data.error);updatePanel('Error: '+r.data.error,'error');return;}
      announceToNVDA('You asked: '+r.data.question+'. Answer: '+r.data.answer);
      updatePanel('Q: '+r.data.question+'\nA: '+r.data.answer,'ready');
      playAudioBase64(r.data.audio_base64);
    });
  };
  reader.readAsDataURL(new Blob(audioChunks,{type:'audio/webm'}));
}

function createPanel(){
  if(document.getElementById('va-panel'))return;
  const panel=document.createElement('div');
  panel.id='va-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Visual Assistant');
  panel.style.cssText='position:fixed;bottom:20px;right:20px;width:340px;background:#1a1a2e;color:#eee;border-radius:12px;padding:16px;z-index:999999;font-family:Arial,sans-serif;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.5);border:2px solid #4a90e2;';
  const hdr=document.createElement('div');hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';
  const ttl=document.createElement('strong');ttl.style.color='#4a90e2';ttl.textContent='Visual Assistant';
  const cls=document.createElement('button');cls.setAttribute('aria-label','Close');
  cls.style.cssText='background:none;border:none;color:#eee;font-size:18px;cursor:pointer;';cls.textContent='X';
  cls.addEventListener('click',()=>panel.remove());hdr.appendChild(ttl);hdr.appendChild(cls);
  const st=document.createElement('div');st.id='va-status';st.setAttribute('aria-live','polite');
  st.style.cssText='min-height:60px;background:#0d0d1a;padding:10px;border-radius:8px;margin-bottom:10px;font-size:13px;word-wrap:break-word;white-space:pre-wrap;';
  st.textContent='Ready. Right-click any image to describe it.';
  const br=document.createElement('div');br.style.cssText='display:flex;gap:8px;';
  const mb=document.createElement('button');mb.id='va-mic';mb.setAttribute('aria-label','Ask voice question');
  mb.style.cssText='flex:1;padding:10px;background:#4a90e2;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;';
  mb.textContent='Ask';mb.addEventListener('click',()=>{isRecording?stopVoiceRecording():startVoiceRecording();});
  const sb=document.createElement('button');sb.setAttribute('aria-label','Stop audio');
  sb.style.cssText='flex:1;padding:10px;background:#555;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;';
  sb.textContent='Stop Audio';sb.addEventListener('click',()=>{if(currentAudio){currentAudio.pause();currentAudio=null;}});
  br.appendChild(mb);br.appendChild(sb);
  const hl=document.createElement('div');hl.style.cssText='font-size:11px;color:#888;margin-top:8px;';
  hl.innerHTML='Alt+Shift+D: Describe focused image<br>Alt+Shift+Q: Ask/stop voice<br>Enter on image: Describe it<br>Takes 30-60 seconds';
  panel.appendChild(hdr);panel.appendChild(st);panel.appendChild(br);panel.appendChild(hl);
  document.body.appendChild(panel);
}

function enhanceImages(){
  document.querySelectorAll('img').forEach(img=>{
    if(img.dataset.vaProcessed)return;img.dataset.vaProcessed='1';
    if(!img.hasAttribute('tabindex'))img.setAttribute('tabindex','0');
    if(!img.title)img.title='Press Enter to describe with Visual Assistant';
    img.addEventListener('focus',()=>createPanel());
    img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();createPanel();analyzeImage(img.src);}});
  });
}

document.addEventListener('keydown',e=>{
  if(e.altKey&&e.shiftKey&&e.key==='D'){const el=document.activeElement;if(el&&el.tagName==='IMG'){createPanel();analyzeImage(el.src);}}
  if(e.altKey&&e.shiftKey&&e.key==='Q'){createPanel();isRecording?stopVoiceRecording():startVoiceRecording();}
});

enhanceImages();
new MutationObserver(enhanceImages).observe(document.body,{childList:true,subtree:true});
chrome.runtime.onMessage.addListener(msg=>{
  if(msg.action==='analyzeImageUrl'){apiBaseUrl=msg.apiUrl||apiBaseUrl;createPanel();analyzeImage(msg.imageUrl);}
});
