const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'../plugin/AlbumShelf/HTML');
const commands=[];
const albums=Array.from({length:12},(_,i)=>({id:String(i+1),title:i===0?'<img src=x onerror=alert(1)>':'Album '+(i+1),artist:'Test artist',artwork:'javascript:alert(1)'}));
let mode='ok',statusMode='stop';
const server=http.createServer(async(req,res)=>{
 if(req.url==='/jsonrpc.js'){
  let body='';for await(const chunk of req)body+=chunk;
  const p=JSON.parse(body).params;commands.push(p);
  if(p[1][0]==='pause')statusMode=p[1][1]===1?'pause':'play';
  const result=p[1][0]==='players'?{players_loop:[{playerid:'aa:bb',name:'Obývací pokoj',connected:1}]}:{mode:statusMode,playlist_tracks:1,playlist_loop:[{title:'Current track',artist:'Current artist',album:'Current album'}]};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({result}));return;
 }
 if(req.url.startsWith('/plugins/AlbumShelf/albums.json')){
  res.setHeader('Content-Type','application/json');if(mode==='error'){res.statusCode=503;res.end(JSON.stringify({error:'tidal_unavailable',message:'TIDAL Local není dostupný.'}));return;}
  res.end(JSON.stringify({albums:mode==='empty'?[]:mode==='artwork'?albums.map((a,i)=>({...a,artwork:i===0?'/cover.svg':a.artwork})):albums}));return;
 }
 if(req.url==='/cover.svg'){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#60483a"/></svg>');return;}
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
 assert.equal(await page.locator('.album').count(),8);
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
  await page.locator('#transport').click();await page.waitForFunction(()=>document.getElementById('transport').textContent==='Pozastavit');
  assert.deepEqual(commands.filter(c=>c[1][0]==='pause').at(-1),['aa:bb',['pause',0]]);
  await page.locator('#transport').click();await page.waitForFunction(()=>document.getElementById('transport').textContent==='Pokračovat');
  assert.deepEqual(commands.filter(c=>c[1][0]==='pause').at(-1),['aa:bb',['pause',1]]);
  await page.locator('#back').click();assert.equal(await page.locator('#wall').isVisible(),true);
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
