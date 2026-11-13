# Ülesanded: arhitektuur, tee ja mängumaailma kirjad

**Tehtud (versioonid 0.6.0 ja 0.7.0).** Rühmad 1–6 pärinevad versiooni 005 üleandmisest ja tehti versioonis 0.6.0. Rühmad 7–9 (tee ja ristmik pargi juures, H2 akna ees olev seinajupp, jaapanikeelsed kirjad) tehti versioonis 0.7.0. Tulemused ja piirangud on failis [SEIS.md](SEIS.md), võrdluspildid failis [viited/README.md](viited/README.md).

## Eesmärk ja piirid

Säilita brauseri Three.js-i stseen, kohalik r160 teek, udune hämar retroilme, kolmanda isiku tegelane, juhtimine ja käigutee S → J → E1/E2. H1 on kuuekorruseline, H2 seitsmekorruseline ja pargis on kuus puud. Hoia H2 üldine nurk, tagasiaste ja ristmikupoolse otsa asukoht paigas, parandades fassaadi kohalikku kuju.

Säilita tegelase riiete ja automaatide ülaosa varasemad parandused ning kontrolli neid uuesti. Ära ehita templi sisemust ega laienda tööd teiseks projektiks. Päevafotod määravad geomeetria ja materjalid, mitte mängu valgustuse muutmist päevaseks.

Uusimad kasutaja märgitud pildid on olulisemad kui vanad plaanid või varasemad väited valmimise kohta. Ära tuleta ühest perspektiivfotost täpseid meetermõõte. Vali vaadete põhjal kooskõlalised ligikaudsed proportsioonid ja kirjelda olulisi oletusi.

## 1. H1 kattuvad pinnad ja vilkumine

- [x] Parandatud ja liikuva kaameraga kontrollitud (0.6.0): läbipääsu pargipoolne sein algab nurgaposti tagant, vahesein seisab parapeti taga; `npm test` kinnitab, et kattuvaid samatasapinnalisi pindu ei ole; kuvatõmmised retrofiltriga ja ilma.

Pildid: `viited/aktiivne/01_H1_sissepaasu_vilkumine.png` ja `02_H1_sissepaasu_ja_rodu_vilkumine.png` samas kaustas.

Eemalda sissepääsu parema posti ning rõdu vaheseinte ja esipaneelide kattuvad või peaaegu samatasapinnalised pinnad kõigil korduvatel korrustel.

Lähtekohad failis `kood/hooned.js`, funktsioonis `looH1` (kontrolli tegelikku lähtekoodi):

- Parema posti läänetahk on BX1 = X1 − PIL = −16,72. Pargipoolse läbipääsuseina läänetahk algab samuti NE = PASS.X1 = −16,72. Nende ulatused kattuvad. Kärbi või jaga pinnad nii, et nähtaval kohal oleks üks pind.
- Rõduparapeti ja keskmise vaheseina esipinnad asuvad mõlemad Y0 − 0,03 juures, osaliselt samas kõrgusvahemikus. Lahenda liide igal korrusel.

Need on koodi põhjal leitud lähtekohad, mitte lõplik visuaalne diagnoos. Otsi ka teisi piltidel näidatud kattumisi. Ära peida viga udu, madala lahutusvõime, joonistusjärjekorra või üldise sügavuspuhvri võttega. Eelista korrektselt liituvaid pindu juhuslikele pisinihetele.

**Vastuvõtt:** märgitud kohad ei säbruta ega triibuta lähedalt, kaugelt ega külgsuunas liikuva kaameraga, nii väljalülitatud retrofiltriga kui tavalises mänguvaates.

## 2. H1 vasak madal süvis esimesel korrusel

- [x] Parandatud ja eest ning nurga alt kontrollitud (0.6.0): vasak osa on 1 m sügavune süvis sildi, valgusti ja postiga, parem läbipääs 12 m sügav.

Pilt: `viited/aktiivne/03_H1_vasak_madal_suvis.png`. Taust: `viited/taust/01_H1_pohiplaan.png`, `02_H1_fassaad.png` ja `03_H1_sissepaas.png`.

Vasak märgitud osa paistab praegu etteulatuva täismahuna. Ehita see ülemise fassaadi alla mõõdukalt tagasiastuvaks süviseks. Parempoolne sissepääs jääb oluliselt sügavamaks. Ära tee mõlemat poolt sama sügavaks, nihuta tervet H1 hoonet ega eemalda esimest korrust.

Sobita tagasein, külgseinad, lagi, nimesilt, valgustus, istutuskastid ja lähenemistee fotodega. Süvis peab olema tänavalt nähtav, mitte peituma etteulatuva muutmata istutuskasti taha. Säilita kasutatav esiväljak ja sissepääs; vii kokkupõrkekehad ja kaamera laepiirangud uute pindadega vastavusse.

**Vastuvõtt:** eest ja nurga alt eristuvad selgelt madal vasak süvis ja sügav parem läbipääs.

## 3. H1 rõdude alapinnad ja avatud servad

- [x] Kõik korduvad detailid kontrollitud (0.6.0): parapettidel ja pööninguparapetil on alapinnad, plaadi alapind algab parapeti tagant, vaheseinal on suletud küljed; kuus korrust madalalt ja mõlemast otsast üle vaadatud.

Pilt: `viited/aktiivne/04_H1_rodu_puuduvad_alapinnad.png`.

Sulge kõik tahtmatud augud rõduplaadi ja parapeti alaservades ning paljastatud otstes. Kontrolli kogu kuuekorruselise hoone korduvaid detaile, säilitades rõdude kavandatud avad.

Funktsiooni `looH1` parapeti `plaanikast` kasutab tahke `SNT`, mis jätab põhja ja otsad välja. Plaadi alapinna ulatus on teistsugune. Kontrolli paljastunud ribasid, otsi, vaheseinu ja liiteid. Modelleeri tegelik paksus ning õige tippude järjestus ja normaalid. Üldine `DoubleSide` ei asenda puuduvaid tahke. Ära lisa külgnevate täismahtude sisse kattuvaid pindu, mis tekitaksid uut vilkumist.

**Vastuvõtt:** tahke konstruktsiooni servast ei paista taevas ega taust; kontrolli madalalt üles vaadates, külgedelt ja fassaadi mõlemast otsast.

## 4. Pargi põhikuju ja proportsioonid

- [x] Plaan ja võrreldav tänavavaade kontrollitud (0.6.0): park on 9,6 × 19 m piklik riba viltu lõigatud kagunurgaga; proportsioonimuutus ja ebakindlus on kirjas failis SEIS.md. Versioonis 0.7.0 asendas selle rühma 7 kiilukujuline park E2 ääres.

Pildid: `viited/aktiivne/05a_pargi_eeskuju.png` ja `05b_pargi_praegune_kuju.png`. Taust: `viited/taust/12_satelliidivaade.png` ja `11_hoonete_ja_tanava_asetus.png`.

Enne parandust erines park päriskohast. Hinda uuesti pikkuse ja laiuse suhet, tänavapoolset otsa, nurka, sügavust H1 kõrval ning E2-poolset piiri. Eesmärk on piklik väljak H1 kõrval; praegune kuju mõjub liiga laia ja peaaegu ruudukujulisena. Ära pööra kogu parki lihtsalt uuesti 90° ega pea ainult laiuse muutmist vastavuse tõendiks.

Võrdle samast suunast, sest perspektiiv moonutab laiust. Säilita kuus puud, valged avatud raamid, istutusavad, sillutis, pingid ja postid. Paiguta need parandatud põhikujus kooskõlaliselt ümber ilma tarbetu ümberkujundamiseta. Hoia käiguteed kasutatavad ja liited mõlema tänava ning H1-ga puhtad. Uuenda liikunud objektide kokkupõrkekehi.

**Vastuvõtt:** näita pealtvaadet ja eeskujuga sobitatud tänavavaadet; selgita konkreetset kuju- ja proportsioonimuutust ning allesjäänud ebakindlust.

## 5. H2 astmeline tänavafassaad

- [x] Astmed on nähtavad plaanis ja hoone kehas (0.6.0): kaks eenduvat rõdudega osa, 1,4 m tagasiastuv vahe ja 1,1 m tagasiastuv ristmikupoolne ots; katus ja parapetid järgivad astmeid.

Pildid: `viited/aktiivne/06a_H2_astmelise_fassaadi_eeskuju.png` ja `06b_H2_praegune_sirge_fassaad.png`. Taust: `viited/taust/04_H2_materjal.png`, `08_H2_ristmikupoolne_ots.png`, `10_H2_esivaljak.png`, `11_hoonete_ja_tanava_asetus.png` ja `12_satelliidivaade.png`.

Punane piirjoon näitab fassaadiosade edasi-tagasi astumist **plaanis ehk sügavuses**. Praegune fassaad on üks sirge joon. Ehita sektsioonid erineva sügavusega ja ühenda külgpindadega. See ei tähenda erinevat korruste arvu, trepikujulist katust ega välist treppi. Ära lahenda seda terve hoone uue pööramisega.

Kooskõlasta põhimaht, rõdud, plaadid, piirded, sambad, aknad, esimese korruse garaaž ja sissepääs, katuse piirjoon ning kokkupõrkekehad. Säilita seitse korrust, üldine nurk H1 suhtes, esiväljak, sissesõit ja ristmikupoolse otsa asukoht. Automaadid jäävad ligipääsetavaks; liiguta neid ainult siis, kui kohalik geomeetria seda nõuab. Väldi uusi auke, lõikuvaid plaate ja seina sisse mattunud aknaid.

**Vastuvõtt:** fassaadi astmed paistavad pealtvaates ja sobitatud kaldvaates hoone enda kehas, mitte ainult rõdupiirdes või tekstuuris.

## 6. Aia kivisokkel ristmikul J

- [x] Kiviread, proportsioonid ja nurk kontrollitud (0.6.0): kolm rida tahutud plokke nihutatud vuukidega, 0,95 m sokkel ja balustraad karniisil; nurgas järgivad plokid kaart ilma venimata.

Pildid: `viited/aktiivne/07a_aia_kivisokli_eeskuju.png` ja `07b_aia_praegune_sokkel.png`.

Muuda alumine täissokkel fotoga sarnaseks krobeliseks ristkülikukivimüüritiseks: eristuvad rõhtread, nihutatud püstvuugid, usutav plokisuurus, ebaühtlane pind ja mõõdukas toonivaheldus. Võrdle sokli kõrgust ja proportsioone ülemise piirdega, mitte ainult värvi. Praegusel laial siledal alusel puudub vajalik struktuur.

Kasuta geomeetriat või kohapeal genereeritud retrostiiliga sobivat tekstuuri. Säilita ülemine balustraad, postid, ristmik ja käigutee. Nurgas ei tohi kivid venida, vuugid katkeda ega tekkida vahesid. Ära laienda tööd templi ehitamiseks.

**Vastuvõtt:** kiviread on selged nii lähivaates kui tavalisel jalutamiskaugusel, sealhulgas nurgas.

## 7. Tee, E2 ja ristmik pargi juures

- [x] Ümber ehitatud ja kontrollitud (0.7.0): E2 hargneb peatänavast pargi tänavapoolse otsa juures ja kulgeb umbes 25° põhjast itta pargi ning kivipiirde vahel. Park on kiil: lõunaots 7,9 m, põhjaots 15,5 m, pikkus 19 m; idaserv on E2 äärekivi 0,9 m tellisriba taga. Pealtvaade, tänavavaade pargi nurgalt ning kõnd ja jooks S → J → E2 on kontrollitud.

Pilt: `viited/aktiivne/08_tee_ja_ristmik_margitud.jpg` (kasutaja märgitud mänguvaade). Taust: `viited/taust/12_satelliidivaade.png`, `11_hoonete_ja_tanava_asetus.png` ja `viited/aktiivne/05a_pargi_eeskuju.png`. Kasutaja saatis vestluses ka märgitud satelliidivaate ja tänavavaate pargi nurgalt; kolmanda osapoole kaardipilte avalikku repositooriumi ei lisatud.

Tee pargi juures, selle pöörded ja ristmiku laius ei vastanud päriskohale: E2 kulges umbes 6 m ida pool, pargi ja E2 vahele jäi asfaldikiil ning pargi nurk oli täisnurkne. Ehita piirkonna teegeomeetria uuesti satelliidivaate põhikuju ja tänavavaate proportsioonide järgi. Kitsas E2 hargneb pargi tänavapoolse otsa juures ja kulgeb pargi ning kivipiirde vahel; pargi idaserv järgib E2-d ning pargi ja aia nurgad on ümardatud. Kõnniteed, äärekivid, servajooned, peatumisjoon, kõrguskaart, kokkupõrked, postid, valgustid ja püsivaated järgivad uut kuju.

**Vastuvõtt:** pealtvaates on park kiil ning E2 jookseb pargi ja aia vahel ilma asfaldikiiluta. Tänavavaade pargi nurgalt sarnaneb eeskujuga. Kõnd ja jooks S → J → E2 jõuavad tõkkeni.

## 8. H2 esimese korruse akna ees olev seinajupp

- [x] Eemaldatud ja kontrollitud (0.7.0): rõduribade vahelised otsaseinad algavad arkaadi lae kõrguselt ning ainult hoone otste seinad ulatuvad maani. Kokkupõrkekehad on vaid maani ulatuvatel seintel. `npm test` kinnitab kiirtega, et esimese korruse aknad paistavad tänavalt mitmest suunast; brauseris pääseb endise seinajupi kohalt läbi.

Pilt: `viited/aktiivne/09_H2_akna_ees_sein.jpg`.

Punasega märgitud seinajupp varjas H2 esimese korruse akent. Eemalda see koos kokkupõrkekehaga. Rõdude otsaseinad ülemistel korrustel ja hoone otste seinad jäävad alles.

**Vastuvõtt:** aken paistab eest ja küljelt ning seinajupi kohalt saab kõndida.

## 9. Jaapanikeelsed kirjad mängumaailmas

- [x] Tehtud ja kontrollitud (0.7.0): peatumismärgil ja teekirjal on 「止まれ」, tõkete plakatil 「この先 通行止め」. Jaapani keeles on ka automaatide esi- ja külgpaneelid, maja nimesilt, poesilt ja rulooteade; helenduskaart on loodud uuesti. Kirjad on lähedalt ja tavaliselt mängukauguselt loetavad, õiget pidi ega ole peegelpildis.

Pildid: `viited/aktiivne/10a_peatumismark_ja_teekiri.png`, `10b_tokke_silt.png`, `10c_joogiautomaadid.png` ja `10d_maja_nimesilt.png`.

Mängumaailmas füüsiliselt nähtavad kirjad peavad olema jaapani keeles. Peatumiskirja jaoks kasuta 「止まれ」, läbipääsukeelu jaoks 「通行止め」. Menüüd, juhtimisjuhised, HUD, pealtvaate tähised, arendusdokumendid, koodikommentaarid ja vastused jäävad eesti keelde. Joonista kirjad tekstuurigeneraatorites kohaliku jaapani fondiga; ära lisa mängule välist fondi- ega võrgusõltuvust.

**Vastuvõtt:** kõik füüsilised kirjad on jaapani keeles, mahuvad oma alale ja on mudeli igal nähtaval küljel õiget pidi. Puuduva märgi kaste ei ole.

## Teostus ja lõplik kontroll

Enne muutmist tutvu koostajate, geomeetria abifunktsioonide, materjalirühmade ja kokkupõrkereeglitega. Olulised failid: `kood/hooned.js`, `seaded.js`, `taimestik.js`, `tanav.js`, `maapind.js`, `varad.js`, `geomeetria.js` ja `maailm.js` samas kaustas. Vajadusel uuenda ka püsivaateid ja pealtvaate tähiseid.

- Käivita `npm test`: stseen ja tegelane peavad moodustuma ilma vigase geomeetriata.
- Käivita brauseris; kontrolli puuduvaid varasid ning lehe- ja konsoolivigu.
- Kõnni ja jookse S → J ning mõlemas harus. Lähene H1-le, läbi pargi käiguteed ja H2 esiväljak. Kontrolli tegelase ja kaamera kokkupõrkeid, sissepääse ning kaamera sattumist seintesse.
- Kontrolli kõigi rühmade vastuvõtutingimusi sobitatud vaatenurkadest. Plaanimuutuste jaoks kasuta varjamata pealtvaadet. Säilita mängu õhustik.
- Kontrolli tegelase vöö- ja seelikupiirkonda seistes, kõndides ja joostes ning automaatide ülapindu.
- Kontrollide proovipunktid peavad vastama uuele geomeetriale. Ära nõrgenda sisulisi tingimusi ainult läbimise saavutamiseks.

CPU-kontroll ei tõenda visuaalset vastavust, nähtavate normaalide õigsust ega riistvaralist kaadrisagedust. Kui brauserikontroll on võimatu, nimeta täpne piirang ja jäta visuaalne kinnitus selgelt ootele. Ära proovi korduvalt kättesaamatuid allalaadimisi. Salvesta töö käigus muudatused.

## Üleandmine

Anna üle lõplikud repositooriumimuudatused, uuendatud SEIS.md ning tegelikud kontrollitulemused. Tõenda H1 sissepääsu, fassaadi ja alapindu, parki ja E2 tänavalt ja ülalt, H2 astmeid tänavalt ja ülalt, H2 esimese korruse akent, aia alust ja nurka, jaapanikeelseid kirju ning üht tavalist mänguvaadet. Mõni hästi valitud vaade võib katta mitu tingimust. Vilkumise kontroll eeldab kaamera liikumist, ühest kaadrist ei piisa.

Kõik tõendid peavad vastama lõplikule koodile. Märgi ajalooline materjal ja tegemata kontrollid selgelt. Ära nimeta kogu etappi valmis, kui nõuded pole kontrollitud. Uus ZIP on vajalik ainult kasutaja vastava soovi korral; ära lisa repositooriumi vanu arhiive või vahetulemusi.
