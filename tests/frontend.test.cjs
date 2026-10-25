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
 const state=shelf.createState(); state.count=12;state.columns=4;
 assert.equal(shelf.navigate(state,'ArrowRight'),1);
 assert.equal(shelf.navigate(state,'ArrowDown'),5);
 state.idle=true; assert.equal(shelf.navigate(state,'ArrowLeft'),5); assert.equal(state.idle,false);
 assert.equal(shelf.navigate(state,'ArrowDown'),9);
 assert.equal(shelf.navigate(state,'ArrowRight'),10);
 assert.equal(shelf.navigate(state,'ArrowRight'),11);
 assert.equal(shelf.navigate(state,'ArrowRight'),11);
});
test('now playing resolves native cover IDs and proxies remote artwork on HTTPS',()=>{
 const page='https://music.example/lms/plugins/AlbumShelf/';
 assert.equal(shelf.artworkURL('http://resources.tidal.com/a.jpg',page),'/lms/imageproxy/http%3A%2F%2Fresources.tidal.com%2Fa.jpg/image_800x800_o.jpg');
 assert.equal(shelf.artworkURL('http://192.168.1.2:9000/music/abc/cover.jpg',page),'/lms/music/abc/cover.jpg');
 assert.equal(shelf.artworkURL('/music/abc/cover.jpg',page),'/lms/music/abc/cover.jpg');
 assert.equal(shelf.serverPath('jsonrpc.js',page),'/lms/jsonrpc.js');
 const art=shelf.nowArtwork({playlist_tracks:1,playlist_loop:[{coverid:'6949d98b',title:'Song'}]},'aa:bb',page);
 assert.equal(art[0],'/lms/music/6949d98b/cover_800x800_o.jpg');
 assert.match(art.at(-1),/^\/lms\/music\/current\/cover_800x800_o.jpg\?player=aa%3Abb&/);
 assert.deepEqual(shelf.nowArtwork({},'',page),[]);
});
test('public URL accepts a proxy origin or full plugin path and rejects unsafe components',()=>{
 assert.equal(shelf.publicURL('https://music.example'),'https://music.example/plugins/AlbumShelf/');
 assert.equal(shelf.publicURL('https://music.example/lms/plugins/AlbumShelf'),'https://music.example/lms/plugins/AlbumShelf/');
 assert.equal(shelf.publicURL(''),'');
 for(const url of ['javascript:alert(1)','https://user:secret@music.example','https://music.example/?token=x','https://music.example/#x','https://music.example/other','//music.example'])assert.equal(shelf.publicURL(url),null);
});
test('shelf navigation supports three desktop and two mobile columns',()=>{
 const state=shelf.createState();state.count=12;
 assert.equal(state.columns,3);assert.equal(state.pageSize,6);
 assert.equal(shelf.navigate(state,'ArrowDown'),3);
 state.columns=2;assert.equal(shelf.navigate(state,'ArrowDown'),5);
 assert.equal(shelf.navigate(state,'ArrowRight'),6);
});
test('jacket finishes stay stable across wall and now playing and vary between albums',()=>{
 assert.deepEqual(shelf.jacketFinish('  Prelude to Ecstasy [E]'),shelf.jacketFinish('prelude to ecstasy'));
 const variants=new Set();
 for(let i=0;i<30;i++){const finish=shelf.jacketFinish('Album '+i);assert.ok([1,2].includes(finish.edge));assert.ok([0,90,180,270].includes(finish.turn));variants.add(JSON.stringify(finish));}
 assert.ok(variants.size>=6);
});

test('adaptive walls remain muted and readable even with extreme artwork colors',()=>{
 for(const color of [[0,0,0],[255,255,255],[255,0,0],[0,255,0],[0,0,255]]){
  const palette=shelf.palette([color]);
  const rgb=palette.wall.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16));
  assert.ok(Math.max(...rgb)-Math.min(...rgb)<=32);
  assert.ok(Math.max(...rgb)<=63);
  assert.equal(palette.ink,'#f1eadf');
  const luminance=values=>values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  assert.ok((luminance([241,234,223])+.05)/(luminance(rgb)+.05)>=7,'artwork ground retains readable contrast');
 }
 assert.equal(shelf.formatTime(125),'2:05');
 assert.equal(shelf.palette([[110,110,110]]).wall,'#342b2e','monochrome artwork retains warm plaster');
});
