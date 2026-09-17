# GameON

## Projekto tikslas

Žaidimų katalogo ir atsiliepimų sistema: naudotojai naršo žaidimus, skaito bei rašo atsiliepimus, administratoriai tvarko katalogą. Dalykinė hierarchija: **kategorija → žaidimas → atsiliepimas**.

**Technologijos:** React, Tailwind CSS, Vite, NestJS, TypeScript, PostgreSQL, Prisma.

**Sistema:** <https://gameon-uni.duckdns.org> · **API:** <https://gameon-uni.duckdns.org/api/docs>

## Ataskaita ir dokumentacija

[PDF](docs/ataskaita.pdf) · [OpenAPI ir naudojimo pavyzdžiai](docs/api.md)

## Paleidimas

Reikia Docker su Compose v2+.

```sh
cp .env.example .env
docker compose up --build -d --wait
```

Vietinė sistema: <http://localhost:8080> · Swagger: <http://localhost:8080/api/docs>

| Veiksmas                    | Komanda                                 |
| --------------------------- | --------------------------------------- |
| Užpildyti duomenis          | `docker compose exec api npm run seed`  |
| Patikros ir testai          | `docker compose exec api npm run check` |
| Išbandyti visus API metodus | `docker compose exec api npm run smoke` |
| Žurnalai                    | `docker compose logs -f`                |
| Sustabdyti                  | `docker compose down`                   |
| Pašalinti ir DB duomenis    | `docker compose down --volumes`         |

Užpildymui `.env` reikia `IGDB_CLIENT_ID` ir `IGDB_CLIENT_SECRET`. Importuojamos 6 kategorijos, 12 žaidimų ir 5 atsiliepimai.

Demonstracinės paskyros: `admin@gameon.test`, `matas@gameon.test`, `demo@gameon.test`; slaptažodis `Demo1234`. Viešoje sistemoje šio administratoriaus slaptažodžio nepalikite. `.env` nekelkite į Git.

GUI testams reikia Node.js 24, įdiegtų projekto priklausomybių ir veikiančios, duomenimis užpildytos vietinės sistemos:

```sh
npx playwright install chromium
npm run test:browser --workspace @gameon/web
```

## Diegimas

Produkcijos `.env` nustatykite `IMAGE_TAG`, `SITE_ADDRESS`, `APP_ORIGIN` (HTTPS), `DB_PASSWORD` ir `JWT_SECRET` (bent 32 simbolių).

```sh
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up --no-build -d --wait
```

Migracijos taikomos automatiškai. GitHub Actions publikuoja patikrintus `main` atvaizdus ir atnaujina veikiančią VM. VM įjungimas / išjungimas: **Actions → VM power → start / stop**.
