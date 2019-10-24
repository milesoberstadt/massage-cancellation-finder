# massage-cancellation-finder
Checks a booknow.securedata-trans.com site for cancellations. 

I got annoyed with seeing that my massuse constantly had a 6 week wait for availability. Maybe I should just book regular massages, but I'm a developer, why would I take the easy route? This project is meant to regually check the site for cancellations and notifiy me when it finds one.

## Usage
0. Find your therapist option value and pick a serivce you want to book
1. Create an IFTTT account and a webhook service. I should really make a step by step guide to this. Mine triggers a rich text notification on my phone. The values being sent to the notification are as follows:
- Value1: Date
- Value2: Time
- Value3: Screenshot URL

2. Clone this repo

`git clone https://github.com/milesoberstadt/massage-cancellation-finder`

3. Create a .env file in the project root with the following values:
```
# All massage booking sites that use booknow.securedata-trans.com should have a 7 character booking code at the end of the URL
MASSAGE_SITE=https://booknow.securedata-trans.com/7_CHARACTER_CODE_HERE/ 
USERNAME=your_username
PASSWORD=your_password
THERAPIST=therapist_val
SERVICE=service_val
IFTTT_KEY=ifttt_webhook_key
IFTTT_SERVICE=service_to_call
```
4. Run manually with `./run.sh`
5. Schedule it with crontab and forget about it until there's a cancellation!
### Since I only have access to my massage booking site, I have no idea how flexible this needs to be, any feedback on that is very welcome!