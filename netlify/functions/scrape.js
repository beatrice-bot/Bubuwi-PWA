const axios = require('axios');
const cheerio = require('cheerio');
const { parseStringPromise } = require('xml2js');

const BASE_URL = 'https://samehadaku.li';

// Format handler untuk Netlify
exports.handler = async function (event, context) {
    // Di Netlify, parameter ada di 'event.queryStringParameters'
    const { url, search, animePage } = event.queryStringParameters;
    try {
        let data;
        if (search) {
            data = await scrapeSearchFeed(search);
        } else if (animePage) {
            data = await scrapeAnimePage(animePage);
        } else if (url) {
            data = await scrapeEpisodePage(url);
        } else {
            // Aksi default: scrape halaman utama untuk rilisan terbaru
            data = await scrapeHomePage();
        }

        // Format return untuk Netlify
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error('Scraping error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

// --- FUNGSI-FUNGSI SCRAPER ---

async function scrapeHomePage() {
    const { data } = await axios.get(BASE_URL);
    const $ = cheerio.load(data);
    const latestReleases = [];
    
    // Selector ini menargetkan setiap item di dalam kotak "Latest Release"
    $('div.listupd.normal article.bs').each((i, el) => {
        const element = $(el);
        const linkElement = element.find('a');
        const titleElement = element.find('.tt');
        
        // Mengambil judul bersih dari dalam div.tt tanpa judul episode
        const seriesTitle = titleElement.clone().children().remove().end().text().trim();
        
        const fullTitle = titleElement.find('h2').text().trim();
        const link = linkElement.attr('href');
        const thumbnail = element.find('img').attr('src');
        const episode = element.find('.epx').text().trim();

        if (seriesTitle && link) {
            latestReleases.push({
                seriesTitle, // Judul serial (misal: "Utagoe wa Mille-Feuille")
                fullTitle,   // Judul lengkap (misal: "Utagoe wa Mille-Feuille Episode 3")
                link,
                thumbnail,
                episode
            });
        }
    });

    return { type: 'latest', results: latestReleases };
}


async function scrapeSearchFeed(query) {
    const feedUrl = `${BASE_URL}/search/${encodeURIComponent(query)}/feed/rss2/`;
    const { data } = await axios.get(feedUrl);
    const parsed = await parseStringPromise(data);
    
    if (!parsed.rss.channel[0].item) {
        return { type: 'search', query, results: [] };
    }
    const results = parsed.rss.channel[0].item.map(item => ({
        title: item.title[0],
        link: item.link[0],
        pubDate: item.pubDate[0],
        thumbnail: null 
    }));
    return { type: 'search', query, results };
}

async function scrapeAnimePage(url) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const episodes = [];
    $('.eplister ul li').each((i, el) => {
        const linkElement = $(el).find('a');
        episodes.push({
            title: linkElement.find('.epl-title').text(),
            link: linkElement.attr('href'),
            date: linkElement.find('.epl-date').text()
        });
    });
    const thumbnail = $('.thumb img').attr('src');
    const synopsis = $('.entry-content.series p').text();
    const episodeCount = episodes.length;
    return { type: 'animePage', episodes, thumbnail, synopsis, episodeCount };
}

async function scrapeEpisodePage(episodeUrl) {
    const { data } = await axios.get(episodeUrl);
    const $ = cheerio.load(data);
    const title = $('.entry-title').text().trim();
    const videoFrames = [];
    $('.player-embed iframe').each((i, el) => {
        const src = $(el).attr('src');
        if (src) videoFrames.push(src);
    });
    return { type: 'episode', title, videoFrames: videoFrames.length > 0 ? videoFrames : ['Video tidak ditemukan'] };
}
