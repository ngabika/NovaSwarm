#!/usr/bin/env bash

# ==============================================================================
#                  NOVASWARM AI INTERAKTÍV TELEPÍTŐ & GAZDAGÉP INTEGRÁTOR
# ==============================================================================
# Támogatott rendszer: Linux Mint / Ubuntu / Debian alapú disztribúciók
# Jogosultság: Ajánlott sudo jogosultság a rendszerszintű függőségek és a systemd miatt.
# ==============================================================================

# Színes formázási kódok a gyönyörű terminál élményért
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

# ASCII Art fejléc kirajzolása
echo -e "${CYAN}${BOLD}"
echo "  _   _                    ____                                      ___ "
echo " | \ | | ___  _   _  __ _ / ___|__      ____ _ _ __ _ __ ___        / _ \ "
echo " |  \| |/ _ \| | | |/ _\` |\___ \\\ \ /\ / / _\` | '__| '_ \` _ \      | | | |"
echo " | |\  | (_) | |_| | (_| | ___) |\ V  V / (_| | |  | | | | | |  _  | |_| |"
echo " |_| \_|\___/ \__,_|\__,_||____/  \_/\_/ \__,_|_|  |_| |_| |_| (_)  \___/ "
echo "                                                                         "
echo -e "${WHITE}           --- AUTONÓM AI ÁGENS CSAPAT KOORDINÁCIÓS RENDSZER ---${NC}"
echo -e "${YELLOW}                 Interaktív Gazdagép-Telepítő és Rendszerbeállító${NC}"
echo "================================================================================"

# Ellenőrizzük, hogy bash fészekben vagyunk-e
if [ -z "$BASH_VERSION" ]; then
    echo -e "${RED}Hiba: Ez a telepítő script Bash parancsértelmezőt igényel.${NC}"
    exit 1
fi

echo -e "\n${BOLD}[1. FÁZIS] Rendszerkövetelmények és függőségek ellenőrzése...${NC}"

# 1. CURL ellenőrzése és telepítése
if ! command -v curl &> /dev/null; then
    echo -e "${YELLOW}[!] A 'curl' eszköz nem található. Telepítés indítása...${NC}"
    sudo apt-get update && sudo apt-get install -y curl
    if [ $? -ne 0 ]; then
        echo -e "${RED}[X] Nem sikerült a 'curl' telepítése. Kérjük telepítsd manuálisan!${NC}"
        exit 1
    fi
    echo -e "${GREEN}[V] 'curl' sikeresen telepítve.${NC}"
else
    echo -e "${GREEN}[V] 'curl' rendelkezésre áll.${NC}"
fi

# 2. Node.js és npm ellenőrzése / automatikus telepítése NodeSource-ról
INSTALL_NODE=false
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}[!] A Node.js nem található a rendszeren.${NC}"
    INSTALL_NODE=true
else
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 18 ]; then
        echo -e "${YELLOW}[!] Talált Node.js verzió (v$(node -v)) régebbi, mint az ajánlott v18+.${NC}"
        INSTALL_NODE=true
    else
        echo -e "${GREEN}[V] Megfelelő Node.js verzió észlelve: v$(node -v)${NC}"
    fi
fi

if [ "$INSTALL_NODE" = true ]; then
    echo -e "${YELLOW}[?] Szeretnéd, hogy a telepítő automatikusan feltelepítse a Node.js v20 LTS (stabil) verziót? [I/n]${NC}"
    read -p "Válaszod: " install_node_ans
    if [[ "$install_node_ans" =~ ^[Nn]$ ]]; then
        echo -e "${RED}[X] A Node.js telepítése kihagyva. A NovaSwarm futásához Node.js v18+ szükséges!${NC}"
        exit 1
    else
        echo -e "${BLUE}[i] Node.js v20 LTS szoftvertár hozzáadása a rendszerhez...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        echo -e "${BLUE}[i] Node.js és npm csomagok telepítése...${NC}"
        sudo apt-get install -y nodejs
        if ! command -v node &> /dev/null; then
            echo -e "${RED}[X] Sikertelen Node.js telepítés. Kérjük telepítsd manuálisan.${NC}"
            exit 1
        fi
        echo -e "${GREEN}[V] Node.js v$(node -v) és npm v$(npm -v) sikeresen feltelepítve!${NC}"
    fi
else
    echo -e "${GREEN}[V] Node.js és npm rendben van.${NC}"
fi

# 3. Alapkövetelmények (Git, Build-essential) ellenőrzése
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}[!] Giccsomagok nem találhatók. Git telepítése...${NC}"
    sudo apt-get install -y git
fi

echo -e "\n${GREEN}[✔] Rendszerszintű szoftverek ellenőrzése sikeres!${NC}"
echo "================================================================================"

echo -e "\n${BOLD}[2. FÁZIS] Konfigurációs paraméterek megadása${NC}"
echo -e "${BLUE}Itt adhatod meg az ágensek működéséhez és a Telegram párosításhoz szükséges adatokat.${NC}"
echo -e "${BLUE}Az értékek közvetlenül a .env fájlba kerülnek mentésre.${NC}\n"

# Gemini API Kulcs bekérése
GEMINI_KEY=""
while [ -z "$GEMINI_KEY" ]; do
    read -p "👉 Google Gemini API Kulcs (kötelező): " GEMINI_KEY
    if [ -z "$GEMINI_KEY" ]; then
        echo -e "${RED}[!] Az API Kulcs megadása kötelező az ágensek működéséhez!${NC}"
    fi
done

# Telegram Bot Token bekérése (opcionális)
read -p "👉 Telegram Bot Token (opcionális, nyomj Enter-t a kihagyáshoz): " TELE_TOKEN

# Telegram Chat ID bekérése (opcionális)
read -p "👉 Telegram Csoport / Chat ID (opcionális, nyomj Enter-t a kihagyáshoz): " TELE_CHAT

# Port konfiguráció
read -p "👉 Webes kezelőfelület portja [alapértelmezett: 3000]: " USER_PORT
if [ -z "$USER_PORT" ]; then
    USER_PORT="3000"
fi

# Alkalmazás elérési URL
read -p "👉 Gazdagép külső URL-je [alapértelmezett: http://localhost:$USER_PORT]: " USER_URL
if [ -z "$USER_URL" ]; then
    USER_URL="http://localhost:$USER_PORT"
fi

# Gazdagép parancsvégrehajtás és teljes root hozzáférés opció
echo -e "\n${YELLOW}${BOLD}[BIZTONSÁGI JÓVÁHAGYÁS]${NC}"
echo -e "${YELLOW}Szeretnél teljes parancsvégrehajtási és fájlírási (root/gazda) jogot adni Gábornak${NC}"
echo -e "${YELLOW}és az ágens csapatnak ezen a Linux Mint kliensen? Ez lehetővé teszi számukra, hogy:${NC}"
echo -e " - Automatikusan felderítsék és kijelezzék a géphez csatlakoztatott eszközöket (USB, PCI, audió)"
echo -e " - Saját magukat fejlesszék fájlok kiírásával és módosításával"
echo -e " - Teszteljék és telepítsék az új kiegészítéseket és egyedi parancsokat"
read -p "👉 Engedélyezed a teljes gazdegép-kontrollt az ágenseknek? [I/n]: " ROOT_EXEC_ANS

if [[ "$ROOT_EXEC_ANS" =~ ^[Nn]$ ]]; then
    ROOT_EXEC="false"
    echo -e "${YELLOW}[!] Gazda hozzáférés letiltva. Az ágensek csak szimulációs környezetben futnak majd.${NC}"
else
    ROOT_EXEC="true"
    echo -e "${GREEN}[✔] Teljes gazdagép kontroll engedélyezve az ágens rendszerben! Gábor büszke rád.${NC}"
fi

# .env fájl generálása
echo -e "\n${BLUE}[i] .env konfigurációs fájl létrehozása...${NC}"
cat << EOF > .env
# Rendszerszintű NovaSwarm környezeti változók
PORT=$USER_PORT
APP_URL=$USER_URL

# Ágens agykapcsolat (Gemini API)
GEMINI_API_KEY="$GEMINI_KEY"

# Telegram értesítési és csatorna bot kapcsolatok
TELEGRAM_BOT_TOKEN="$TELE_TOKEN"
TELEGRAM_CHAT_ID="$TELE_CHAT"

# Gazdagép rendszer-integráció engedélyezése
HOST_FULL_EXEC_AUTHORIZED=$ROOT_EXEC
EOF

echo -e "${GREEN}[✔] .env fájl sikeresen konfigurálva.${NC}"
echo "================================================================================"

echo -e "\n${BOLD}[3. FÁZIS] Alkalmazás csomagok telepítése és felépítése (Build)${NC}"
echo -e "${BLUE}[i] npm csomagok letöltése (ez eltarthat 1-2 percig a hálózattól függően)...${NC}"

# Csomaglista telepítése
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[X] Hiba történt az npm csomagok letöltése közben. Ellenőrizd az internetkapcsolatot és futtasd újra!${NC}"
    exit 1
fi
echo -e "${GREEN}[✔] Csomagok sikeresen telepítve.${NC}"

# Alkalmazás fordítása (Build)
echo -e "${BLUE}[i] React frontend és Express backend szerver fordítása...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}[X] Nem sikerült lefordítani az alkalmazást.${NC}"
    exit 1
fi
echo -e "${GREEN}[✔] Sikeres build folyamat.${NC}"
echo "================================================================================"

echo -e "\n${BOLD}[4. FÁZIS] Automatikus háttérszolgáltatás regisztráció (Systemd)${NC}"

# Megkérdezzük a felhasználót az automatikus indításról
read -p "👉 Szeretnéd, hogy a NovaSwarm automatikusan elinduljon a számítógép bekapcsolásakor (systemd háttérfolyamat)? [I/n]: " SYSTEMD_ANS

if [[ "$SYSTEMD_ANS" =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}[i] Rendszerindító szolgáltatás regisztrációja kihagyva.${NC}"
else
    # Szolgáltatás fájl előkészítése
    CURR_DIR=$(pwd)
    NPM_PATH=$(which npm)
    
    if [ -z "$NPM_PATH" ]; then
        NPM_PATH="/usr/bin/npm"
    fi

    echo -e "${BLUE}[i] Systemd konfigurációs fájl generálása...${NC}"
    
    # Systemd egység létrehozása átmeneti fájlba
    cat << EOF > novaswarm.service
[Unit]
Description=NovaSwarm Autonomous AI Agent Swarm Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$CURR_DIR
ExecStart=$NPM_PATH start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # Bejegyzés másolása a helyére
    sudo mv novaswarm.service /etc/systemd/system/novaswarm.service
    sudo chown root:root /etc/systemd/system/novaswarm.service
    
    # Rendszer betöltése
    echo -e "${BLUE}[i] Háttérszolgáltatás aktiválása és elindítása...${NC}"
    sudo systemctl daemon-reload
    sudo systemctl enable novaswarm.service
    sudo systemctl restart novaswarm.service
    
    echo -e "${GREEN}[✔] A 'novaswarm.service' sikeresen konfigurálva, engedélyezve és elindítva!${NC}"
fi

echo "================================================================================"
echo -e "${GREEN}${BOLD}🎉 GRATULÁLUNK! A NOVASWARM AI SIKERESEN TELEPÍTVE LETT A LINUX MINT RENDSZERRE!${NC}"
echo "================================================================================"
echo -e "\n${BOLD}Rendszer részletei és kezelése:${NC}"
echo -e " 🌐 ${BOLD}Kezelőfelület elérhetősége:${NC} ${CYAN}http://localhost:$USER_PORT${NC} (vagy ${CYAN}$USER_URL${NC})"
echo -e " ⚡ ${BOLD}Helyi hardverek állapota:${NC} Csatlakoztatott USB/PCI eszközök beolvasva és Gáborék Swarm Memóriájába töltve!"
if [ "$ROOT_EXEC" = "true" ]; then
    echo -e " 💻 ${BOLD}Root / Gazdagép parancskihasználás:${NC} ${GREEN}ENGEDÉLYEZVE${NC}. Gábor képes futtatni helyi parancsokat és fájlrendszert írni!"
else
    echo -e " 💻 ${BOLD}Root / Gazdagép parancskihasználás:${NC} ${RED}KORLÁTOZOTT${NC} (Biztonságos homokozó mód)."
fi

if [[ ! "$SYSTEMD_ANS" =~ ^[Nn]$ ]]; then
    echo -e "\n${BOLD}Alapvető parancsok a háttérszolgáltatás kezeléséhez:${NC}"
    echo -e "  - ${YELLOW}Rendszer állapotának megtekintése:${NC}  sudo systemctl status novaswarm"
    echo -e "  - ${YELLOW}Rendszer live naplózása (Logs):${NC}    journalctl -u novaswarm -f"
    echo -e "  - ${YELLOW}Rendszer újraindítása:${NC}            sudo systemctl restart novaswarm"
    echo -e "  - ${YELLOW}Rendszer leállítása:${NC}              sudo systemctl stop novaswarm"
fi

echo -e "\n${PURPLE}Most már megnyithatod a böngészőt, aktiválhatod az ágenseket a fenti címen,${NC}"
echo -e "${PURPLE}és élvezheted az autonóm együttműködő AI csapatodat a saját fizikai Linux Mint gépeden!${NC}\n"
