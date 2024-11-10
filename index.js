import { Cluster } from 'puppeteer-cluster';
import { writeFile } from 'fs/promises';
import { readFileSync } from 'fs';
import pc from 'picocolors'
import { intro, outro, text, confirm } from '@clack/prompts';
import ms from 'ms';
import config from './config.js';


intro(pc.bgCyanBright(' website-scraper '))


if (!config.baseUrl) config.baseUrl = await text({
    message: 'What is the base URL of the website?',
    placeholder: 'https://example.com/blog/',
    validate(value) {
        const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/[\w-]*)*\/?$/;
        if (!urlPattern.test(value)) return 'Please enter a valid URL!';
    }
})


if (!config.baseUrl.endsWith('/')) config.baseUrl += '/';


if (!config.pathToWordList) config.pathToWordList = await text({
    message: 'What is the path to the wordlist?',
    placeholder: './words2.txt',
})


if (!config.firstIndex) config.firstIndex = await text({
    message: 'What index in the wordlist do you want to start from?',
    placeholder: '0',
    validate(value) {
        if (Number.isNaN(parseInt(value))) return `Value must be an integer!`;
        if (value.length < 0) return `Value must be greater than 0!`;
    },
});


if (!config.numberOfWords) config.numberOfWords = await text({
    message: 'How many words do you want to scrape?',
    placeholder: '1000',
    validate(value) {
        if (Number.isNaN(parseInt(value))) return `Value must be an integer!`;
        if (value.length < 0) return `Value must be greater than 0!`;
    },
})


if (!config.quietMode) config.quietMode = await confirm({
    message: 'Do you want to run in quiet mode? (no logging for each word)',
})




const allWords = readFileSync(config.pathToWordList, 'utf-8').split('\n');


outro(`Alright, starting scraping! ETA: ${pc.bold(ms(config.numberOfWords * 100))}`);


const wordList = allWords.slice(+config.firstIndex, +config.firstIndex + +config.numberOfWords);
const worked = [];


console.log(pc.bold('🚀🚀🚀🚀 SCRAPING WEBSITE... 👾👾👾👾'))
console.time('Done in');


(async () => {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 1,
    });


    await cluster.task(async ({ page, data: word }) => {
        if (!config.quietMode) console.time(pc.bold(word));
        await page.goto(config.baseUrl + word, { waitUntil: "load" });

        const length = await page.$eval("#root", e => e.innerHTML.trim().length)

        if (length > 0) {
            worked.push(word);
            console.log(pc.bgGreen(` ${pc.bold(word)} worked! `))
        }
        if (!config.quietMode) console.timeEnd(pc.bold(word));
    });


    for (const word of wordList) {
        cluster.queue(word);
    }


    await cluster.idle();
    await cluster.close();


    console.log('')


    if (worked.length === 0) {
        console.log(pc.bgRed(pc.bold(' Found 0 words! ')))
    }


    else if (worked.length === 1) {
        console.log(pc.bgYellowBright(pc.bold(' Found 1 word! ')))
    }


    else {
        console.log(pc.bgGreenBright(pc.bold(` Found ${worked.length} words! `)))
    }


    await writeFile('./result.json', JSON.stringify(worked, null, 2));
    console.timeEnd('Done in')
})()