type RosterPlayer = {
  id: string
  name: string
  team: string
}

type OfficialRating = {
  name: string
  team: string
  mv: number
  appearances: number
}

const TEAM_CODES: Record<string, string> = {
  atalanta: "ATA",
  bergamo: "ATA",
  bologna: "BOL",
  cagliari: "CAG",
  como: "COM",
  cremonese: "CRE",
  fiorentina: "FIO",
  firenze: "FIO",
  genoa: "GEN",
  genova: "GEN",
  inter: "INT",
  internazionale: "INT",
  juventus: "JUV",
  juve: "JUV",
  lazio: "LAZ",
  lecce: "LEC",
  milan: "MIL",
  napoli: "NAP",
  parma: "PAR",
  pisa: "PIS",
  roma: "ROM",
  sassuolo: "SAS",
  torino: "TOR",
  udinese: "UDI",
  verona: "VER",
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function decodeHtml(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  }

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, reference: string) => {
    if (reference.startsWith("#x")) return String.fromCodePoint(Number.parseInt(reference.slice(2), 16))
    if (reference.startsWith("#")) return String.fromCodePoint(Number.parseInt(reference.slice(1), 10))
    return namedEntities[reference.toLowerCase()] ?? entity
  })
}

function extractCell(row: string, className: string) {
  const cellPattern = new RegExp(
    `<(?:td|th)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/(?:td|th)>`,
    "i",
  )
  const content = row.match(cellPattern)?.[1]
  return content ? decodeHtml(content.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim() : ""
}

function parseOfficialRatings(html: string): OfficialRating[] {
  const ratings: OfficialRating[] = []
  const rows = html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)

  for (const [, attributes, row] of rows) {
    if (!/\bplayer-row\b/i.test(attributes)) continue

    const nameAttribute = attributes.match(/\bdata-filter-keywords="([^"]+)"/i)?.[1]
    const name = nameAttribute ? decodeHtml(nameAttribute).trim() : ""
    const team = extractCell(row, "player-team").toUpperCase()
    const appearances = Number.parseInt(extractCell(row, "player-match-playeds"), 10)
    const mv = Number.parseFloat(extractCell(row, "player-grade-avg").replace(",", "."))

    if (name && team && Number.isFinite(appearances) && Number.isFinite(mv)) {
      ratings.push({ name, team, mv, appearances })
    }
  }

  return ratings
}

function getSeason() {
  const now = new Date()
  const startYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
  return `${startYear}-${String(startYear + 1).slice(-2)}`
}

function getTeamCode(team: string) {
  const normalizedTeam = normalize(team)
  return TEAM_CODES[normalizedTeam] ?? (normalizedTeam.length === 3 ? normalizedTeam.toUpperCase() : undefined)
}

function isRosterPlayer(value: unknown): value is RosterPlayer {
  if (!value || typeof value !== "object") return false
  const player = value as Partial<RosterPlayer>
  return typeof player.id === "string" && player.id.length > 0 && player.id.length <= 120
    && typeof player.name === "string" && player.name.trim().length > 0 && player.name.length <= 100
    && typeof player.team === "string" && player.team.length <= 80
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > 40_000) return Response.json({ error: "Richiesta troppo grande." }, { status: 413 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 })
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as { players?: unknown }).players)) {
    return Response.json({ error: "La rosa non è valida." }, { status: 400 })
  }

  const players = (body as { players: unknown[] }).players
  if (players.length > 100 || !players.every(isRosterPlayer)) {
    return Response.json({ error: "La rosa deve contenere al massimo 100 giocatori validi." }, { status: 400 })
  }

  const season = getSeason()
  const sourceUrl = `https://www.fantacalcio.it/statistiche-serie-a/${season}/italia`

  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FantacalcioRatingLookup/1.0)" },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(12_000),
    })

    if (!response.ok) return Response.json({ error: "Fantacalcio.it non ha restituito le statistiche." }, { status: 502 })

    const html = await response.text()
    const officialRatings = parseOfficialRatings(html)
    if (!officialRatings.length) {
      return Response.json({ error: "Il formato delle statistiche di Fantacalcio.it è cambiato." }, { status: 502 })
    }

    const ratingsByName = new Map<string, OfficialRating[]>()
    for (const rating of officialRatings) {
      const key = normalize(rating.name)
      const candidates = ratingsByName.get(key) ?? []
      candidates.push(rating)
      ratingsByName.set(key, candidates)
    }

    const ratings = players.flatMap((player) => {
      const candidates = ratingsByName.get(normalize(player.name)) ?? []
      if (!candidates.length) return []

      const teamCode = getTeamCode(player.team)
      const matched = teamCode
        ? candidates.find((candidate) => candidate.team === teamCode) ?? (candidates.length === 1 ? candidates[0] : undefined)
        : candidates.length === 1 ? candidates[0] : undefined

      if (!matched || matched.appearances === 0) return []
      return [{ id: player.id, mv: matched.mv, appearances: matched.appearances }]
    })

    return Response.json({ season, sourceUrl, ratings })
  } catch {
    return Response.json({ error: "Impossibile raggiungere le statistiche di Fantacalcio.it." }, { status: 502 })
  }
}
