# Building a Next-Gen Influencer Dashboard with React, Vite, and the Selanet API

In the fast-paced world of social media marketing and Web3 community building, evaluating an influencer's true impact is surprisingly difficult. Vanity metrics like follower counts are often misleading, and building tools to scrape X (formerly Twitter) can be a nightmare due to strict API limits and IP blocks.

I needed a solution that was resilient, powerful, and visually stunning. So, I set out to build a fully automated **Influencer Analytics Dashboard** using React, Vite, and the **Selanet API**.

Here is how I built it.

---

## 🛠️ The Tech Stack

To ensure the application was lightning-fast and looked beautiful, I kept the stack modern but simple:
*   **Frontend Framework**: React + Vite (for instantaneous hot-module reloading).
*   **Styling**: Pure CSS utilizing modern Glassmorphism (frosted glass, backdrop-filters, and CSS mesh gradients).
*   **Backend / Data Engine**: The [Selanet API](https://selanet.ai). Selanet acts as an intelligent scraping layer—you hand it a URL, and it returns beautifully parsed JSON data, completely bypassing the headaches of headless browsers and proxy rotation.

---

## 📡 Tapping into the Selanet API

The core engine of the dashboard relies on Selanet's `/browse` endpoint. Taking an influencer's handle (e.g., `elonmusk`), the dashboard dynamically dispatches a request to extract their profile and recent timeline articles.

```javascript
const url = `https://api.selanet.ai/v1/browse`;
const req = { 
  parse_only: true,
  x_params: { 
    feature: 'profile', 
    url: `https://x.com/${cleanHandle}` 
  } 
};

// Fetch data using the Selanet API Key
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SELANET_API_KEY}`,
  },
  body: JSON.stringify(req),
});
```

Selanet's response returns an array of content. By simply filtering `c.role === 'profile'` and `c.role === 'article'`, I have instant access to everything: biographies, exact follower counts, verification status, and recent tweets with full engagement metrics.

---

## 🧠 Engineering the Dashboard Features

Having access to raw JSON is great, but the magic happens when you synthesize it into actionable insights. I built five custom analytics engines on top of the Selanet data:

### 1. The Social Worth Estimator 💰
Brands always want to know what a standard post should cost. I built an algorithm that takes the influencer's follower count and multiplies it by their **Engagement Density** (derived from calculating Following/Follower ratios and recent post interactions). It seamlessly spits out an estimated sponsorship valuation.

### 2. Intelligent Brand MatchMaking 💼
Instead of guessing an influencer's niche, I implemented an NLP keyword parser. It scans the influencer's bio and the text of their last dozen tweets. If it detects heavy usage of words like `btc`, `web3`, and `eth`, the dashboard dynamically ranks **Crypto & Web3** as a 95% brand match. If it sees `software`, `dev`, or `startup`, it ranks **Technology**.

### 3. The Influence Network Graph 🕸️
Who influences the influencer? The dashboard iterates through the timeline articles, extracts all string structures matching robust `@mentions`, and ranks the most frequent connections. Now, users can instantly see the influencer's closest network.

### 4. Trophy Content Engagement 🏆
Finding an influencer's best posts usually requires endless scrolling. My app captures the articles Array, mathematically parses strings like `"124K likes"` into integers, sorts them descending, and displays the "Top 3 Trophies", complete with an internally calculated **Engagement Rate (ER) Score**.

---

## 🛡️ Overcoming Scraper Hurdles

Anyone who has scraped social media knows that platforms actively fight back by dropping proxy connections. During development, the Selanet API would occasionally return an empty array `[]` when a proxy was temporarily blocked.

Instead of displaying an ugly "Data Not Found" error to the user, I implemented a resilient, invisible automatic retry system:

```javascript
let data = await res.json();
  
// If API returns an empty content array (proxy block), automatically wait 2s and retry
if (data && Array.isArray(data.content) && data.content.length === 0) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Re-fetch logic triggered seamlessly
}
```
Because Selanet intrinsically rotates its proxies, a 2-second delay ensures the subsequent retry connects flawlessly. The user never notices a thing.

---

## 🚀 The Result

What started as a basic profile fetching script is now a highly polished, glassmorphism-powered command center. By leveraging **React** for state management and **Selanet** as the heavy-lifting data ingestion engine, I abstracted away the hardest parts of social media analytics.

Developers don't need to fight rate limits or headless browser captchas anymore. By utilizing robust API wrappers like Selanet, we can focus on what actually matters: building beautiful, insightful applications.
