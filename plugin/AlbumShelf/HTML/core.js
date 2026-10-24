(function(root){
 'use strict';
 function safeArtwork(value){
  if(typeof value!=='string'||!value.trim()||/[\u0000-\u0020\\]/.test(value)) return '';
  if(value.startsWith('/')&&!value.startsWith('//')) return value;
  try { const url=new URL(value); return ['http:','https:'].includes(url.protocol)?value:''; } catch { return ''; }
 }
 function createState(){ return {selected:0,count:0,idle:false,player:'',playing:false,busy:false,lastInteraction:Date.now()}; }
 function navigate(state,key){
  if(state.idle){state.idle=false;return state.selected;}
  const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-4,ArrowDown:4}[key]||0;
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
 const api={safeArtwork,createState,navigate,playAlbum,canRotate};
 if(typeof module!=='undefined'&&module.exports) module.exports=api;
 else root.AlbumShelf=api;
})(typeof globalThis!=='undefined'?globalThis:this);
