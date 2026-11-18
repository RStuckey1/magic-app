# Mana Index

A Magic: The Gathering card search app powered by the Scryfall API. Search by card name or Scryfall query syntax, refine results by color identity and rarity, and open a card on Scryfall for more details.

## Run locally

```sh
npm install
npm run dev
```

## Search syntax

Searches use Scryfall's card search endpoint. Examples:

- `Lightning Bolt` — search by card name
- `t:dragon` — search by card type
- `o:draw` — search rules text
- `cmc=3` — search by mana value

Color identity and rarity options in the panel are added to the Scryfall query. Card data and images are served directly by Scryfall.
