# Musicaltekst Oefenen

Een gratis, lokaal werkende PWA om musicalteksten te oefenen.

## Mapstructuur

- `index.html` – schermen en navigatie
- `style.css` – vormgeving
- `app.js` – opslag, oefenstanden, voortgang en instellingen
- `parser.js` – scriptuitlezing en rolherkenning
- `manifest.json` – PWA-instellingen
- `service-worker.js` – offline cache
- `icon-192.png` en `icon-512.png` – app-iconen
- `voorbeeldscript.txt` – testscript

## GitHub Pages

1. Maak een nieuwe repository, bijvoorbeeld `musicaltekst-oefenen`.
2. Pak de ZIP uit.
3. Upload alle losse bestanden naar de hoofdmap van de repository.
4. Open `Settings` en daarna `Pages`.
5. Kies `Deploy from a branch`.
6. Kies branch `main` en map `/(root)`.
7. Sla op. De app verschijnt doorgaans binnen enkele minuten.

De URL wordt ongeveer:

`https://jouwgebruikersnaam.github.io/musicaltekst-oefenen/`

## Installeren op iPhone

1. Open de GitHub Pages-link in Safari.
2. Tik op de deelknop.
3. Kies `Zet op beginscherm`.
4. Bevestig met `Voeg toe`.

## Testlijst

- Upload `voorbeeldscript.txt`.
- Kies de rol `MARTIJN`.
- Controleer of de regels correct zijn herkend.
- Start de opzegmodus en toon het antwoord.
- Beoordeel een regel als goed, bijna goed en fout.
- Start de typmodus en controleer een antwoord.
- Sluit de app en controleer of gegevens bewaard blijven.
- Exporteer en importeer een JSON-back-up.
- Test de app zonder internet nadat hij eenmaal volledig is geopend.

## Belangrijke beperking

PDF- en DOCX-bestanden worden in de browser gelezen met gratis externe bibliotheken. Bij het allereerste gebruik daarvan is internet nodig om die bibliotheken te laden. Daarna probeert de service worker ze te cachen. Een gescande PDF zonder selecteerbare tekst kan niet zonder OCR worden uitgelezen. In dat geval kun je de tekst plakken of eerst OCR gebruiken.

## Versie 2

De PDF-parser herkent nu ook rolregels met gewone hoofd- en kleine letters, zoals `Isabelle:` en `D’Artagnan:`. PDF-regelafbrekingen worden op basis van hun positie op de pagina hersteld, zodat doorlopende dialogen beter bijeen blijven.


## Versie 4

- `Repeteren`: één voorgaande tekst, zelf beoordelen of typen met automatische controle.
- `Oefenen`: twee voorgaande teksten, hardop zeggen en antwoord tonen zonder beoordeling.
- `Extra oefenen`: gerichte repetitie van fout, bijna goed of moeilijk gemarkeerde teksten.
- Voorlezen via de stemmen die iOS, Android of de browser beschikbaar stelt. De app probeert op basis van bekende rolbenamingen een passende stem te kiezen, maar een betrouwbare man/vrouw-classificatie is niet op elk apparaat beschikbaar.


## Versie 5: Inleren en eigen stemopnames

De pagina **Inleren** toont alle zinnen van andere rollen. Per zin kun je:
- een opname maken;
- de opname beluisteren;
- de opname vervangen;
- de opname verwijderen.

Tijdens **Repeteren** en **Oefenen** gebruikt de app eerst de eigen opname. Is die niet beschikbaar, dan gebruikt de app de systeemstem.

Opnames worden lokaal in IndexedDB opgeslagen en worden niet naar GitHub of een server verstuurd. De browser vraagt bij de eerste opname toestemming voor de microfoon. Opnemen werkt alleen via een beveiligde HTTPS-verbinding, zoals GitHub Pages.


## Versie 6

- Repeteren en Oefenen staan als twee afzonderlijke pagina's in de navigatie en op het dashboard.
- Repeteren bevat Goed, Bijna goed en Fout.
- Oefenen bevat geen beoordeling en toont twee voorgaande tekstregels van andere rollen.
- De fout bij ingeschakelde slimme herhaling is opgelost door oude of onvolledige statistiekgegevens automatisch te herstellen.


## Versie 7

- Oefenen toont nu exact de volledige twee tekstblokken direct vóór jouw eigen tekstblok.
- De oorspronkelijke rollen en volgorde blijven behouden.
- De tekstblokken worden niet genummerd.
- Slimme herhaling is extra foutbestendig gemaakt en blokkeert de startknop niet meer.
- Bij oude of beschadigde statistiekgegevens gebruikt de app automatisch een veilige standaard of de oorspronkelijke volgorde.


## Versie 8
- Zichtbare v8-aanduiding bovenaan.
- Repeteren en Oefenen zijn aparte navigatiepagina’s.
- Slimme herhaling sorteert niet meer bij het starten en kan de startknop daardoor niet blokkeren.
- Slimme herhaling plaatst fout of bijna goed beantwoorde teksten later opnieuw in de lopende repetitie.
- Cache wordt geforceerd vernieuwd en de service worker gebruikt netwerk-eerst voor appbestanden.


## Versie 10

- Een opstartfout door verwijzingen naar verwijderde opname- en voorleesknoppen is opgelost.
- Alle menu- en navigatieknoppen werken weer.
- Inleren en voorlezen zijn niet meer zichtbaar of bruikbaar.
- Toon tekst bij Oefenen heeft een expliciete, betrouwbare knopwerking.
- De cache wordt opnieuw geforceerd ververst met versiemarkering v10.


## Versie 11

- Meerdere rollen en schrijfwijzen tegelijk selecteren.
- Voorbeelden: Aramis, ARAMIS, Allen, Mannen, Vrouwen, Ensemble en Koor.
- Zelf extra rollen of tekstgroepen toevoegen.
- Alle geselecteerde rollen tellen als jouw tekst in Repeteren, Oefenen en Extra oefenen.


## Versie 12

- Bij Repeteren, Oefenen en Extra oefenen staan nu drie rolkeuzes:
  - Rol 1
  - Rol 2 (optioneel)
  - Rol 3 (optioneel)
- Alle drie geselecteerde rollen tellen als jouw tekst.
- Dubbele keuzes worden automatisch verwijderd.
- De keuzes worden per script onthouden.


## Versie 13

- De rol-aanvinkfunctie is van de scriptcontrole verwijderd.
- Bij scriptcontrole pas je alleen rollen, scènes en tekstregels aan.
- Rol 1, Rol 2 en Rol 3 staan nu bij Repeteren, Oefenen en Extra oefenen.
- Alle voorleesknoppen en voorleesopties zijn verwijderd.
- JavaScript-syntax en alle direct gekoppelde knoppen zijn gecontroleerd.


## Versie 14

- Rolnamen zijn nu hoofdlettergevoelig.
- `Aramis` en `ARAMIS` mogen tegelijk als Rol 1 en Rol 2 worden gekozen.
- Alleen exact dezelfde schrijfwijze wordt als dubbel beschouwd.
- Oefenen gebruikt nu correct de keuzelijsten Rol 1, Rol 2 en Rol 3 van Oefenen zelf.
- Extra oefenen heeft opnieuw volledige startlogica.
- De fout waarbij Oefenen per ongeluk de rolvelden van Repeteren controleerde is opgelost.


## Versie 15

- Repeteren en Oefenen tonen nu allebei de twee volledige tekstblokken direct vóór jouw tekst.
- De app toont de complete tekst van de spreker direct vóór jou en de complete tekst van de spreker daarvoor.
- De oorspronkelijke volgorde en rolnamen blijven behouden.
- De app zoekt eerst het begin van jouw eigen tekstblok, zodat meerdere opeenvolgende eigen regels de aanwijzingen niet verstoren.


## Versie 16: liedteksten overslaan

- Herkenbare liedsecties worden vóór de dialoogherkenning uit het script verwijderd.
- Ondersteunde markeringen zijn onder andere LIED, SONG, MUZIEKNUMMER, ZANGNUMMER, REFREIN, COUPLET, VERSE, CHORUS en BRIDGE.
- Een liedsectie eindigt bij een nieuwe akte/scène of een duidelijke eindmarkering, zoals EINDE LIED of MUZIEK STOPT.
- Op de uploadpagina staat duidelijk dat liedteksten niet in de overhoringen worden meegenomen.
- Na verwerking toont de app hoeveel liedsecties zijn overgeslagen.


## Versie 17: bijna identieke rolnamen samenvoegen

De app combineert nu schrijfvarianten van dezelfde rol.

Voorbeelden die één rol worden:
- `Aramis`, `ARAMIS` en `aramis`
- `D'Artagnan`, `D Artagnan`, `D ' Artagnan` en `D’ARTAGNAN`
- verschillen in hoofdletters, accenten, spaties, apostroffen, punten en streepjes

Genummerde rollen blijven apart:
- `Man 1`, `Man 2`, `Man 3`
- `Stem 1`, `Stem 2`
- `Soldaat 1`, `Soldaat 2`

De app kiest één nette schrijfwijze als zichtbare naam en koppelt alle teksten van de varianten aan die rol.


## Versie 18: fuzzy rolherkenning

Kleine spelfouten in rolnamen worden nu automatisch gecombineerd.

Voorbeelden:
- `Aramis`, `ARAMIS`, `aramis` en `Aramius`
- `D'Artagnan`, `D Artagnan`, `D’Artagnan` en kleine typefouten

De herkenning blijft voorzichtig:
- korte duidelijk verschillende namen worden niet gecombineerd;
- bij gewone namen is meestal maximaal één teken verschil toegestaan;
- bij langere namen zijn maximaal twee kleine verschillen toegestaan.

Genummerde rollen blijven altijd afzonderlijk:
- `Man 1`, `Man 2`, `Man 3`
- `Soldaat 1`, `Soldaat 2`
- `Stem 1`, `Stem 2`

Alleen dezelfde genummerde rol met andere hoofdletters, zoals `MAN 1` en `Man 1`, wordt gecombineerd.
