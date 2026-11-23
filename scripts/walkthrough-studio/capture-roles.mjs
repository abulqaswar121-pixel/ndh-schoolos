// Actual role-scoped components, recording-only in-memory accounts. No production demo route.
import { chromium as playwright } from '@playwright/test';
import chromium from '@sparticuz/chromium';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
const role=process.env.ROLE;
if(!['exam_officer','class_teacher','subject_teacher','bursar','secretary','parent'].includes(role))throw new Error('Set ROLE to one of the six remaining roles');
const pack=JSON.parse(await readFile(`docs/walkthroughs/v6-roles/${role}/source.json`,'utf8'));
const base=process.env.STUDIO_URL || 'http://localhost:8081';
const origin=new URL(base).origin;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
for(const variant of (process.argv.slice(2).length?process.argv.slice(2):['phone','desktop'])){
  const phone=variant==='phone';if(!phone&&variant!=='desktop')throw new Error('Unknown view');
  const browser=await playwright.launch({executablePath:await chromium.executablePath(),args:chromium.args,headless:true});
  const out=path.resolve('.cache/walkthrough-recordings/roles',role,variant);await mkdir(out,{recursive:true});
  try{
    const context=await browser.newContext({viewport:phone?{width:390,height:650}:{width:1280,height:640},deviceScaleFactor:phone?2:1,reducedMotion:'reduce'});
    const errors=[],blocked=[];
    await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin||['data:','blob:'].includes(u.protocol))return r.continue();blocked.push(u.origin);return r.abort()});
    await context.addInitScript(()=>{
      document.addEventListener('DOMContentLoaded',()=>{
        const pointer=document.createElement('div');pointer.id='recording-pointer';pointer.style.left='-50px';pointer.style.top='-50px';document.body.append(pointer);
        document.addEventListener('mousemove',e=>{pointer.style.left=`${e.clientX}px`;pointer.style.top=`${e.clientY}px`});
        document.addEventListener('mousedown',()=>pointer.classList.add('click'));document.addEventListener('mouseup',()=>setTimeout(()=>pointer.classList.remove('click'),350));
        window.print=()=>{throw new Error('Native print disabled: only the genuine app preview is recorded')};
      });
    });
    const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
    const point=async l=>{await l.scrollIntoViewIfNeeded();await wait(180);const b=await l.boundingBox();if(!b)throw new Error('Target invisible');await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10});await wait(220)};
    const click=async l=>{await point(l);await l.click();await wait(400)};
    const show=async l=>{await l.evaluate(e=>e.scrollIntoView({block:'center',behavior:'smooth'}));await wait(600);await point(l)};
    const close=async()=>{
      if(await page.locator('#ndh-print-portal').count())await click(page.locator('#ndh-print-portal').getByRole('button',{name:'Close',exact:true}));
      if(await page.getByRole('dialog').count())await click(page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).last());
    };
    const nav=async name=>{await close();await page.evaluate(()=>window.scrollTo({top:0}));if(phone)await click(page.getByRole('button',{name:'Open navigation menu'}));await click(page.getByRole('button',{name:new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\s+\\d+)?$')}));await page.evaluate(()=>window.scrollTo({top:0,behavior:'smooth'}));await wait(650)};
    const login=async(stream='')=>{
      if(stream || await page.locator('.schoolos-workspace').count()) await page.goto(`${base}/s/demo-academy?recordingRole=${role}${stream?'&stream='+stream:''}`);await wait(650);
      if(role==='parent')await click(page.getByRole('tab',{name:'Parent Portal',exact:true}));
      const field=page.locator(role==='parent'?'#login-parent-phone':'#login-staff-id');await click(field);await field.pressSequentially('00000000000',{delay:65});
      const pin=page.locator(role==='parent'?'#parent-password':'#login-staff-pin');await click(pin);await pin.pressSequentially('0000',{delay:120});
      await click(page.getByRole('button',{name:role==='parent'?'Open Parent Portal':'Sign In',exact:true}));await page.locator('.schoolos-workspace').waitFor();await wait(900);
    };
    const printProof=async()=>{await page.locator('#ndh-print-portal').waitFor();await wait(1500)};
    const report=async()=>{await nav('Results & Report Cards');await click(page.getByRole('tab',{name:/Broadsheet & Report Cards/}));await show(page.getByRole('button',{name:'Print Card',exact:true}).first());await click(page.getByRole('button',{name:'Print Card',exact:true}).first());await printProof()};
    const actions={
      signin:async()=>{await login();await writeFile(path.join(out,'role-scope-proof.txt'),await page.locator('main').innerText());
        const text=await page.locator('main').innerText();if(role==='parent'&&text.includes('Demo Learner C'))throw new Error('Parent scope leaked another family');},
      'exam-list':async()=>{await nav('Exam Questions');await show(page.getByLabel('Filter paper status'));await page.getByLabel('Filter paper status').selectOption('submitted');await wait(900);await show(page.getByRole('button',{name:'PDF / Print',exact:true}).first())},
      'exam-review':async()=>{await nav('Exam Questions');await page.getByLabel('Filter paper status').selectOption('submitted');await click(page.getByRole('button',{name:'PDF / Print',exact:true}).first());await printProof();await close();await click(page.getByRole('button',{name:'Approve',exact:true}).first());await page.getByLabel('Filter paper status').selectOption('approved');await show(page.getByRole('button',{name:'Word (.doc)',exact:true}).first());},
      reports:report,
      attendance:async()=>{await nav('Attendance');await click(page.getByRole('button',{name:'Mark All Present',exact:true}));await click(page.getByRole('tab',{name:'Term Summary',exact:true}));await show(page.getByRole('table').first());},
      scores:async()=>{await nav('Results & Report Cards');await show(page.getByRole('tab',{name:'Subject Marksheet',exact:true}));const field=page.getByLabel('Demo Learner A CA 1',{exact:true});await point(field);await field.fill('18');await field.press('Tab');await wait(900);},
      combined:async()=>{await nav('Results & Report Cards');const scope=page.getByLabel('Choose marksheet recording scope');await point(scope);await scope.selectOption('group:demo-combined');await wait(900);await click(page.getByRole('button',{name:'Print Marksheet',exact:true}));await printProof();},
      'exam-draft':async()=>{await nav('Exam Questions');await point(page.getByLabel('Filter paper status'));await page.getByLabel('Filter paper status').selectOption('draft');await click(page.getByRole('button',{name:'Edit',exact:true}).first());await show(page.getByLabel('Objective question 1'));},
      quran:async()=>{await login('tahfeez');await nav("Results & Qur'an");await click(page.getByRole('tab',{name:"Qur'an Progress (Optional)",exact:true}));await show(page.getByRole('heading',{name:"Optional 114-Surah Qur'an Tracker"}));await show(page.getByText('Ayah From',{exact:true}));},
      fees:async()=>{await nav('Fees & Receipts');await show(page.getByLabel('Filter fee status'));await page.getByLabel('Filter fee status').selectOption('debtors');await show(page.getByRole('table').first());},
      receipts:async()=>{await nav('Fees & Receipts');await click(page.getByRole('tab',{name:/Receipts History/}));await click(page.getByRole('button',{name:'Receipt',exact:true}).first());await printProof();},
      payroll:async()=>{await nav('Staff & Payroll');await show(page.getByLabel('Select payroll month'));await page.getByLabel('Select payroll month').selectOption('2026-10');await click(page.getByRole('button',{name:'Payslip',exact:true}).first());await printProof();},
      staff:async()=>{await nav('Staff & Payroll');await click(page.getByRole('tab',{name:/Staff & Role Assignments/}));const filter=page.getByLabel('Filter by staff type');await point(filter);await filter.selectOption('non_teaching');await show(page.getByRole('row').filter({hasText:'Demo Support Staff'}));},
      students:async()=>{await nav('Students');const search=page.getByPlaceholder('Search student name, admission ID or parent phone...');await click(search);await search.pressSequentially('Demo Learner A',{delay:65});const row=page.getByRole('row').filter({hasText:'Demo Learner A'});await click(row.getByRole('button').first());await wait(900);},
      'attendance-print':async()=>{await nav('Attendance');await click(page.getByRole('tab',{name:'Term Summary',exact:true}));await wait(700);await click(page.getByRole('tab',{name:'Daily Register',exact:true}));await click(page.getByRole('button',{name:'Print Sheet',exact:true}));await printProof();},
      'student-report':async()=>{await nav('Students');await click(page.getByTitle('Print Report Card').first());await printProof();},
      siblings:async()=>{await click(page.getByRole('button',{name:/Demo Learner B/}));await show(page.getByLabel('Select term'));await click(page.getByRole('button',{name:/Demo Learner A/}));await show(page.getByRole('heading',{name:/Welcome,/}));},
      'parent-report':async()=>{await click(page.getByRole('button',{name:'Print Report Card',exact:true}));await printProof();},
      'parent-fees':async()=>{await close();await show(page.getByRole('button',{name:'Print Receipt',exact:true}).first());await click(page.getByRole('button',{name:'Print Receipt',exact:true}).first());await printProof();},
      install:async()=>{await close();await page.evaluate(()=>window.scrollTo({top:0,behavior:'smooth'}));await click(page.getByRole('button',{name:'Install school app',exact:true}));await wait(1700);},
      offline:async()=>{await close();if(['exam_officer','bursar','secretary'].includes(role)){await nav('Backups & Offline');await show(page.getByRole('heading',{name:'Offline Mode, Backups & Data Exports'}));await wait(1100)}else{await page.evaluate(()=>window.scrollTo({top:0}));await click(page.getByRole('button',{name:'Install school app',exact:true}));await show(page.getByText(/Use your own device\. Sign in online first/));}},
    };
    await page.goto(`${base}/s/demo-academy?recordingRole=${role}`);
    await page.locator("#login-staff-id").waitFor();
    for(const scene of pack.scenes){
      if(process.env.ONLY_ACTION&&scene.action!==process.env.ONLY_ACTION){if(scene.action==='signin')await login();continue;}
      const dir=path.join(out,scene.id);if(!process.env.DRY_RUN){await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true})}
      let done=false,frames=0,captureError;const start=Date.now();
      const loop=process.env.DRY_RUN?Promise.resolve():(async()=>{while(!done){const tick=Date.now();await page.screenshot({path:path.join(dir,`${String(frames++).padStart(6,'0')}.jpg`),type:'jpeg',quality:84,timeout:30000});await wait(Math.max(0,125-(Date.now()-tick)))}})().catch(error=>{captureError=error;done=true});
      try{await actions[scene.action]();if(!process.env.DRY_RUN)await wait(1300)}catch(error){await page.screenshot({path:path.join(out,'failure.jpg')});await writeFile(path.join(out,'failure.txt'),await page.locator('body').innerText());throw error}finally{done=true;await loop;}
      if(captureError)throw captureError;
      const meta={id:scene.id,action:scene.action,frames,elapsedSec:(Date.now()-start)/1000,viewport:page.viewportSize(),role};
      if(!process.env.DRY_RUN)await writeFile(path.join(dir,'capture.json'),JSON.stringify(meta,null,2)+'\n');
      console.log(role,variant,scene.id,scene.action,meta.elapsedSec,'sec',frames,'frames');
    }
    await writeFile(path.join(out,'qa.json'),JSON.stringify({role,variant,errors,blockedExternalOrigins:[...new Set(blocked)],localDemo:true,liveBackend:false,scopeUsesRealAccessControl:true},null,2)+'\n');
    if(errors.length)throw new Error(errors.join('\n'));
  }finally{await browser.close()}
}
