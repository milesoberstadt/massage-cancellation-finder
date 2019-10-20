const puppeteer = require('puppeteer');
const debug = true;
let screenshotCounter = 0;
let page = null;

(async() => {

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  page = await browser.newPage();
  try {
    await page.goto(process.env.MASSAGE_SITE, {waitUntil: 'networkidle2'});
    // Load the home page, sign in
    await page.waitForSelector('input[name="loginname"]');
    await page.focus('input[name="loginname"]');
    await page.keyboard.type(process.env.USERNAME);
    await page.focus('input[name="password"]');
    await page.keyboard.type(process.env.PASSWORD);
    await screenshot();
    await Promise.all([
      page.click('input[value="Log In"]'), 
      page.waitForNavigation({waitUntil: 'networkidle0'})
    ]);
    await screenshot();

    // Select our therapist
    await page.evaluate((env) => {
      document.getElementsByName('e_id')[0].value  = env.THERAPIST;
    }, process.env)
    await screenshot();


    browser.close();
  }
  catch (e){
    console.log(e)
    browser.close();
  }
})();

async function screenshot(){
  if (debug)
    await page.screenshot({ path: `debug/${screenshotCounter++}.png` });
}