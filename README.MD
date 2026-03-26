# PulseFX — Live Currency & Crypto Tracker

A real-time financial dashboard tracking 20 top cryptocurrencies and 15 major fiat currencies (including African currencies like RWF and KES). Built with plain HTML/CSS/JavaScript — no frameworks, no build tools.

---

## Features

- **Live Crypto Prices** — Top 20 coins by market cap via CoinGecko (BTC, ETH, BNB, SOL, etc.)
- **Fiat Exchange Rates** — 15 currencies vs USD via ExchangeRate-API (EUR, GBP, RWF, KES, NGN, ZAR...)
- **Search** — Filter assets by name or ticker symbol in real time
- **Filter Tabs** — Switch between All / Crypto / Fiat / Saved views
- **Sort** — By name (A–Z, Z–A), price (high/low), or 24h change %
- **Favorites** — Star/save assets; persisted in localStorage across sessions
- **Price Flash** — Rows flash green/red when prices update
- **Stats Bar** — Live BTC, ETH, EUR/USD, RWF/USD, and market sentiment at a glance
- **Auto-refresh** — Data refreshes every 60 seconds automatically
- **Error Handling** — Clear banners if either API is unreachable; partial data still shown
- **Responsive** — Works on mobile, tablet, and desktop

---

## APIs Used

| API | Purpose | Auth |
|-----|---------|------|
| [CoinGecko API v3](https://www.coingecko.com/en/api) | Top 20 crypto prices, market cap, 24h change | None (public endpoint) |
| [ExchangeRate-API (open.er-api.com)](https://www.exchangerate-api.com) | Fiat currency rates vs USD | None (free public tier) |

No API keys required. Both APIs are free and public — no `.env` files needed.

---

## Running Locally

**Prerequisites:** Any web server (Nginx, Apache, Python's http.server, VS Code Live Server)

### Option 1 — Python (quickest)
```bash
git clone https://github.com/YOUR_USERNAME/pulsefx.git
cd pulsefx
python3 -m http.server 8080
# Visit http://localhost:8080
```

### Option 2 — Nginx
```nginx
server {
    listen 80;
    root /path/to/pulsefx;
    index index.html;
    location / { try_files $uri $uri/ =404; }
}
```

### Option 3 — VS Code
Install the Live Server extension, right-click `index.html` → **Open with Live Server**.

---

## Deployment on ALU Servers

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/pulsefx.git
git push -u origin main
```

### Step 2 — Deploy to web-01 and web-02

SSH into each server and clone:
```bash
# On web-01 (34.201.51.178) AND web-02 (54.158.123.226)
sudo apt update && sudo apt install -y nginx git
sudo rm -rf /var/www/html/*
sudo git clone https://github.com/YOUR_USERNAME/pulsefx.git /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo systemctl restart nginx
```

The default Nginx config serves `/var/www/html/index.html` on port 80 — no extra config needed.

### Step 3 — Configure HAProxy on lb-01

SSH into lb-01 (44.202.34.36):
```bash
sudo nano /etc/haproxy/haproxy.cfg
```

Add or replace the backend config:
```haproxy
frontend http_front
    bind *:80
    default_backend web_servers

backend web_servers
    balance roundrobin
    server web-01 34.201.51.178:80 check
    server web-02 54.158.123.226:80 check
```

Then restart HAProxy:
```bash
sudo systemctl restart haproxy
sudo systemctl status haproxy
```

**Verify:** Visit `http://44.202.34.36` — traffic should distribute between web-01 and web-02.

---

## Project Structure

```
pulsefx/
├── index.html      # App shell, layout, markup
├── style.css       # All styles — dark terminal theme
├── app.js          # API fetching, filtering, sorting, rendering
└── README.md       # This file
```

---

## Attribution

- **CoinGecko** — Cryptocurrency market data API. Free tier used. [coingecko.com](https://www.coingecko.com)
- **ExchangeRate-API** — Fiat currency exchange rates. Free public endpoint used. [exchangerate-api.com](https://www.exchangerate-api.com)
- **Syne** and **Space Mono** fonts via Google Fonts — [fonts.google.com](https://fonts.google.com)

---

## Built For

ALU — Playing Around with APIs assignment  
Frontend Web Development track  
Infrastructure: web-01, web-02 (Nginx), lb-01 (HAProxy)