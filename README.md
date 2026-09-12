# GameON

## Projekto tikslas

Šiame projekte kuriama žaidimų atsiliepimų ir prekybos sistema „GameON“. Jos tikslas – suteikti naudotojams galimybę naršyti žaidimų katalogą, peržiūrėti žaidimų informaciją, dalintis atsiliepimais ir pateikti demonstracinius užsakymus.

**Technologijos:** React, Tailwind CSS, Vite, NestJS, TypeScript, PostgreSQL, Prisma.
**Būsena:** API, IGDB duomenys, JWT ir prisitaikanti GUI įgyvendinti.

## Paleidimas

Reikia Docker su Compose v2+. Nukopijuokite `.env.example` į `.env`.
Tik trys konteineriai: **web, api, db**. Kiekvieną kartą paleidžiamas kūrimo API vykdo `npm ci`, generuoja „Prisma“ klientą ir pritaiko migracijas. DB duomenys išlieka.
Kūrimo konteineriai veikia kaip `node` (UID/GID `1000:1000`); bendrai naudojamas projekto aplankas turi būti jam rašomas.

```sh
docker compose up --build --force-recreate -d --wait
```

Sistema: <http://localhost:8080> · API dokumentacija: <http://localhost:8080/api/docs>

| Veiksmas            | Komanda                                 |
| ------------------- | --------------------------------------- |
| Žurnalai            | `docker compose logs -f`                |
| Sustabdyti          | `docker compose down`                   |
| Ištrinti ir DB      | `docker compose down --volumes`         |
| Patikros ir testai  | `docker compose exec api npm run check` |
| Užpildyti duomenis  | `docker compose exec api npm run seed`  |
| Produkcinis režimas | Žr. „Diegimas“ žemiau                   |

Produkciniam režimui kitose komandose taip pat pridėkite `-f compose.prod.yaml`. Aplinkų DB atskiros. `--volumes` ištrina DB ir HTTPS sertifikatus be patvirtinimo.

## Duomenys ir prisijungimas

- IGDB užpildymui į `.env` įrašykite `IGDB_CLIENT_ID` ir `IGDB_CLIENT_SECRET` iš [Twitch programėlės](https://api-docs.igdb.com/#getting-started).
- Viena IGDB užklausa importuoja 12 žaidimų su viršelių URL. Pridedamos kategorijos, paskyros, atsiliepimai ir demonstraciniai užsakymai. Esami įrašai nekeičiami; turinys anglų kalba.
- Paskyros: `admin@gameon.test`, `matas@gameon.test`, `demo@gameon.test`. Slaptažodis: `Demo1234`. DB: `gameon` / `Demo1234`.
- Autentifikacijos POST metodams reikia `X-GameON-CSRF: 1`; apsaugotiems API metodams – `Authorization: Bearer <accessToken>`.
- JWT galioja 15 min., atnaujinimo slapukas – iki 30 dienų. Neprivalomas `JWT_SECRET` (bent 32 simbolių) tuščias generuojamas paleidžiant. `APP_ORIGIN` numatytai atitinka vietinį adresą ir `APP_PORT`.

## Sąsaja

- Svečiai naršo katalogą, ieško ir filtruoja žaidimus, skaito atsiliepimus.
- Prisijungę naudotojai kuria ir keičia savo atsiliepimus, pateikia demonstracinius užsakymus ir peržiūri jų istoriją.
- Administratoriai valdo kategorijas bei žaidimus, šalina atsiliepimus ir mato visus užsakymus.
- Sąsaja anglų kalba; mobilus meniu, puslapiavimas, patvirtinimo dialogai ir savarankiškai talpinamas „Inter“ šriftas. Tikrų mokėjimų ar žaidimų pristatymo nėra.

## Patikros

ESLint, Prettier, TypeScript ir nedidelis testų rinkinys vykdomi konteineriuose. Tikrinami pagrindiniai API veiksmai, teisės, sesijų atnaujinimas ir IGDB duomenys. Integraciniai testai naudoja atskirą laikiną DB tame pačiame `db` konteineryje. Produkcinis kūrimas tikrina kodą ir vienetinius testus; paleidžiant tik pritaikomos migracijos, testai automatiškai nekartojami.

## API demonstracija

Paleistoje ir duomenimis užpildytoje sistemoje:

```sh
docker compose exec api npm run smoke
```

Komanda demonstruoja visus 24 API metodus. Užklausos sunumeruotos ir sugrupuotos pagal sritis; kiekvienai atskirai rodomi „Request“, „Response“ ir rezultatas: adresas, JSON, atsako kodas ir turinio tipas. Slaptažodžiai bei žetonai paslepiami. Papildomai parodomi 400 bei 404 atvejai. Aprėptis lyginama su OpenAPI; išvedamas vykdymo laikas. Naudojama `admin@gameon.test` paskyra ir laikini demonstraciniai įrašai. Laikina paskyra bei užsakymas pašalinami tiesiogiai iš DB, nes jų trynimo API nėra. Nesėkmės atveju komanda grąžina klaidos kodą. Swagger „Try it out“ lieka atskirų metodų demonstravimui.

## Kodo struktūra

- `apps/web/src/App.tsx` – puslapių maršrutai; `features/` – puslapiai ir jų formos.
- `apps/web/src/components/` – bendri sąsajos elementai; `auth/` – prisijungimas ir teisių tikrinimas.
- `apps/web/src/lib/api.ts` – HTTP užklausos ir sesija; `queries.ts` – duomenų gavimas ir podėlis.
- `apps/api/src/` – kiekvienos srities valdiklis (`controller`), įvesties taisyklės (`dto`) ir logika (`service`).
- `apps/api/prisma/` – DB schema ir migracijos; `scripts/check-db.mjs` – izoliuotų testų paleidimas.

## Diegimas

„GitHub Actions“ sukuria produkcinius atvaizdus, patikrina trijų konteinerių sistemą ir tik iš `main` publikuoja `ghcr.io/zix3r/gameon-api` bei `gameon-web`. GHCR paketai turi būti vieši. VM nereikia Node.js ar kompiliavimo įrankių – tik Docker ir Compose v2.

Serveryje laikykite `compose.prod.yaml` ir privačią `.env` (`chmod 600 .env`):

```dotenv
IMAGE_TAG=<patikrinto-main-komito-SHA>
SITE_ADDRESS=<vardas>.duckdns.org
APP_ORIGIN=https://<vardas>.duckdns.org
DB_PASSWORD=<atsitiktinis-hex-slaptazodis>
JWT_SECRET=<atsitiktinis-hex-raktas>
IGDB_CLIENT_ID=<kliento-ID>
IGDB_CLIENT_SECRET=<kliento-paslaptis>
```

`DB_PASSWORD` ir `JWT_SECRET` sugeneruokite atskirai su `openssl rand -hex 32`. DB slaptažodis nustatomas kuriant DB tomą; vien `.env` pakeitimas esamos DB slaptažodžio nepakeičia.

„DuckDNS“ A įrašas turi rodyti į VM viešą IP. Atverkite TCP 80 ir 443; SSH 22 leiskite tik iš administratoriaus IP. `web` naudoja „Caddy“, kuris automatiškai išduoda ir atnaujina HTTPS sertifikatus. DB ir API prievadai neviešinami.

```sh
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up --no-build -d --wait
```

Atnaujinant pakeiskite `IMAGE_TAG` į patikrinto komito SHA ir pakartokite komandas. Migracijos taikomos automatiškai; konteineriai pasileidžia po VM perkrovimo. Prieš DB keičiančius atnaujinimus pasidarykite atsarginę kopiją; senas atvaizdas neatšaukia migracijų.

Vietiniam produkcijos tikrinimui naudokite `SITE_ADDRESS=:80`, `HTTP_PORT=18080`, `HTTPS_PORT=18443` ir `APP_ORIGIN=http://localhost:18080`; atvaizdus galima sukurti su `docker compose -f compose.prod.yaml build`.

`.env` nekelkite į Git.
