import fetch from 'make-fetch-happen'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const argv = yargs(hideBin(process.argv)).argv
if (!argv['bot-token']) {
    console.error('--bot-token is required');
    process.exit(1)
}

if (!argv['chat-id']) {
    console.error('--chat-id is required');
    process.exit(1)
}

const sent_earthquakes = [];

for (const eq of await ceicLookup()) {
    sent_earthquakes.push(eq.CATA_ID);
}

console.log('Pool:', sent_earthquakes)

setInterval(async () => {
    try {
        for (const eq of await ceicLookup()) {
            if (sent_earthquakes.includes(eq.CATA_ID)) {
                continue;
            }
            sent_earthquakes.push(eq.CATA_ID);
            console.log('New EQ:', eq.CATA_ID)
            await sendNotification(eq);
        }
    } catch (e) {
        console.error(e);
    }
}, 300 * 1000);

async function ceicLookup() {
    const res = await fetch(`https://news.ceic.ac.cn/ajax/google?rand=${Date.now()}`, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.62 Safari/537.36',
            referer: `https://news.ceic.ac.cn/index.html?time=${Math.floor(Date.now() / 1000)}`
        },
        strictSSL: false
    });

    return await res.json();
}

async function sendNotification(eq) {
    let text = '#地震速报\n';
    text += `震级: <b>M${eq.M}</b>\n`;
    text += `地点: <b>${eq.LOCATION_C}</b> (Lat ${eq.EPI_LAT}, Lon ${eq.EPI_LON})\n`;
    text += `深度: ${eq.EPI_DEPTH} KM\n`;
    text += `发生时间: ${eq.O_TIME} (UTC+8)\n`;
    text += `https://news.ceic.ac.cn/${eq.CATA_ID}.html\n`;

    const res = await fetch('https://api.telegram.org/bot' + argv['bot-token'] + '/sendMessage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: argv['chat-id'],
            text: text,
            parse_mode: 'HTML'
        })
    });

    const r = await res.json();
    if (!r.ok) {
        console.error(r);
    }
}