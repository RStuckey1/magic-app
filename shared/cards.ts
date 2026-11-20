export type CardImageUris = {
  normal?: string
  large?: string
  art_crop?: string
}

export type ScryfallCard = {
  id: string
  name: string
  mana_cost?: string
  type_line: string
  oracle_text?: string
  set_name: string
  set: string
  rarity: string
  image_uris?: CardImageUris
  card_faces?: { image_uris?: CardImageUris }[]
  prices: { usd: string | null }
  scryfall_uri: string
}

export type SearchResponse = {
  data: ScryfallCard[]
  has_more: boolean
  next_page?: string
  total_cards: number
}
