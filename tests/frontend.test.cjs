const {test}=require('node:test');
const assert=require('node:assert/strict');
const shelf=require('../plugin/AlbumShelf/HTML/core.js');
test('play requires explicit connected target, rejects repeats, and uses verified Tidal action',async()=>{
 const state=shelf.createState(); const calls=[]; const rpc=async(...args)=>{calls.push(args);};
 await assert.rejects(shelf.playAlbum(state,{id:'123'},rpc),/přehrávač/);
 state.player='aa';state.connected=true;
 const first=shelf.playAlbum(state,{id:'123'},rpc);
 await shelf.playAlbum(state,{id:'123'},rpc); await first;
 assert.deepEqual(calls,[['aa',['tidal_browse','playlist','load','type:album','id:123']]]);
 assert.equal(state.busy,false);
});
test('rotation requires idle, no playback, and five minutes without interaction',()=>{
 const s=shelf.createState();s.lastInteraction=0;
 assert.equal(shelf.canRotate(s,400000),false);s.idle=true;
 assert.equal(shelf.canRotate(s,1000),false);assert.equal(shelf.canRotate(s,400000),true);
 s.playing=true;assert.equal(shelf.canRotate(s,400000),false);
 s.playing=false;s.busy=true;assert.equal(shelf.canRotate(s,400000),false);
});
test('artwork accepts web and local URLs but rejects executable schemes',()=>{
 assert.equal(shelf.safeArtwork('https://img.example/a.jpg'),'https://img.example/a.jpg');
 assert.equal(shelf.safeArtwork('/music/a/cover.jpg'),'/music/a/cover.jpg');
 for(const value of ['javascript:alert(1)','data:image/svg+xml,x','file:///etc/passwd','//other.example/x',null]) assert.equal(shelf.safeArtwork(value),'');
});
test('remote grid navigation clamps, wraps pages and wakes without moving',()=>{
 const state=shelf.createState(); state.count=12;
 assert.equal(shelf.navigate(state,'ArrowRight'),1);
 assert.equal(shelf.navigate(state,'ArrowDown'),5);
 state.idle=true; assert.equal(shelf.navigate(state,'ArrowLeft'),5); assert.equal(state.idle,false);
 assert.equal(shelf.navigate(state,'ArrowDown'),9);
 assert.equal(shelf.navigate(state,'ArrowRight'),10);
 assert.equal(shelf.navigate(state,'ArrowRight'),11);
 assert.equal(shelf.navigate(state,'ArrowRight'),11);
});
