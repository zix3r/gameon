# Projekto ataskaita

- [Ataskaita (ODT)](ataskaita.odt) – redaguojamas dokumentas.
- [Ataskaita (PDF)](ataskaita.pdf) – peržiūrai ir pateikimui.
- [API dokumentacija ir pavyzdžiai](api.md).
- [OpenAPI 3.0 specifikacija](openapi.json) – visos 22 operacijos su užklausų, atsakymų ir klaidų pavyzdžiais.
- [UML diegimo diagrama (ODG)](assets/diegimas.odg) – redaguojama LibreOffice Draw; [PNG](assets/diegimas.png).

Ataskaitoje išsaugoti pradinio KTU dokumento titulinio lapo, teksto, antraščių ir puslapių stiliai. Turinys suderintas su katalogu ir atsiliepimais, be prekybos funkcijų. Diagrama atitinka `compose.prod.yaml` ir `apps/web/Caddyfile`; PlantUML nenaudotas.

## Naudotojo sąsaja

Wireframe eksportuoti iš [esamo Figma failo](https://www.figma.com/design/YMyWIYDUfDL3kLBdMxRAkF). Jame pašalinti užsakymų ekranai, kainos, pirkimo valdikliai bei susiję navigacijos ir administravimo elementai.

| Ekranas              | Figma šaltinis                                                             | Wireframe                             | Realizacija                        |
| -------------------- | -------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------- |
| Pagrindinis puslapis | [6:96](https://www.figma.com/design/YMyWIYDUfDL3kLBdMxRAkF?node-id=6-96)   | [PNG](assets/wireframe-home.png)      | [PNG](assets/screen-home.png)      |
| Katalogas            | [5:179](https://www.figma.com/design/YMyWIYDUfDL3kLBdMxRAkF?node-id=5-179) | [PNG](assets/wireframe-catalogue.png) | [PNG](assets/screen-catalogue.png) |
| Žaidimo informacija  | [6:224](https://www.figma.com/design/YMyWIYDUfDL3kLBdMxRAkF?node-id=6-224) | [PNG](assets/wireframe-game.png)      | [PNG](assets/screen-game.png)      |

Realizacijos ekranvaizdžiai užfiksuoti 2026-09-17 iš `https://gameon-uni.duckdns.org` puslapių `/`, `/games` ir `/games/12`, 1440 × 900 px lange, kaip neprisijungusiam lankytojui. Vaizdai nėra maketų imitacijos; užfiksuojant viešos sistemos duomenys nekeisti.

ODT faile iliustracijos įterptos, todėl dokumentui atverti atskiro `assets/` katalogo nereikia. Atnaujinus tekstą, LibreOffice Writer galima atnaujinti turinį ir paveikslų sąrašą per **Tools → Update → Update All**.
