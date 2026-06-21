#!/usr/bin/env bash

# ==============================================================================
#                  NOVASWARM AI INTERAKTÍV ELTÁVOLÍTÓ PARANCSFÁJL
# ==============================================================================
# Támogatott OS: Helyi Linux Mint / Ubuntu / Debian alapú disztribúciók
# Kiadás: v1.3.0 STABLE (Magyar verzió)
# Privilégiumok: Szükség esetén 'sudo' a systemd szolgáltatás törléséhez.
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
echo -e "${RED}${BOLD}"
echo "  _   _                    ____                                      ___ "
echo " | \ | | ___  _   _  __ _ / ___|__      ____ _ _ __ _ __ ___        / _ \ "
echo " |  \| |/ _ \| | | |/ _\` |\___ \\\ \ /\ / / _\` | '__| '_ \` _ \      | | | |"
echo " | |\  | (_) | |_| | (_| | ___) |\ V  V / (_| | |  | | | | | |  _  | |_| |"
echo " |_| \_|\___/ \__,_|\__,_||____/  \_/\_/ \__,_|_|  |_| |_| |_| (_)  \___/ "
echo "                                                                         "
echo -e "${WHITE}               --- NOVASWARM AI MULTI-ÁGENS ELTÁVOLÍTÓ ---${NC}"
echo -e "${YELLOW}                      Biztonságos és Tisztító Rendszer${NC}"
echo "================================================================================"

# Ellenőrzés, hogy Bash környezetben fut-e
if [ -z "$BASH_VERSION" ]; then
    echo -e "${RED}Hiba: Ez a parancsfájl Bash parancsértelmezőt igényel.${NC}"
    exit 1
fi

# Megerősítés kérése
echo -e "\n${YELLOW}${BOLD}[FIGYELMEZTETÉS]${NC}"
echo -e "Biztosan szeretnéd eltávolítani a ${BOLD}NovaSwarm AI Rendszert${NC} erről a számítógépről?"
read -p "👉 Írd be, hogy 'IGEN' az eltávolításhoz (bármi más megszakítja): " CONFIRM_UNINSTALL

if [ "$CONFIRM_UNINSTALL" != "IGEN" ] && [ "$CONFIRM_UNINSTALL" != "igen" ]; then
    echo -e "\n${GREEN}[✔] Eltávolítás megszakítva. A NovaSwarm továbbra is aktív és biztonságos!${NC}\n"
    exit 0
fi

echo -e "\n${BLUE}[i] Eltávolítási folyamat elindítva...${NC}"

# ==============================================================================
# 1. LÉPÉS: Systemd háttérszolgáltatás leállítása és törlése
# ==============================================================================
echo -e "\n${CYAN}1. Lépés: Rendszerszolgáltatás ellenőrzése és törlése...${NC}"
if systemctl list-unit-files | grep -q "novaswarm.service"; then
    echo -e "${YELLOW}[!] 'novaswarm.service' észlelve. Szolgáltatás leállítása...${NC}"
    sudo systemctl stop novaswarm.service 2>/dev/null
    sudo systemctl disable novaswarm.service 2>/dev/null
    
    echo -e "${YELLOW}[!] Szolgáltatás konfigurációjának törlése...${NC}"
    sudo rm -f /etc/systemd/system/novaswarm.service
    sudo systemctl daemon-reload
    echo -e "${GREEN}[✔] Háttérszolgáltatás sikeresen letiltva és eltávolítva!${NC}"
else
    echo -e "${GREEN}[✔] Nincs aktív 'novaswarm.service' az operációs rendszerben.${NC}"
fi

# ==============================================================================
# 2. LÉPÉS: Felhasználói adatok, beállítások és adatbázis megőrzése / törlése
# ==============================================================================
echo -e "\n${CYAN}2. Lépés: Felhasználói adatok védelme és kezelése...${NC}"
DB_FILE="novaswarm-db.json"
CONFIG_FILE=".config"
ENV_FILE=".env"

DATA_FOUND=false
if [ -f "$DB_FILE" ] || [ -f "$CONFIG_FILE" ] || [ -f "$ENV_FILE" ]; then
    DATA_FOUND=true
fi

if [ "$DATA_FOUND" = true ]; then
    echo -e "${YELLOW}[!] Értékes adatokat és korábbi beállításokat találtunk (memóriák, API kulcsok, konfiguráció).${NC}"
    echo "Mit szeretnél tenni ezekkel az adatokkal?"
    echo "  1) Biztonsági mentés készítése az eltávolítás előtt (AJÁNLOTT)"
    echo "  2) Végleges, visszaállíthatatlan törlés az összes adattal együtt"
    echo "  3) Kihagyás, maradjanak érintetlenül a mappában"
    read -p "👉 Kérlek válassz egy opciót [1-3, alapértelmezett: 1]: " DATA_OPTION

    if [ -z "$DATA_OPTION" ]; then
        DATA_OPTION="1"
    fi

    case "$DATA_OPTION" in
        1)
            BACKUP_DIR="$HOME/novaswarm_backup_$(date +%Y%m%d_%H%M%S)"
            echo -e "${BLUE}[i] Biztonsági mentés mappa létrehozása: ${BACKUP_DIR}...${NC}"
            mkdir -p "$BACKUP_DIR"
            
            [ -f "$DB_FILE" ] && cp "$DB_FILE" "$BACKUP_DIR/" && echo -e " - ${GREEN}$DB_FILE mentve${NC}"
            [ -f "$CONFIG_FILE" ] && cp "$CONFIG_FILE" "$BACKUP_DIR/" && echo -e " - ${GREEN}$CONFIG_FILE mentve${NC}"
            [ -f "$ENV_FILE" ] && cp "$ENV_FILE" "$BACKUP_DIR/" && echo -e " - ${GREEN}$ENV_FILE mentve${NC}"
            
            # Töröljük a helyi példányokat, ha elkészült a mentés
            rm -f "$DB_FILE" "$CONFIG_FILE" "$ENV_FILE"
            echo -e "${GREEN}[✔] Adatok elmentve ide: ${BOLD}${BACKUP_DIR}${NC}"
            ;;
        2)
            echo -e "${RED}[!] Biztonsági adatok végleges törlése folyamatban...${NC}"
            rm -f "$DB_FILE" "$CONFIG_FILE" "$ENV_FILE"
            echo -e "${GREEN}[✔] Minden érzékeny adatbázis és API kulcs sikeresen megsemmisítve.${NC}"
            ;;
        *)
            echo -e "${YELLOW}[i] Adatbázisok érintetlenül hagyva a jelenlegi könyvtárban.${NC}"
            ;;
    esac
else
    echo -e "${GREEN}[✔] Nincsenek mentett adatok vagy konfigurációk ebben a könyvtárban.${NC}"
fi

# ==============================================================================
# 3. LÉPÉS: Függőségek és fordítási állományok tisztítása
# ==============================================================================
echo -e "\n${CYAN}3. Lépés: Felépített kódok és függőségek (node_modules, dist) eltávolítása...${NC}"
read -p "👉 Szeretnéd törölni a tárhelyet foglaló 'node_modules' és 'dist' mappákat? [I/n]: " CLEAN_DEP_ANS

if [[ ! "$CLEAN_DEP_ANS" =~ ^[Nn]$ ]]; then
    echo -e "${BLUE}[i] Mappák tisztítása folyamatban...${NC}"
    rm -rf node_modules dist
    echo -e "${GREEN}[✔] Node függőségek és compiled fájlok sikeresen letörölve.${NC}"
else
    echo -e "${YELLOW}[i] Függőségek és build mappák megőrizve.${NC}"
fi

# Befejezés
echo "================================================================================"
echo -e "${GREEN}${BOLD}🎉 A NOVASWARM AI SZOLGÁLTATÁS SIKERESEN ELTÁVOLÍTVA AZ OPERÁCIÓS RENDSZERBŐL!${NC}"
echo "================================================================================"
echo -e "${WHITE}Ha a jövőben újra szeretnéd indítani a több-ágenses Command Centert,"
echo -e "csak futtasd újra a telepítőt:${NC}  ${BOLD}./install.sh${NC}\n"
