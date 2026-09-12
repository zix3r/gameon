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

| Veiksmas            | Komanda                                                    |
| ------------------- | ---------------------------------------------------------- |
| Žurnalai            | `docker compose logs -f`                                   |
| Sustabdyti          | `docker compose down`                                      |
| Ištrinti ir DB      | `docker compose down --volumes`                            |
| Patikros ir testai  | `docker compose exec api npm run check`                    |
| Užpildyti duomenis  | `docker compose exec api npm run seed`                     |
| Produkcinis režimas | `docker compose -f compose.prod.yaml up --build -d --wait` |

Produkciniam režimui kitose komandose taip pat pridėkite `-f compose.prod.yaml`. Aplinkų DB atskiros; prieš keisdami režimą sustabdykite esamą. `--volumes` ištrina DB be patvirtinimo.

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

`.env` nekelkite į Git. Diegimas debesyje dar neparengtas.
