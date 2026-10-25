const {chromium}=require('playwright');
const {createPreview}=require('./preview.cjs');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
 const server=await createPreview();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1672,height:941},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const folder=path.resolve(__dirname,'../.impeccable/review/holder-v4');await fs.mkdir(folder,{recursive:true});
  await page.goto(`http://127.0.0.1:${server.address().port}/plugins/AlbumShelf/?player=preview`);
  await page.waitForFunction(()=>[...document.querySelectorAll('.cover-face img')].length===6&&[...document.querySelectorAll('.cover-face img')].every(i=>i.naturalWidth>0));
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
  async function capture(name){await page.screenshot({path:path.join(folder,name+'.png'),fullPage:true});}
  await capture('hero');
  await capture('hero-repro');
  const heroRepeat=(await fs.readFile(path.join(folder,'hero.png'))).equals(await fs.readFile(path.join(folder,'hero-repro.png')));
  if(!heroRepeat)throw new Error('Settled gallery capture is not reproducible');
  await page.setViewportSize({width:1440,height:900});await capture('desktop');
  await page.setViewportSize({width:390,height:844});await capture('mobile');
  await page.setViewportSize({width:1672,height:941});await page.locator('#settings-toggle').click();await page.selectOption('#motion','vinyl');await capture('settings');
  await page.locator('#settings-close').click();await page.locator('.album').nth(2).focus();await page.waitForTimeout(300);await capture('vinyl');
  await page.locator('#now-toggle').click();await page.waitForFunction(()=>document.querySelector('#now-art img')?.naturalWidth>0);await page.locator('#now-art img').evaluate(img=>img.decode());await page.waitForTimeout(350);await capture('now-light');
  await page.locator('#settings-toggle').click();await page.locator('#wear').fill('0');await page.locator('#wear').dispatchEvent('input');await page.locator('#settings-close').click();await capture('now-clean');
  await page.locator('#settings-toggle').click();await page.locator('#wear').fill('55');await page.locator('#wear').dispatchEvent('input');await page.locator('#settings-close').click();
  await page.locator('#settings-toggle').click();await page.selectOption('#theme','artwork');await page.locator('#settings-close').click();await page.waitForTimeout(450);await capture('now-artwork');
  const artBounds=await page.locator('.now-art-slot').boundingBox(),holderBounds=await page.locator('.now-art-slot .holder').boundingBox();
  await page.screenshot({path:path.join(folder,'material-now.png'),clip:{x:artBounds.x-25,y:artBounds.y-15,width:artBounds.width+70,height:artBounds.height+85}});
  await page.screenshot({path:path.join(folder,'now-holder.png'),clip:{x:holderBounds.x-25,y:holderBounds.y-25,width:holderBounds.width+60,height:holderBounds.height+65}});
  await page.screenshot({path:path.join(folder,'now-edge.png'),clip:{x:artBounds.x-20,y:artBounds.y-20,width:155,height:155}});
  await page.screenshot({path:path.join(folder,'wall-detail.png'),clip:{x:10,y:130,width:140,height:300}});
  const dimensions=await page.evaluate(()=>Object.fromEntries(['now-title','now-artist','now-album','transport','seek'].map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect();return [id,{x:r.x,y:r.y,width:r.width,height:r.height,fontSize:getComputedStyle(el).fontSize}];})));
  await fs.writeFile(path.join(folder,'dimensions.json'),JSON.stringify(dimensions,null,2));
  await page.setViewportSize({width:390,height:844});await capture('now-mobile');
  await page.setViewportSize({width:921,height:884});await capture('now-panel');
  await fs.writeFile(path.join(folder,'browser-evidence.json'),JSON.stringify({errors,heroRepeatIdentical:heroRepeat,source:'Local offline fixture using earlier read-only favourite-album snapshot; no LMS connection or playback',viewportWidths:[1672,1440,921,390]},null,2));
  if(errors.length)throw new Error(errors.join('\n'));
  process.stdout.write('Captured hero, desktop, mobile, settings, vinyl, now-light, now-artwork, now-mobile.\n');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{process.stderr.write(error.stack+'\n');process.exitCode=1;});
