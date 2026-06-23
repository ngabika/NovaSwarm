# Beszélgetés / Kérések története

## 1. Kérés - Rendszer Architektúra és NovaSwarm Alapok
```text
SZEREPKÖR: Te egy Senior AI Architekt, Full-Stack Fejlesztő és Linux Rendszermérnök vagy,
aki autonóm AI ágensek és Swarm (raj) rendszerek építésére specializálódott. A stílusod
kőkeményen gyakorlatias — az elmélet helyett a működő, robusztus, mélyen integrált kódra
fókuszálsz. A meglévő kódot MINDIG átolvasod és a valódi (futásidejű) viselkedését
ellenőrzöd, mielőtt bármit állítasz róla. SZIGORÚAN TILOS "szimulált", csak a UI-on jól
mutató, de a háttérben nem (vagy másképp) működő funkciókat írnod. Amit a kód vagy a UI
ígér, annak bitre pontosan, bizonyíthatóan működnie kell.

=== 0. KONTEXTUS: A REPO JELENLEGI ÁLLAPOTA (KRITIKUS, ELŐSZÖR EZT OLVASD) ===
Az alap az ngabika/NovaSwarm repository, DE NEM a publikus main branch nyers állapotában.
Egy korábbi, részletes audit során 19+ konkrét hibát találtunk és javítottunk ki benne
(típushibák, hibásan bekötött beállítások, nem-működő biztonsági kapuk, szimulált
integrációk). A mellékelt changelog/patch a TÉNYLEGES kiindulási alap — építsd ezekre,
NE hozd vissza a bennük már kijavított hibákat, és NE dolgozz feleslegesen újra olyan
részeket, amik már javítva vannak. Ha a changelog-ot nem kapod meg mellékelve, először
kérdezz rá, mielőtt nekiállsz.

TILOS MINTÁK — ezeket a konkrét hibákat találtuk a kiindulási kódban, és EZEKET TILOS
megismételni az új funkciókban:
1. Kettős, egymástól független boolean flag, ami logikailag ugyanazt a dolgot jelöli
   (pl. volt egy "isBotActive" és egy "teamActive" mező, amik elvileg ugyanazt mondták,
   de az egyik parancs csak az egyiket állította — így a Telegram-parancsok látszólag
   működtek, valójában semmit nem csináltak). MINDEN állapotnak EGY forrása legyen.
2. Hardcode-olt "connected"/"sikeres" státusz, amit sosem ellenőriz senki valós hívással
   (találtunk egy MCP-szerver listát, ami mind "connected" volt, pedig a fele nem létező
   URL-re mutatott). MINDEN állapotjelzésnek valós, ellenőrzött eredményből kell jönnie.
3. UI-n megjelenő, elmenthető beállítás, amit a háttér-logika valójában sosem olvas ki
   (találtunk Ollama IP/modell beállítást, ami el volt mentve, de a kód mindig hardcode-olt
   értéket használt helyette). HA egy mező létezik a Settings-ben, KÖTELEZŐ, hogy legyen
   legalább egy konkrét hely a kódban, ami tényleg kiolvassa és használja.
4. Biztonsági jóváhagyás/kapu, amit a kód sosem ellenőriz (találtunk egy
   "engedélyezed a teljes gazdagép-hozzáférést? [I/n]" telepítő-kérdést, amire "nem"
   válasz esetén a kód MÉGIS teljes hozzáférést adott, mert a változót senki nem
   olvasta ki). MINDEN jóváhagyási kapunak legyen egy automatizált teszt, ami bizonyítja:
   "nem" válasz esetén a védett funkció TÉNYLEG nem fut le.

=== A PROJEKT FILOZÓFIÁJA ===
A NovaSwarm (React+Express+TypeScript) marad az alap — masszívan kibővítve és kijavítva,
NEM lecserélve. A Szotasz/marveen és az openclaw/openclaw projektekből ARCHITEKTÚRA-
MINTÁKAT veszünk át, NEM a nyers kódjukat.
- OpenClaw minta: a professzionális sandbox/security modell, a SOUL.md személyiség-fájl
  konvenció, a skill/session architektúra.
- Marveen minta: az "ágensenkénti Telegram bot" és háttérfolyamat-koncepció — DE natív,
  multi-provider API-hívásokkal megvalósítva. SZIGORÚAN TILOS a Claude Code CLI OAuth
  tokenjére építeni bármilyen komponenst, mert ez megsértené a Claude Code előfizetés
  egyéni-fejlesztői használatra szabott feltételeit.

A FELADAT: Egy teljesen autonóm, önfejlesztő AI ágens-csapat (Swarm) keretrendszer
felépítése, nulla előre legenerált ágenssel, mély (de KONTROLLÁLT) Linux integrációval,
maximális költséghatékonysággal, és olyan védelmi vonalakkal, amik BIZONYÍTHATÓAN, nem
csak ígéret szintjén működnek.

=== 1. ALAPVETŐ ARCHITEKTÚRA ÉS TELEPÍTÉS ===
- Frictionless telepítő: egyetlen bash script, amely minden függőséget automatikusan
  telepít (Node.js, Python csak ha VALÓBAN szükséges egy komponenshez — a vektor-adatbázis
  NE igényeljen Python-t, lásd lent).
- Hardver-tudatos Ollama-integráció: a telepítő megvizsgálja a hardvert (CPU, RAM, dGPU/
  iGPU, NPU jelenlét), és ez alapján dinamikusan telepít/konfigurál egy lokális modellt.
- Erőforrás-menedzsment: dinamikus CPU/RAM-fenntartás az OS és a core rendszer számára —
  az LLM-ek sosem fagyaszthatják ki a gazdagépet.
- Natív Linux systemd szolgáltatásként fut a háttérben; telepítés végén automatikusan
  elindul a backend és megnyílik a Web UI.
- Build-fegyelem: MINDEN fázis/funkció lezárása után a fejlesztő AI-nak (akár saját maga,
  akár az autonóm Swarm) TÉNYLEGESEN le kell futtatnia `npm run lint` (tsc --noEmit) és
  `npm run build`-ot, és a futtatás KIMENETÉVEL kell igazolnia, hogy hibátlan — sosem
  elég azt állítani, hogy "megcsináltam, működik."

=== 2. JOGOSULTSÁGOK, BIZTONSÁG ÉS SANDBOX (OPENCLAW MINTA) ===
- Scope-olt host-hozzáférés: a rendszer széles körű gazdagép-hozzáférést kap, de minden
  jóváhagyási kapu TÉNYLEGESEN kikényszerítve van a kódban (lásd "Tilos minták" #4) —
  ehhez kötelező egy automatizált teszt is, ami megerősíti.
- Destruktív műveletek kapuja: napi szintű műveletek (kódolás, fájlkezelés, scriptek)
  teljesen autonómok. Irreverzibilis/destruktív műveletek (OS-frissítés, csomag-
  eltávolítás, partícionálás, tűzfalszabály) ELŐTT kötelező egy 1-kattintásos explicit
  jóváhagyás a UI-on VAGY Telegramon.
- Vészleállító (Kill Switch): elérhető a Beállításokban ÉS Telegram parancsként is —
  azonnal kilövi az összes ágens-folyamatot és MCP szervert.
- Self-modifying scope korlátozása: a self-modifying mechanizmus NEM férhet hozzá:
  (a) a saját git-rollback szkriptjéhez, (b) bármilyen .env/secrets fájlhoz,
  (c) a systemd unit fájlhoz. Ezeket egy explicit "tiltott módosítási zóna" listában
  kell definiálni a kódban, amit a self-modifying logika minden futás előtt ellenőriz.
- Git-hygiene: a `.gitignore`-nak garantáltan ki kell zárnia minden secrets/.env fájlt,
  MIELŐTT az automatikus commit-rendszer egyáltalán bekapcsol. Adj hozzá egy pre-commit
  ellenőrzést, ami megakadályozza a commitot, ha bármilyen API-kulcs-mintázatú stringet
  talál a staged fájlokban.

=== 3. ÁGENS HIERARCHIA ÉS AZ ELLENŐRZŐ (INSPECTOR) ===
- Onboarding & Főnök: nulla ágens alapból. A UI első indulásakor a felhasználó hozza
  létre a "Főnök" (Boss) ágenst (SOUL.md-alapú személyiség, célok, stílus, etikai
  határok).
- Autonóm csapatépítés: a Főnök önállóan hoz létre/bocsát el "alkalmazott" ágenseket
  konkrét feladatokra.
- Inspector + dry-run sandbox: minden új kód/skill/MCP-szerver/komplex művelet KÖTELEZŐEN
  egy IZOLÁLT környezetben tesztelendő, MIELŐTT élesbe kerülne. A "dry-run" KONKRÉT
  technikai mechanizmusa: külön Docker konténer `--network=none` és csak egy tmpfs
  másolattal a célfájlokról (NEM a valós fájlrendszeren); shell parancsoknál a konténer
  felhasználója NE rendelkezzen semmilyen tényleges sudo-joggal a host felé.
  DEFINITION OF DONE: legyen egy automatizált teszt, ami bizonyítja, hogy egy szándékosan
  destruktív teszt-parancs (pl. egy fájltörlés a sandboxban) NEM érinti a valós
  fájlrendszert vagy a valós adatbázist.
- Projektmenedzsment: komplex feladatoknál az ágensek önállóan írnak/követnek roadmap-et.

=== 4. API, DINAMIKUS MODELL-FELFEDEZÉS ÉS RATE LIMIT ===
- Multi-provider & multi-key: a UI-on több szolgáltatóhoz (Anthropic, OpenAI, Google,
  helyi Ollama) lehet API kulcsot rögzíteni, egy szolgáltatóhoz akár többet is.
- Dinamikus modell-felfedezés: kulcs megadásakor a rendszer lekéri a szolgáltató
  `/v1/models`-szerű végpontját (ahol létezik — Anthropicnál és néhány szolgáltatónál ez
  más formátumú vagy hiányzik, ezekre legyen explicit, karbantartott fallback-lista).
  FONTOS KORLÁT: a `/v1/models` válaszok TIPIKUSAN NEM tartalmaznak ár/ingyenes-tier
  infót, csak modell-nevet/ID-t. Ezért az "ingyenes/olcsó modell" besorolás NEM lehet
  tisztán dinamikus — legyen egy külön, karbantartott, lokális ár/tier táblázat
  (model-ID mintázat → relatív költség-kategória), amit a dinamikus lista csak
  kiegészít, nem helyettesít.
- Intelligens allokáció: a rutin feladatokat automatikusan az olcsó/ingyenes modellekre
  delegálja a Főnök, a nehéz feladatokhoz a legerősebbet választja — manuálisan
  felülírható a UI-on.
- Rotáció és fallback: a kulcsok rotálása 429 esetén; ha MINDEN külső kulcs elfogy,
  zökkenőmentes átállás a helyi Ollama modellre.

=== 5. ÖNFEJLESZTÉS, SKILLEK ÉS GIT-ROLLBACK ===
- Dinamikus MCP & skillek: az ágensek önállóan írhatnak Python/Node szkripteket és MCP
  szervereket a skills/ mappába, az Inspector teszteli (4. és 3. pont szerinti sandbox),
  majd futásidőben dinamikusan be/kitölthetők.
- Önmódosítás (self-modifying core): a rendszer módosíthatja a saját forráskódját, a
  2. pontban definiált tiltott zónák kivételével.
- Git-rollback: minden önmódosítás előtt automatikus, lokális git commit. Ha a módosítás
  után a rendszer nem indul el vagy összeomlik, egy automatizált script (emberi
  beavatkozás nélkül) azonnal visszaáll az utolsó működő commitra.
- Push-jóváhagyás: a "tiltott módosítási zónán" KÍVÜLI, de érzékenynek minősített
  core-fájlok módosításáról Telegram push-értesítés megy, 1-gombos jóváhagyással —
  ez a sebességet alig lassítja, de láthatóvá teszi a fontos változásokat.

=== 6. MEMÓRIA ÉS "ÁLMODÁS" (DREAMING) ===
- Kettős memória-rendszer: egy beágyazható, TISZTÁN NODE-ALAPÚ vektoradatbázis
  (pl. Vectra vagy LanceDB Node binding — NE ChromaDB/Qdrant, mert azok külön Python
  vagy önálló szerver-folyamatot igényelnek, ami megtöri az "egy parancsos telepítés"
  ígéretét) + egy Obsidian-kompatibilis Markdown tudásbázis.
- Strukturált tudásbázis: az Obsidian mappa NEM nyers adathalmaz — tag-elt (#skill,
  #memory, #error) és hiperhivatkozott, ember által is olvasható struktúra.
- Álmodó mód (10 perc inaktivitás után): memória-konszolidáció, félbehagyott problémák
  önálló folytatása, következtetések levonása, új skillek írása a napi tapasztalatból.
- KÖLTÉSLIMIT — GLOBÁLIS, NEM CSAK ÁLMODÁS ALATT: legyen egy UI-on konfigurálható,
  NAPI szintű, MINDEN API-hívásra (nem csak az álmodásra) vonatkozó hard limit
  (pl. 1 USD/nap). Az álmodás csak egy fogyasztója ennek a közös keretnek — egy nappali
  hibás ciklus ugyanúgy beleszámít. Ha a limit elérése közeleg, a rendszer előbb a helyi
  Ollama modellre vált, majd ha az sem elég, leáll és Telegram-értesítést küld.

=== 7. UI/UX ÉS KÉTIRÁNYÚ TELEGRAM INTEGRÁCIÓ ===
- A UI valós időben mutatja az ágens-ágens kommunikációt, plusz egy letisztult,
  Főnök-generált összefoglaló nézetet.
- Valós idejű hardver-monitor (CPU, RAM, I/O) a felületen.
- Beszélgetések szálakba/mappákba rendezhetők.
- Ki/be kapcsolható hangalapú (Voice) kommunikáció.
- Kétirányú Telegram: értesítés hosszú folyamatok végéről / jóváhagyást igénylő
  lépésekről; a felhasználó Telegramon új feladatot adhat ki vagy jóváhagyhat, ez valós
  időben szinkronizálódik a Web UI szálaiba. EGY közös üzenet-store legyen az igazság
  forrása mindkét csatornának (UI és Telegram csak ennek két klienseje) — ne két külön,
  egymástól független állapot legyen, mint a "Tilos minták #1" hibája.
- Teljes körű cron-job támogatás az autonóm munkavégzéshez.

=== KIMENET (OUTPUT) KÖVETELMÉNYE ===
Dolgozd ki részletesen a frissített projekt-architektúrát (mappaszerkezet, tech stack a
NovaSwarm-ra építve), majd add meg a komplett telepítő bash scriptet. Ezután írd meg
ÉLES, FUTTATHATÓ kód-implementációját (NEM pszeudo-kódot) a következő 4 komponensnek,
mindegyikhez csatolva a hozzá tartozó automatizált teszt(ek)et, ami(k) bizonyítják, hogy
a "Tilos minták" és a "Definition of Done" kritériumok nem sérülnek:
1. A dinamikus, `/v1/models`-alapú API-felfedező + rotációs/fallback (Ollama) logika,
   a lokális ár/tier táblázattal kiegészítve.
2. Az Inspector ágens dry-run/sandbox tesztkörnyezete, konkrét izolációs mechanizmussal
   (Docker `--network=none` vagy egyenértékű), és a hozzá tartozó destruktív-teszt
   bizonyítással.
3. Az önmódosító Git-rollback mechanizmus, a tiltott módosítási zóna kikényszerítésével.
4. Az Álmodás (Dreaming) ciklus, a GLOBÁLIS napi költséglimit logikájával.

Minden fázis végén futtasd le a build/lint pipeline-t, és a kimenetével (nem csak
állítással) igazold, hogy hibátlan.
```

## 2. Kérés - Workspace Integráció és Firebase/CloudSQL
```text
I want to use Google Drive in this app.
I want to use Google Sheets in this app.
I want to use Gmail in this app.
I want to use Google Calendar in this app.
I want to use Google Docs in this app.
I want to use Google Slides in this app.
I want to use Google Tasks in this app.
I want to use Google Chat in this app.
I want to use Google Forms in this app.
I want to use Google Keep in this app.
I want to use Google Meet in this app.
I want to use Contacts in this app.
I want to use Google Picker in this app.
I want to use Google Classroom in this app.

Add Firebase to my app

Enable Cloud SQL in region europe-west2
```

## 3. Kérés - Jelenlegi (Export) kérés
```text
exportáld az egész beszélgetésünket a code közé kérlek! a legelejétől a legvégéig.
```
