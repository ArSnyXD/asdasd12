# Seis 13.11.2026

Paketi versioon: **0.5.1**. Alus: kasutaja üle antud versioon 005.

## Selle paketi muudatused

- Mängu menüüd, juhtimisjuhised, püsivaated, kaarditähised, olekuread ja veateated on eestikeelsed.
- Tõlgitud on 433 mängukoodi reakommentaari, ülejäänud koodikommentaarid, generaatorite kirjeldused ja kogu jätkamisdokumentatsioon.
- Projekti moodulid, tekstuurifailid ja võrdluspildid on eestikeelsete nimedega. Ümber nimetatud on ka projekti enda peamised klassid, koostajad, materjalid ja paljud abifunktsioonid. Impordid ja viited on uuendatud koos nimedega.
- Peatumiskirjad, sulgemissilt, hoone nimesilt, kaupluse silt, ruloole kleebitud teade ja automaatide kirjad on eestikeelsed. Vastavad protseduurtekstuurid on uuesti loodud.
- `index.html` asub repositooriumi juures. Lisatud on sõltuvusteta Node.js-i server, käivituskäsud ning Giti välistused ja failitüübid.
- Vanad pakendamisreeglid, kontrollsummad ja taastamise kordusjuhised on asendatud repositooriumi jätkamise juhistega. Algne Three.js ja selle litsents on muutmata.
- Eemaldatud on ajalooliste tõendite kaust koos piltide, video ja JSON-aruannetega, kolm tehtud tööde viitepilti, kasutamata varasem tegelasemoodul, eraldi vana proovileht, kasutamata kaamerajuhtimise lisamoodul ning keskkonnaspetsiifilised vanad abiskriptid.
- Alles on kümme aktiivset võrdluspilti ja kaheksa taustapilti pooleliolevate paranduste jaoks. Mängu kõik 41 kohalikku tekstuuri on säilitatud.

## Kontrollitud

| Kontroll | Tulemus |
| --- | --- |
| JavaScripti ja Pythoni süntaks | Korras |
| Kohalikud mängumoodulite impordid | Sihtfailid olemas |
| Tekstuuriviited | Kõik 41 sihtfaili olemas |
| Three.js-i failid ja litsents | Baitide kaupa algse paketiga samad |
| Stseeni koostamine | 66 võrku, 152 537 kolmnurka |
| Kokkupõrkekehad | 309 |
| Tegelase koostamine | 26 võrku, 13 576 kolmnurka |
| Geomeetria arvud ja tipuindeksid | Vigaseid ei leitud |
| Kahe sekundi simuleeritud kõnd | Nihe 2,958 m |
| Seismise, kõnni ja jooksu geomeetria | Arvulised kontrollid läbitud |
| Tõlgitud sildid ja automaadiatlas | Tekstuuripildid visuaalselt üle vaadatud |
| Automaatide generaatori uus käivitus | Edukas |
| Kasutajaliidese juhtloogika asendatud DOM-i ja renderdajaga | Käivitumine, menüü, kolm kvaliteeditaset ja 13 püsivaadet läbitud; ei ole päris brauserikontroll |

Stseeni ja tegelase võrkude ning kolmnurkade arv ja takistuste arv vastavad alusversioonile. Arhitektuuri ega liikumisreegleid selle töö käigus ei parandatud.

## Kontrollipiirang

Tegelikku Chromiumi/WebGL-i käivitust ei õnnestunud selles keskkonnas teha: Chromium peatus süsteemi keelatud soklioperatsiooni tõttu enne lehe avamist (`socket() failed: Operation not permitted`). Seetõttu ei ole kinnitatud lõplikku brauseripilti, tekstide paigutust kõigil ekraanisuurustel ega riistvaralist kaadrisagedust. CPU-kontrolli ei tohi nimetada brauserikontrolliks.

Kaasas on valikuline `tooriistad/brauserikontroll.mjs`, mis vajab arenduskeskkonnas Playwrighti ja Chromiumi. Käivita see Hoplite’is või oma arvutis, kus brauser töötab, ning vaata stseen ka ise üle.

## Pooleliolev töö

Kõik [ULESANDED.md](ULESANDED.md) kuus rühma on **ootel**:

1. H1 sissepääsu ja rõdude kattuvate pindade vilkumine.
2. H1 vasak madal süvis esimesel korrusel.
3. H1 rõdude puuduvad alapinnad ja servad.
4. Pargi põhikuju ja proportsioonid.
5. H2 astmeline fassaad sügavuses.
6. Aia sokli kiviread ja proportsioonid.

Alusversioonis on juba H1 ja H2 esiväljakud, H1 läbipääs, H2 üldpööre, kuue puuga park, suletud automaadikorpused ja taastatud tegelaseriiete parandused. Need tuleb järgmises töös säilitada ning pärast geomeetriamuudatusi uuesti kontrollida.
