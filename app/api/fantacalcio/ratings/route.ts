type RosterPlayer = {
  id: string
  name: string
  team: string
}

type OfficialRating = {
  name: string
  team: string
  appearances?: number
  mv?: number
  fantasyAverage?: number
  goals?: number
  goalsConceded?: number
  penaltiesScored?: number
  penaltiesTaken?: number
  penaltiesSaved?: number
  assists?: number
  yellowCards?: number
  redCards?: number
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
  monza: "MON",
  napoli: "NAP",
  parma: "PAR",
  frosinone: "FRO",
  venezia: "VEN",
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


function parseOfficialRatings(html: string): OfficialRating[] {
  const ratings: OfficialRating[] = []
  const rows = html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)

  for (const [, attributes, row] of rows) {
    if (!/\bplayer-row\b/i.test(attributes)) continue

    const nameAttribute = attributes.match(/\bdata-filter-keywords="([^"]+)"/i)?.[1]
    const name = nameAttribute ? decodeHtml(nameAttribute).trim() : ""
    const team = extractColumn(row, "sq").toUpperCase()
    const appearances = parseInteger(extractColumn(row, "pg"))
    const mv = parseNumber(extractColumn(row, "mv"))
    const fantasyAverage = parseNumber(extractColumn(row, "mfv"))
    const goals = parseInteger(extractColumn(row, "gol"))
    const goalsConceded = parseInteger(extractColumn(row, "gs"))
    const penaltyRecord = extractColumn(row, "rig").match(/(\d+)\s*\/\s*(\d+)/)
    const penaltiesSaved = parseInteger(extractColumn(row, "rp"))
    const assists = parseInteger(extractColumn(row, "ass"))
    const yellowCards = parseInteger(extractColumn(row, "amm"))
    const redCards = parseInteger(extractColumn(row, "esp"))

    if (name && team) {
      ratings.push({
        name,
        team,
        ...(appearances !== undefined ? { appearances } : {}),
        ...(mv !== undefined ? { mv } : {}),
        ...(fantasyAverage !== undefined ? { fantasyAverage } : {}),
        ...(goals !== undefined ? { goals } : {}),
        ...(goalsConceded !== undefined ? { goalsConceded } : {}),
        ...(penaltyRecord ? { penaltiesScored: Number(penaltyRecord[1]), penaltiesTaken: Number(penaltyRecord[2]) } : {}),
        ...(penaltiesSaved !== undefined ? { penaltiesSaved } : {}),
        ...(assists !== undefined ? { assists } : {}),
        ...(yellowCards !== undefined ? { yellowCards } : {}),
        ...(redCards !== undefined ? { redCards } : {}),
      })
    }
  }

  return ratings
}

function extractColumn(row: string, key: string) {
  const cellPattern = new RegExp(
    `<(?:td|th)\\b[^>]*\\bdata-col-key="${key}"[^>]*>([\\s\\S]*?)<\\/(?:td|th)>`,
    "i",
  )
  const content = row.match(cellPattern)?.[1]
  return content ? decodeHtml(content.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim() : ""
}

function parseNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
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

      if (!matched) return []
      const { name: _name, team: _team, ...stats } = matched
      return [{ id: player.id, stats }]
    })

    return Response.json({ season, sourceUrl, ratings })
  } catch {
    return Response.json({ error: "Impossibile raggiungere le statistiche di Fantacalcio.it." }, { status: 502 })
  }
}
