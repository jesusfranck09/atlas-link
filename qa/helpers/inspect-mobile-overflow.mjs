import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9430');
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const output=[];
try {
  for(const route of ['/', '/hospital', '/hospital/accounts', '/hospital/reports']) {
    if(route==='/hospital') {
      await page.goto('http://127.0.0.1:4430/login', {waitUntil:'networkidle'});
      await page.getByRole('button').filter({has:page.getByText('admin@demo.atlaslink.mx',{exact:true})}).click();
      await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
      await expect(page.locator('[data-system-cover]')).toBeVisible();
    }
    await page.goto('http://127.0.0.1:4430'+route,{waitUntil:'networkidle'});
    output.push({route,...await page.evaluate(()=>({
      client:document.documentElement.clientWidth,inner:innerWidth,scroll:document.documentElement.scrollWidth,
      elements:[...document.querySelectorAll('body *')].map(e=>({e,r:e.getBoundingClientRect(),s:getComputedStyle(e)})).filter(({r,s})=>r.right>391&&r.width>0&&s.display!=='none').slice(0,60).map(({e,r,s})=>({tag:e.tagName,class:String(e.className),right:r.right,width:r.width,overflow:s.overflowX,minWidth:s.minWidth,position:s.position,parent:e.parentElement?.className,parentOverflow:e.parentElement?getComputedStyle(e.parentElement).overflowX:null}))
    }))});
  }
  await writeFile('../evidence/redesign/overflow-probe.json',JSON.stringify(output,null,2));
  console.log(JSON.stringify(output,null,2));
} finally { await context.close(); process.exit(0); }
