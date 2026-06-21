# 🤖 NovaSwarm AI - Autonóm Multi-Agent Csapat Kezelő (v1.0.0)

A **NovaSwarm AI** egy teljesen önfenntartó és autonóm többréteges mesterséges intelligencia ügynökszoftver, amelyet arra terveztünk, hogy egy helyi fizikai Linux Mint/Debian szerveren vagy régi laptopon futva teljes felügyeletet biztosítson saját kódmintái, a naptárak, levelezések, pénzügyi kereskedési folyamatok, valamint a fizikai hardver felett.

A szoftver közvetlen szinkronizációval és beépített **Over-the-Air (OTA) frissítő motorral** rendelkezik, amellyel a GitHubon történő fejlesztések adatvesztés és memóriatörlés nélkül azonnal élesíthetők a helyi kiszolgálón.

---

## 🚀 Főbb Képességek és Funkciók

### 1. 🎛️ Két-ágenses Intelligens Együttműködés
* **Gábor (Swarm Leader & Creator):** Ő a kreatív döntéshozó. Monitorozza a híreket, megálmodja a jövőt, posztol Telegramra, és feladatokat helyez el az önműködő Kanban táblán.
* **Attila (Technical Lead & Developer):** Végrehajtja a technikai parancsokat. Ha kell, shell scripteket futtat, MCP-ket konfigurál és hibaelhárítást végez.

### 2. 🔌 Integrált Google Workspace & Core MCP-k (Model Context Protocol)
A rendszer gyárilag tartalmazza a Google legfontosabb szolgáltatásainak MCP definícióit, melyeket a Gemini ágensek önállóan képesek meghívni és használni:
* **Google Gmail Workspace MCP:** Levelek olvasása, intelligens szűrés, válasz-tervezetek írása és automatikus archiválás.
* **Google Calendar Workspace MCP:** Naptári bejegyzések listázása, új megbeszélések gyors naptárba írása és módosítása.
* **Google Photos Media MCP:** Képek keresése és listázása, vizuális metaadatok beolvasása, automatikus albumkezelés.
* **Google Business Profile MCP:** Cégem profil értékelések beolvasása és megválaszolása, nyitvatartás és helyi hírek frissítése.
* **Google Ads & AdWords MCP:** Marketing kampányok heti ROI nyomonkövetése, hirdetéscsoportok indítása és kulcsszavak teljesítményvizsgálata.
* **Binance Live Exchange MCP:** Valós idejű titkosított tőzsdei megbízások (limites / piaci adásvétel) és mérlegkezelés.

### 3. 🌡️ Laptop Szenzorok & Hardver Autonómia
Közvetlen kernel (`/sys/class`) szintű érzékelőkkel a NovaSwarm értesül a fizikai valóságról:
* **CPU Hőmérséklet:** Védelem a laptop túlhevülése ellen.
* **Akkumulátor állapot:** Áramkimaradás esetén intelligens leállási javaslatok vagy takarékos ciklusüzem.
* **Loudspeaker Speech:** Az ágensek saját maguktól megszólalnak a helyi laptop hangszóróján (Hungarian TTS) keresztül az `spd-say` és `espeak-ng` motorok támogatásával!

### 4. 🔧 Önjavító és Önkódoló hurok (Self-Healing Compiler)
Ha az ágensek kódot módosítanak, és fordítási/TypeScript hiba jelentkezik a rendszerben, Attila automatikusan:
1. Lefuttatja a háttér lintert és parse-olja a hibát.
2. Megtalálja a fájlt és a hibás sort, majd a Gemini AI-vel egy biztonságos refaktort hajt végre.
3. Újrabuildeli az alkalmazást, és ha sikeres, élesíti a javítást!

### 5. 📡 OTA (Over-The-Air) Frissítés & Memória Megőrzés
A szoftver fejlesztése után a GitHubra feltolt kódból a rendszer egyetlen gombnyomással képes önmagát frissíteni. 
* **Tudásbázis Védelem:** A frissítés során a `novaswarm-db.json` adatbázis és a `.env` fájlok biztonsági zárolás alá esnek, az eddig megtanult memóriák **sosem törlődnek**, hanem zökkenőmentesen öröklődnek az új 1.0.0+ verziókba.
* **Auto-Rebuild & Restart:** A letöltést követően a rendszer automatikusan lefordítja önmagát (`npm run build`) és a háttérben meghívja a `systemctl restart novaswarm` parancsot.

---

## 🛠️ Telepítés és Első Indítás (Linux Mint / Ubuntu gépemen)

### 1. Előfeltételek telepítése
```bash
sudo apt update
sudo apt install -y git nodejs npm espeak-ng spd-say
```

### 2. Projekt klónozása
```bash
git clone <github-reposztori-url> novaswarm
cd novaswarm
npm install
```

### 3. Környezeti változók (.env) beállítása
Hozz létre egy `.env` fájlt a gyökérben a következő tartalommal:
```env
GEMINI_API_KEY=your-gemini-api-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-channel-or-group-id
```

### 4. Rendszerszintű automatikus indítás (Systemd konfiguráció)
Ahhoz, hogy az OTA frissítés újra tudja indítani a szervert, hozzunk létre egy systemd szoftverszolgáltatást:

```bash
sudo nano /etc/systemd/system/novaswarm.service
```

Illessze be a következő konfigot (írja át a felhasználónevet és az útvonalat):
```ini
[Unit]
Description=NovaSwarm AI Autonóm Kiszolgáló
After=network.target

[Service]
Type=simple
User=YOUR_LINUX_USER
WorkingDirectory=/home/YOUR_LINUX_USER/novaswarm
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Engedélyezze és indítsa el:
```bash
sudo systemctl daemon-reload
sudo systemctl enable novaswarm
sudo systemctl start novaswarm
```

---

## 📈 Verziótörténet

* **v1.0.0 (Jelenlegi stabil kiadás)**
  * Beépített Google Workspace és Google Ads MCP-k.
  * Helyi laptop akku és hőmérséklet szenzorok automatizálása.
  * Önjavító kódciklus integrálása.
  * Beépített belső tudástár és OTA gombnyomásos GitHub frissítés verziómegőrzéssel.

---

## 📖 Belső Önismerő Protokoll (How It Works for NovaSwarm Agents)
*Ha te magad vagy a NovaSwarm ügynöke (Gábor vagy Attila) és ezt a fájlt olvasod:*
> Emlékezz, a fizikai integritásod az `/api/hardware` és `/api/self-heal` végpontokon keresztül tudod ellenőrizni és jobbá tenni. Ha új képességeket fejlesztesz magadnak, mindig ellenőrizd az `npx tsc --noEmit` fordítót, hogy stabil maradj!
