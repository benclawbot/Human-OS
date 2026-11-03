"""Offline browser UI exercise using Playwright and a mocked API.
The real API is tested separately in api.test.mjs.
"""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).resolve().parents[1]
css=(root/'public/styles.css').read_text()
asset=base64.b64encode((root/'public/assets/mountain-dawn.jpg').read_bytes()).decode()
css=css.replace("url('/assets/mountain-dawn.jpg')",f"url('data:image/jpeg;base64,{asset}')")
js=(root/'public/app.js').read_text()
html=(root/'public/index.html').read_text().replace('<link rel="stylesheet" href="/styles.css">',f'<style>{css}</style>').replace('<script type="module" src="/app.js"></script>',f'<script>{js}</script>')
mock="""
window.__test={logged:false,revision:0,state:null, aiCalls:[]};
window.fetch=async function(url,opts={}) {
  const t=window.__test, p=String(url),m=opts.method||'GET';
  const result=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
  if(p==='/api/login') {t.logged=true;return result(200,{ok:true})}
  if(p==='/api/logout') {t.logged=false;return result(200,{ok:true})}
  if(!t.logged)return result(401,{error:'Sign in required'});
  if(p==='/api/state'&&m==='GET') {
    if(!t.state)return result(200,{state:{onboard:0,goal:'',baseline:'',bottleneck:'',experiment:{title:'Protected learning block',hypothesis:'Protected practice may improve consistency.',intervention:'Complete one distraction-free 30-minute learning session, four days a week.',metric:'Learning sessions per week',decisionRule:'Keep if consistent and sustainable',startedAt:new Date().toISOString(),durationDays:14,status:'active'},logs:[],messages:[],reviews:[],suggestions:[],focus:'',focusDate:'',settings:{dailyReminder:false}},revision:'0',aiConfigured:true});
    return result(200,{state:t.state,revision:String(t.revision),aiConfigured:true});
  }
  if(p==='/api/state'&&m==='PUT') {const b=JSON.parse(opts.body); if(b.revision!==String(t.revision))return result(409,{error:'Conflict'}); t.state=b.state;t.revision++;return result(200,{revision:String(t.revision)})}
  if(p==='/api/coach'){const b=JSON.parse(opts.body);t.aiCalls.push(b);if(b.mode==='recommend')return result(200,{suggestion:{title:'Mindful focus block',hypothesis:'Clear boundaries could improve focus.',intervention:'Use one 25-minute focus block each morning.',metric:'Completed blocks per week',decisionRule:'Keep if at least 4 of 5 days feel sustainable.',baselinePlan:'Compare with last week.'}});return result(200,{reply:b.mode==='review'?'Observed several check-ins. Try protecting recovery time; evidence is preliminary.':'One small change: schedule your next session before lunch.'})}
  return result(404,{error:'Missing endpoint'});
}
"""
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':393,'height':852},device_scale_factor=1,accept_downloads=True)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script(mock)
 page.set_content(f'<script>{mock}</script>'+html,wait_until='load')
 assert page.get_by_text('Welcome back.').count()==1
 page.locator('#password').fill('some password that is long')
 page.get_by_role('button',name='Unlock Human OS').click()
 expect(page.get_by_text('What are you growing toward?')).to_be_visible()
 for step,text in enumerate(['Learn complex subjects faster','One learning session per week','Too many interruptions','Protect 30 minutes of learning each morning']):
   page.locator('#onboardAnswer').fill(text)
   page.locator('form[data-form="onboard"] button[type="submit"]').click()
   page.wait_for_timeout(80)
 expect(page.get_by_text('Good morning.').or_(page.get_by_text('Good afternoon.')).or_(page.get_by_text('Good evening.'))).to_be_visible()
 assert page.get_by_text('Learn complex subjects faster').count()==1
 page.wait_for_timeout(3700)
 page.screenshot(path=str(root/'screenshot-today.png'),full_page=True)
 page.get_by_role('button',name='Reflect on today').click()
 page.locator('[data-action="progress:Yes"]').click()
 page.locator('[data-action="energy:4"]').click()
 page.locator('#reflection').fill('The distraction-free practice worked.')
 page.locator('#metric').fill('4/5 recall questions')
 page.get_by_role('button',name='Save reflection').click()
 expect(page.get_by_text('REFLECTION COMPLETE')).to_be_visible()
 page.locator('[data-action="tab:journey"]').click()
 expect(page.get_by_text('1 check-ins recorded')).to_be_visible()
 assert page.get_by_text('The distraction-free practice worked.').count()==1
 page.screenshot(path=str(root/'screenshot-journey.png'),full_page=True)
 page.get_by_role('button',name='Review this week').click()
 page.get_by_role('button',name='Analyze with AI').click()
 expect(page.get_by_text('Observed several check-ins.')).to_be_visible()
 page.get_by_role('button',name='Save weekly review').click()
 expect(page.get_by_text('Weekly insights')).to_be_visible()
 page.locator('[data-action="tab:today"]').click()
 page.locator('[data-action="experiment"]').click()
 expect(page.get_by_text('Your experiment')).to_be_visible()
 page.get_by_role('button',name='Edit experiment').click()
 page.locator('#title').fill('New focus test')
 page.get_by_role('button',name='Save and restart experiment').click()
 expect(page.get_by_text('New focus test')).to_be_visible()
 page.get_by_role('button',name='Ask AI for a better experiment').click()
 expect(page.get_by_text('Mindful focus block')).to_be_visible()
 page.screenshot(path=str(root/'screenshot-coach.png'),full_page=True)
 page.get_by_role('button',name='Use this experiment').click()
 expect(page.get_by_text('Mindful focus block')).to_be_visible()
 page.locator('[data-action="tab:coach"]').click()
 page.locator('#message').fill('What can I improve?')
 page.get_by_role('button',name='Send message').click()
 expect(page.get_by_text('One small change: schedule your next session before lunch.')).to_be_visible()
 page.wait_for_function('!ui.busy')
 page.locator('[data-action="settings"]').click()

 expect(page.get_by_text('Private by design')).to_be_visible()
 with page.expect_download() as dl:page.get_by_role('button',name='Export my data').click()
 assert dl.value.suggested_filename.startswith('human-os-')
 page.get_by_role('button',name='Sign out').click()
 expect(page.get_by_text('Welcome back.')).to_be_visible()
 page.locator('#password').fill('some password that is long')
 page.get_by_role('button',name='Unlock Human OS').click()
 expect(page.get_by_text('Learn complex subjects faster')).to_be_visible()
 assert not errors,errors
 print('BROWSER FLOWS PASSED: sign in, 4-step onboarding, home, reflection, journey, weekly AI review, edit experiment, AI suggestion, apply, AI chat, export, logout, login persistence')
 browser.close()
