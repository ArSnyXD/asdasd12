# Tokyo udune tänav

Väike brauseris töötav Three.js-i stseen, milles saab jalutada kolmanda isiku vaates. Projekt sisaldab kogu mängukoodi, kohalikke tekstuure ja Three.js r160 teeki. Mängimiseks pole võrguühendust ega pakettide allalaadimist vaja.

See on versiooni 005 eestikeelne ja korrastatud jätkuprojekt, paketi versioon **0.5.1**. Kuus arhitektuuriparandust on endiselt tegemata: vt [ÜLESANDED](ULESANDED.md). Lokaliseerimine ei tähenda nende valmimist.

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
2. Säilita `teegid/` ja `varad/`: need on mängu käivitamiseks vajalikud. `viited/` sisaldab alles tegemata tööde võrdluspilte.
3. Ühenda see repositoorium Hoplite’iga. Kui keskkond küsib käivituskäsku, kasuta `npm start`; koostamisetappi pole. Eelvaate juur on repositooriumi juur.
4. Anna agendile failis [JATKA.txt](JATKA.txt) olev juhis. Agent peab lugema [AGENTS.md](AGENTS.md), [SEIS.md](SEIS.md) ja [ULESANDED.md](ULESANDED.md).

See pakett ei loo ise repositooriumi, ei avalda saiti ega ühenda Hoplite’i kontot. Tegelik ühendamine ja keskkonna eelvaateseaded tehakse pärast üleslaadimist.

## Failid

| Asukoht | Sisu |
| --- | --- |
| `index.html` | Mängu algusleht ja eestikeelne kasutajaliides |
| `kood/` | Stseen, geomeetria, juhtimine, animatsioon ja renderdus |
| `stiil/kujundus.css` | Kasutajaliidese kujundus |
| `varad/tekstuurid/` | Mängus kasutatavad tekstuurid, eestikeelsed sildid ja automaadid |
| `teegid/three/` | Muutmata kohalik Three.js-i sõltuvus koos algse litsentsiga |
| `tooriistad/` | Server, stseeni kontroll ja tekstuurigeneraatorid |
| `viited/` | Praeguse ülesande kümme pilti ja kaheksa vajalikku taustafotot |

## Kontrollid ja tekstuurid

```sh
npm test
```

Kui arenduskeskkonnas on Playwright koos Chromiumiga juba olemas, saab töötava serveri kõrval käivitada ka `node tooriistad/brauserikontroll.mjs`. Vajadusel määra mängu aadress muutujaga `MANGU_AADRESS` ja brauseri käivitusfail muutujaga `BRAUSERI_FAIL`. See valikuline kontroll proovib kasutajaliidest, kõndi, jooksu, seadeid ja püsivaateid. Selles üleandmiskeskkonnas jäi see brauseri käivituspiirangu tõttu läbimata.

Põhikontroll koostab stseeni ja tegelase, otsib vigaseid geomeetriaarve ja indekseid ning proovib kõndi ja animatsiooni. See ei asenda visuaalset kontrolli. Selle paketi tegelikud tulemused on failis [SEIS.md](SEIS.md).

Tekstuuride uuesti loomiseks on vaja Pythonit ning NumPy ja Pillow’ teeke. Tavaliseks mängimiseks neid vaja ei ole. Kõik tekstuurid on juba kaasas.

```sh
python tooriistad/loo_tekstuurid.py
python tooriistad/loo_lisatekstuurid.py
```

Käivita generaatorid selles järjekorras. Ainult automaatide loomiseks:

```sh
python tooriistad/loo_lisatekstuurid.py automaadid
```

Lisatekstuuride fondifaili saab määrata muutujaga `TOKYO_FONT`. Põhigeneraatori fondikandidaadid asuvad faili alguses. Automaatide juhuarvugeneraator on eraldi; teiste tekstuuride osaline genereerimine võib muuta juhumustrit.

## Keelekasutus ja sõltuvused

Projekti kasutajale mõeldud tekstid, juhised, kommentaarid ja stseenis joonistatavad kirjad on eesti keeles. Projekti enda failid ning paljud funktsioonid ja materjalid kasutavad eestikeelseid nimesid. Uued selgitused ja vastused tuleb kirjutada eesti keeles.

Programmeerimiskeelte süntaks, brauseri ja Three.js-i API nimed, failivormingute võtmed, matemaatilised lühendid ning standardsed `README.md`, `AGENTS.md`, `index.html` ja `package.json` nimed jäävad tehnilisel kujul. Kolmanda osapoole Three.js-i lähtekood ja kohustuslik litsents on algsel kujul; neid ei tõlgita ega maskeerita. Vajalikud võrdlusfotod ja kasutaja märgitud kuvatõmmised on originaalid: fotodel nähtavad päris maailma kirjad või varasema mängu liides ei ole uue mängu tekst.
