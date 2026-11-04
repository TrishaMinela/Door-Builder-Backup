import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium, type Page } from 'playwright-core'
import { doorStyles, hardwareOptions } from '../src/data/options'

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5196','--strictPort'],{stdio:'pipe'})
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
async function check(page: Page, label: string) {
  await page.waitForTimeout(120)
  const groups=await page.locator('[data-equal-product-grid]').evaluateAll(grids=>grids.map(grid=>{
    const cards=[...grid.children].filter(el=>el.matches('.option-card,.glass-choice-card,.hardware-option-card'))
    return cards.map(card=>{
      const r=card.getBoundingClientRect(), visual=card.querySelector('.option-visual'),v=visual?.getBoundingClientRect()
      const copy=card.querySelector('.option-copy')!
      const controls=card.querySelector('.hardware-finish-options,.glass-caming-options')?.getBoundingClientRect()
      const css=getComputedStyle(card)
      const intrinsicHeight=(v?.height ?? 0)+copy.getBoundingClientRect().height+(controls?.height ?? 0)+parseFloat(css.paddingTop)+parseFloat(css.paddingBottom)+parseFloat(css.borderTopWidth)+parseFloat(css.borderBottomWidth)
      const text=[...copy.children].map(el=>({text:el.textContent,height:el.getBoundingClientRect().height,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,scroll:(el as HTMLElement).scrollHeight,client:el.clientHeight,display:getComputedStyle(el).display}))
      return {height:r.height,intrinsicHeight,minHeight:css.minHeight,sharedHeight:css.getPropertyValue('--product-card-height'),top:r.top,bottom:r.bottom,imageHeight:v?.height,imageOffset:v ? v.top-r.top : null,copyTop:copy.getBoundingClientRect().top,imageBottom:v?.bottom,controlsBottom:controls ? r.bottom-controls.bottom : null,text,images:[...card.querySelectorAll('.option-visual img')].map(image=>getComputedStyle(image).objectFit)}
    })
  }))
  for(const cards of groups) {
    assert.ok(Math.max(...cards.map(c=>c.height))-Math.min(...cards.map(c=>c.height))<1,`${label}: same height throughout grid ${JSON.stringify(cards)}`)
    assert.ok(Math.max(...cards.map(c=>c.height))<=Math.ceil(Math.max(...cards.map(c=>c.intrinsicHeight)))+1,`${label}: no space beyond tallest natural content`)
    const images=cards.filter(c=>c.imageHeight!==undefined)
    const controls=cards.filter(c=>c.controlsBottom!==null)
    if(controls.length)assert.ok(Math.max(...controls.map(c=>c.controlsBottom!))-Math.min(...controls.map(c=>c.controlsBottom!))<1,`${label}: controls aligned at card bottoms`)
    if(images.length) {
      assert.ok(Math.max(...images.map(c=>c.imageHeight!))-Math.min(...images.map(c=>c.imageHeight!))<1,`${label}: image regions`)
      assert.ok(Math.max(...images.map(c=>c.imageOffset!))-Math.min(...images.map(c=>c.imageOffset!))<=2,`${label}: image offsets ${JSON.stringify(images)}`)
    }
    for(const card of cards) {
      if(card.imageBottom!==undefined)assert.ok(Math.abs(card.copyTop-card.imageBottom)<=2,`${label}: text immediately below thumbnail`)
      assert.ok(card.images.every(fit=>fit==='contain'),`${label}: preserve aspect ratio`)
      assert.ok(card.text.every(text=>text.display!=='none' && text.scroll<=text.client+1),`${label}: complete unclipped text ${JSON.stringify(card.text)}`)
      const visualTextOrder=[...card.text].sort((a,b)=>a.top-b.top)
      for (let i=1;i<visualTextOrder.length;i++) assert.ok(Math.abs(visualTextOrder[i].top-visualTextOrder[i-1].bottom-4)<1,`${label}: consistent compact text spacing ${JSON.stringify(card.text)}`)
      for(const sibling of cards.filter(c=>Math.abs(c.top-card.top)<1)) assert.ok(Math.abs(sibling.bottom-card.bottom)<1)
    }
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label}: no horizontal overflow`)
  const selected = page.locator('[data-equal-product-grid] > :is(.option-card,.glass-choice-card,.hardware-option-card).selected').first()
  if (await selected.count()) {
    const selection = await selected.evaluate(card => {
      const cardRect = card.getBoundingClientRect()
      const style = getComputedStyle(card)
      const lower = card.querySelector('.hardware-finish-options,.glass-caming-options')
      const lowerRect = lower?.getBoundingClientRect()
      const main = card.querySelector('.hardware-card-main,.glass-card-main')
      return {
        borderWidth: style.borderWidth,
        borderColor: style.borderColor,
        boxShadow: style.boxShadow,
        overflow: style.overflow,
        lowerInsideCard: !lowerRect || (lowerRect.left >= cardRect.left && lowerRect.right <= cardRect.right && lowerRect.bottom <= cardRect.bottom + 1),
        mainShadow: main ? getComputedStyle(main).boxShadow : 'none',
      }
    })
    assert.equal(selection.borderWidth, '1px', `${label}: selection border does not change card dimensions`)
    assert.notEqual(selection.borderColor, 'rgb(207, 216, 218)', `${label}: full card has its selected accent`)
    assert.notEqual(selection.boxShadow, 'none', `${label}: full card has selected elevation`)
    assert.equal(selection.overflow, 'hidden', `${label}: one coherent outer radius`)
    assert.equal(selection.lowerInsideCard, true, `${label}: lower finish controls stay inside selected surface`)
    assert.equal(selection.mainShadow, 'none', `${label}: main/upper section has no detached shadow`)
  }
}
try {
  await new Promise<void>((resolve,reject)=>{server.stdout.on('data',chunk=>{if(String(chunk).includes('127.0.0.1:5196'))resolve()});server.once('error',reject);setTimeout(()=>reject(new Error('Vite timeout')),10000).unref()})
  browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
  const widths=process.argv.includes('--representative-widths')?[320,390,820,1440]:[320,375,390,430,768,820,1024,1280,1440]
  for(const width of widths) {
    const page=await browser.newPage({viewport:{width,height:1000}})
    const draft={version:1,configuration:{selectedDoorConfigurationType:'french',doubleDoorLockPrep:'DDLLBO',styleId:doorStyles.find(s=>s.code==='F')!.id,doorLineId:'20-gauge-smooth-steel',sidelites:'both-sides',sideliteStyleId:'ssl',selectedFinishType:'paint',selectedPaint:'paint-black',jambType:'timber',jambFinishType:'paint',jambFinishColor:'paint-black',selectedGlassCategory:'clear',glassId:'f-clear-grids',selectedGlassGroupKey:'clear-glass-with-grids',glassVariantConfirmed:true,gridPathId:'internal',gridStyle:'Flat',gridPattern:'4 Lite',gridColor:'White',gridWidth:'5/8"',hardwareId:hardwareOptions[0].id,doorSwingId:'LHI'}}
    await page.addInitScript(value=>{localStorage.setItem('hgi-door-builder-draft',JSON.stringify(value));(window as unknown as {__name:(fn:unknown)=>unknown}).__name=fn=>fn},draft)
    await page.goto('http://127.0.0.1:5196/')
    await page.getByRole('button',{name: 'Start Building Your Door', exact: true}).click()
    const next=page.getByRole('button',{name:'Next configuration step'})
    await next.waitFor()
    const visited=[]
    for(let step=0;step<32 && await next.count();step++) {
      const heading=await page.locator('.step-heading h1').innerText();visited.push(heading)
      if(await page.getByRole('button',{name:'Start Configuring',exact:true}).isVisible())await page.getByRole('button',{name:'Start Configuring',exact:true}).click()
      await page.locator('[data-equal-product-grid]').first().waitFor()
      if(step===0) {
        // Hidden jamb/frame selectors reuse OptionCard. Exercise their layout
        // without enabling customer-facing feature flags or altering app state.
        await page.locator('.builder-options-scroll').evaluate(host=>{
          const sample=host.querySelector('.option-card')!
          const grid=document.createElement('div');grid.className='options-grid';grid.id='frame-layout-fixture'
          for(const name of ['Timber','Clad frame with a longer finish label']) {
            const card=sample.cloneNode(true) as HTMLElement;card.className='option-card'
            card.querySelector('strong')!.textContent=name
            card.querySelector('small')!.textContent='Jamb / frame'
            card.querySelector('.option-copy>span')!.textContent=name==='Timber'?'Matching frame finish.':'Available frame finishes and material details remain visible even when this description wraps.'
            grid.append(card)
          }
          host.append(grid)
        })
        await check(page,`${width}px frame selector fixture`)
        await page.locator('#frame-layout-fixture').evaluate(el=>el.remove())
      }
      await check(page,`${width}px ${heading}`)
      if (/Door Style|Sidelite Slab|Door Line/.test(heading)) await page.screenshot({path:`/private/tmp/hgi-card-spacing-${width}-${heading.replace(/[^a-z0-9]+/gi,'-')}.png`})
      // Long text must grow the entire grid, not one card or a clipped label.
      const title=page.locator('[data-equal-product-grid] .option-copy strong').first()
      if(await title.count()) {
        const original=await title.innerText()
        await title.evaluate(el=>{el.textContent+=' - Extended product description with a significantly longer title'})
        await check(page,`${width}px ${heading} long title`)
        await title.evaluate((el,value)=>{el.textContent=value},original)
      }
      const description=page.locator('[data-equal-product-grid] .option-copy>span').first()
      if(await description.count()) {
        const originalDescription=await description.innerText()
        await description.evaluate(el=>{el.textContent+=' Extra descriptive text to verify wrapping without hiding product details.'})
        await check(page,`${width}px ${heading} wrapped description`)
        await description.evaluate((el,value)=>{el.textContent=value},originalDescription)
      }
      if(/Hardware/.test(heading))await page.screenshot({path:`/private/tmp/hgi-selected-hardware-${width}.png`})
      if(await next.isDisabled())await page.locator('.builder-options-scroll button').first().click()
      if(await next.isDisabled())throw new Error(`${heading} requires an explicit test selection`)
      await next.click();await page.waitForTimeout(100)
    }
    assert.ok(visited.some(v=>/Hardware/.test(v)), `Hardware reached: ${visited.join(' → ')}`)
    console.log(`${width}px: ${visited.join(' → ')}`)
    await page.close()
  }
}finally{await browser?.close();server.kill('SIGTERM')}
