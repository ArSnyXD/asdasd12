# Tokyo udune tänav

Väike brauseris töötav Three.js-i stseen, milles saab jalutada kolmanda isiku vaates. Projekt sisaldab kogu mängukoodi, kohalikke tekstuure ja Three.js r160 teeki. Mängimiseks pole võrguühendust ega pakettide allalaadimist vaja.

See on versiooni 005 eestikeelne jätkuprojekt, paketi versioon **0.7.0**. Versioonis 0.6.0 tehti kuus arhitektuuriparandust (H1 kattuvad pinnad, vasak süvis ja rõdude alapinnad, pargi kuju, H2 astmeline fassaad, aia kivisokkel). Versioonis 0.7.0 ehitati ümber tee, E2 ja ristmik pargi juures, eemaldati H2 akna ees olnud seinajupp ning mängumaailma kirjad muudeti jaapanikeelseks. Vt [ÜLESANDED](ULESANDED.md) ja [SEIS](SEIS.md).

## Käivitamine

Ava terminal kaustas, kus asub `index.html`.

Node.js 20.6 või uuem:

```sh
npm start
```

Ava brauseris `http://localhost:8000`. Sõltuvuste paigaldamist pole vaja. Teine port:

```sh
npm start -- --port 3000
```

Kui Node.js puudub, sobib Python 3:

```sh
python -m http.server 8000
```

Ära ava `index.html`-i failina topeltklõpsuga: moodulid ja tekstuurid vajavad HTTP-serverit. Brauser peab toetama WebGL2. Kohaliku serveri vaikimisi liides on `127.0.0.1`; eelvaatekeskkonnas saab vajadusel määrata `HOST=0.0.0.0` ja `PORT`.

## Juhtimine

| Klahv või hiir | Tegevus |
| --- | --- |
| W / S või üles- / allanool | Edasi / tagasi |
| A / D | Vasakule / paremale |
| Hiir | Vaata ringi; hõivamiseta lohista vasaku nupuga |
| Kerimisratas | Muuda kaamera kaugust |
| Q / E või vasak- / paremnool | Pööra kaamerat |
| Shift | Jookse |
| Esc | Paus ja menüü |
| 1–9 menüüs või püsivaates | Vali üks esimesest üheksast püsivaatest |

Menüüst saab muuta kvaliteeti ning lülitada udu ja retrofiltri. Püsivaadete paneel sisaldab pealtvaadet.

## GitHub ja Hoplite

1. Paki arhiiv lahti. Laadi **selle sisu**, sealhulgas `index.html`, `package.json`, `AGENTS.md` ja kõik alamkaustad, repositooriumi juurkausta. Ära laadi ainult ZIP-faili.
2. Säilita `teegid/` ja `varad/`: need on mängu käivitamiseks vajalikud. `viited/` sisaldab tehtud paranduste võrdluspilte.
3. Ühenda see repositoorium Hoplite’iga. Kui keskkond küsib käivituskäsku, kasuta `npm start`; koostamisetappi pole. Eelvaate juur on repositooriumi juur.
4. Anna agendile failis [JATKA.txt](JATKA.txt) olev juhis. Agent peab lugema [AGENTS.md](AGENTS.md), [SEIS.md](SEIS.md) ja [ULESANDED.md](ULESANDED.md).

See pakett ei loo ise repositooriumi, ei avalda saiti ega ühenda Hoplite’i kontot. Tegelik ühendamine ja keskkonna eelvaateseaded tehakse pärast üleslaadimist.

## Failid

| Asukoht | Sisu |
| --- | --- |
| `index.html` | Mängu algusleht ja eestikeelne kasutajaliides |
| `kood/` | Stseen, geomeetria, juhtimine, animatsioon ja renderdus |
| `stiil/kujundus.css` | Kasutajaliidese kujundus |
| `varad/tekstuurid/` | Mängus kasutatavad tekstuurid, jaapanikeelsed sildid ja automaadid |
| `teegid/three/` | Muutmata kohalik Three.js-i sõltuvus koos algse litsentsiga |
| `tooriistad/` | Server, stseeni kontroll, kattuvate pindade kontroll, valikulised brauseri- ja vaatekontrollid, tekstuurigeneraatorid ja nende jaapani kirja moodul |
| `viited/` | Tehtud parandusrühmade võrdluspildid ja taustafotod |

## Kontrollid ja tekstuurid

```sh
npm test
```

Kui arenduskeskkonnas on Playwright koos Chromiumiga juba olemas, saab töötava serveri kõrval käivitada ka `node tooriistad/brauserikontroll.mjs`. Vajadusel määra mängu aadress muutujaga `MANGU_AADRESS` ja brauseri käivitusfail muutujaga `BRAUSERI_FAIL`. See valikuline kontroll proovib kasutajaliidest, kõndi, jooksu, seadeid ja püsivaateid; versioonis 0.7.0 läbis see Hoplite’i liivakastis päises Chrome’is. Samas keskkonnas töötab ka `node tooriistad/vaatekontroll.mjs`, mis salvestab vastuvõtuvaadete, tee ja jaapanikeelsete siltide ning tegelase pooside kuvatõmmised kausta `kontrollivaljund/` (valikud `RETRO=0|1`, `FOG=0|1`). Osa kaamerapunkte arvutatakse mängu geomeetriast, et need püsiksid tee või hoonete muutmisel õigel kohal.

Põhikontroll koostab stseeni ja tegelase, otsib vigaseid geomeetriaarve ja indekseid, proovib kõndi ja animatsiooni ning kontrollib kattuvaid samatasapinnalisi pindu (`tooriistad/kattuvus.mjs`), H1 süvise ja läbipääsu kokkupõrkeid, pargi kiilukuju ja E2 suunda, pargi ja E2 vahelist tellisriba, H2 astmeid ja esimese korruse akende nähtavust ning aia kõrgust. See ei asenda visuaalset kontrolli. Selle paketi tegelikud tulemused on failis [SEIS.md](SEIS.md).

Tekstuuride uuesti loomiseks on vaja Pythonit, NumPy ja Pillow’ teeke ning jaapani märkidega fonti (näiteks Noto Sans CJK JP; Debianis ja Ubuntus pakett `fonts-noto-cjk`). Tavaliseks mängimiseks neid vaja ei ole. Kõik tekstuurid on juba kaasas ja mäng ei laadi fonte.

```sh
python tooriistad/loo_tekstuurid.py
python tooriistad/loo_lisatekstuurid.py
```

Käivita generaatorid selles järjekorras. Ainult automaatide või ainult peatumiskirja ja -märgi loomiseks:

```sh
python tooriistad/loo_lisatekstuurid.py automaadid
python tooriistad/loo_tekstuurid.py looPeatumiskiri looLiiklusmargid
```

Font valitakse moodulis `tooriistad/kirjad.py`; muu faili saab määrata muutujatega `TOKYO_FONT` ja `TOKYO_FONT_INDEX` (näo indeks `.ttc`-failis). Generaator katkestab töö, kui fondis puudub mõni sildi märk. Põhigeneraatori igal funktsioonil on oma juhuarvude seeme. Lisatekstuuride automaatidel on eraldi juhuarvugeneraator; teiste lisatekstuuride osaline genereerimine võib muuta nende juhumustrit.

## Keelekasutus ja sõltuvused

Projekti kasutajale mõeldud tekstid (menüüd, juhtimisjuhised, HUD ja pealtvaate tähised), juhendid ja kommentaarid on eesti keeles. Mängumaailmas füüsiliselt nähtavad kirjad on jaapani keeles: liiklusmärgid ja teekiri, tõkete plakatid, automaadid, maja nimesilt, poesilt ning rulooteade. Projekti enda failid ning paljud funktsioonid ja materjalid kasutavad eestikeelseid nimesid. Uued selgitused ja vastused tuleb kirjutada eesti keeles.

Programmeerimiskeelte süntaks, brauseri ja Three.js-i API nimed, failivormingute võtmed, matemaatilised lühendid ning standardsed `README.md`, `AGENTS.md`, `index.html` ja `package.json` nimed jäävad tehnilisel kujul. Kolmanda osapoole Three.js-i lähtekood ja kohustuslik litsents on algsel kujul; neid ei tõlgita ega maskeerita. Vajalikud võrdlusfotod ja kasutaja märgitud kuvatõmmised on originaalid: fotodel nähtavad päris maailma kirjad või varasema mängu liides ei ole uue mängu tekst.
