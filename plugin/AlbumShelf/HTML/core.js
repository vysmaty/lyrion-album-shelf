(function(root){
 'use strict';
 function safeArtwork(value){
  if(typeof value!=='string'||!value.trim()||/[\u0000-\u0020\\]/.test(value)) return '';
  if(value.startsWith('/')&&!value.startsWith('//')) return value;
  try { const url=new URL(value); return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?value:''; } catch { return ''; }
 }
 function serverPath(path,page){
  const url=new URL(page),at=url.pathname.lastIndexOf('/plugins/AlbumShelf');
  const prefix=at<0?'/':url.pathname.slice(0,at)+'/';
  return path.startsWith(prefix)?path:prefix+path.replace(/^\/+/, '');
 }
 function artworkURL(value,page){
  const safe=safeArtwork(value);if(!safe)return '';
  if(safe.startsWith('/'))return serverPath(safe,page);
  const url=new URL(safe),current=new URL(page);
  if(url.origin===current.origin||/^\/(?:music|imageproxy)\//.test(url.pathname))return serverPath(url.pathname+url.search,page);
  const encoded=encodeURIComponent(safe).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
  return serverPath('imageproxy/'+encoded+'/image_800x800_o.jpg',page);
 }
 function nowArtwork(status,player,page){
  const track=(status.playlist_loop||[])[0]||status;
  if(!player||!Number(status.playlist_tracks))return [];
  const candidates=[];
  if(track.artwork_url)candidates.push(artworkURL(track.artwork_url,page));
  for(const id of [track.coverid,track.artwork_track_id,track.id]){
   if(id!==undefined&&/^[A-Za-z0-9_-]{1,128}$/.test(String(id)))candidates.push(serverPath('music/'+encodeURIComponent(id)+'/cover_800x800_o.jpg',page));
  }
  const key=track.coverid||track.id||track.title||status.current_title||'current';
  candidates.push(serverPath('music/current/cover_800x800_o.jpg',page)+'?player='+encodeURIComponent(player)+'&track='+encodeURIComponent(key));
  return [...new Set(candidates.filter(Boolean))];
 }
 function publicURL(value){
  if(typeof value!=='string'||/[\u0000-\u001f\u007f\\]/.test(value))return null;
  const input=value.trim();if(!input)return '';
  if(!/^https?:\/\//i.test(input)||/\s/.test(input))return null;
  try{
   const url=new URL(input);if(url.username||url.password||url.search||url.hash)return null;
   let path=url.pathname.replace(/\/$/,'');
   if(!path)path='/plugins/AlbumShelf';
   if(!path.endsWith('/plugins/AlbumShelf'))return null;
   return url.origin+path+'/';
  }catch{return null;}
 }
 function palette(samples){
  const valid=samples.filter(rgb=>Array.isArray(rgb)&&rgb.length>=3&&rgb.slice(0,3).every(Number.isFinite));
  let wall='#342b2e';
  if(valid.length){
   const average=[0,1,2].map(i=>valid.reduce((sum,rgb)=>sum+Math.max(0,Math.min(255,rgb[i])),0)/valid.length);
   const neutral=average.reduce((sum,v)=>sum+v,0)/3;
   // Preserve artwork chroma on a warm plaster ground; monochrome art stays warm.
   const channels=[52,43,46].map((base,i)=>Math.round(base+Math.max(-8,Math.min(8,(average[i]-neutral)*.2))));
   wall='#'+channels.map(value=>value.toString(16).padStart(2,'0')).join('');
  }
  return {wall,ink:'#f1eadf',muted:'#c9bfb1',scheme:'dark'};
 }
 function jacketFinish(value){
  const key=String(value||'album').trim().toLowerCase().replace(/\s*\[e\]\s*$/,'');
  let hash=2166136261;for(const character of key)hash=Math.imul(hash^character.codePointAt(0),16777619)>>>0;
  return {edge:1+(hash%2),turn:90*((hash>>>4)%4)};
 }
 function formatTime(value){const seconds=Math.max(0,Math.floor(Number(value)||0));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
 function createState(){ return {selected:0,count:0,columns:3,pageSize:6,idle:false,player:'',playing:false,busy:false,lastInteraction:Date.now()}; }
 function navigate(state,key){
  if(state.idle){state.idle=false;return state.selected;}
  const columns=state.columns||3;
  const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[key]||0;
  state.selected=Math.max(0,Math.min(Math.max(0,state.count-1),state.selected+offset));
  return state.selected;
 }
 async function playAlbum(state,album,rpc){
  if(!state.player||!state.connected) throw new Error('Vyberte připojený přehrávač.');
  if(state.busy) return;
  if(!album||!/^\d+$/.test(String(album.id))) throw new Error('Neplatné ID alba.');
  state.busy=true;
  try { await rpc(state.player,['tidal_browse','playlist','load','type:album','id:'+album.id]);state.playing=true; }
  finally {state.busy=false;}
 }
 function canRotate(state,now){return state.idle&&!state.playing&&!state.busy&&now-state.lastInteraction>=300000;}
 const api={safeArtwork,serverPath,artworkURL,nowArtwork,publicURL,palette,jacketFinish,formatTime,createState,navigate,playAlbum,canRotate};
 if(typeof module!=='undefined'&&module.exports) module.exports=api;
 else root.AlbumShelf=api;
})(typeof globalThis!=='undefined'?globalThis:this);
