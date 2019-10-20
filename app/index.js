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
      document.querySelector('select[name="e_id"]').value  = env.THERAPIST;
    }, process.env);
    
    await screenshot();
    
    // Select our massage service
    await page.evaluate((env) => {
      document.querySelector('select[name="service_id"]').value  = env.SERVICE;
      // Create a a submit button since puppeteer prefers clicks to JS induced submit
      let submitInput = document.createElement('INPUT');
      submitInput.id = 'addedSubmit';
      submitInput.type = 'submit';
      document.querySelector('form').appendChild(submitInput);
    }, process.env);
    await screenshot();
    // Click submit
    await Promise.all([
      page.click('#addedSubmit'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    await screenshot();
    
    // Find available massages
    await findNextAvailableMonth();
    await screenshot();
    await page.waitForSelector('td.calendar-available a');
    await Promise.all([
      page.click('td.calendar-available a'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ])
    const soonest = await page.evaluate(() => {
      // Side note, if you're a dev reading this and like software gore, check the output of this on the booking site...
      // document.querySelector('table.appointment-list-style').innerHTML
      const firstAvailableRow = 'table.appointment-list-style>tbody>tr:nth-of-type(2n)';
      const date = document.querySelector(`${firstAvailableRow}>td`).textContent.trim();
      const time = document.querySelector(`${firstAvailableRow}>td:nth-of-type(2n)`).textContent.trim();
      return { date, time };
    });
    // Note to self, it would be cool to be able to screenshot the schedule here...
    await screenshot();
    console.log(soonest);

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

async function findNextAvailableMonth(monthsForwardAccpetable = 2) {
  while (true) {
    const found = await page.evaluate(() =>  document.querySelector('td.calendar-available a'));
    if (found) {
      break;
    }
    else if (monthsForwardAccpetable-- === 0) {
      throw new Error('Next appointment availability is too far away :(');
    }
    await page.waitForSelector('a.right');
    await Promise.all([
      page.click('a.right'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ])
  }
}