# Seis 13.11.2026

Paketi versioon: **0.6.0**. Alus: versioon 0.5.1 (kasutaja üle antud versiooni 005 eestikeelne korrastus).

## Selle versiooni muudatused

Kõik [ULESANDED.md](ULESANDED.md) kuus parandusrühma on teostatud olemasoleva stseeni põhjal. Tegelane, juhtimine, udu, hämar retroilme, käigutee S → J → E1/E2, H1 kuus ja H2 seitse korrust, kuus pargipuud, tegelase riiete katvus ja automaatide suletud ülaosa on säilitatud.

1. **H1 kattuvad pinnad.** Läbipääsu pargipoolne betoonsein algab nüüd nurgaposti tagant (varem jagasid post ja sein sama tasapinda). Rõdude valge vahesein seisab 14 cm parapeti taga, mitte parapetiga samal esipinnal. Lisaks kõrvaldati muud leitud samatasapinnalised kattumised: H1, N1, N3 ja H2 katuseparapettide nurgad, H1 trepikoja ja H2 fuajee ukseraamide ülemised liited, N1 musta aia nurgapostid ja sokkel, pargi raamide postid ja talad, automaatide korpuse kaas ja esiraam ning taustahoone N1 lääneseina vastas.
2. **H1 vasak madal süvis.** Esimese korruse vasak osa on 1 m sügavune süvis: tagasein nimesildi ja seinavalgustiga, lagi on esimese rõdu alapind, vasakul nurgapost ja paremal 30 cm post läbipääsu vastu. Süvise põrand on esiväljaku sillutis; lillepeenar jäi süvise vasaku otsa ette fassaadijoonest väljapoole, parem pool on käidav. Kokkupõrkekehad ja valgusti asukoht on uuendatud; kaamera laepiirang kehtib ka süvises.
3. **H1 rõdude alapinnad.** Parapetil ja pööninguparapetil on alapind; plaadi alapind algab parapeti tagant, nii et kaks alapinda ei kattu ega jäta pilu. Vahesein ulatub plaadist järgmise plaadi alapinnani ja on külgedelt suletud. `DoubleSide`'i ei kasutatud.
4. **Pargi kuju.** Park on kitsas piklik riba piki H1 külgseina: laius 9,6 m (X −15,3 … −5,7), pikkus 19 m, sirge idaserv ja viltu lõigatud kagunurk (3,2 × 5,5 m), nagu tänavavaates. Kuus puud on kahes reas (X −13,3 ja −8,5), raamid, pingid ja istutusavad puuridade vahel; postid, pargi valgustid, parkimiskeelumärk, hekid, valge teejoon ja kõrguskaart on kohandatud. Varasem park oli 14–17 m lai ja peaaegu ruudukujuline.
5. **H2 astmeline fassaad.** Tänavafassaad astub hoone kehas sügavusse: kohalikul x-teljel eenduvad rõdudega osad 0–7,2 m ja 9,0–19,8 m (y = 0), nende vahel 1,4 m tagasiastuv kitsas vahe ja ristmikupoolses otsas 1,1 m tagasiastuv osa (19,8–22 m). Rõduribade otsaseinad ühendavad eri sügavusel pinnad; katuseplaat, parapetid, nurgarõdud ja kokkupõrkekehad järgivad astmeid. Esimene korrus, esiväljak, sissesõit, fuajee, automaadid, hoone nurk ja idaotsa asukoht on endised.
6. **Aia kivisokkel.** Sile 0,58 m sokkel on asendatud 0,95 m kõrguse tahutud ristkülikplokkidest müüritisega: kolm rida, 0,7–1,05 m pikad plokid nihutatud püstvuukidega, iga plokk 0–3,5 cm eri sügavusel ja neljast toonist ühega (uus tekstuur `varad/tekstuurid/sokkelkivi.jpg`, generaator `tooriistad/loo_tekstuurid.py`), vuukides tume mört. Plokid järgivad joont ka J ümardatud nurgas. Peal on betoonkarniis ja senine balustraad (postid, talad, balustrid) 39 cm kõrgemal; aia kokkupõrkekeha ulatub 1,98 m-ni.

Uued kontrollitööriistad: `tooriistad/kattuvus.mjs` (kattuvate samatasapinnaliste pindade loend, H2 kontrollitakse kohalikus koordinaadistikus) ja valikuline `tooriistad/vaatekontroll.mjs` (vastuvõtuvaadete ja tegelase pooside kuvatõmmised kausta `kontrollivaljund/`, mis ei kuulu repositooriumi). `npm test` kontrollib nüüd ka kattuvusi, H1 süvise ja posti kokkupõrkeid, pargi proportsioone ja sissepääsu, H2 astmeid ning aia kõrgust.

## Kontrollitud

| Kontroll | Tulemus |
| --- | --- |
| `npm test` (süntaks, impordid, tekstuurid, geomeetria, simuleeritud kõnd, proovipunktid) | Läbitud; 66 võrku, 156 626 kolmnurka, 306 takistust, kõnd 2,958 m |
| Kattuvad samatasapinnalised pinnad (`kattuvus.mjs`) | H1 0, H2 0, kogu stseen 0 (versioonis 0.5.1 vastavalt 20, 52 ja 79; sh läbipääsu post/sein ja viie korruse vahesein/parapet) |
| `tooriistad/brauserikontroll.mjs` päris Chromiumis (SwiftShader) | Läbitud: käivitus, kõnd, jooks, paus, kolm kvaliteeditaset, 13 püsivaadet, 0 viga, 0 puuduvat faili |
| Skriptitud jalutuskäik brauseris | S → J 37 m vabalt; J → E2 ja J → E1 joostes kuni tõketeni (25 m); H1 süvis avatud tagaseinani (Y0 + 0,73), post ja lillepeenar peatavad, läbipääs avatud hoovi väravani; pargi tänavapoolne sissepääs avatud, puu, pink ja hekk peatavad; aia nurk ja E2-poolne aed peatavad; H2 garaaživõre, tagasiastuva vahe esimese korruse sein ja automaadid peatavad; kaamera püsib süvise, läbipääsu ja arkaadi lae all |
| Kuvatõmmised (`vaatekontroll.mjs`, retrofiltriga ja ilma) | H1 sissepääs eest ja nurga alt, süvis eest, rõdud madalalt ja mõlemast otsast; park tänavalt, nurgast ja pealtvaates; H2 tänavalt, läänest, idast ja pealtvaates; aia nurk, sokkel lähedalt ja E2 poolt; automaadid; tegelane seistes, kõndides ja joostes — inimese poolt üle vaadatud |
| Tegelase vöö- ja seelikupiirkond seistes, kõndides, joostes | Kaetud; automaatide ülaosa suletud |

Kontrollid tehti Hoplite'i liivakastis päises Chrome'is tarkvararenderdusega (SwiftShader), mitte graafikaprotsessoriga.

## Pargi proportsioonimuutus ja ebakindlus

Satelliidivaate ja tänavafoto järgi on park umbes 9 m lai ja ulatub H1 esiväljaku lõunaservast H1 sügavuse keskpaigani; selle idaserv on päriselt otse E2 sõidutee ääres. Mudelis asub E2 sõidutee H1 suhtes umbes 6 m kaugemal idas kui fotodel, sest tee, aia ja ristmiku asetust ei muudetud. Seetõttu jääb pargi idaserva ja E2 vahele asfaltlaiend (valge teejoon kulgeb piki pargi serva ja liitub pargist põhjas E2 servaga). Pargi mõõdud on ligikaudsed (laius ±1 m), viltu lõike pikkus on hinnatud ühest perspektiivfotost.

## Kontrollipiirang

Riistvaraline kaadrisagedus, tekstide paigutus kõigil ekraanisuurustel ja GPU-draiveri sügavuspuhvri käitumine ei ole kinnitatud: liivakastis puudub graafikaprotsessor. Kattuvate pindade puudumine on tõendatud geomeetriliselt (`npm test`), kuvatõmmised tehti tarkvararenderdusega.

## Pooleliolev töö

Kuus parandusrühma on tehtud. Ettepanekud edasiseks: eemaldada valmis tööde võrdluspildid kaustast `viited/aktiivne` pärast kasutaja ülevaatust (uuendades `viited/README.md`), ning soovi korral täpsustada pargi ja E2 vahelist asfaltlaiendit (nt parkimistasku), kui tee asetust otsustatakse muuta.
