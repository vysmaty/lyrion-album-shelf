/* Local, offline fixture preview. It has no connection to an LMS server. */
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'../plugin/AlbumShelf/HTML');
const reference=path.resolve(__dirname,'../artifacts/reference');
async function createPreview(){
 const snapshot=JSON.parse(await fs.readFile(path.join(reference,'favourites.json'),'utf8'));
 let publicurl='',playing=true,position=102;
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost'),pathname=url.pathname;
   if(pathname==='/jsonrpc.js'){
    let body='';for await(const chunk of req)body+=chunk;
    const command=JSON.parse(body).params[1];
    if(command[0]==='pause')playing=command[1]!==1;
    if(command[0]==='time')position=Number(command[1]);
    if(command[0]==='albumshelf'&&command[2]!=='?')publicurl=command[2];
    const result=command[0]==='players'?{players_loop:[{playerid:'preview',name:'Náhled kolekce',connected:1}]}:command[0]==='albumshelf'?{publicurl,url:publicurl||'http://localhost:8765/plugins/AlbumShelf/'}:{player_connected:1,mode:playing?'play':'pause',time:position,playlist_tracks:1,playlist_loop:[{id:'preview-track',coverid:'preview-cover',title:'Burn Alive',artist:'The Last Dinner Party',album:'Prelude to Ecstasy',duration:201}]};
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({result}));return;
   }
   if(pathname==='/plugins/AlbumShelf/albums.json'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(snapshot));return;}
   if(pathname.startsWith('/imageproxy/')||pathname.startsWith('/music/')){
    if(pathname.startsWith('/music/')){res.setHeader('Content-Type','image/jpeg');res.end(await fs.readFile(path.join(reference,'covers/last-dinner-party.jpg')));return;}
    const source=pathname.startsWith('/imageproxy/')?decodeURIComponent(pathname.slice(12).split('/image_')[0]):snapshot.albums[2].artwork;
    const index=snapshot.albums.findIndex(a=>a.artwork===source);
    if(index<0)throw new Error('Unknown fixture artwork');
    res.setHeader('Content-Type','image/jpeg');res.end(await fs.readFile(path.join(reference,'covers',`album-${index+1}.jpg`)));return;
   }
   const name=pathname==='/plugins/AlbumShelf/'?'index.html':pathname.replace(/^\/plugins\/AlbumShelf\//,'');
   if(!/^[A-Za-z0-9_-]+\.(html|js|css|webp|ttf|txt)$/.test(name)){res.writeHead(404);res.end();return;}
   const types={html:'text/html; charset=utf-8',js:'application/javascript',css:'text/css',webp:'image/webp',ttf:'font/ttf',txt:'text/plain'};
   let content=await fs.readFile(path.join(root,name));
   if(name==='index.html')content=content.toString().replace('<div id="demo-badge" hidden>NÁHLED · BEZ PŘEHRÁVÁNÍ','<div id="demo-badge">MÍSTNÍ NÁHLED · BEZ PŘEHRÁVÁNÍ');
   res.setHeader('Content-Type',types[name.split('.').at(-1)]);res.end(content);
  }catch{res.writeHead(404);res.end('Preview fixture unavailable');}
 });
 return server;
}
module.exports={createPreview};
if(require.main===module)createPreview().then(server=>server.listen(Number(process.env.PORT)||8765,'127.0.0.1',()=>process.stdout.write('Offline preview: http://127.0.0.1:'+server.address().port+'/plugins/AlbumShelf/?player=preview\n'))).catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
