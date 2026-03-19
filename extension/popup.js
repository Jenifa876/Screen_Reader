const input=document.getElementById('apiUrl'),statusEl=document.getElementById('status'),saveBtn=document.getElementById('saveBtn');
chrome.storage.sync.get(['apiUrl'],r=>{if(r.apiUrl)input.value=r.apiUrl;});
saveBtn.addEventListener('click',saveAndTest);
function saveAndTest(){
  const url=input.value.trim().replace(/\/$/,'');
  if(!url){show('Please enter a URL',false);return;}
  chrome.storage.sync.set({apiUrl:url});show('Testing connection...',null);
  const port=chrome.runtime.connect({name:'va-request'});
  let settled=false;
  port.onMessage.addListener(r=>{
    if(r.heartbeat)return;
    if(!settled){settled=true;port.disconnect();
      if(!r.ok){show('Failed: '+(r.error||'Cannot connect.'),false);return;}
      show('Connected! GPU: '+(r.data.gpu?'Yes':'No'),true);}
  });
  port.onDisconnect.addListener(()=>{if(!settled){settled=true;show('Failed: disconnected.',false);}});
  port.postMessage({action:'fetchHealth',apiUrl:url});
}
function show(msg,ok){
  statusEl.style.display='block';
  statusEl.className='status '+(ok===true?'ok':ok===false?'err':'');
  statusEl.textContent=msg;
}
