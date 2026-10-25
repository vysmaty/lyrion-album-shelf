/* AlbumShelf controls an existing LMS player; it never plays audio in the browser. */
(function(){
 'use strict';
 const A=window.AlbumShelf,state=A.createState(),$=id=>document.getElementById(id);
 const params=new URLSearchParams(location.search),demo=params.get('demo')==='1';
 const icons={
  now:'<path d="M5 9v6m5-11v16m5-13v10m5-6v2"/>',back:'<path d="m10 5-7 7 7 7M3 12h18"/>',
  settings:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
  left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>',
  previous:'<path d="M4 3v18" stroke-width="2.6"/><path d="M21 3 7 12l14 9Z" fill="currentColor" stroke="none"/>',next:'<path d="M20 3v18" stroke-width="2.6"/><path d="M3 3l14 9-14 9Z" fill="currentColor" stroke="none"/>',
  play:'<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>',pause:'<path d="M8 6v12m8-12v12" stroke-width="4.3"/>',
  music:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>'
 };
 function svg(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';}
 const iconBindings={'now-toggle':'now',back:'back','settings-toggle':'settings',fullscreen:'fullscreen','settings-close':'close','page-previous':'left','page-next':'right',previous:'previous',next:'next',transport:'play'};
 for(const [id,icon] of Object.entries(iconBindings))$(id).innerHTML=svg(icon);
 let albums=[],players=[],status={},generation=0,renderEpoch=0,renderKey='',nowKey='',nowView=false,settingsOpen=false,lastPlay=0,rotation=0,toastTimer,seeking=false,statusTime=0;
 let theme=readPreference('theme','light',['light','dark','artwork']),motion=readPreference('motion','tilt',['tilt','vinyl']);
 const storedWear=Number(readPreference('wear','55'));
 let wear=Number.isFinite(storedWear)?Math.max(0,Math.min(100,storedWear)):55;
 function readPreference(key,fallback,values){try{const value=localStorage.getItem('albumshelf.'+key);return !values||values.includes(value)?value||fallback:fallback;}catch{return fallback;}}
 function savePreference(key,value){try{localStorage.setItem('albumshelf.'+key,value);}catch{/* Browsers may disable local storage. */}}
 function text(id,value){$(id).textContent=value||'';}
 function notify(value){text('toast',value);$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
 function wake(){state.idle=false;state.lastInteraction=Date.now();document.body.classList.remove('idle');}
 async function rpc(player,command){
  const response=await fetch(A.serverPath('jsonrpc.js',location.href),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:1,method:'slim.request',params:[player,command]}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Lyrion není dostupný.');
  const body=await response.json();if(body.error)throw new Error('Lyrion odmítl příkaz.');return body.result||{};
 }
 function placeholder(container,album,index){
  const art=document.createElement('div');
  if(demo){
   const colours=[['#25494c','#e6d8bb'],['#d1ad70','#473d43'],['#6d3c40','#f0ccb0'],['#b5bab0','#304d50'],['#304254','#d2bdb2'],['#bd6e49','#f3d4a3']];
   art.className='demo-cover variant-'+index%4;art.style.setProperty('--cover-bg',colours[index%6][0]);art.style.setProperty('--cover-ink',colours[index%6][1]);
   const title=document.createElement('b');title.textContent=album.title;const label=document.createElement('small');label.textContent='ILUSTRAČNÍ OBAL';art.append(title,label);
  }else{art.className='missing-art';art.innerHTML=svg('music');const label=document.createElement('span');label.textContent='Obal není dostupný';art.append(label);}
  container.append(art);if(demo)aging(container,album);
 }
 function aging(container,album){
  const finish=A.jacketFinish(album.title||album.id),layer=document.createElement('span');
  layer.className='jacket-aging';layer.setAttribute('aria-hidden','true');
  layer.style.setProperty('--wear-edge',"url('wear-edge-"+finish.edge+".webp')");
  layer.style.setProperty('--wear-turn',finish.turn+'deg');container.append(layer);
 }
 function artwork(container,candidates,album,index){
  return new Promise(resolve=>{
   const urls=[...new Set(candidates.filter(Boolean))];
   if(!urls.length){placeholder(container,album,index);resolve();return;}
   const img=document.createElement('img');img.alt='';img.decoding='async';
   img.onload=()=>{aging(container,album);resolve();};img.onerror=()=>{if(urls.length)img.src=urls.shift();else{img.remove();placeholder(container,album,index);resolve();}};
   container.append(img);img.src=urls.shift();
  });
 }
 function applyPalette(value){
  const style=document.documentElement.style;
  for(const key of ['wall','ink','muted'])style.setProperty('--'+key,value[key]);
  style.setProperty('--focus',value.scheme==='dark'?'#d6bd99':'#806044');style.colorScheme=value.scheme;
 }
 function applyTheme(){
  document.body.dataset.theme=theme;
  if(theme==='light')applyPalette({wall:'#fbf8f2',ink:'#352e27',muted:'#716455',scheme:'light'});
  else if(theme==='dark')applyPalette({wall:'#342b2c',ink:'#f1eadf',muted:'#c9bfb1',scheme:'dark'});
  else adaptPalette();
 }
 function adaptPalette(){
  if(theme!=='artwork')return;
  const images=document.querySelectorAll(nowView?'#now-art img':'#wall img'),samples=[];
  for(const img of images){
   if(!img.complete||!img.naturalWidth)continue;
   try{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=16;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0,16,16);
    const pixels=context.getImageData(0,0,16,16).data,totals=[0,0,0];
    for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)totals[c]+=pixels[i+c];
    samples.push(totals.map(v=>v/256));
   }catch{/* A failed or cross-origin image leaves the neutral artwork palette. */}
  }
  applyPalette(A.palette(samples));
 }
 function message(value,retry=false){text('message-text',value);$('message').hidden=nowView;$('retry').hidden=!retry;}
 function updateSelection(focus=false){
  document.querySelectorAll('.album').forEach(button=>{
   const selected=Number(button.dataset.index)===state.selected;
   button.classList.toggle('is-selected',selected);button.tabIndex=selected?0:-1;
   if(selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
  });
  const album=albums[state.selected];text('caption-title',album?.title);text('caption-artist',album?.artist);
  $('pagination').hidden=albums.length<=state.pageSize;
  text('page-count',albums.length?`${Math.floor(state.selected/state.pageSize)+1} / ${Math.ceil(albums.length/state.pageSize)}`:'');
  $('page-previous').disabled=state.selected<state.pageSize;$('page-next').disabled=Math.floor(state.selected/state.pageSize)>=Math.ceil(albums.length/state.pageSize)-1;
  if(focus)document.querySelector('.album.is-selected')?.focus({preventScroll:true});
 }
 function render(focus=false){
  const start=Math.floor(state.selected/state.pageSize)*state.pageSize;
  const key=start+':'+albums.slice(start,start+state.pageSize).map(a=>a.id).join(',');
  if(key!==renderKey){
   renderKey=key;const epoch=++renderEpoch,loads=[];
   $('row-0').replaceChildren();$('row-1').replaceChildren();
   albums.slice(start,start+state.pageSize).forEach((album,i)=>{
    const index=start+i,slot=document.createElement('div'),button=document.createElement('button');
    slot.className='album-slot wood-'+(i+1);button.type='button';button.className='album';button.dataset.index=String(index);
    button.setAttribute('aria-label',`${album.title} — ${album.artist}. Přehrát album`);
    const sleeve=document.createElement('span');sleeve.className='sleeve';
    const vinyl=document.createElement('span');vinyl.className='vinyl';vinyl.setAttribute('aria-hidden','true');
    const face=document.createElement('span');face.className='cover-face';
    loads.push(artwork(face,[A.artworkURL(album.artwork,location.href)],album,index));sleeve.append(vinyl,face);button.append(sleeve);
    const holder=document.createElement('span');holder.className='holder';holder.setAttribute('aria-hidden','true');slot.append(button,holder);
    button.addEventListener('focus',()=>{state.selected=index;wake();updateSelection();});
    button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&!state.idle){state.selected=index;updateSelection();}});
    button.addEventListener('click',()=>{wake();state.selected=index;updateSelection();play();});
    $('row-'+Math.floor(i/3)).append(slot);
   });
   Promise.all(loads).then(()=>{if(epoch===renderEpoch&&!nowView)adaptPalette();});
  }
  $('message').hidden=nowView||albums.length>0;$('wall').hidden=nowView||!albums.length;updateSelection(focus);
 }
 async function play(){
  if(demo){notify('Náhled vzhledu — přehrávání je vypnuté.');return;}
  if(state.busy||Date.now()-lastPlay<1500)return;
  lastPlay=Date.now();const album=albums[state.selected];
  try{await A.playAlbum(state,album,rpc);notify('Přehrávám: '+album.title);await pollStatus();}catch(error){notify(error.message);}
 }
 async function loadAlbums(focus=false){
  const token=++generation;albums=[];state.count=0;state.selected=0;renderKey='';render();
  if(!state.player)return message('Vyberte přehrávač. Vaše oblíbená alba se objeví na policích.');
  message('Načítám vaše oblíbená alba…');
  try{
   const response=await fetch('albums.json?player='+encodeURIComponent(state.player),{signal:AbortSignal.timeout(15000)}),body=await response.json();
   if(token!==generation)return;
   if(!response.ok||body.error)throw new Error(body.message||'TIDAL Local není dostupný. Zkontrolujte plugin a přihlášení v Lyrionu.');
   if(!Array.isArray(body.albums))throw new Error('Lyrion vrátil neočekávanou odpověď.');
   const seen=new Set();albums=body.albums.filter(a=>a&&/^\d+$/.test(String(a.id))&&!seen.has(String(a.id))&&seen.add(String(a.id))).map(a=>({id:String(a.id),title:String(a.title||'Album bez názvu'),artist:String(a.artist||''),artwork:a.artwork}));
   state.count=albums.length;render(focus);
   if(!albums.length)message('Zatím tu není žádné album. Přidejte oblíbená alba v TIDALu a zkuste to znovu.',true);
   await pollStatus();
  }catch(error){if(token===generation)message(error.name==='TimeoutError'?'Lyrion neodpovídá. Zkuste to znovu.':error.message,true);}
 }
 async function discover(){
  const result=await rpc('',['players',0,999]);players=(result.players_loop||[]).filter(p=>[1,'1',true].includes(p.connected));
  $('player').replaceChildren(new Option('Vyberte přehrávač',''));
  for(const p of players)$('player').append(new Option(p.name||p.playerid,p.playerid));
  const requested=params.get('player')||readPreference('player','');
  if(requested&&players.some(p=>p.playerid===requested)){
   $('player').value=requested;state.player=requested;state.connected=true;await loadAlbums();
  }else if(requested)message('Zvolený přehrávač není připojený. Vyberte jiný.',true);
  else if(!players.length)message('Žádný přehrávač není připojený. Připojte svůj stávající přehrávač k Lyrionu.',true);
  if(!state.player)$('player').focus();updateConnection();
 }
 function updateConnection(){$('connection-dot').classList.toggle('connected',!!state.player&&state.connected);}
 function updateTimeline(){
  const track=(status.playlist_loop||[])[0]||status,duration=Number(track.duration||status.duration)||0;
  const elapsed=Math.min(duration,Math.max(0,(Number(status.time)||0)+(status.mode==='play'?(Date.now()-statusTime)/1000:0)));
  $('timeline').hidden=!duration;$('seek').max=String(duration||1);
  if(!seeking){$('seek').value=String(Math.floor(elapsed));$('seek').style.setProperty('--progress',(duration?100*elapsed/duration:0)+'%');text('time-elapsed',A.formatTime(elapsed));}
  text('time-duration',A.formatTime(duration));
 }
 function renderNow(){
  const track=(status.playlist_loop||[])[0]||status,hasTrack=Number(status.playlist_tracks)>0;
  const title=hasTrack?track.title||status.current_title||'Skladba bez názvu':'Nic nehraje';text('now-title',title);
  $('now-title').classList.toggle('long-title',title.length>18);$('now-title').classList.toggle('very-long-title',title.length>42);
  text('now-artist',hasTrack?track.artist:'');text('now-album',hasTrack?track.album:'');
  const candidates=A.nowArtwork(status,state.player,location.href),key=state.player+':'+candidates.join('|');
  if(key!==nowKey){
   nowKey=key;$('now-art').replaceChildren();artwork($('now-art'),candidates,{title:track.album||track.title||'Nic nehraje'},0).then(()=>{if(nowView&&key===nowKey)adaptPalette();});
  }
  $('transport').innerHTML=svg(status.mode==='play'?'pause':'play');$('transport').setAttribute('aria-label',status.mode==='play'?'Pozastavit':'Pokračovat');
  for(const id of ['previous','transport','next','seek'])$(id).disabled=!state.connected||!hasTrack||demo||state.busy;
  updateTimeline();
 }
 async function pollStatus(){
  if(!state.player||demo)return;
  const player=state.player;
  try{
   const result=await rpc(player,['status','-',1,'tags:alKct']);if(player!==state.player)return;
   status=result;statusTime=Date.now();state.connected=![0,'0',false].includes(result.player_connected);state.playing=result.mode==='play';
   updateConnection();if(nowView)renderNow();
  }catch{if(player===state.player){state.playing=true;state.connected=false;updateConnection();if(nowView)renderNow();}}
 }
 function toggleNow(value){
  wake();nowView=value;document.body.classList.toggle('now-view',value);$('now').hidden=!value;
  $('now-toggle').hidden=value;$('back').hidden=!value;
  if(value){$('wall').hidden=true;$('message').hidden=true;renderNow();pollStatus();$('back').focus();}
  else{render(true);adaptPalette();}
 }
 async function transport(command){
  wake();if(!state.player||!state.connected||demo||state.busy||!Number(status.playlist_tracks))return;
  state.busy=true;renderNow();
  try{await rpc(state.player,command);await pollStatus();}catch(error){notify(error.message);}finally{state.busy=false;renderNow();}
 }
 function publicLink(url){const safe=A.publicURL(url);$('public-link').hidden=!safe;if(safe)$('public-link').href=safe;else $('public-link').removeAttribute('href');}
 async function loadPublicURL(){
  if(demo){$('save-url').disabled=true;text('url-status','V náhledu se nastavení serveru neukládá.');return;}
  $('save-url').disabled=true;text('url-status','Načítám nastavení serveru…');
  try{const result=await rpc('',['albumshelf','publicurl','?']);$('public-url').value=result.publicurl||'';publicLink(result.url);text('url-status','');}
  catch(error){text('url-status',error.message);}finally{$('save-url').disabled=false;}
 }
 function showSettings(value){
  wake();settingsOpen=value;$('settings').hidden=!value;$('settings-toggle').setAttribute('aria-expanded',String(value));
  $('content').inert=value;$('footer').inert=value;
  if(value){$('theme').focus();loadPublicURL();}else $('settings-toggle').focus();
 }
 $('theme').value=theme;$('motion').value=motion;document.body.dataset.motion=motion;applyTheme();
 function applyWear(){document.documentElement.style.setProperty('--wear',wear/100);$('wear').value=wear;$('wear-value').value=wear+' %';}
 applyWear();$('wear').addEventListener('input',()=>{wake();wear=Number($('wear').value);savePreference('wear',wear);applyWear();});
 $('theme').addEventListener('change',()=>{wake();theme=$('theme').value;savePreference('theme',theme);applyTheme();});
 $('motion').addEventListener('change',()=>{wake();motion=$('motion').value;savePreference('motion',motion);document.body.dataset.motion=motion;});
 $('settings-toggle').addEventListener('click',()=>showSettings(!settingsOpen));$('settings-close').addEventListener('click',()=>showSettings(false));
 document.addEventListener('pointerdown',event=>{if(settingsOpen&&!event.target.closest('#settings, #settings-toggle'))showSettings(false);});
 $('settings').addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const controls=[...$('settings').querySelectorAll('button,input,select,a[href]')].filter(el=>!el.disabled&&!el.hidden),first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&event.target===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&event.target===last){event.preventDefault();first.focus();}
 });
 $('public-url-form').addEventListener('submit',async event=>{
  event.preventDefault();if(demo)return;
  const value=A.publicURL($('public-url').value);
  if(value===null){text('url-status','Zadejte HTTP(S) doménu nebo adresu končící /plugins/AlbumShelf/.');$('public-url').focus();return;}
  $('save-url').disabled=true;
  try{const result=await rpc('',['albumshelf','publicurl',value]);if(result.publicurl!==value)throw new Error('Server adresu neuložil.');$('public-url').value=value;publicLink(result.url);text('url-status','Adresa byla uložena.');}
  catch(error){text('url-status',error.message);}finally{$('save-url').disabled=false;}
 });
 $('player').addEventListener('change',()=>{
  wake();state.player=$('player').value;state.connected=players.some(p=>p.playerid===state.player);state.playing=true;status={};nowKey='';savePreference('player',state.player);updateConnection();if(nowView)renderNow();loadAlbums(true);
 });
 $('retry').addEventListener('click',()=>{wake();if(state.player)loadAlbums();else discover().catch(e=>message(e.message,true));});
 $('now-toggle').addEventListener('click',()=>toggleNow(true));$('back').addEventListener('click',()=>toggleNow(false));
 $('previous').addEventListener('click',()=>transport(['playlist','index','-1']));$('next').addEventListener('click',()=>transport(['playlist','index','+1']));
 $('transport').addEventListener('click',()=>transport(['pause',status.mode==='play'?1:0]));
 $('seek').addEventListener('input',()=>{wake();seeking=true;$('seek').style.setProperty('--progress',(100*Number($('seek').value)/Number($('seek').max))+'%');text('time-elapsed',A.formatTime($('seek').value));});
 $('seek').addEventListener('change',async()=>{await transport(['time',Number($('seek').value)]);seeking=false;updateTimeline();});
 $('seek').addEventListener('blur',()=>{seeking=false;});
 for(const [id,offset] of [['page-previous',-1],['page-next',1]])$(id).addEventListener('click',()=>{wake();state.selected=Math.max(0,Math.min(albums.length-1,(Math.floor(state.selected/state.pageSize)+offset)*state.pageSize));render(true);});
 $('fullscreen').addEventListener('click',()=>{wake();const operation=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();operation?.catch(()=>notify('Celou obrazovku zapněte v nabídce prohlížeče.'));});
 const responsive=matchMedia('(max-width:600px)');function columns(){state.columns=responsive.matches?2:3;}columns();responsive.addEventListener('change',columns);
 document.addEventListener('keydown',event=>{
  if(state.idle){event.preventDefault();wake();if(!nowView)render(true);return;}
  wake();if(event.key==='Escape'&&settingsOpen){event.preventDefault();showSettings(false);return;}
  if(settingsOpen||event.target.matches('input,select,textarea'))return;
  if(event.key==='Escape'||event.key==='Backspace'){if(nowView){event.preventDefault();toggleNow(false);}return;}
  if(event.key.startsWith('Arrow')){
   columns(); // A resize's media-change event can arrive after the first key.
   if(event.target.closest('header')){
    event.preventDefault();if(event.key==='ArrowDown'&&!nowView){render(true);return;}
    const controls=[...document.querySelectorAll('header select,header button')].filter(el=>!el.disabled&&!el.hidden),at=controls.indexOf(event.target),offset=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0;
    controls[Math.max(0,Math.min(controls.length-1,at+offset))]?.focus();return;
   }
   if(nowView){
    event.preventDefault();const controls=[$('back'),$('previous'),$('transport'),$('next')].filter(el=>!el.disabled),at=controls.indexOf(event.target),offset=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;
    controls[Math.max(0,Math.min(controls.length-1,at+offset))]?.focus();return;
   }
   if(albums.length){event.preventDefault();if(event.key==='ArrowUp'&&state.selected%state.pageSize<state.columns){$('now-toggle').focus();return;}A.navigate(state,event.key);render(true);}
  }else if(event.key==='Enter'&&event.target.classList.contains('album')){event.preventDefault();if(!event.repeat)play();}
 });
 document.addEventListener('pointermove',wake,{passive:true});document.addEventListener('pointerdown',wake,{passive:true});
 setInterval(()=>{
  const now=Date.now();if(nowView)updateTimeline();
  if(albums.length&&!nowView&&!settingsOpen&&!state.busy&&document.activeElement?.tagName!=='SELECT'&&now-state.lastInteraction>18000){state.idle=true;document.body.classList.add('idle');}
  if(!settingsOpen&&!nowView&&A.canRotate(state,now)&&albums.length>state.pageSize&&now-rotation>=300000){
   const page=Math.floor(state.selected/state.pageSize)*state.pageSize,visible=Math.min(state.pageSize,albums.length-page),slot=page+Math.floor(Math.random()*visible);
   const candidates=albums.map((_,i)=>i).filter(i=>i<page||i>=page+state.pageSize);
   if(slot!==state.selected&&candidates.length){const other=candidates[Math.floor(Math.random()*candidates.length)];[albums[slot],albums[other]]=[albums[other],albums[slot]];renderKey='';render();rotation=now;}
  }
 },1000);
 setInterval(pollStatus,10000);
 if(demo){
  $('demo-badge').hidden=false;$('player').disabled=true;
  albums=['Quiet forms','The long way home','Evening light','Still moving','Blue hours','Soft focus'].map((title,i)=>({id:String(i+1),title,artist:'Ilustrační album'}));
  state.count=albums.length;state.selected=2;status={playlist_tracks:1,playlist_loop:[{title:'Evening light',artist:'Ilustrační skladba',album:'Evening light',duration:240}],time:76};statusTime=Date.now();render();
 }else discover().catch(()=>message('Lyrion není dostupný. Otevřete AlbumShelf ze svého hudebního serveru.',true));
})();
