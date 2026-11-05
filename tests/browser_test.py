import json, os, time, tempfile, subprocess, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
PORT=43219
p=subprocess.Popen(['node',str(ROOT/'scripts/serve.mjs'),str(PORT)],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
try:
    for _ in range(30):
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{PORT}/',timeout=1);break
        except Exception: time.sleep(.15)
    else: raise RuntimeError('Server unavailable')
    with sync_playwright() as pwr:
        browser=pwr.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,accept_downloads=True)
        page=context.new_page();errors=[];requests=[]
        page.on('request', lambda req: requests.append(req.url))
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{PORT}/',wait_until='networkidle')
        page.get_by_role('heading',name='What are you growing toward?').wait_for()
        for val in ['Learn to focus deeply','Two sessions weekly','Context switching','Protect a 30-minute block']:
            page.locator('#answer').fill(val)
            page.locator('button[type=submit]').click()
        page.get_by_text('Learn to focus deeply').wait_for()
        assert page.get_by_role('button',name='Reflect on today').is_visible()
        # Today screen visual capture
        page.screenshot(path=str(ROOT/'screenshot-today-v4.png'))
        page.get_by_role('button',name='Reflect on today').click()
        page.get_by_role('button',name='Yes',exact=True).click()
        page.locator('#energy').fill('4')
        page.locator('#note').fill('Less switching today')
        page.locator('#metric').fill('30 min focused study')
        page.locator('button[type=submit]').click()
        page.get_by_text('Today’s reflection is saved').wait_for()
        page.reload(wait_until='networkidle')
        page.get_by_text('Learn to focus deeply').wait_for()
        page.get_by_role('button',name='Journey').click()
        page.get_by_text('Less switching today').wait_for()
        assert page.get_by_text('30 min focused study').is_visible()
        page.screenshot(path=str(ROOT/'screenshot-journey-v4.png'))
        page.get_by_role('button',name='Start weekly review').click()
        page.locator('#takeaway').fill('Protecting focus worked this week')
        page.locator('#systemChange').fill('Try a more precise metric')
        page.locator('button[type=submit]').click()
        page.get_by_text('Protecting focus worked this week').wait_for()
        page.get_by_role('button',name='Experiment').click()
        page.get_by_text('Your experiment').wait_for()
        page.get_by_role('button',name='New experiment').click()
        page.get_by_role('button',name='Active practice').click()
        page.once('dialog',lambda d:d.accept())
        page.get_by_role('button',name='Start this 14-day experiment').click()
        page.get_by_text('Active practice').wait_for()
        page.reload(wait_until='networkidle');page.get_by_text('Active practice').wait_for()
        # Export and import
        page.get_by_role('button',name='Settings').click()
        with page.expect_download() as item: page.get_by_role('button',name='Export my data').click()
        download=item.value
        with tempfile.NamedTemporaryFile(suffix='.json',delete=False) as f: backup=f.name
        download.save_as(backup)
        payload=json.loads(Path(backup).read_text());assert payload['state']['goal']=='Learn to focus deeply'
        assert payload['state']['experiment']['title']=='Active practice'
        page.once('dialog',lambda d:d.accept())
        page.get_by_role('button',name='Start setup again').click()
        page.get_by_role('heading',name='What are you growing toward?').wait_for()
        # Import through settings is only available after onboarding, so create throwaway setup and then import
        for val in ['Temporary goal','Temporary baseline','Temporary blocker','Temporary action']:
            page.locator('#answer').fill(val);page.locator('button[type=submit]').click()
        page.get_by_role('button',name='Settings').click()
        page.locator('#import-file').set_input_files(backup)
        page.once('dialog',lambda d:d.accept())
        page.get_by_role('button',name='Import backup').click()
        page.get_by_text('Learn to focus deeply').wait_for()
        assert not errors, errors
        # no AI or backend network calls
        assert not any('/api/' in req for req in requests)
        # Offline after first full load. Wait for the service worker to take control.
        page.wait_for_function('navigator.serviceWorker.controller !== null')
        context.set_offline(True)
        page.reload(wait_until='domcontentloaded')
        page.get_by_text('Learn to focus deeply').wait_for()
        browser.close()
        print('PASS: onboarding, daily reflection, IndexedDB persistence, journey, weekly review, experiment archive, backup restore, offline launch')
finally:
    p.terminate();p.wait(timeout=5)
