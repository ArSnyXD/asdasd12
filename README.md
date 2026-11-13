# Shibuya tänavalõik – interaktiivne 3D-stseen

Väike low-poly tänavastseen (Three.js), mis on modelleeritud Shibuya tänavapildi
referentsfoto järgi: kitsas valge rõdudega korterelamu (H1) tänava lõpus, selle kõrval
hall kõrghoone, parkimiskoha betoonaed, elektripostid juhtmetega ning paremal
puudealleega plats valgete pergolatega. Tegelast juhitakse kolmandas isikus.

## Käivitamine

Stseen kasutab ES-mooduleid, seega tuleb failid serveerida üle HTTP (otse `file://`
kaudu avamine ei tööta). Sobib ükskõik milline staatiline server:

```bash
# variant 1 – Python (eelinstallitud enamikus süsteemides)
python3 -m http.server 8080

# variant 2 – Node.js
npx serve .
```

Seejärel ava brauseris <http://localhost:8080> (Node'i `serve` puhul prinditakse aadress
terminali). Internetti pole tarvis: Three.js on kaasas kaustas `vendor/`.

## Juhtimine

| Tegevus                  | Klahv / hiir                          |
| ------------------------ | ------------------------------------- |
| Kõndimine                | `W` `A` `S` `D` või nooleklahvid      |
| Jooks                    | `Shift` + liikumine                   |
| Kaamera pööramine        | hiirega lohistamine (või puutega)     |
| Kaamera kaugus           | hiirerull                             |

Tegelane pöörab liikumissuunda, kaamera jälgib teda sujuvalt selja tagant ja tõmbub
lähemale, kui hoone jääb tegelase ja kaamera vahele. Hooned, aiad, postid, puud, autod
ja muu tänavainventar on läbipääsmatud.

## Projekti ülesehitus

```
index.html            lehe karkass, import map ja juhiste HUD
src/main.js           renderer, valgus, udu, animatsioonitsükkel
src/world.js          tänav, hooned, puud, pergolad, tänavainventar, põrkekehad
src/textures.js       protseduurilised canvas-tekstuurid (fassaadid, sillutis, sildid)
src/character.js      low-poly tegelane ja kõndimisanimatsioon
src/player.js         liikumine kaamera suhtes ja kokkupõrgete lahendamine
src/camera.js         kolmanda isiku kaamera (orbiit, sujuv jälgimine, varjestus)
src/input.js          klaviatuuri- ja hiiresisend
vendor/               Three.js r187 (MIT, üks minifitseeritud ESM-fail)
```

Väliseid teenuseid, API-võtmeid ega ehitussammu pole – kõik tekstuurid genereeritakse
laadimisel koodist.
