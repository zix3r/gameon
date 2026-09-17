# GameON OpenAPI dokumentacija

Specifikacija: [openapi.json](openapi.json). Tai iš veikiančios vietinės API eksportuota OpenAPI 3.0 specifikacija, papildyta užklausų, sėkmingų atsakymų ir klaidų pavyzdžiais. Aprašytos visos 22 dabartinės API operacijos. Pagrindas – projekto versija `636f2cd`; užsakymų ir kainų funkcijų nėra.

Interaktyvi dabartinės API dokumentacija: <https://gameon-uni.duckdns.org/api/docs>. Vietinis adresas: <http://localhost:8080/api/docs>. Šio katalogo JSON galima importuoti į Swagger Editor; jame yra ir papildomi `cURL` pavyzdžiai.

## Naudojimas

Pavyzdžius, kurie kuria, keičia ar šalina duomenis, vykdykite vietinėje aplinkoje. Žemiau pateikti ID ir atsakymų duomenys yra iliustraciniai, todėl naudokite savo sistemos grąžintus ID. `ACCESS_TOKEN_FROM_LOGIN` nėra tikras prieigos raktas.

```sh
BASE=http://localhost:8080
TOKEN="prisijungimo-atsakyme-gautas-accessToken"
```

- Skaitymo operacijos viešos, išskyrus `/api/auth/me`.
- Kategorijas ir žaidimus keičia administratorius (`ADMIN`). Atsiliepimą kuria prisijungęs naudotojas, redaguoja tik autorius, o pašalina autorius arba administratorius.
- `POST` ir `PATCH` kūnas perduodamas kaip `application/json`. Nežinomi laukai ir tuščias `PATCH` atmetami; kūno dydžio riba – 100 KB.
- Autentifikacijos `POST` užklausoms reikia `X-GameON-CSRF: 1`. Naršyklės `Origin`, jei pateiktas, turi sutapti su `APP_ORIGIN`.
- Prisijungimas grąžina 15 minučių galiojantį JWT. Atnaujinimo sesija galioja iki 30 dienų; `gameon_refresh` saugomas `HttpOnly`, `SameSite=Strict` slapuke (HTTPS aplinkoje ir `Secure`). Atnaujinant raktas keičiamas.
- Sąrašai turi `items`, `page`, `pageSize`, `total` ir `_links`. `pageSize` pagal nutylėjimą yra 20, leidžiama 1–100; `page` – 1–1 000 000. Paieška: `search`; žaidimų filtras: `categoryId`; atsiliepimų filtras: `authorId`.
- Identifikatoriai yra teigiami 32 bitų sveikieji skaičiai. Atsiliepimo įvertinimas – sveikasis skaičius nuo 1 iki 5. Tam pačiam žaidimui autorius gali turėti vieną atsiliepimą.
- `_links` pateikia susijusių išteklių adresus. Žaidimo atsiliepimų nuoroda patikrina ir kategorijos → žaidimo priklausomybę.

## Operacijos ir galimi rezultatai

| Metodas ir adresas                                        | Paskirtis                                             | Prieiga                           | HTTP rezultatai                                       |
| --------------------------------------------------------- | ----------------------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| `GET /api/health`                                         | Check application and database readiness              | Vieša                             | 200, 429, 500, 503                                    |
| `POST /api/auth/register`                                 | Register a regular user and start a session           | Vieša + CSRF                      | 201, 400, 403, 409, 413, 415, 429, 500, 503           |
| `POST /api/auth/login`                                    | Log in and receive an access token and refresh cookie | Vieša + CSRF                      | 200, 400, 401, 403, 413, 415, 429, 500, 503           |
| `POST /api/auth/refresh`                                  | Rotate the refresh cookie and issue an access token   | Atnaujinimo slapukas + CSRF       | 200, 400, 401, 403, 413, 415, 429, 500, 503           |
| `POST /api/auth/logout`                                   | Revoke the current session and clear its cookie       | CSRF; be sesijos irgi grąžina 204 | 204, 400, 403, 413, 415, 429, 500, 503                |
| `GET /api/auth/me`                                        | Get the authenticated user                            | Prisijungęs naudotojas            | 200, 401, 429, 500, 503                               |
| `GET /api/categories`                                     | List categories                                       | Vieša                             | 200, 400, 429, 500, 503                               |
| `POST /api/categories`                                    | Create a category                                     | Administratorius                  | 201, 400, 401, 403, 409, 413, 415, 429, 500, 503      |
| `GET /api/categories/{id}`                                | Get a category                                        | Vieša                             | 200, 400, 404, 429, 500, 503                          |
| `PATCH /api/categories/{id}`                              | Update a category                                     | Administratorius                  | 200, 400, 401, 403, 404, 409, 413, 415, 429, 500, 503 |
| `DELETE /api/categories/{id}`                             | Delete an empty category                              | Administratorius                  | 204, 400, 401, 403, 404, 409, 429, 500, 503           |
| `GET /api/games`                                          | List, search and filter games                         | Vieša                             | 200, 400, 429, 500, 503                               |
| `POST /api/games`                                         | Create a game                                         | Administratorius                  | 201, 400, 401, 403, 404, 409, 413, 415, 429, 500, 503 |
| `GET /api/games/{id}`                                     | Get a game                                            | Vieša                             | 200, 400, 404, 429, 500, 503                          |
| `PATCH /api/games/{id}`                                   | Update a game                                         | Administratorius                  | 200, 400, 401, 403, 404, 409, 413, 415, 429, 500, 503 |
| `DELETE /api/games/{id}`                                  | Delete a game without reviews                         | Administratorius                  | 204, 400, 401, 403, 404, 409, 429, 500, 503           |
| `GET /api/games/{gameId}/reviews`                         | List reviews belonging to a game                      | Vieša                             | 200, 400, 404, 429, 500, 503                          |
| `POST /api/games/{gameId}/reviews`                        | Create a game review                                  | Prisijungęs naudotojas            | 201, 400, 401, 404, 409, 413, 415, 429, 500, 503      |
| `GET /api/games/{gameId}/reviews/{id}`                    | Get a review belonging to a game                      | Vieša                             | 200, 400, 404, 429, 500, 503                          |
| `PATCH /api/games/{gameId}/reviews/{id}`                  | Update review text or rating                          | Autorius                          | 200, 400, 401, 403, 404, 413, 415, 429, 500, 503      |
| `DELETE /api/games/{gameId}/reviews/{id}`                 | Delete a game review                                  | Autorius / administratorius       | 204, 400, 401, 403, 404, 429, 500, 503                |
| `GET /api/categories/{categoryId}/games/{gameId}/reviews` | List reviews scoped through a category and game       | Vieša                             | 200, 400, 404, 429, 500, 503                          |

## Būsenų reikšmės

| Kodas | Reikšmė                                                                                                           |
| ----- | ----------------------------------------------------------------------------------------------------------------- |
| 200   | Sėkminga peržiūra, prisijungimas, atnaujinimas arba redagavimas.                                                  |
| 201   | Sukurta paskyra, kategorija, žaidimas arba atsiliepimas.                                                          |
| 204   | Sėkmingas pašalinimas arba atsijungimas; atsakymo kūno nėra.                                                      |
| 400   | Neteisingi laukai, ID, puslapio parametrai arba JSON.                                                             |
| 401   | Nėra galiojančio prieigos / atnaujinimo rakto arba klaidingi prisijungimo duomenys.                               |
| 403   | Trūksta teisių, atsiliepimas priklauso kitam autoriui arba neatitinka CSRF / Origin patikra.                      |
| 404   | Nėra ištekliaus arba jis nepriklauso nurodytam tėviniam ištekliui.                                                |
| 409   | Dubliuojamas el. paštas, kategorijos pavadinimas ar atsiliepimas; šalinamas išteklius dar turi priklausomų įrašų. |
| 413   | Užklausos kūnas viršija 100 KB.                                                                                   |
| 415   | Kūno formatas nėra palaikomas `application/json`.                                                                 |
| 429   | Viršytas užklausų dažnis. Laukimo laiką nurodo `Retry-After`.                                                     |
| 500   | Vidinė serverio klaida; techninės detalės neatskleidžiamos.                                                       |
| 503   | Laikinai nepasiekiama duomenų bazė.                                                                               |

Klaidos kūnas turi `statusCode` ir `message` (tekstą arba validavimo klaidų masyvą). `401` atsakymai pateikia `WWW-Authenticate: Bearer`. Konkrečiai operacijai taikomi kodai išvardyti lentelėje ir JSON specifikacijoje.

## Naudojimo pavyzdžiai

### Prisijungimas

```sh
curl -i \
  -X POST \
  "$BASE/api/auth/login" \
  -H 'X-GameON-CSRF: 1' \
  -b cookies.txt -c cookies.txt \
  -H 'Content-Type: application/json' \
  --data '{"email":"demo@gameon.test","password":"Demo1234"}'
```

Sėkmė: **200**.

```json
{
  "accessToken": "ACCESS_TOKEN_FROM_LOGIN",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": 2,
    "email": "demo@gameon.test",
    "displayName": "Player",
    "role": "USER",
    "_links": {
      "self": {
        "href": "/api/auth/me"
      }
    }
  }
}
```

Nesėkmės pavyzdys: **401**.

```json
{
  "statusCode": 401,
  "message": "Invalid email or password"
}
```

### Katalogo peržiūra

```sh
curl -i \
  "$BASE/api/games"
```

Sėkmė: **200**.

```json
{
  "items": [
    {
      "id": 1,
      "categoryId": 1,
      "title": "Hades",
      "description": "Veiksmo žaidimas, kuriame mėginama ištrūkti iš požemio.",
      "platform": "PC",
      "imageUrl": null,
      "igdbId": null,
      "averageRating": 4,
      "reviewCount": 1,
      "createdAt": "2026-09-13T10:00:00.000Z",
      "updatedAt": "2026-09-13T10:00:00.000Z",
      "_links": {
        "self": {
          "href": "/api/games/1"
        },
        "category": {
          "href": "/api/categories/1"
        },
        "reviews": {
          "href": "/api/categories/1/games/1/reviews"
        }
      }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "_links": {
    "self": {
      "href": "/api/games?page=1&pageSize=20"
    },
    "first": {
      "href": "/api/games?page=1&pageSize=20"
    },
    "last": {
      "href": "/api/games?page=1&pageSize=20"
    }
  }
}
```

Nesėkmės pavyzdys: **400**.

```json
{
  "statusCode": 400,
  "message": "Invalid input"
}
```

### Atsiliepimo kūrimas

```sh
curl -i \
  -X POST \
  "$BASE/api/games/1/reviews" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"text":"Įdomios kovos ir aiškus progresas.","rating":4}'
```

Sėkmė: **201**.

```json
{
  "id": 1,
  "gameId": 1,
  "authorId": 2,
  "text": "Įdomios kovos ir aiškus progresas.",
  "rating": 4,
  "author": {
    "id": 2,
    "displayName": "Player"
  },
  "createdAt": "2026-09-13T10:00:00.000Z",
  "updatedAt": "2026-09-13T10:00:00.000Z",
  "_links": {
    "self": {
      "href": "/api/games/1/reviews/1"
    },
    "game": {
      "href": "/api/games/1"
    }
  }
}
```

Nesėkmės pavyzdys: **409**.

```json
{
  "statusCode": 409,
  "message": "Author already reviewed this game"
}
```

### Savo atsiliepimo redagavimas

```sh
curl -i \
  -X PATCH \
  "$BASE/api/games/1/reviews/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"text":"Po ilgesnio žaidimo vertinu dar geriau.","rating":5}'
```

Sėkmė: **200**.

```json
{
  "id": 1,
  "gameId": 1,
  "authorId": 2,
  "text": "Po ilgesnio žaidimo vertinu dar geriau.",
  "rating": 5,
  "author": {
    "id": 2,
    "displayName": "Player"
  },
  "createdAt": "2026-09-13T10:00:00.000Z",
  "updatedAt": "2026-09-13T10:30:00.000Z",
  "_links": {
    "self": {
      "href": "/api/games/1/reviews/1"
    },
    "game": {
      "href": "/api/games/1"
    }
  }
}
```

Nesėkmės pavyzdys: **403**.

```json
{
  "statusCode": 403,
  "message": "Only the author may edit a review"
}
```

### Kategorijos šalinimas

```sh
curl -i \
  -X DELETE \
  "$BASE/api/categories/1" \
  -H "Authorization: Bearer $TOKEN"
```

Sėkmė: **204**.
Atsakymo kūno nėra. Jei kategorijoje tebėra žaidimų, grąžinamas **409**, o kategorija lieka nepakeista.

Nesėkmės pavyzdys: **409**.

```json
{
  "statusCode": 409,
  "message": "Category still contains games"
}
```

Prisijungus išsaugokite `accessToken` į `TOKEN`. Sesijos atnaujinimas:

```sh
curl -i -X POST "$BASE/api/auth/refresh" \
  -H 'X-GameON-CSRF: 1' -b cookies.txt -c cookies.txt
```

Atnaujinimas grąžina naują `accessToken` ir naują slapuką. Atsijungimas vykdomas analogiškai per `/api/auth/logout` ir sėkmės atveju grąžina `204`.
