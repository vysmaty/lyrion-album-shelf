/* AlbumShelf is a remote control, never an audio player. */
(function(){
 'use strict';
 const A=window.AlbumShelf, state=A.createState(), $=id=>document.getElementById(id);
 const params=new URLSearchParams(location.search), demo=params.get('demo')==='1';
 let albums=[],slots=[],players=[],generation=0,nowView=false,lastPlay=0,status={},rotation=0,toastTimer;
 const colours=[['#25494c','#e6d8bb'],['#d1ad70','#473d43'],['#6d3c40','#f0ccb0'],['#b5bab0','#304d50'],['#304254','#d2bdb2'],['#bd6e49','#f3d4a3'],['#d7c6a4','#725d52'],['#504756','#b5af9b']];
 const demoNames=['Quiet\nforms','The long\nway home','Evening\nlight','Still\nmoving','Blue\nhours','Soft\nfocus','Open\nwindows','After\nthe rain'];
 function text(id,value){$(id).textContent=value||'';}
 function notify(message){text('toast',message);$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
 function wake(){state.idle=false;state.lastInteraction=Date.now();document.body.classList.remove('idle');}
 async function rpc(player,command){
  const response=await fetch('/jsonrpc.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:1,method:'slim.request',params:[player,command]}),signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error('Lyrion není dostupný.');
  const body=await response.json();if(body.error)throw new Error('Lyrion odmítl příkaz.');return body.result||{};
 }
 function artwork(container,album,index){
  const url=A.safeArtwork(album.artwork);
  if(url){const img=document.createElement('img');img.alt='';img.src=url;img.referrerPolicy='no-referrer';img.addEventListener('error',()=>{img.remove();placeholder(container,album,index);},{once:true});container.append(img);}
  else placeholder(container,album,index);
 }
 function placeholder(container,album,index){
  const art=document.createElement('div');
  if(demo){art.className='demo-cover variant-'+index%4;art.style.setProperty('--cover-bg',colours[index%8][0]);art.style.setProperty('--cover-ink',colours[index%8][1]);const title=document.createElement('b');title.textContent=album.title;title.style.whiteSpace='pre-line';const label=document.createElement('small');label.textContent='ALBUMSHELF / STUDIE '+String(index+1).padStart(2,'0');art.append(title,label);}
  else{art.className='missing-art';art.textContent='♫';}
  container.append(art);
 }
 function message(value,retry=false){text('message-text',value);$('message').hidden=false;$('retry').hidden=!retry;}
 function caption(){const album=albums[state.selected];text('caption-title',album?album.title:'Vyberte si něco na poslech.');text('caption-artist',album?album.artist:'OBLÍBENÁ ALBA');text('page-count',albums.length?`${Math.floor(state.selected/8)+1} / ${Math.ceil(albums.length/8)}`:'');}
 function render(focus=false){
  $('row-0').replaceChildren();$('row-1').replaceChildren();
  const start=Math.floor(state.selected/8)*8;
  slots=albums.slice(start,start+8);
  slots.forEach((album,i)=>{
   const index=start+i,button=document.createElement('button');button.type='button';button.className='album'+(index===state.selected?' is-selected':'');button.dataset.index=String(index);button.tabIndex=index===state.selected?0:-1;button.setAttribute('aria-label',`${album.title} — ${album.artist}. Přehrát album`);
   artwork(button,album,index);
   button.addEventListener('focus',()=>{state.selected=index;wake();document.querySelectorAll('.album').forEach(el=>{el.classList.toggle('is-selected',el===button);el.tabIndex=el===button?0:-1;});caption();});
   button.addEventListener('click',()=>{wake();state.selected=index;play();});
   $('row-'+Math.floor(i/4)).append(button);
  });
  $('message').hidden=albums.length>0;$('wall').hidden=nowView;caption();
  if(focus)document.querySelector('.album.is-selected')?.focus({preventScroll:true});
 }
 async function play(){
  if(demo){notify('Ukázka vzhledu — přehrávání je vypnuté.');return;}
  if(state.busy||Date.now()-lastPlay<1500)return;
  lastPlay=Date.now();const album=albums[state.selected];
  try{await A.playAlbum(state,album,rpc);notify('Přehrávám: '+album.title);await pollStatus();}catch(error){notify(error.message);}
 }
 async function loadAlbums(focus=false){
  const token=++generation;albums=[];state.count=0;state.selected=0;render();
  if(!state.player)return message('Vyberte přehrávač. Vaše oblíbená alba se objeví na policích.');
  message('Načítám vaše oblíbená alba…');
  try{
   const response=await fetch('albums.json?player='+encodeURIComponent(state.player),{signal:AbortSignal.timeout(15000)});
   const body=await response.json();if(token!==generation)return;
   if(!response.ok||body.error)throw new Error(body.message||'TIDAL Local není dostupný. Zkontrolujte plugin a přihlášení v Lyrionu.');
   if(!Array.isArray(body.albums))throw new Error('Lyrion vrátil neočekávanou odpověď.');
   const seen=new Set();albums=body.albums.filter(a=>a&&/^\d+$/.test(String(a.id))&&!seen.has(String(a.id))&&seen.add(String(a.id))).map(a=>({id:String(a.id),title:String(a.title||'Album bez názvu'),artist:String(a.artist||''),artwork:a.artwork}));
   state.count=albums.length;render(focus);if(!albums.length)message('Zatím tu není žádné album. Přidejte oblíbená alba v TIDALu a zkuste to znovu.',true);
   await pollStatus();
  }catch(error){if(token===generation)message(error.name==='TimeoutError'?'Lyrion neodpovídá. Zkuste to znovu.':error.message,true);}
 }
 async function discover(){
  const result=await rpc('',['players',0,999]);players=(result.players_loop||[]).filter(p=>p.connected===1||p.connected==='1'||p.connected===true);
  $('player').replaceChildren(new Option('Vyberte přehrávač',''));
  for(const p of players)$('player').append(new Option(p.name||p.playerid,p.playerid));
  let saved='';try{saved=localStorage.getItem('albumshelf.player')||'';}catch{}
  const requested=params.get('player')||saved;
  if(requested&&players.some(p=>p.playerid===requested)){$('player').value=requested;state.player=requested;state.connected=true;await loadAlbums();}
  else if(requested)message('Zvolený přehrávač není připojený. Vyberte jiný.');
  else if(!players.length)message('Žádný přehrávač není připojený. Připojte svůj stávající přehrávač k Lyrionu.',true);
  if(!state.player)$('player').focus();
 }
 function renderNow(){
  const track=(status.playlist_loop||[])[0]||status;
  text('now-title',track.title||'Nic nehraje');text('now-artist',track.artist||'');text('now-album',track.album||'');$('now-art').replaceChildren();artwork($('now-art'),{artwork:track.artwork_url},0);
  text('transport',status.mode==='play'?'Pozastavit':'Pokračovat');$('transport').disabled=!state.connected||!status.playlist_tracks||demo;
 }
 async function pollStatus(){
  if(!state.player||demo)return;
  const player=state.player;
  try{const result=await rpc(player,['status','-',1,'tags:alKct']);if(player!==state.player)return;status=result;state.connected=result.player_connected!==0&&result.player_connected!=='0';state.playing=result.mode==='play';if(nowView)renderNow();}
  catch{state.playing=true;state.connected=false;if(nowView){$('transport').disabled=true;notify('Přehrávač není dostupný.');}}
 }
 function toggleNow(value){wake();nowView=value;$('now').hidden=!value;$('wall').hidden=value;$('message').hidden=value||albums.length>0;if(value){renderNow();pollStatus();$('back').focus();}else render(true);}
 $('player').addEventListener('change',()=>{wake();state.player=$('player').value;state.connected=players.some(p=>p.playerid===state.player);state.playing=true;status={};try{localStorage.setItem('albumshelf.player',state.player);}catch{}loadAlbums(true);});
 $('retry').addEventListener('click',()=>{wake();if(state.player)loadAlbums();else discover().catch(e=>message(e.message,true));});
 $('now-toggle').addEventListener('click',()=>toggleNow(!nowView));$('back').addEventListener('click',()=>toggleNow(false));
 $('transport').addEventListener('click',async()=>{wake();if(!state.player||!state.connected||demo||state.busy)return;state.busy=true;$('transport').disabled=true;try{await rpc(state.player,['pause',status.mode==='play'?1:0]);await pollStatus();}catch(e){notify(e.message);}finally{state.busy=false;}});
 $('fullscreen').addEventListener('click',()=>{wake();const operation=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();operation?.catch(()=>notify('Celou obrazovku zapněte v nabídce prohlížeče.'));});
 document.addEventListener('keydown',event=>{
  const arrow=event.key.startsWith('Arrow');
  if(state.idle){event.preventDefault();wake();if(!nowView)render(true);return;}
  if(event.key==='Escape'||event.key==='Backspace'){if(nowView){event.preventDefault();toggleNow(false);}return;}
  wake();
  if(arrow&&!nowView){
   const target=event.target;
   if(target.classList.contains('album')&&event.key==='ArrowUp'&&state.selected%8<4){event.preventDefault();$('now-toggle').focus();return;}
   if(target.closest('header')&&target.tagName!=='SELECT'){
    event.preventDefault();if(event.key==='ArrowDown'){render(true);return;}
    const controls=[$('player'),$('now-toggle'),$('fullscreen')].filter(el=>!el.disabled);
    const at=controls.indexOf(target);controls[Math.max(0,Math.min(controls.length-1,at+(event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0)))]?.focus();return;
   }
  }
  if(arrow&&nowView){event.preventDefault();(document.activeElement===$('back')?$('transport'):$('back')).focus();return;}
  if(arrow&&albums.length&&!nowView&&event.target.tagName!=='SELECT'){
   event.preventDefault();A.navigate(state,event.key);render(true);
  }else if(event.key==='Enter'&&event.target.classList.contains('album')){event.preventDefault();if(!event.repeat)play();}
 });
 document.addEventListener('pointermove',wake,{passive:true});document.addEventListener('pointerdown',wake,{passive:true});
 setInterval(()=>{
  const now=Date.now();if(albums.length&&!nowView&&!state.busy&&document.activeElement?.tagName!=='SELECT'&&now-state.lastInteraction>18000){state.idle=true;document.body.classList.add('idle');}
  if(A.canRotate(state,now)&&albums.length>8&&now-rotation>=300000){
   // Rotate one non-selected cover by swapping with an off-screen album; never play.
   const page=Math.floor(state.selected/8)*8,visible=Math.min(8,albums.length-page),slot=page+(Math.floor(Math.random()*visible));
   const candidates=albums.map((_,i)=>i).filter(i=>i<page||i>=page+8);
   if(slot!==state.selected&&candidates.length){const other=candidates[Math.floor(Math.random()*candidates.length)];[albums[slot],albums[other]]=[albums[other],albums[slot]];render();rotation=now;}
  }
 },1000);
 setInterval(pollStatus,10000);
 if(demo){$('demo-badge').hidden=false;$('player').disabled=true;$('now-toggle').disabled=true;albums=demoNames.map((title,i)=>({id:String(i+1),title,artist:'Studie obalu · AlbumShelf'}));state.count=albums.length;state.selected=2;render();}
 else discover().catch(()=>message('Lyrion není dostupný. Otevřete AlbumShelf ze svého hudebního serveru.',true));
})();
