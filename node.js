import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

puppeteer.use(StealthPlugin());

function randomDelay(min = 100, max = 300) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanType(page, selector, text) {
  for (const char of text) {
    await page.type(selector, char, { delay: randomDelay(100, 250) });
    await sleep(randomDelay(50, 150));
  }
}

async function humanScroll(page, times = 3) {
  for (let i = 0; i < times; i++) {
    const scrollAmount = 400 + Math.floor(Math.random() * 400);
    await page.evaluate(scroll => window.scrollBy(0, scroll), scrollAmount);
    await sleep(2000 + Math.floor(Math.random() * 2000));
  }
}

async function scrapeFacebookPage(pageUrl, maxPosts = 50) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    protocolTimeout: 120000 
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.188 Safari/537.36"
  );


  await page.goto("https://www.facebook.com/login", { waitUntil: "networkidle2" });
  await humanType(page, "#email", process.env.FB_EMAIL );
  await humanType(page, "#pass", process.env.FB_PASSWOR );
  await page.click("button[name=login]");
  await page.waitForNavigation({ waitUntil: "networkidle2" });


  await page.goto(pageUrl, { waitUntil: "networkidle2" });

  let posts = [];
  let attempts = 0;
  const maxAttempts = 50;

  while (posts.length < maxPosts && attempts < maxAttempts) {
    attempts++;

    
    const postLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href*='/posts/']"))
        .map(a => a.href)
        .filter((v, i, a) => a.indexOf(v) === i) 
    );

    for (const link of postLinks) {
      if (posts.length >= maxPosts) break;
      if (posts.find(p => p.permalink_url === link)) continue;

      const postData = {
        id: crypto.createHash("md5").update(link).digest("hex"),
        permalink_url: link
      };

      posts.push(postData);
      console.log(`✅ Saved ${posts.length} posts`);

     
      fs.writeFileSync("facebook_posts.json", JSON.stringify(posts, null, 2));
    }

    await humanScroll(page, 3); 
  }

  await browser.close();
  console.log(`🎉 Finished! Total posts saved: ${posts.length}`);
}

scrapeFacebookPage("https://www.facebook.com/junynaresofficial", 10);
