const Crawler = require('crawler');
const { writeFile } = require('jsonfile');
const { promisify } = require('util');
const URL = require('url');

const write = promisify(writeFile);

let shouldWrite = true;
const pages = [
  'https://en.wikipedia.org/wiki/Animal_consciousness#Cambridge_Declaration_on_Consciousness',
  'https://www.theguardian.com/news/2018/may/07/true-cost-of-eating-meat-environment-health-animal-welfare',
  'http://www.hannejohansen.no/2017/02/12/hvorfor-veganer/',
  'http://www.hannejohansen.no',
  'https://forskning.no/2018/05/kjottreduksjon-kan-radikalt-oke-norsk-selvforsyning-av-mat/produsert-og-finansiert-av/nordlandsforskning',
  'https://forskning.no/mat-landbruk/2018/03/hvis-alle-blir-veganere-vil-verden-fa-mye-mer-mat-kan-lose-matkrise-ved-bytte',
  'http://waterfootprint.org/en/water-footprint/product-water-footprint/water-footprint-crop-and-animal-products/',
  'https://www.sciencedirect.com/science/article/pii/S2212371713000024',
  'http://www.oecd.org/agriculture/water-use-in-agriculture.htm',
  'https://www.researchgate.net/publication/285775211_Eutrophication_and_hypoxia_in_coastal_areas_a_global_assessment_of_the_state_of_knowledge',
  'https://www.theguardian.com/commentisfree/2016/aug/09/vegan-corrupt-food-system-meat-dairy',
  'https://www.theguardian.com/commentisfree/2015/dec/22/festive-christmas-meal-long-haul-flight-meats-damaging-planet',
];

const visitedPages = [
  'https://www.theguardian.com/commentisfree/2016/aug/09/vegan-corrupt-food-system-meat-dairy',
];

const blacklistWords = [
  'twitter',
  'facebook',
  'google',
  'linkedin',
  'mailto:',
  'whatsapp',
  'pinterest',
  'fb-messenger'
];

const whitelistInclude = [
  'vegan',
  'vegetarian',
  'meat',
];

const visitedDictionary = {};

function isIncludedInList(token, list) {
  return list.some(listWord => token.includes(listWord));
}

const c = new Crawler({
  maxConnections: 100,
  callback: (err, res, done) => {
    if (err) {
      console.log(err);
    } else {
      const cheerio = res.$;
      if (!shouldWrite || !cheerio) {
        console.log('weird', res);
        done();
        return;
      }

      const links = cheerio("a");
      cheerio(links).each((i, link) => {
        let href = cheerio(link).attr('href');

        if (
          href &&
          (isIncludedInList(href, whitelistInclude) || isIncludedInList(cheerio(link).text(), whitelistInclude)) &&
          !isIncludedInList(href, blacklistWords) &&
          !visitedPages.includes(href)
        ) {
          const hrefUrl = href.startsWith('/') ? URL.resolve(res.request.uri.href, href) : href;

          console.log(hrefUrl);
          visitedPages.push(hrefUrl);

          if (visitedDictionary[res.request.uri.hostname]) {
            visitedDictionary[res.request.uri.hostname].push(hrefUrl)
          } else {
            visitedDictionary[res.request.uri.hostname] = [hrefUrl];
          }

          c.queue(hrefUrl);
        }
      })
    }

    done();
  }
});

c.queue('https://www.theguardian.com/commentisfree/2016/aug/09/vegan-corrupt-food-system-meat-dairy');

process.on('SIGINT', async () => {
  shouldWrite = false;
  await Promise.all(Object.keys(visitedDictionary).map(site => write(`./urls/${site}.json`, visitedDictionary[site])));
  process.exit();
});

