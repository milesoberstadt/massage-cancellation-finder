const puppeteer = require('puppeteer');
const https = require('https');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs');

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
    await page.setViewport({width: 990, height: 730});
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
    const {date, time} = await page.evaluate(() => {
      // Side note, if you're a dev reading this and like software gore, check the output of this on the booking site...
      // document.querySelector('table.appointment-list-style').innerHTML
      const firstAvailableRow = 'table.appointment-list-style>tbody>tr:nth-of-type(2n)';
      const date = document.querySelector(`${firstAvailableRow}>td`).textContent.trim();
      const time = document.querySelector(`${firstAvailableRow}>td:nth-of-type(2n)`).textContent.trim();
      return { date, time };
    });
    console.log('Soonest appointment available', date, time);
    await page.screenshot({ path: `output/schedule.png` });
    // Check to see if we've already notified about this date
    const cancellationsString = fs.readFileSync('output/cancellations.txt', {flag: 'a+'}).toString();
    const cancellations = cancellationsString.split('\n');
    if (cancellations.includes(`${date} ${time}`)){
      console.log("We've already notified for this date, exiting");
      return browser.close();
    }
    
    // I know I should probablty make this into a node http request instead of using a child process, but multipart is hard :(
    const uploadOutput = await exec(`curl -F'file=@output/schedule.png' https://0x0.st/`);
    const uploadURL = uploadOutput.stdout.trim();

    //iftttNotification(date, time, uploadURL);
    await exec(`curl -X POST -H "Content-Type: application/json" -d '{"value1":"${date}","value2":"${time}","value3":"${uploadURL}"}' \
      https://maker.ifttt.com/trigger/${process.env.IFTTT_SERVICE}/with/key/${process.env.IFTTT_KEY}`);
    fs.appendFileSync('output/cancellations.txt', `${date} ${time}\n`);
    console.log('Notification sent!');
    return browser.close();
  }
  catch (e){
    console.log(e)
    browser.close();
  }
})();

async function screenshot(){
  if (debug)
    await page.screenshot({ path: `output/${screenshotCounter++}.png` });
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

// This doesn't work right now, endpoint gives me a 400 error. Working with the http lib sucks
function iftttNotification(date, time, screenshotURL) {
  // Here's our POST to IFTTT
  //`curl -X POST -H "Content-Type: application/json" -d '{"value1":"${date}","value2":"${time}","value3":"${screenshotURL}"}' https://maker.ifttt.com/trigger/${process.env.IFTTT_SERVICE}/with/key/${process.env.IFTTT_KEY}`

  let data = { "value1": date, "value2": time, "value3": screenshotURL };
  const options = {
    hostname: 'maker.ifttt.com',
    path: `/trigger/${process.env.IFTTT_SERVICE}/with/key/${process.env.IFTTT_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`statusCode: ${res.statusCode}: ${res.statusMessage}`);
      res.on('data', (d) => {
        process.stdout.write(d);
        process.stdout.write('done');
        resolve(d);
      });
    });

    req.on('error', (err) => console.log(err));

    req.write(`file=${data}`);
    req.end();
  });
}
