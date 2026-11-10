import os, subprocess, time
from playwright.sync_api import sync_playwright
root=os.path.dirname(__file__)
proc=subprocess.Popen(['python','-m','http.server','8777','--bind','127.0.0.1'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(.8)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
  problems=[]
  page.on('pageerror',lambda e: problems.append(str(e)))
  page.route('https://world.openfoodfacts.org/**',lambda route: route.abort())
  page.goto('http://127.0.0.1:8777/',wait_until='domcontentloaded')
  page.locator('#addFast').click()
  page.locator('#searchName').fill('mandarynki')
  page.locator('#searchForm button[type=submit]').click()
  page.get_by_text('Mandarynka, bez skórki').wait_for(timeout=8000)
  card=page.locator('.food-card').filter(has_text='Mandarynka, bez skórki')
  print('UI mandarynka:',card.inner_text()[:240])
  assert '53 kcal' in card.inner_text(), card.inner_text()
  card.get_by_text('Wybierz produkt').click()
  page.locator('#productGrams').wait_for(timeout=10000)
  print('product grams:',page.locator('#productGrams').input_value())
  assert float(page.locator('#productGrams').input_value())==100
  page.locator('#productGrams').fill('200')
  vals={field:page.locator('#'+field).input_value() for field in ['productKcal','productProtein','productFat','productCarbs']}
  print('UI after 200g:',vals)
  assert float(vals['productKcal'])==106, vals
  print('Page errors',problems)
  assert not problems
  page.screenshot(path='/mnt/data/Moj_Bilans_v08_owoce_warzywa_podglad_test.png')
  browser.close()
finally:proc.terminate();proc.wait(timeout=5)
