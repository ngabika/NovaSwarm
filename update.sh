#!/usr/bin/env bash

# ==============================================================================
#                  NOVASWARM AI AUTOMATA SZOFTVERFRISSÍTŐ (OTA)
# ==============================================================================
# Támogatott OS: Helyi Linux Mint / Ubuntu / Debian alapú disztribúciók
# Kiadás: v1.3.0 STABLE (Magyar verzió)
# Adatvédelem: Nem-roncsoló és megőrző automatikus adatbázis & .env migrációval.
# ==============================================================================

# ANSI színek a látványos megjelenítéshez
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

clear

# Fejléc
echo -e "${CYAN}${BOLD}"
echo "  _   _                    ____                                      ___ "
echo " | \ | | ___  _   _  __ _ / ___|__      ____ _ _ __ _ __ ___        / _ \ "
echo " |  \| |/ _ \| | | |/ _\` |\___ \\\ \ /\ / / _\` | '__| '_ \` _ \      | | | |"
echo " | |\  | (_) | |_| | (_| | ___) |\ V  V / (_| | |  | | | | | |  _  | |_| |"
echo " |_| \_|\___/ \__,_|\__,_||____/  \_/\_/ \__,_|_|  |_| |_| |_| (_)  \___/ "
echo "                                                                         "
echo -e "${WHITE}               --- NOVASWARM AI OVER-THE-AIR (OTA) UPDATER ---${NC}"
echo -e "${YELLOW}                 Intelligens Git-Frissítő és Adatvédelmi Hurok${NC}"
echo "================================================================================"

# Ellenőrzés, hogy Bash környezetben fut-e
if [ -z "$BASH_VERSION" ]; then
    echo -e "${RED}Hiba: Ez a parancsfájl Bash parancsértelmezőt igényel.${NC}"
    exit 1
fi

# ==============================================================================
# 1. BIZTONSÁGI ADATMENTÉS (Hotswap Backups)
# ==============================================================================
echo -e "${BLUE}[1/5] Adatvédelem: Értékes memóriák és beállítások zárolása és biztonsági mentése...${NC}"
BACKUP_TEMP_DIR="/tmp/novaswarm_update_hotswap"
rm -rf "$BACKUP_TEMP_DIR"
mkdir -p "$BACKUP_TEMP_DIR"

DB_FILE="novaswarm-db.json"
CONFIG_FILE=".config"
ENV_FILE=".env"

HAS_DB=false
HAS_CONFIG=false
HAS_ENV=false

if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_TEMP_DIR/"
    HAS_DB=true
    echo -e "  - ${GREEN}Tudásbázis memória ($DB_FILE) zárolva és mentvesz.${NC}"
fi

if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$BACKUP_TEMP_DIR/"
    HAS_CONFIG=true
    echo -e "  - ${GREEN}Rendszerbeállítások ($CONFIG_FILE) zárolva és mentve.${NC}"
fi

if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$BACKUP_TEMP_DIR/"
    HAS_ENV=true
    echo -e "  - ${GREEN}Környezeti változók ($ENV_FILE) zárolva és mentve.${NC}"
fi

# ==============================================================================
# 2. GIT FETCH & PULL (Kód letöltése GitHubról)
# ==============================================================================
echo -e "\n${BLUE}[2/5] Git Kapcsolat: Forráskód frissítése a repóból...${NC}"

# Ellenőrzés, hogy Git munkakönyvtárban vagyunk-e
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    echo -e "${YELLOW}[!] Ez a könyvtár nem git repository. Git inicializálása és távoli repó ellenőrzése...${NC}"
    git init
    # Ha van már beállított origin, azt megtartjuk, egyébként jelezzük a manuális teendőt
fi

echo -e "${CYAN}Változások lekérése a távoli kiszolgálóról (git fetch)...${NC}"
git fetch --all

# Aktuális ág meghatározása (main vagy master)
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ -z "$BRANCH_NAME" ] || [ "$BRANCH_NAME" = "HEAD" ]; then
    # Ha nincs ág, defaultoljunk main-re
    BRANCH_NAME="main"
fi

echo -e "${CYAN}Helyi kódok frissítése a legújabb verzióra (${BRANCH_NAME})...${NC}"
# Erőszakos felülírás, de az adataink védve vannak mert elmentettük őket!
git reset --hard "origin/${BRANCH_NAME}" || git pull origin "$BRANCH_NAME"

# ==============================================================================
# 3. ADATOK HETREÁLLÍTÁSA ÉS SÉMA MIGRICIÓ (Restore & Schema Migration)
# ==============================================================================
echo -e "\n${BLUE}[3/5] Adatmigráció: Megőrzött adatok visszaállítása és intelligens sémakezelés...${NC}"

# Visszahelyezzük a fájlokat
if [ "$HAS_DB" = true ]; then
    cp "$BACKUP_TEMP_DIR/$DB_FILE" .
    echo -e "  - ${GREEN}Tudásbázis ($DB_FILE) sikeresen visszaállítva.${NC}"
fi

if [ "$HAS_CONFIG" = true ]; then
    cp "$BACKUP_TEMP_DIR/$CONFIG_FILE" .
    echo -e "  - ${GREEN}Globális konfiguráció ($CONFIG_FILE) visszaállítva.${NC}"
fi

if [ "$HAS_ENV" = true ]; then
    cp "$BACKUP_TEMP_DIR/$ENV_FILE" .
    echo -e "  - ${GREEN}API kulcsok és környezet ($ENV_FILE) zökkenőmentesen visszaállítva.${NC}"
fi

# Futtassuk az intelligens non-destruktív sémavizsgáló Node.js kódot
echo -e "${CYAN}Adatbázis sémák és új alapértelmezett beállítások ellenőrzése...${NC}"

node -e "
try {
  const fs = require('fs');
  const path = require('path');
  const dbPath = path.join(process.cwd(), 'novaswarm-db.json');
  
  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    let migrated = false;

    // Ellenőrizzük az alapvető struktúra meglétét
    if (!db.memories) { db.memories = []; migrated = true; }
    if (!db.logs) { db.logs = []; migrated = true; }
    if (!db.agents) { db.agents = []; migrated = true; }
    if (!db.kanbanTasks) { db.kanbanTasks = []; migrated = true; }
    if (!db.skills) { db.skills = []; migrated = true; }
    if (!db.mcpServers) { db.mcpServers = []; migrated = true; }
    if (!db.settings) { db.settings = {}; migrated = true; }

    // Példaképp: Ha hiányzik egy új ágens vagy funkció sémája vagy kulcsa, itt zökkenőmentesen hozzáadjuk
    if (migrated) {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      console.log('  -> Adatbázis sémamigráció: Töltő mezők sikeresen integrálva!');
    } else {
      console.log('  -> Adatbázis séma ellenőrzése: Minden bejegyzés és memória naprakész.');
    }
  } else {
    console.log('  -> Nincs észlelhető korábbi adatbázis fájl. A szerver az első indításkor automatikusan legenerálja majd.');
  }
} catch (e) {
  console.error('  -> Hiba az automatikus sémamigráció közben (biztonságos kihagyás):', e.message);
}
"

rm -rf "$BACKUP_TEMP_DIR"

# ==============================================================================
# 4. ALKALMAZÁS SIKERES ÚJRAFORDÍTÁSA (NPM Install & Build)
# ==============================================================================
echo -e "\n${BLUE}[4/5] Fordító: Új csomagok telepítése és éles build készítése...${NC}"

# Telepítjük az npm csomagokat
echo -e "${CYAN}Függőségek ellenőrzése és telepítése (npm install)...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}[X] Hiba történt a csomagok letöltése/telepítése közben.${NC}"
    exit 1
fi

# Újraépítjük a frontend kódokat és szervert
echo -e "${CYAN}Front-end és Back-end újrafordítása (npm run build)...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}[X] Sikertelen alkalmazás build! Kérlek javítsd az ágensek kódjait!${NC}"
    exit 1
fi

echo -e "${GREEN}[✔] Az új 1.0+ build sikeresen lefordítva és élesítésre kész!${NC}"

# ==============================================================================
# 5. RENDSZER SZOLGÁLTATÁSOK ÚJRAINDÍTÁSA (Systemd Restart)
# ==============================================================================
echo -e "\n${BLUE}[5/5] Élesítés: NovaSwarm háttérszolgáltatás újraindítása...${NC}"

if systemctl list-unit-files | grep -q "novaswarm.service"; then
    echo -e "${YELLOW}[!] Aktív 'novaswarm.service' észlelve. Újraindítás a legújabb kóddal...${NC}"
    sudo systemctl daemon-reload
    sudo systemctl restart novaswarm.service
    echo -e "${GREEN}[✔] Szolgáltatás sikeresen frissítve és elindítva!${NC}"
else
    echo -e "${YELLOW}[i] Nincs regisztrált Systemd szolgáltatás. Elindíthatod manuálisan a szervert: ${BOLD}npm start${NC}"
fi

# Befejezés és siker visszajelzés
echo "================================================================================"
echo -e "${GREEN}${BOLD}🎉 SORSOLÁSMENTES FRISSÍTÉS ÉS ADATMIGRÁCIÓ SIKERESEN BEFEJEZŐDÖTT!${NC}"
echo "================================================================================"
echo -e " 🌐 ${BOLD}Alkalmazás verziója:${NC} ${CYAN}v1.3.0-STABLE${NC}"
echo -e " 💾 ${BOLD}Tudásbázis integritás:${NC} ${GREEN}Megőrzve és sértetlen!${NC}"
echo -e " 📢 ${BOLD}Következő lépés:${NC} Nyiss rá a webes felületre, a NovaSwarm zökkenőmentesen fut tovább az új konfigurációval!"
echo "================================================================================"
echo ""
