const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'../plugin/AlbumShelf/HTML');
const commands=[];
const albums=Array.from({length:12},(_,i)=>({id:String(i+1),title:i===0?'<img src=x onerror=alert(1)>':'Album '+(i+1),artist:'Test artist',artwork:'javascript:alert(1)'}));
let mode='ok',statusMode='stop',publicUrl='',elapsed=35;
const server=http.createServer(async(req,res)=>{
 // Exercise the same plugin behind a reverse proxy mounted at /lms/.
 req.url=req.url.replace(/^\/lms\//,'/');
 if(req.url==='/jsonrpc.js'){
  let body='';for await(const chunk of req)body+=chunk;
  const p=JSON.parse(body).params;commands.push(p);
  if(p[1][0]==='pause')statusMode=p[1][1]===1?'pause':'play';
  if(p[1][0]==='time')elapsed=Number(p[1][1]);
  if(p[1][0]==='albumshelf'&&p[1][2]!=='?')publicUrl=p[1][2];
  const result=p[1][0]==='players'?{players_loop:[{playerid:'aa:bb',name:'Obývací pokoj',connected:1}]}:p[1][0]==='albumshelf'?{publicurl:publicUrl,url:publicUrl||'http://localhost:9000/plugins/AlbumShelf/'}:{mode:statusMode,player_connected:1,playlist_tracks:1,time:elapsed,playlist_loop:[{title:'Current track',artist:'Current artist',album:'Current album',coverid:'6949d98b',duration:240}]};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({result}));return;
 }
 if(req.url.startsWith('/plugins/AlbumShelf/albums.json')){
  res.setHeader('Content-Type','application/json');if(mode==='error'){res.statusCode=503;res.end(JSON.stringify({error:'tidal_unavailable',message:'TIDAL Local není dostupný.'}));return;}
  res.end(JSON.stringify({albums:mode==='empty'?[]:mode==='artwork'?albums.map((a,i)=>({...a,artwork:i===0?'/cover.svg':a.artwork})):albums}));return;
 }
 if(req.url==='/cover.svg'||req.url.startsWith('/music/')||req.url.startsWith('/imageproxy/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#60483a"/></svg>');return;}
 try{const filename=path.join(root,new URL(req.url,'http://localhost').pathname.replace('/plugins/AlbumShelf/','')||'index.html');res.setHeader('Content-Type',filename.endsWith('.js')?'application/javascript':filename.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(filename));}catch{res.statusCode=404;res.end('Not found');}
});
test('real browser: explicit player, safe grid, D-pad and single native album launch',async(t)=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=`http://127.0.0.1:${server.address().port}/plugins/AlbumShelf/`;
 await page.goto(base);await page.locator('#player option[value="aa:bb"]').waitFor({state:'attached'});
 assert.equal(await page.locator('.album').count(),0);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'player');
 assert.equal(commands.filter(c=>c[1][0]==='tidal_browse').length,0);
 await page.selectOption('#player','aa:bb');await page.locator('.album').first().waitFor();
 assert.equal(await page.locator('.album').count(),6);
 assert.ok(await page.locator('.tools').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))>=16,'TV controls must be readable at a distance');
 assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('album')),true);
 assert.equal(await page.locator('.album img').count(),0);
 await page.locator('.album').first().focus();await page.keyboard.press('ArrowUp');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'now-toggle');
 await page.keyboard.press('ArrowDown');
 assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('album')),true);
 await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('.album.is-selected').getAttribute('data-index'),'1');
 await page.keyboard.press('Enter');await page.keyboard.press('Enter');
 await page.waitForTimeout(100);
 assert.deepEqual(commands.filter(c=>c[1][0]==='tidal_browse'),[['aa:bb',['tidal_browse','playlist','load','type:album','id:2']]]);
 assert.equal(await page.locator('audio').count(),0);assert.deepEqual(errors,[]);
 await t.test('empty favourites and unavailable TIDAL have truthful retry states',async()=>{
  mode='empty';await page.goto(base+'?player=aa%3Abb');await page.locator('#retry:not([hidden])').waitFor();
  assert.match(await page.locator('#message-text').textContent(),/žádné album/);assert.equal(await page.locator('.album').count(),0);
  mode='error';await page.locator('#retry').click();await page.waitForFunction(()=>document.getElementById('message-text').textContent.includes('TIDAL Local'));
  assert.equal(await page.locator('.album').count(),0);mode='ok';
 });
 await t.test('remembered explicit target restores without playback',async()=>{
  const before=commands.filter(c=>c[1][0]==='tidal_browse').length;
  await page.goto(base);await page.locator('.album').first().waitFor();
  assert.equal(await page.locator('#player').inputValue(),'aa:bb');
  assert.equal(commands.filter(c=>c[1][0]==='tidal_browse').length,before);
  assert.equal(await page.locator('.album').first().getAttribute('aria-label'),'<img src=x onerror=alert(1)> — Test artist. Přehrát album');
 });
 await t.test('safe artwork loads real image pixels in the browser',async()=>{
  mode='artwork';await page.goto(base+'?player=aa%3Abb');
  await page.waitForFunction(()=>document.querySelector('.album img')?.naturalWidth===300);
  mode='ok';
 });
 await t.test('now-playing view never sends a transport command on open',async()=>{
  const before=commands.filter(c=>c[1][0]==='pause').length;
  await page.locator('#now-toggle').click();assert.equal(await page.locator('#now').isVisible(),true);
  assert.equal(commands.filter(c=>c[1][0]==='pause').length,before);
  assert.equal(await page.locator('#now-title').textContent(),'Current track');
  await page.waitForFunction(()=>document.querySelector('#now-art img')?.naturalWidth===300);
  assert.match(await page.locator('#now-art img').getAttribute('src'),/music\/6949d98b\/cover_800x800_o.jpg/);
  await page.locator('#transport').click();await page.waitForFunction(()=>document.getElementById('transport').getAttribute('aria-label')==='Pozastavit');
  assert.deepEqual(commands.filter(c=>c[1][0]==='pause').at(-1),['aa:bb',['pause',0]]);
  await page.locator('#transport').click();await page.waitForFunction(()=>document.getElementById('transport').getAttribute('aria-label')==='Pokračovat');
  assert.deepEqual(commands.filter(c=>c[1][0]==='pause').at(-1),['aa:bb',['pause',1]]);
  await page.locator('#back').click();assert.equal(await page.locator('#wall').isVisible(),true);
 });
 await t.test('wear overlays preserve artwork, persist and switch off without playback',async()=>{
  mode='artwork';await page.goto(base+'?player=aa%3Abb');
  await page.waitForFunction(()=>document.querySelector('.album img')?.naturalWidth===300&&document.querySelector('.jacket-aging'));
  assert.equal(await page.locator('.missing-art .jacket-aging').count(),0);
  const original=await page.locator('.album img').first().getAttribute('src');
  await page.locator('#settings-toggle').click();
  const writes=()=>commands.filter(c=>['pause','time','tidal_browse'].includes(c[1][0])).length,before=writes();
  await page.locator('#wear').focus();await page.keyboard.press('Home');
  assert.equal(await page.locator('#wear').inputValue(),'0');
  assert.equal(await page.locator('.jacket-aging').first().evaluate(el=>getComputedStyle(el).opacity),'0');
  await page.keyboard.press('End');assert.equal(await page.locator('#wear-value').textContent(),'100 %');
  assert.equal(writes(),before);assert.equal(await page.locator('.album img').first().getAttribute('src'),original);
  await page.goto(base);await page.locator('.album img').first().waitFor();
  assert.equal(await page.locator('#wear').inputValue(),'100');
  await page.locator('#settings-toggle').click();await page.locator('#wear').fill('55');await page.locator('#wear').dispatchEvent('input');await page.locator('#settings-close').click();mode='ok';
 });
 await t.test('material hierarchy and authored timeline preserve accessible keyboard seeking',async()=>{
  await page.locator('#now-toggle').click();
  const sizes=await page.evaluate(()=>({title:parseFloat(getComputedStyle(document.getElementById('now-title')).fontSize),transport:document.getElementById('transport').getBoundingClientRect().width,cover:document.querySelector('.now-art-slot').getBoundingClientRect().width,holder:document.querySelector('.now-art-slot .holder').getBoundingClientRect().width}));
  assert.equal(sizes.title,116);assert.equal(sizes.transport,124);
  assert.ok(Math.abs(sizes.holder/sizes.cover-.465)<.005);
  assert.equal(await page.locator('#seek').getAttribute('aria-label'),'Pozice ve skladbě');
  const before=commands.filter(c=>c[1][0]==='time').length;
  await page.locator('#seek').focus();await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>document.getElementById('time-elapsed').textContent==='0:36');
  assert.equal(commands.filter(c=>c[1][0]==='time').length,before+1);
  assert.deepEqual(commands.filter(c=>c[1][0]==='time').at(-1),['aa:bb',['time',36]]);
  assert.ok(parseFloat(await page.locator('#seek').evaluate(el=>el.style.getPropertyValue('--progress')))>=15);
  await page.locator('#back').click();
 });
 await t.test('settings persist motion/theme, preserve native fields and save public URL',async()=>{
  await page.locator('#settings-toggle').click();
  await page.selectOption('#motion','vinyl');await page.selectOption('#theme','artwork');
  await page.locator('#public-url').fill('https://hudba.example.cz');
  await page.locator('#public-url').press('ArrowLeft');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'public-url');
  await page.locator('#save-url').click();await page.waitForFunction(()=>document.getElementById('url-status').textContent.includes('uložena'));
  assert.equal(publicUrl,'https://hudba.example.cz/plugins/AlbumShelf/');
  assert.equal(await page.locator('#public-link').getAttribute('href'),publicUrl);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#settings').isVisible(),false);
  await page.goto(base);await page.locator('.album').first().waitFor();
  assert.equal(await page.locator('body').getAttribute('data-motion'),'vinyl');
  assert.equal(await page.locator('body').getAttribute('data-theme'),'artwork');
  for(const selection of ['tilt','vinyl']){
   await page.evaluate(value=>{document.body.dataset.motion=value;},selection);
   assert.equal(await page.locator('.album.is-selected').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
   assert.equal(await page.locator('.album.is-selected').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
  }
  const disc=await page.locator('.vinyl').first().evaluate(el=>({w:el.offsetWidth,h:el.offsetHeight,r:getComputedStyle(el).borderRadius,transform:getComputedStyle(el).transform}));
  assert.equal(disc.w,disc.h);assert.equal(disc.r,'50%');assert.equal(disc.transform,'none','reduced motion suppresses reveal');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.album').nth(1).focus();await page.waitForTimeout(300);
  assert.notEqual(await page.locator('.album.is-selected .vinyl').evaluate(el=>getComputedStyle(el).transform),'none');
  const stable=await page.locator('.album').first().evaluate(el=>{window.retainedCover=el;return true;});assert.ok(stable);
  await page.locator('.album').nth(2).focus();assert.equal(await page.evaluate(()=>window.retainedCover===document.querySelector('.album')),true,'selection must not rebuild covers');
  await page.emulateMedia({reducedMotion:'reduce'});
 });
 await t.test('six-album pagination, mobile navigation and proxy prefix work',async()=>{
  await page.locator('#page-next').click();assert.equal(await page.locator('.album.is-selected').getAttribute('data-index'),'6');
  assert.equal(await page.locator('#page-count').textContent(),'2 / 2');
  await page.setViewportSize({width:390,height:844});await page.locator('.album').first().focus();await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('.album.is-selected').getAttribute('data-index'),'8');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.setViewportSize({width:1920,height:1080});
  await page.goto(base.replace('/plugins/','/lms/plugins/')+'?player=aa%3Abb');await page.locator('.album').first().waitFor();
  await page.locator('#now-toggle').click();await page.waitForFunction(()=>document.querySelector('#now-art img')?.naturalWidth===300);
  assert.match(await page.locator('#now-art img').getAttribute('src'),/^\/lms\/music\//);
  await page.locator('#back').click();
 });
 await page.clock.install();
 await t.test('five-minute idle rotation changes one cover and is suppressed during playback',async()=>{
  statusMode='stop';await page.goto(base+'?player=aa%3Abb');await page.locator('.album').first().waitFor();
  await page.evaluate(()=>{Math.random=()=>0.8;});
  const before=await page.locator('.album').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')));
  await page.clock.runFor(301000);
  const after=await page.locator('.album').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')));
  assert.equal(before.filter((name,i)=>name!==after[i]).length,1);
  statusMode='play';await page.goto(base+'?player=aa%3Abb');await page.locator('.album').first().waitFor();
  const playingBefore=await page.locator('.album').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')));
  await page.clock.runFor(310000);
  assert.deepEqual(await page.locator('.album').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label'))),playingBefore);
 });
 await page.goto(base+'?demo=1');await page.locator('.album').first().waitFor();
 await fs.mkdir(path.resolve(__dirname,'../artifacts'),{recursive:true});
 await page.screenshot({path:path.resolve(__dirname,'../artifacts/frontend-1920x1080.png')});
 await t.test('idle hides chrome and first D-pad press wakes without changing the album',async()=>{
  await page.locator('.album').nth(2).focus();
  await page.clock.runFor(20000);
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('idle')),true);
  assert.equal(await page.locator('header').evaluate(el=>getComputedStyle(el).visibility),'hidden');
  await page.screenshot({path:path.resolve(__dirname,'../artifacts/frontend-idle-1920x1080.png')});
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.album.is-selected').getAttribute('data-index'),'2');
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('idle')),false);
  const before=commands.length;await page.keyboard.press('Enter');assert.equal(commands.length,before);
 });
});
