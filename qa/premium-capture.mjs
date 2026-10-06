import {chromium, expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9430');
const out='../evidence/compact-v5';await mkdir(out,{recursive:true});
for(const [label,width,height] of [['desktop',1440,1100],['mobile',390,844]]){
 const ctx=await browser.newContext({baseURL:process.env.QA_BASE_URL || 'http://127.0.0.1:4430',viewport:{width,height},isMobile:label==='mobile',hasTouch:label==='mobile'});const page=await ctx.newPage();
 page.on('pageerror',e=>console.log('ERROR',e.message));
 await page.goto('/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1500);
 await page.screenshot({path:`${out}/${label}-landing.png`,fullPage:true});await page.screenshot({path:`${out}/${label}-hero.png`});
 for(const [route,role] of [['/login','admin'],['/admin/login','atlas']]){
  await page.goto(route,{waitUntil:'networkidle'});await page.screenshot({path:`${out}/${label}-${role}-login.png`,fullPage:true});
  await page.getByRole('button').filter({has:page.getByText(`${role}@demo.atlaslink.mx`,{exact:true})}).click();await page.locator('button[type=submit]').click();await expect(page.locator('[data-system-cover]')).toBeVisible();await page.waitForTimeout(2000);
  await page.screenshot({path:`${out}/${label}-${role}-dashboard.png`,fullPage:true});
 }
 await ctx.close();
}
await browser.close();
