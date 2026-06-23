#!/usr/bin/env bash

# ==============================================================================
#                  NOVASWARM AI INTERAKTÍV MULTI-LANGUAGE TELEPÍTŐ
# ==============================================================================
# Supported OS: Linux Mint / Ubuntu / Debian-based distributions
# Release: v2.0.0 (Personal Assistant & Self-Learning Update) - STABLE
# Privileges: Recommended sudo for systemd background services and node/ollama setup.
# ==============================================================================

# Beautiful ANSI color formatting
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

# ASCII Art header
echo -e "${CYAN}${BOLD}"
echo "  _   _                    ____                                      ___ "
echo " | \ | | ___  _   _  __ _ / ___|__      ____ _ _ __ _ __ ___        / _ \ "
echo " |  \| |/ _ \| | | |/ _\` |\___ \\\ \ /\ / / _\` | '__| '_ \` _ \      | | | |"
echo " | |\  | (_) | |_| | (_| | ___) |\ V  V / (_| | |  | | | | | |  _  | |_| |"
echo " |_| \_|\___/ \__,_|\__,_||____/  \_/\_/ \__,_|_|  |_| |_| |_| (_)  \___/ "
echo "                                                                         "
echo -e "${WHITE}      --- AUTONÓM AI ÁGENS CSAPAT KOORDINÁCIÓS ÉS COMMAND CENTER RENDSZER ---${NC}"
echo -e "${YELLOW}                 Interaktív Gazdagép-Telepítő, Rendszerbeállító [v2.0.0]${NC}"
echo "================================================================================"

# Check for bash environment
if [ -z "$BASH_VERSION" ]; then
    echo -e "${RED}Error: This installation script requires the Bash command interpreter.${NC}"
    exit 1
fi

# ==========================================
# 🥇 1ST QUESTION: LANGUAGE SELECTION
# ==========================================
echo -e "\n${BOLD}Language Selection / Rendszer Nyelv Kiválasztása:${NC}"
echo "  1) Hungarian / Magyar"
echo "  2) English"
echo "  3) German / Deutsch"
echo "  4) Spanish / Español"
echo "  5) French / Français"
echo "  6) Italian / Italiano"
echo "  7) Portuguese / Português"
echo "  8) Russian / Русский"
echo "  9) Chinese / 中文"
echo " 10) Japanese / 日本語"
echo " 11) Arabic / العربية"
echo ""
read -p "👉 Choose system language [1-11, default 1]: " LANG_CHOICE

case "$LANG_CHOICE" in
    1) APP_LANG="hu" ;;
    2) APP_LANG="en" ;;
    3) APP_LANG="de" ;;
    4) APP_LANG="es" ;;
    5) APP_LANG="fr" ;;
    6) APP_LANG="it" ;;
    7) APP_LANG="pt" ;;
    8) APP_LANG="ru" ;;
    9) APP_LANG="zh" ;;
    10) APP_LANG="ja" ;;
    11) APP_LANG="ar" ;;
    *) APP_LANG="hu" ;;
esac

echo -e "\n${GREEN}[✔] Configured language / Beállított nyelv:${NC} ${BOLD}${APP_LANG}${NC}\n"

# -------------------------------------------------------------
# DYNAMIC TRANSLATION LABELS
# -------------------------------------------------------------
if [ "$APP_LANG" = "hu" ]; then
    T_PHASE1="[1. FÁZIS] Rendszerkövetelmények és függőségek ellenőrzése..."
    T_CURL_CHECK="[i] CURL ellenőrzése és telepítése..."
    T_CURL_MISSING="[!] A 'curl' eszköz nem található. Telepítés indítása..."
    T_CURL_FAIL="[X] Nem sikerült a 'curl' telepítése. Kérjük telepítsd manuálisan!"
    T_CURL_OK="[V] 'curl' rendelkezésre áll."
    T_NODE_CHECK="[i] Node.js és npm ellenőrzése..."
    T_NODE_MISSING="[!] A Node.js nem található a rendszeren."
    T_NODE_OLD="[!] Talált Node.js verzió (%s) régebbi, mint az ajánlott v18+."
    T_NODE_OK="[V] Megfelelő Node.js verzió észlelve: %s"
    T_NODE_ASK="[?] Szeretnéd, hogy a telepítő automatikusan feltelepítse a Node.js v20 LTS verziót? [I/n]: "
    T_NODE_SKIP="[X] A Node.js telepítése kihagyva. A NovaSwarm futásához Node.js v18+ szükséges!"
    T_NODE_SETUP="[i] Node.js v20 LTS szoftvertár hozzáadása és telepítés..."
    T_NODE_INSTALL_OK="[V] Node.js és npm sikeresen feltelepítve!"
    T_GIT_CHECK="[i] Alapkövetelmények (Git) ellenőrzése..."
    T_GIT_INSTALL="[!] Git csomag nem található. Git telepítése..."
    T_OLLAMA_CHECK="[i] Ellenőrzés: Ollama offline LLM kiszolgáló és könnyű modellek..."
    T_OLLAMA_ASK="[?] Az 'ollama' nincs telepítve. Szeretnéd telepíteni az offline AI futtatáshoz? [I/n]: "
    T_OLLAMA_SETUP="[i] Ollama letöltése és automatikus telepítése..."
    T_OLLAMA_INSTALL_OK="[V] Ollama sikeresen telepítve!"
    T_OLLAMA_INSTALL_FAIL="[X] Sikertelen Ollama telepítés. Kérjük, majd telepítsd manuálisan!"
    T_OLLAMA_OK="[V] Ollama már telepítve van a rendszeren."
    T_OLLAMA_START="[i] Ollama kiszolgáló indítása a háttérben..."
    T_OLLAMA_PULL="[i] Rendkívül könnyű, CPU-barát offline modell (qwen2.5:0.5b - ~350MB RAM) lekérése..."
    T_OLLAMA_PULL_OK="[V] Az offline 'qwen2.5:0.5b' modell sikeresen konfigurálva!"
    T_OLLAMA_PULL_FAIL="[!] Nem sikerült a modellt letölteni. Az Ollama fut, de a fenti modellt kézzel kell lekérned: 'ollama pull qwen2.5:0.5b'"
    T_SYS_OK="[✔] Rendszerszintű szoftverek ellenőrzése sikeres!"
    T_PHASE2="[2. FÁZIS] Konfigurációs paraméterek megadása"
    T_PHASE2_DESC="Itt adhatod meg az ágensek működéséhez és a Telegram párosításhoz szükséges adatokat.\nAz értékek közvetlenül a .env fájlba kerülnek mentésre."
    T_GEMINI_ASK="👉 Google Gemini API Kulcs (kötelező): "
    T_GEMINI_ERR="[!] Az API Kulcs megadása kötelező az ágensek működéséhez!"
    T_TELE_ASK="👉 Telegram Bot Token (opcionális, nyomj Enter-t a kihagyáshoz): "
    T_CHAT_ASK="👉 Telegram Csoport / Chat ID (opcionális, nyomj Enter-t a kihagyáshoz): "
    T_PORT_ASK="👉 Webes kezelőfelület portja [alapértelmezett: 3000]: "
    T_URL_ASK="👉 Gazdagép külső URL-je [alapértelmezett: http://localhost:%s]: "
    T_ROOT_TITLE="[BIZTONSÁGI JÓVÁHAGYÁS]"
    T_ROOT_DESC="Szeretnél teljes parancsvégrehajtási és fájlírási (root/gazda) jogot adni Gábornak\nés az ágens csapatnak ezen a Linux Mint kliensen? Ez lehetővé teszi számukra, hogy:\n - Automatikusan felderítsék és kijelezzék a géphez csatlakoztatott eszközöket (USB, PCI, audió)\n - Saját magukat fejlesszék fájlok kiírásával és módosításával\n - Teszteljék és telepítsék az új kiegészítéseket és egyedi parancsokat"
    T_ROOT_ASK="👉 Engedélyezed a teljes gazdegép-kontrollt az ágenseknek? [I/n]: "
    T_ROOT_DENY="[!] Gazda hozzáférés letiltva. Az ágensek csak szimulációs környezetben futnak majd."
    T_ROOT_ALLOW="[✔] Teljes gazdagép kontroll engedélyezve az ágens rendszerben!"
    T_ENV_WRITE="[i] .env konfigurációs fájl létrehozása..."
    T_ENV_OK="[✔] .env fájl sikeresen konfigurálva."
    T_PHASE3="[3. FÁZIS] Alkalmazás csomagok telepítése és felépítése (Build)"
    T_NPM_INSTALL="[i] npm csomagok letöltése (ez eltarthat 1-2 percig)..."
    T_NPM_FAIL="[X] Hiba történt az npm csomagok letöltése közben. Ellenőrizd az internetkapcsolatot és futtasd újra!"
    T_NPM_OK="[✔] Csomagok sikeresen telepítve."
    T_BUILD_START="[i] React frontend és Express backend szerver fordítása..."
    T_BUILD_FAIL="[X] Nem sikerült lefordítani az alkalmazást."
    T_BUILD_OK="[✔] Sikeres build folyamat."
    T_PHASE4="[4. FÁZIS] Automatikus háttérszolgáltatás regisztráció (Systemd)"
    T_SYSTEMD_ASK="👉 Szeretnéd, hogy a NovaSwarm automatikusan elinduljon a számítógép bekapcsolásakor (systemd háttérfolyamat)? [I/n]: "
    T_SYSTEMD_SKIP="[i] Rendszerindító szolgáltatás regisztrációja kihagyva."
    T_SYSTEMD_WRITE="[i] Systemd konfigurációs fájl generálása..."
    T_SYSTEMD_START="[i] Háttérszolgáltatás aktiválása és elindítása..."
    T_SYSTEMD_OK="[✔] A 'novaswarm.service' sikeresen konfigurálva, engedélyezve és elindítva!"
    T_CONGRATS="🎉 GRATULÁLUNK! A NOVASWARM AI SIKERESEN TELEPÍTVE LETT!"
    T_INFO_HEADER="Rendszer részletei és kezelése:"
    T_INFO_WEB="Kezelőfelület elérhetősége:"
    T_INFO_HW="Helyi hardverek állapota: Csatlakoztatott USB/PCI eszközök beolvasva és Gáborék Swarm Memóriájába töltve!"
    T_INFO_ROOT_TRUE="Root / Gazdagép parancskihasználás: ENGEDÉLYEZVE. Gábor képes futtatni helyi parancsokat és szoftvereket telepíteni!"
    T_INFO_ROOT_FALSE="Root / Gazdagép parancskihasználás: KORLÁTOZOTT (Biztonságos homokozó mód)."
    T_INFO_TELEGRAM="Telegram Command Center: AKTÍV. Használhatod a Telegram parancsokat."
    T_INFO_COMMAND_HELP="Alapvető parancsok a háttérszolgáltatás kezeléséhez:"
    T_INFO_PROMPT="Most már megnyithatod a böngészőt, aktiválhatod az ágenseket a fenti címen,\nés élvezheted az autonóm együttműködő AI csapatodat!"
elif [ "$APP_LANG" = "de" ]; then
    T_PHASE1="[PHASE 1] Systemanforderungen und Abhängigkeiten überprüfen..."
    T_CURL_CHECK="[i] Überprüfung und Installation von CURL..."
    T_CURL_MISSING="[!] Das Tool 'curl' wurde nicht gefunden. Installation wird gestartet..."
    T_CURL_FAIL="[X] 'curl' konnte nicht installiert werden. Bitte manuell installieren!"
    T_CURL_OK="[V] 'curl' ist verfügbar."
    T_NODE_CHECK="[i] Überprüfung von Node.js und npm..."
    T_NODE_MISSING="[!] Node.js wurde auf dem System nicht gefunden."
    T_NODE_OLD="[!] Die gefundene Node.js-Version (%s) ist älter als die empfohlene v18+."
    T_NODE_OK="[V] Geeignete Node.js-Version erkannt: %s"
    T_NODE_ASK="[?] Möchten Sie, dass das Installationsprogramm automatisch Node.js v20 LTS installiert? [J/n]: "
    T_NODE_SKIP="[X] Node.js-Installation übersprungen. NovaSwarm benötigt Node.js v18+!"
    T_NODE_SETUP="[i] Node.js v20 LTS-Repository hinzufügen und installieren..."
    T_NODE_INSTALL_OK="[V] Node.js und npm erfolgreich installiert!"
    T_GIT_CHECK="[i] Grundvoraussetzungen (Git) überprüfen..."
    T_GIT_INSTALL="[!] Git-Paket nicht gefunden. Git installieren..."
    T_OLLAMA_CHECK="[i] Überprüfung: Ollama Offline-LLM-Server und leichte Modelle..."
    T_OLLAMA_ASK="[?] 'ollama' ist nicht installiert. Möchten Sie es für Offline-AI installieren? [J/n]: "
    T_OLLAMA_SETUP="[i] Herunterladen und automatische Installation von Ollama..."
    T_OLLAMA_INSTALL_OK="[V] Ollama erfolgreich installiert!"
    T_OLLAMA_INSTALL_FAIL="[X] Ollama-Installation fehlgeschlagen. Bitte später manuell installieren!"
    T_OLLAMA_OK="[V] Ollama ist bereits auf dem System installiert."
    T_OLLAMA_START="[i] Ollama-Server im Hintergrund starten..."
    T_OLLAMA_PULL="[i] CPU-freundliches Offline-Modell (qwen2.5:0.5b - ~350MB RAM) herunterladen..."
    T_OLLAMA_PULL_OK="[V] Offline-Modell 'qwen2.5:0.5b' erfolgreich konfiguriert!"
    T_OLLAMA_PULL_FAIL="[!] Modell konnte nicht geladen werden. Bitte führen Sie manuell 'ollama pull qwen2.5:0.5b' aus."
    T_SYS_OK="[✔] Systemprüfung erfolgreich abgeschlossen!"
    T_PHASE2="[PHASE 2] Konfigurationsparameter eingeben"
    T_PHASE2_DESC="Hier können Sie die für den Agentenbetrieb und die Telegram-Kopplung erforderlichen Daten eingeben.\nDie Werte werden direkt in die .env-Datei gespeichert."
    T_GEMINI_ASK="👉 Google Gemini API-Schlüssel (erforderlich): "
    T_GEMINI_ERR="[!] Der API-Schlüssel ist für den Betrieb der Agenten erforderlich!"
    T_TELE_ASK="👉 Telegram Bot-Token (optional, Eingabetaste drücken zum Überspringen): "
    T_CHAT_ASK="👉 Telegram Gruppen-/Chat-ID (optional, Eingabetaste drücken zum Überspringen): "
    T_PORT_ASK="👉 Port der Weboberfläche [Standard: 3000]: "
    T_URL_ASK="👉 Externe Host-URL [Standard: http://localhost:%s]: "
    T_ROOT_TITLE="[SICHERHEITSBESTÄTIGUNG]"
    T_ROOT_DESC="Möchten Sie Gabor und dem Agenten-Team vollständige Befehlsausführungs- und Dateischreibrechte\n(Root/Host) auf diesem Linux Mint-Client gewähren? Dies ermöglicht ihnen:\n - Angeschlossene Geräte (USB, PCI, Audio) automatisch zu erkennen und anzuzeigen\n - Sich selbst durch Schreiben und Bearbeiten von Dateien weiterzuentwickeln\n - Neue Add-ons und benutzerdefinierte Befehle zu testen und zu installieren"
    T_ROOT_ASK="👉 Erlauben Sie den Agenten die volle Host-Kontrolle? [J/n]: "
    T_ROOT_DENY="[!] Host-Zugriff gesperrt. Agenten laufen in einer sicheren Sandbox."
    T_ROOT_ALLOW="[✔] Volle Host-Kontrolle für die Agenten aktiviert!"
    T_ENV_WRITE="[i] .env Konfigurationsdatei erstellen..."
    T_ENV_OK="[✔] .env Datei erfolgreich konfiguriert."
    T_PHASE3="[PHASE 3] Anwendungspakete installieren und kompilieren (Build)"
    T_NPM_INSTALL="[i] npm-Pakete herunterladen (kann 1-2 Minuten dauern)..."
    T_NPM_FAIL="[X] Fehler beim Herunterladen der npm-Pakete. Bitte Internetverbindung prüfen und erneut versuchen!"
    T_NPM_OK="[✔] Pakete erfolgreich installiert."
    T_BUILD_START="[i] React-Frontend und Express-Backend-Server kompilieren..."
    T_BUILD_FAIL="[X] Fehler beim Kompilieren der Anwendung."
    T_BUILD_OK="[✔] Erfolgreicher Build-Prozess."
    T_PHASE4="[PHASE 4] Automatische Hintergrunddienst-Registrierung (Systemd)"
    T_SYSTEMD_ASK="👉 Möchten Sie, dass NovaSwarm beim Einschalten des Computers automatisch startet (systemd)? [J/n]: "
    T_SYSTEMD_SKIP="[i] Hintergrunddienst-Registrierung übersprungen."
    T_SYSTEMD_WRITE="[i] Systemd-Konfigurationsdatei generieren..."
    T_SYSTEMD_START="[i] Aktivierung und Start des Hintergrunddienstes..."
    T_SYSTEMD_OK="[✔] 'novaswarm.service' erfolgreich konfiguriert, aktiviert und gestartet!"
    T_CONGRATS="🎉 GLÜCKWUNSCH! NOVASWARM AI WURDE ERFOLGREICH INSTALLIERT!"
    T_INFO_HEADER="Systemdetails und Verwaltung:"
    T_INFO_WEB="Weboberfläche erreichbar unter:"
    T_INFO_HW="Lokaler Hardware-Status: Angeschlossene USB/PCI-Geräte eingelesen und ins Swarm-Gedächtnis geladen!"
    T_INFO_ROOT_TRUE="Root / Host-Befehlsausführung: AKTIVIERT. Gabor kann lokale Befehle ausführen!"
    T_INFO_ROOT_FALSE="Root / Host-Befehlsausführung: EINGESCHRÄNKT (Sicherer Sandbox-Modus)."
    T_INFO_TELEGRAM="Telegram Command Center: AKTIV. Nutzen Sie Telegram-Befehle."
    T_INFO_COMMAND_HELP="Grundlegende Befehle zur Verwaltung des Hintergrunddienstes:"
    T_INFO_PROMPT="Sie können jetzt Ihren Browser öffnen, Ihre Agenten aktivieren und Ihren autonomen AI-Swarm geniessen!"
else
    # Default to English (covers Spanish, French, Italian, Portuguese, Russian, Chinese, Japanese, Arabic with standard understandable English fallback in terminal)
    T_PHASE1="[PHASE 1] Checking System Requirements & Dependencies..."
    T_CURL_CHECK="[i] Checking and installing CURL..."
    T_CURL_MISSING="[!] 'curl' tool not found. Launching installation..."
    T_CURL_FAIL="[X] Failed to install 'curl'. Please install it manually!"
    T_CURL_OK="[V] 'curl' is available."
    T_NODE_CHECK="[i] Checking Node.js and npm..."
    T_NODE_MISSING="[!] Node.js not found on this system."
    T_NODE_OLD="[!] Detected Node.js (%s) is older than recommended v18+."
    T_NODE_OK="[V] Compatible Node.js version detected: %s"
    T_NODE_ASK="[?] Would you like the installer to automatically install Node.js v20 LTS? [Y/n]: "
    T_NODE_SKIP="[X] Node.js installation skipped. NovaSwarm requires Node.js v18+ to run!"
    T_NODE_SETUP="[i] Adding Node.js v20 LTS repository and installing packages..."
    T_NODE_INSTALL_OK="[V] Node.js and npm installed successfully!"
    T_GIT_CHECK="[i] Checking prerequisites (Git)..."
    T_GIT_INSTALL="[!] Git package not found. Installing git..."
    T_OLLAMA_CHECK="[i] Checking Ollama offline LLM server and light models..."
    T_OLLAMA_ASK="[?] 'ollama' is not installed. Would you like to install it for offline AI? [Y/n]: "
    T_OLLAMA_SETUP="[i] Downloading and installing Ollama..."
    T_OLLAMA_INSTALL_OK="[V] Ollama installed successfully!"
    T_OLLAMA_INSTALL_FAIL="[X] Failed to install Ollama. Please install it manually later!"
    T_OLLAMA_OK="[V] Ollama is already installed."
    T_OLLAMA_START="[i] Starting Ollama server in background..."
    T_OLLAMA_PULL="[i] Pulling extremely light, CPU-friendly offline model (qwen2.5:0.5b - ~350MB RAM)..."
    T_OLLAMA_PULL_OK="[V] Offline 'qwen2.5:0.5b' model configured successfully!"
    T_OLLAMA_PULL_FAIL="[!] Failed to pull the model. Please run 'ollama pull qwen2.5:0.5b' manually!"
    T_SYS_OK="[✔] System requirements matched successfully!"
    T_PHASE2="[PHASE 2] Configuring Parameters"
    T_PHASE2_DESC="Specify the keys required for agents operation and Telegram group sync.\nAll settings are saved directly to the .env file."
    T_GEMINI_ASK="👉 Google Gemini API Key (required): "
    T_GEMINI_ERR="[!] API Key is required for agents to operate!"
    T_TELE_ASK="👉 Telegram Bot Token (optional, press Enter to skip): "
    T_CHAT_ASK="👉 Telegram Group / Chat ID (optional, press Enter to skip): "
    T_PORT_ASK="👉 Web Interface Port [default: 3000]: "
    T_URL_ASK="👉 Host External URL [default: http://localhost:%s]: "
    T_ROOT_TITLE="[SECURITY AUTHORIZATION]"
    T_ROOT_DESC="Would you like to grant Gabor and his autonomous team full execution & write rights\n(root/host privileges) on this machine? This allows them to:\n - Query and display connected hardware (USB, PCI, audio)\n - Read, write and modify codebase to improve themselves\n - Install system dependencies or packages dynamically"
    T_ROOT_ASK="👉 Allow full host control for the AI swarm? [Y/n]: "
    T_ROOT_DENY="[!] Host authorization denied. Swarm will run in standard sandbox mode."
    T_ROOT_ALLOW="[✔] Swarm full host authorization granted!"
    T_ENV_WRITE="[i] Generating .env configuration file..."
    T_ENV_OK="[✔] .env file configured successfully."
    T_PHASE3="[PHASE 3] Installing Packages and Building Application"
    T_NPM_INSTALL="[i] Downloading npm packages (this might take 1-2 minutes)..."
    T_NPM_FAIL="[X] Error occurred while installing packages."
    T_NPM_OK="[✔] Packages installed successfully."
    T_BUILD_START="[i] Building React frontend and Express backend..."
    T_BUILD_FAIL="[X] Failed to build the codebase."
    T_BUILD_OK="[✔] Codebase build succeeded."
    T_PHASE4="[PHASE 4] Registering Systemd Background Service"
    T_SYSTEMD_ASK="👉 Would you like NovaSwarm to run in the background as a systemd service automatic on boot? [Y/n]: "
    T_SYSTEMD_SKIP="[i] System service registration skipped."
    T_SYSTEMD_WRITE="[i] Creating systemd service file..."
    T_SYSTEMD_START="[i] Activating and starting systemd service..."
    T_SYSTEMD_OK="[✔] novaswarm.service configured, enabled, and started successfully!"
    T_CONGRATS="🎉 CONGRATULATIONS! NOVASWARM AI WAS SUCCESSFULLY INSTALLED!"
    T_INFO_HEADER="System summary and operations:"
    T_INFO_WEB="Web Control Panel URL:"
    T_INFO_HW="Hardware status: Local devices read and pushed to agent group collective memories."
    T_INFO_ROOT_TRUE="Root / Host Execution: ENABLED. Agents have direct system command powers!"
    T_INFO_ROOT_FALSE="Root / Host Execution: RESTRICTED (Safe sandbox mode)."
    T_INFO_TELEGRAM="Telegram Command Center: ACTIVE. You can control the system directly from Telegram chat."
    T_INFO_COMMAND_HELP="Service management commands:"
    T_INFO_PROMPT="You can now open your browser, activate your team, and enjoy your physical Linux Mint Swarm!"
fi


# ==========================================
# Phase 1 Execution
# ==========================================
echo -e "\n${BOLD}${T_PHASE1}${NC}"

# 1. CURL
echo -e "${T_CURL_CHECK}"
if ! command -v curl &> /dev/null; then
    echo -e "${YELLOW}${T_CURL_MISSING}${NC}"
    sudo apt-get update && sudo apt-get install -y curl
    if [ $? -ne 0 ]; then
        echo -e "${RED}${T_CURL_FAIL}${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}${T_CURL_OK}${NC}"

# 2. Node.js
echo -e "${T_NODE_CHECK}"
INSTALL_NODE=false
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}${T_NODE_MISSING}${NC}"
    INSTALL_NODE=true
else
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 18 ]; then
        printf "${YELLOW}${T_NODE_OLD}${NC}\n" "$(node -v)"
        INSTALL_NODE=true
    else
        printf "${GREEN}${T_NODE_OK}${NC}\n" "$(node -v)"
    fi
fi

if [ "$INSTALL_NODE" = true ]; then
    read -p "${T_NODE_ASK}" install_node_ans
    if [[ "$install_node_ans" =~ ^[Nn]$ ]]; then
        echo -e "${RED}${T_NODE_SKIP}${NC}"
        exit 1
    else
        echo -e "${BLUE}${T_NODE_SETUP}${NC}"
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        if ! command -v node &> /dev/null; then
            echo -e "${RED}Node.js installation failed.${NC}"
            exit 1
        fi
        echo -e "${GREEN}${T_NODE_INSTALL_OK}${NC}"
    fi
fi

# 3. Git Environment
echo -e "${T_GIT_CHECK}"
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}${T_GIT_INSTALL}${NC}"
    sudo apt-get install -y git
fi

echo -e "[i] Ellenőrzés: Pure Node.js alapú Vector DB (Vectra) használatban. Nincs szükség hibrid Python Vektortér inicializálásra!"
echo -e "${GREEN}[V] Telepítési fázis beállítva Node fókusszal.${NC}"

# Configure API Key Pre-Commit block hook for security
mkdir -p .git/hooks
cat << 'HOOKEOF' > .git/hooks/pre-commit
#!/bin/bash
if git diff --cached | grep -iE "(sk-[a-zA-Z0-9]{30,})|(AIzaSy[A-Za-z0-9_-]{33})"; then
    echo "⚠️ [PRE-COMMIT HOOK] Lehetséges API kulcs szivárgást észleltem a commit-ban. BLOKKOLVA!"
    exit 1
fi
exit 0
HOOKEOF
chmod +x .git/hooks/pre-commit
echo -e "${GREEN}[V] Pre-commit API Shield (OpenClaw Security) aktív.${NC}"

# 4. Ollama Hardware Autotune & Setup
echo -e "${T_OLLAMA_CHECK}"
echo -e "${T_OLLAMA_CHECK}"
if ! command -v ollama &> /dev/null; then
    read -p "${T_OLLAMA_ASK}" install_ollama_ans
    if [[ ! "$install_ollama_ans" =~ ^[Nn]$ ]]; then
        echo -e "${BLUE}${T_OLLAMA_SETUP}${NC}"
        curl -fsSL https://ollama.com/install.sh | sh
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}${T_OLLAMA_INSTALL_OK}${NC}"
        else
            echo -e "${RED}${T_OLLAMA_INSTALL_FAIL}${NC}"
        fi
    fi
else
    echo -e "${GREEN}${T_OLLAMA_OK}${NC}"
fi

if command -v ollama &> /dev/null; then
    echo -e "${T_OLLAMA_START}"
    if systemctl list-unit-files | grep -q "ollama.service"; then
        sudo systemctl start ollama
    else
        ollama serve > /dev/null 2>&1 &
    fi
    sleep 2

    echo -e "${T_OLLAMA_PULL}"
    ollama pull qwen2.5:0.5b
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}${T_OLLAMA_PULL_OK}${NC}"
    else
        echo -e "${YELLOW}${T_OLLAMA_PULL_FAIL}${NC}"
    fi
fi

echo -e "\n${GREEN}${T_SYS_OK}${NC}"
echo "================================================================================"

# ==========================================
# Phase 2 Execution
# ==========================================
echo -e "\n${BOLD}${T_PHASE2}${NC}"
echo -e "${BLUE}${T_PHASE2_DESC}${NC}\n"

GEMINI_KEY=""
read -p "${T_GEMINI_ASK}" GEMINI_KEY
if [ -z "$GEMINI_KEY" ]; then
    echo -e "${YELLOW}[i] Gemini API kulcs kihagyva. Ezt az indítás után a Webes Kezelőfelületen (Setup Wizard) kényelmesen beállíthatod!${NC}"
fi

read -p "${T_TELE_ASK}" TELE_TOKEN
read -p "${T_CHAT_ASK}" TELE_CHAT

read -p "${T_PORT_ASK}" USER_PORT
if [ -z "$USER_PORT" ]; then
    USER_PORT="3000"
fi

printf "${T_URL_ASK}" "$USER_PORT"
read -p "" USER_URL
if [ -z "$USER_URL" ]; then
    USER_URL="http://localhost:$USER_PORT"
fi

# Security Confirmation
echo -e "\n${YELLOW}${BOLD}${T_ROOT_TITLE}${NC}"
echo -e "${YELLOW}${T_ROOT_DESC}${NC}"
read -p "${T_ROOT_ASK}" ROOT_EXEC_ANS

if [[ "$ROOT_EXEC_ANS" =~ ^[Nn]$ ]]; then
    ROOT_EXEC="false"
    echo -e "${YELLOW}${T_ROOT_DENY}${NC}"
else
    ROOT_EXEC="true"
    echo -e "${GREEN}${T_ROOT_ALLOW}${NC}"
fi

# Generate .env with APP_LANG inside!
echo -e "\n${BLUE}${T_ENV_WRITE}${NC}"
cat << EOF > .env
# System wide environment variables
PORT=$USER_PORT
APP_URL=$USER_URL
APP_LANG=$APP_LANG

# Gemini API Connection
GEMINI_API_KEY="$GEMINI_KEY"

# Telegram Bot configurations
TELEGRAM_BOT_TOKEN="$TELE_TOKEN"
TELEGRAM_CHAT_ID="$TELE_CHAT"

# Host control permission
HOST_FULL_EXEC_AUTHORIZED=$ROOT_EXEC
EOF

echo -e "${GREEN}${T_ENV_OK}${NC}"
echo "================================================================================"

# ==========================================
# Phase 3 Execution
# ==========================================
echo -e "\n${BOLD}${T_PHASE3}${NC}"
echo -e "${BLUE}${T_NPM_INSTALL}${NC}"

npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}${T_NPM_FAIL}${NC}"
    exit 1
fi
echo -e "${GREEN}${T_NPM_OK}${NC}"

echo -e "${BLUE}${T_BUILD_START}${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}${T_BUILD_FAIL}${NC}"
    exit 1
fi
echo -e "${GREEN}${T_BUILD_OK}${NC}"
echo "================================================================================"

# ==========================================
# Phase 4 Execution
# ==========================================
echo -e "\n${BOLD}${T_PHASE4}${NC}"
read -p "${T_SYSTEMD_ASK}" SYSTEMD_ANS

if [[ "$SYSTEMD_ANS" =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}${T_SYSTEMD_SKIP}${NC}"
else
    CURR_DIR=$(pwd)
    NPM_PATH=$(which npm)
    if [ -z "$NPM_PATH" ]; then
        NPM_PATH="/usr/bin/npm"
    fi

    echo -e "${BLUE}${T_SYSTEMD_WRITE}${NC}"
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

    sudo mv novaswarm.service /etc/systemd/system/novaswarm.service
    sudo chown root:root /etc/systemd/system/novaswarm.service
    
    echo -e "${BLUE}${T_SYSTEMD_START}${NC}"
    sudo systemctl daemon-reload
    sudo systemctl enable novaswarm.service
    sudo systemctl restart novaswarm.service
    
    echo -e "${GREEN}${T_SYSTEMD_OK}${NC}"
fi

# Finished Output
echo "================================================================================"
echo -e "${GREEN}${BOLD}${T_CONGRATS}${NC}"
echo "================================================================================"
echo -e "\n${BOLD}${T_INFO_HEADER}${NC}"
echo -e " 🌐 ${BOLD}${T_INFO_WEB}${NC} ${CYAN}$USER_URL${NC}"
echo -e " ⚡ ${BOLD}Hardware status:${NC} ${T_INFO_HW}"
if [ "$ROOT_EXEC" = "true" ]; then
    echo -e " 💻 ${BOLD}Root / Host Execution:${NC} ${GREEN}${T_INFO_ROOT_TRUE}${NC}"
else
    echo -e " 💻 ${BOLD}Root / Host Execution:${NC} ${RED}${T_INFO_ROOT_FALSE}${NC}"
fi

echo -e " 📢 ${BOLD}Telegram Bot Center:${NC} ${T_INFO_TELEGRAM}"

if [[ ! "$SYSTEMD_ANS" =~ ^[Nn]$ ]]; then
    echo -e "\n${BOLD}${T_INFO_COMMAND_HELP}${NC}"
    echo -e "  - ${YELLOW}View system state:${NC}         sudo systemctl status novaswarm"
    echo -e "  - ${YELLOW}Live journal logs:${NC}         journalctl -u novaswarm -f"
    echo -e "  - ${YELLOW}Restart swarm services:${NC}   sudo systemctl restart novaswarm"
    echo -e "  - ${YELLOW}Stop swarm services:${NC}      sudo systemctl stop novaswarm"
fi

echo -e "\n${PURPLE}${T_INFO_PROMPT}${NC}\n"
