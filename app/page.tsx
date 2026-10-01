"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ChangeEvent, CSSProperties } from "react"
import { read as readWorkbook, utils as workbookUtils } from "xlsx"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FileSpreadsheet,
  Flame,
  LoaderCircle,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react"

type Position = "P" | "D" | "C" | "A"
type Page = "home" | "roster" | "formation"
type Theme = "dark" | "light"

interface Player {
  id: string
  name: string
  team: string
  position: Position
  mantraRoles: string[]
  titolarita: number
  hype: number
  mv: number
  inj: boolean
  suspended?: boolean
  reason: string
  opponent: string
}

interface Formation {
  name: string
  defense: number
  midfield: number
  attack: number
}

const STORAGE_KEY = "fanta-vibes-final-bello"
const FIRST_NAME_HEADERS = new Set(["nome","firstname","nomeproprio"])
const NAME_HEADERS = new Set(["giocatore","calciatore","nome","nominativo","nomegiocatore","nomecalciatore","player","playername","atleta"])
const TEAM_HEADERS = new Set(["squadra","teamsquadra","club","clubsquadra","squadraappartenenza"])
const ROLE_HEADERS = new Set(["ruolo","ruoliclassic","ruolomantra","ruoli","posizione","r","mantra"])
const INJURY_HEADERS = new Set(["infortunio","infortunata","infortunato","injury","injured","indisponibile","out"])
const SUSPENSION_HEADERS = new Set(["squalifica","squalificato","squalificata","suspended","suspension"])
const STATUS_HEADERS = new Set(["stato","status","note","disponibilita","disponibilitagiocatore"])

const CLASSIC_FORMATIONS: Formation[] = [
  { name: "3-4-3", defense: 3, midfield: 4, attack: 3 },
  { name: "3-5-2", defense: 3, midfield: 5, attack: 2 },
  { name: "4-3-3", defense: 4, midfield: 3, attack: 3 },
  { name: "4-4-2", defense: 4, midfield: 4, attack: 2 },
]

const POSITION_NAMES: Record<Position, string> = { P: "Portieri", D: "Difensori", C: "Centrocampisti", A: "Attaccanti" }
const POSITION_COLORS: Record<Position, string> = {
  P: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  D: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  C: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  A: "border-rose-400/30 bg-rose-400/10 text-rose-100",
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}
function exactPlayerByName(name: string): Player | undefined {
  const n = normalizeName(name)
  if (!n) return undefined
  return PLAYER_DB.find((p) => normalizeName(p.name) === n)
}
function getAvailability(player: Player) {
  if (player.inj || player.suspended) return 0
  return player.titolarita / 100
}
function parseAvailabilityFlag(value: string | undefined, kind: "injury" | "suspension", explicitField = false) {
  const normalized = normalizeName(value?? "")
  if (!normalized) return undefined
  const pattern = kind === "injury"? /infortun|injur|indisponibil/ : /squalific|suspend|sospes/
  if (pattern.test(normalized) || (kind === "injury" && normalized === "out")) return true
  if (explicitField && ["si","yes","true","1","x"].includes(normalized)) return true
  if (["no","false","0","disponibile","disponibilita","regolare"].includes(normalized)) return false
  return undefined
}
function getImportedRole(roleText: string, existing?: Player) {
  const tokens = roleText.toUpperCase().match(/POR|PC|DC|DD|DS|[PMDCETWA]/g)?? []
  const mantraRoles = [...new Set(tokens.map((role) => (role === "P"? "Por" : role[0] + role.slice(1).toLowerCase())))]
  const position: Position | undefined = tokens.some((r) => r === "P" || r === "POR")? "P" : tokens.some((r) => ["D","DC","DD","DS"].includes(r))? "D" : tokens.some((r) => ["A","PC","W"].includes(r))? "A" : tokens.some((r) => ["M","C","T","E"].includes(r))? "C" : existing?.position
  return { position: position?? "C", mantraRoles: mantraRoles.length? mantraRoles : existing?.mantraRoles?? [] }
}
function createImportedPlayer(name: string, team: string, roleText: string, inj?: boolean, suspended?: boolean): Player {
  const existing = exactPlayerByName(name)
  const importedRole = getImportedRole(roleText, existing)
  if (existing) {
    return {...existing, name: name.trim(), team: team || existing.team, position: importedRole.position, mantraRoles: importedRole.mantraRoles, inj: inj?? existing.inj, suspended: suspended?? existing.suspended?? false }
  }
  const id = `import-${normalizeName(name)}`
  return { id, name: name.trim(), team: team || "—", position: importedRole.position, mantraRoles: importedRole.mantraRoles, titolarita: 55, hype: 5, mv: 6, inj: inj?? false, suspended: suspended?? false, reason: "Importato - Statistiche da verificare.", opponent: "—" } as Player
}
function matchRosterFromOcr(text: string): Player[] {
  const lines = text.split(/[\n\r|]+/).map((l) => l.replace(/\d+[.,]?\d*/g, " ").replace(/[^\p{L}\s.'-]/gu, " ").trim()).filter(Boolean)
  const headings = /^(rosa|titolari|panchina|formazione|giocatori|portieri|difensori|centrocampisti|attaccanti)$/i
  const players: Player[] = []
  const seen = new Set<string>()
  for (const line of lines) {
    if (line.length < 3 || headings.test(line)) continue
    const key = normalizeName(line)
    if (seen.has(key)) continue
    const exact = exactPlayerByName(line)
    if (exact) { seen.add(key); players.push(exact) }
    else if (line.length >=3 && line.length <=35) { seen.add(key); players.push(createImportedPlayer(line,"","")) }
  }
  return players
}
function parseRosterRows(rows: unknown[][]) {
  const normalizedRows = rows.map((row) => (row as any[]).map((cell) => String(cell?? "").trim()))
  const headerIndex = normalizedRows.slice(0, 15).findIndex((row) => row.some((cell) => NAME_HEADERS.has(normalizeName(cell))))
  const seenNames = new Set<string>()
  const players: Player[] = []
  const addPlayer = (name: string, team = "", roleText = "", inj?: boolean, suspended?: boolean) => {
    const cleanName = name.replace(/^[\s\d.#-]+|[\s\d.#-]+$/g, "").trim()
    const key = normalizeName(cleanName)
    if (key.length < 2 || seenNames.has(key)) return
    seenNames.add(key)
    players.push(createImportedPlayer(cleanName, team, roleText, inj, suspended))
  }
  if (headerIndex >= 0) {
    const headers = normalizedRows[headerIndex].map(normalizeName)
    let nameIndex = headers.findIndex((h) => NAME_HEADERS.has(h))
    const firstNameIdx = headers.findIndex((h) => ["nome","firstname","nomeproprio"].includes(h))
    const lastNameIdx = headers.findIndex((h) => ["cognome","lastname","cognomegiocatore"].includes(h))
    if (nameIndex < 0 && firstNameIdx >= 0 && lastNameIdx >= 0) nameIndex = firstNameIdx
    const teamIndex = headers.findIndex((h) => TEAM_HEADERS.has(h))
    const roleIndexes = headers.map((h,i) => ROLE_HEADERS.has(h)? i : -1).filter(i=>i>=0)
    const injuryIndex = headers.findIndex((h) => INJURY_HEADERS.has(h))
    const suspensionIndex = headers.findIndex((h) => SUSPENSION_HEADERS.has(h))
    const statusIndexes = headers.map((h,i) => STATUS_HEADERS.has(h)? i : -1).filter(i=>i>=0)
    for (const row of normalizedRows.slice(headerIndex + 1)) {
      const name = firstNameIdx >= 0 && lastNameIdx >= 0? `${row[firstNameIdx]?? ""} ${row[lastNameIdx]?? ""}`.trim() : row[nameIndex]?? ""
      if (!name) continue
      const statusText = statusIndexes.map(i => row[i]?? "").join(" ")
      const inj = parseAvailabilityFlag(injuryIndex>=0?row[injuryIndex]:undefined,"injury",injuryIndex>=0)?? parseAvailabilityFlag(statusText,"injury")
      const susp = parseAvailabilityFlag(suspensionIndex>=0?row[suspensionIndex]:undefined,"suspension",suspensionIndex>=0)?? parseAvailabilityFlag(statusText,"suspension")
      addPlayer(name, teamIndex>=0?row[teamIndex]:"", roleIndexes.map(i=>row[i]?? "").join(" "), inj, susp)
    }
  } else {
    for (const row of normalizedRows) {
      for (const cell of row) {
        if (!cell || cell.length < 2) continue
        if (/^(foglio1|lista)$/i.test(cell)) continue
        const exact = exactPlayerByName(cell)
        if (exact) addPlayer(exact.name, exact.team, exact.mantraRoles.join(" "))
        else addPlayer(cell, "", "")
      }
    }
  }
  return players
}
function getCsvDelimiter(text: string) {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0]?? ""
  const counts = [";",",","\t"].map(d => ({ delimiter: d, count: firstLine.split(d).length }))
  const detected = counts.sort((a,b)=>b.count-a.count)[0]
  return detected.count > 1? detected.delimiter : ","
}
function readBrowserFile(file: File, format: "text"): Promise<string>
function readBrowserFile(file: File, format: "arrayBuffer"): Promise<ArrayBuffer>
function readBrowserFile(file: File, format: "text" | "arrayBuffer"): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error?? new Error("Unable to read"))
    reader.onabort = () => reject(new Error("Cancelled"))
    reader.onload = () => {
      if (format === "text" && typeof reader.result === "string") resolve(reader.result)
      else if (format === "arrayBuffer" && reader.result instanceof ArrayBuffer) resolve(reader.result)
      else reject(new Error("Unexpected format"))
    }
    if (format === "text") reader.readAsText(file)
    else reader.readAsArrayBuffer(file)
  })
}
async function importRosterFile(file: File): Promise<Player[]> {
  const extension = file.name.toLowerCase().split(".").pop() || ""
  if (["png","jpg","jpeg","webp","bmp"].includes(extension)) {
    const { createWorker } = await import("tesseract.js")
    const worker = await (createWorker as any)("ita+eng")
    const { data } = await (worker as any).recognize(file)
    await (worker as any).terminate()
    return matchRosterFromOcr(data.text || "")
  }
  if (["txt"].includes(extension)) {
    const text = await file.text()
    return matchRosterFromOcr(text)
  }
  let workbook
  if (extension === "csv") {
    const csv = await readBrowserFile(file, "text")
    workbook = readWorkbook(csv, { type: "string", FS: getCsvDelimiter(csv) })
  } else {
    const fileBytes = await readBrowserFile(file, "arrayBuffer")
    workbook = readWorkbook(fileBytes, { type: "array" })
  }
  const players = workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    return sheet? parseRosterRows(workbookUtils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false })) : []
  })
  return [...new Map(players.map((p) => [p.id, p])).values()]
}
function isStoredPlayer(value: unknown): value is Player {
  if (!value || typeof value!== "object") return false
  const p = value as Partial<Player>
  return typeof p.id === "string" && typeof p.name === "string" && ["P","D","C","A"].includes(p.position?? "")
}const PLAYER_DB: Player[] = [
  { id: "svilar", name: "Svilar", team: "Roma", position: "P", mantraRoles: ["Por"], fantacalcioId: 5841 },
  { id: "carnesecchi", name: "Carnesecchi", team: "Atalanta", position: "P", mantraRoles: ["Por"], fantacalcioId: 4431 },
  { id: "vicario", name: "Vicario", team: "Juventus", position: "P", mantraRoles: ["Por"], fantacalcioId: 4964 },
  { id: "maignan", name: "Maignan", team: "Milan", position: "P", mantraRoles: ["Por"], fantacalcioId: 4312 },
  { id: "martinez-jo", name: "Martinez Jo.", team: "Inter", position: "P", mantraRoles: ["Por"], fantacalcioId: 5116 },
  { id: "caprile", name: "Caprile", team: "Cagliari", position: "P", mantraRoles: ["Por"], fantacalcioId: 4360 },
  { id: "butez", name: "Butez", team: "Como", position: "P", mantraRoles: ["Por"], fantacalcioId: 6966 },
  { id: "mandas", name: "Mandas", team: "Lazio", position: "P", mantraRoles: ["Por"], fantacalcioId: 6482 },
  { id: "de-gea", name: "De Gea", team: "Fiorentina", position: "P", mantraRoles: ["Por"], fantacalcioId: 2521 },
  { id: "skorupski", name: "Skorupski", team: "Bologna", position: "P", mantraRoles: ["Por"], fantacalcioId: 133 },
  { id: "palmisani", name: "Palmisani", team: "Frosinone", position: "P", mantraRoles: ["Por"], fantacalcioId: 6415 },
  { id: "di-gregorio", name: "Di Gregorio", team: "Juventus", position: "P", mantraRoles: ["Por"], fantacalcioId: 5876 },
  { id: "meret", name: "Meret", team: "Napoli", position: "P", mantraRoles: ["Por"], fantacalcioId: 572 },
  { id: "perri", name: "Perri", team: "Torino", position: "P", mantraRoles: ["Por"], fantacalcioId: 6534 },
  { id: "okoye", name: "Okoye", team: "Udinese", position: "P", mantraRoles: ["Por"], fantacalcioId: 6462 },
  { id: "sanchez-ro", name: "Sanchez Ro.", team: "Como", position: "P", mantraRoles: ["Por"], fantacalcioId: 6344 },
  { id: "falcone", name: "Falcone", team: "Lecce", position: "P", mantraRoles: ["Por"], fantacalcioId: 2134 },
  { id: "milinkovic-savic-v", name: "Milinkovic-Savic V.", team: "Napoli", position: "P", mantraRoles: ["Por"], fantacalcioId: 2170 },
  { id: "suzuki", name: "Suzuki", team: "Parma", position: "P", mantraRoles: ["Por"], fantacalcioId: 6641 },
  { id: "bijlow", name: "Bijlow", team: "Genoa", position: "P", mantraRoles: ["Por"], fantacalcioId: 7332 },
  { id: "perin", name: "Perin", team: "Juventus", position: "P", mantraRoles: ["Por"], fantacalcioId: 218 },
  { id: "daffara", name: "Daffara", team: "Parma", position: "P", mantraRoles: ["Por"], fantacalcioId: 7411 },
  { id: "muric", name: "Muric", team: "Sassuolo", position: "P", mantraRoles: ["Por"], fantacalcioId: 4236 },
  { id: "stankovic-f", name: "Stankovic F.", team: "Venezia", position: "P", mantraRoles: ["Por"], fantacalcioId: 6248 },
  { id: "corvi", name: "Corvi", team: "Parma", position: "P", mantraRoles: ["Por"], fantacalcioId: 6662 },
  { id: "tornqvist", name: "Tornqvist", team: "Monza", position: "P", mantraRoles: ["Por"], fantacalcioId: 7301 },
  { id: "thiam", name: "Thiam", team: "Monza", position: "P", mantraRoles: ["Por"], fantacalcioId: 4485 },
  { id: "rossi-f", name: "Rossi F.", team: "Atalanta", position: "P", mantraRoles: ["Por"], fantacalcioId: 2297 },
  { id: "sportiello", name: "Sportiello", team: "Atalanta", position: "P", mantraRoles: ["Por"], fantacalcioId: 4 },
  { id: "happonen", name: "Happonen", team: "Bologna", position: "P", mantraRoles: ["Por"], fantacalcioId: 7533 },
  { id: "pessina-mas", name: "Pessina Mas.", team: "Bologna", position: "P", mantraRoles: ["Por"], fantacalcioId: 7172 },
  { id: "ciocci", name: "Ciocci", team: "Cagliari", position: "P", mantraRoles: ["Por"], fantacalcioId: 4929 },
  { id: "sherri", name: "Sherri", team: "Cagliari", position: "P", mantraRoles: ["Por"], fantacalcioId: 6650 },
  { id: "vigorito", name: "Vigorito", team: "Como", position: "P", mantraRoles: ["Por"], fantacalcioId: 2809 },
  { id: "christensen-o", name: "Christensen O.", team: "Fiorentina", position: "P", mantraRoles: ["Por"], fantacalcioId: 6403 },
  { id: "lezzerini", name: "Lezzerini", team: "Fiorentina", position: "P", mantraRoles: ["Por"], fantacalcioId: 158 },
  { id: "desplanches", name: "Desplanches", team: "Frosinone", position: "P", mantraRoles: ["Por"], fantacalcioId: 7463 },
  { id: "lolic", name: "Lolic", team: "Frosinone", position: "P", mantraRoles: ["Por"], fantacalcioId: 7466 },
  { id: "sommariva", name: "Sommariva", team: "Genoa", position: "P", mantraRoles: ["Por"], fantacalcioId: 219 },
  { id: "stolz", name: "Stolz", team: "Genoa", position: "P", mantraRoles: ["Por"], fantacalcioId: 6569 },
  { id: "di-gennaro", name: "Di Gennaro", team: "Inter", position: "P", mantraRoles: ["Por"], fantacalcioId: 1926 },
  { id: "provedel", name: "Provedel", team: "Inter", position: "P", mantraRoles: ["Por"], fantacalcioId: 2814 },
  { id: "pinsoglio", name: "Pinsoglio", team: "Juventus", position: "P", mantraRoles: ["Por"], fantacalcioId: 1930 },
  { id: "motta", name: "Motta", team: "Lazio", position: "P", mantraRoles: ["Por"], fantacalcioId: 7337 },
  { id: "renzetti", name: "Renzetti", team: "Lazio", position: "P", mantraRoles: ["Por"], fantacalcioId: 7534 },
  { id: "fruchtl", name: "Fruchtl", team: "Lecce", position: "P", mantraRoles: ["Por"], fantacalcioId: 2401 },
  { id: "samooja", name: "Samooja", team: "Lecce", position: "P", mantraRoles: ["Por"], fantacalcioId: 6523 },
  { id: "terracciano", name: "Terracciano", team: "Milan", position: "P", mantraRoles: ["Por"], fantacalcioId: 2815 },
  { id: "torriani", name: "Torriani", team: "Milan", position: "P", mantraRoles: ["Por"], fantacalcioId: 6813 },
  { id: "pizzignacco", name: "Pizzignacco", team: "Monza", position: "P", mantraRoles: ["Por"], fantacalcioId: 6682 },
  { id: "strajnar", name: "Strajnar", team: "Monza", position: "P", mantraRoles: ["Por"], fantacalcioId: 7475 },
  { id: "contini", name: "Contini", team: "Napoli", position: "P", mantraRoles: ["Por"], fantacalcioId: 2845 },
  { id: "de-marzi", name: "De Marzi", team: "Roma", position: "P", mantraRoles: ["Por"], fantacalcioId: 7048 },
  { id: "gollini", name: "Gollini", team: "Roma", position: "P", mantraRoles: ["Por"], fantacalcioId: 610 },
  { id: "russo-a", name: "Russo A.", team: "Sassuolo", position: "P", mantraRoles: ["Por"], fantacalcioId: 4518 },
  { id: "turati", name: "Turati", team: "Sassuolo", position: "P", mantraRoles: ["Por"], fantacalcioId: 4867 },
  { id: "mascardi", name: "Mascardi", team: "Torino", position: "P", mantraRoles: ["Por"], fantacalcioId: 7457 },
  { id: "paleari", name: "Paleari", team: "Torino", position: "P", mantraRoles: ["Por"], fantacalcioId: 5320 },
  { id: "siviero", name: "Siviero", team: "Torino", position: "P", mantraRoles: ["Por"], fantacalcioId: 7363 },
  { id: "padelli", name: "Padelli", team: "Udinese", position: "P", mantraRoles: ["Por"], fantacalcioId: 543 },
  { id: "piana", name: "Piana", team: "Udinese", position: "P", mantraRoles: ["Por"], fantacalcioId: 5707 },
  { id: "grandi", name: "Grandi", team: "Venezia", position: "P", mantraRoles: ["Por"], fantacalcioId: 6671 },
  { id: "pozzi", name: "Pozzi", team: "Venezia", position: "P", mantraRoles: ["Por"], fantacalcioId: 7531 },
  { id: "vismara", name: "Vismara", team: "Atalanta", position: "P", mantraRoles: ["Por"], fantacalcioId: 7545 },
  { id: "satalino", name: "Satalino", team: "Sassuolo", position: "P", mantraRoles: ["Por"], fantacalcioId: 2127 },
  { id: "penev", name: "Penev", team: "Lecce", position: "P", mantraRoles: ["Por"], fantacalcioId: 7557 },
  { id: "pisseri", name: "Pisseri", team: "Frosinone", position: "P", mantraRoles: ["Por"], fantacalcioId: 7560 },
  { id: "radunovic", name: "Radunovic", team: "Cagliari", position: "P", mantraRoles: ["Por"], fantacalcioId: 3 },
  { id: "montipò", name: "Montipò", team: "Venezia", position: "P", mantraRoles: ["Por"], fantacalcioId: 4957 },
  { id: "bleve", name: "Bleve", team: "Lecce", position: "P", mantraRoles: ["Por"], fantacalcioId: 4468 },
  { id: "grabara", name: "Grabara", team: "Juventus", position: "P", mantraRoles: ["Por"], fantacalcioId: 7603 },
  { id: "mrozek", name: "Mrozek", team: "Udinese", position: "P", mantraRoles: ["Por"], fantacalcioId: 7611 },
  { id: "ghidotti", name: "Ghidotti", team: "Parma", position: "P", mantraRoles: ["Por"], fantacalcioId: 2874 },
  { id: "pompei", name: "Pompei", team: "Atalanta", position: "P", mantraRoles: ["Por"], fantacalcioId: 7626 },
  { id: "neto", name: "Neto", team: "Juventus", position: "P", mantraRoles: ["Por"], fantacalcioId: 283 },
  { id: "dimarco", name: "Dimarco", team: "Inter", position: "D", mantraRoles: ["E","W"], fantacalcioId: 254 },
  { id: "wesley", name: "Wesley", team: "Roma", position: "D", mantraRoles: ["E"], fantacalcioId: 7181 },
  { id: "bremer", name: "Bremer", team: "Juventus", position: "D", mantraRoles: ["Dc"], fantacalcioId: 2788 },
  { id: "molina-n", name: "Molina N.", team: "Roma", position: "D", mantraRoles: ["E"], fantacalcioId: 4998 },
  { id: "rrahmani", name: "Rrahmani", team: "Napoli", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4409 },
  { id: "mancini", name: "Mancini", team: "Roma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 2296 },
  { id: "akanji", name: "Akanji", team: "Inter", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4159 },
  { id: "bastoni", name: "Bastoni", team: "Inter", position: "D", mantraRoles: ["Dc"], fantacalcioId: 2120 },
  { id: "bisseck", name: "Bisseck", team: "Inter", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6217 },
  { id: "kalulu", name: "Kalulu", team: "Juventus", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 4976 },
  { id: "gila", name: "Gila", team: "Milan", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5833 },
  { id: "pavlovic", name: "Pavlovic", team: "Milan", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5022 },
  { id: "ramon", name: "Ramon", team: "Como", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6869 },
  { id: "di-lorenzo", name: "Di Lorenzo", team: "Napoli", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 2816 },
  { id: "hermoso", name: "Hermoso", team: "Roma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4807 },
  { id: "solet", name: "Solet", team: "Udinese", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6956 },
  { id: "stones", name: "Stones", team: "Inter", position: "D", mantraRoles: ["Dc"], fantacalcioId: 2514 },
  { id: "ndicka", name: "N'Dicka", team: "Roma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4317 },
  { id: "scalvini", name: "Scalvini", team: "Atalanta", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5526 },
  { id: "miranda-j", name: "Miranda J.", team: "Bologna", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 4734 },
  { id: "jimenez-a", name: "Jimenez A.", team: "Fiorentina", position: "D", mantraRoles: ["Dd","Ds","E"], fantacalcioId: 6531 },
  { id: "ostigard", name: "Ostigard", team: "Genoa", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5750 },
  { id: "carlos-augusto", name: "Carlos Augusto", team: "Inter", position: "D", mantraRoles: ["B","Ds","E"], fantacalcioId: 5877 },
  { id: "mangas", name: "Mangas", team: "Monza", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7485 },
  { id: "kamara-h", name: "Kamara H.", team: "Udinese", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 5555 },
  { id: "spence", name: "Spence", team: "Inter", position: "D", mantraRoles: ["E"], fantacalcioId: 5982 },
  { id: "alaba", name: "Alaba", team: "Udinese", position: "D", mantraRoles: ["Dc"], fantacalcioId: 2404 },
  { id: "mina", name: "Mina", team: "Cagliari", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4210 },
  { id: "kaiki", name: "Kaiki", team: "Como", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7414 },
  { id: "bracaglia", name: "Bracaglia", team: "Frosinone", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 7469 },
  { id: "oyono-a", name: "Oyono A.", team: "Frosinone", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 6238 },
  { id: "vasquez", name: "Vasquez", team: "Genoa", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 5514 },
  { id: "tavares-n", name: "Tavares N.", team: "Lazio", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 5620 },
  { id: "tiago-gabriel", name: "Tiago Gabriel", team: "Lecce", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6989 },
  { id: "valeri", name: "Valeri", team: "Parma", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 5862 },
  { id: "chalobah-t", name: "Chalobah T.", team: "Como", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 5641 },
  { id: "lucumì", name: "Lucumì", team: "Juventus", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6042 },
  { id: "zè-pedro", name: "Zè Pedro", team: "Cagliari", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 7274 },
  { id: "obert", name: "Obert", team: "Cagliari", position: "D", mantraRoles: ["B","Ds","E"], fantacalcioId: 5701 },
  { id: "valle", name: "Valle", team: "Como", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 6867 },
  { id: "dragusin", name: "Dragusin", team: "Fiorentina", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5365 },
  { id: "dodò", name: "Dodò", team: "Fiorentina", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 5885 },
  { id: "calvani", name: "Calvani", team: "Frosinone", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7467 },
  { id: "norton-cuffy", name: "Norton-Cuffy", team: "Genoa", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 6814 },
  { id: "celik", name: "Celik", team: "Juventus", position: "D", mantraRoles: ["B","Dd","E"], fantacalcioId: 4657 },
  { id: "doekhi", name: "Doekhi", team: "Lazio", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6320 },
  { id: "gutierrez", name: "Gutierrez", team: "Napoli", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 5427 },
  { id: "spinazzola", name: "Spinazzola", team: "Napoli", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 1852 },
  { id: "delprato", name: "Delprato", team: "Parma", position: "D", mantraRoles: ["B","Dd","E"], fantacalcioId: 6664 },
  { id: "doig", name: "Doig", team: "Sassuolo", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 5851 },
  { id: "coco", name: "Coco", team: "Torino", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6642 },
  { id: "vojvoda", name: "Vojvoda", team: "Udinese", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 4994 },
  { id: "hainaut", name: "Hainaut", team: "Venezia", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 6821 },
  { id: "couto", name: "Couto", team: "Como", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 6727 },
  { id: "leysen-f", name: "Leysen F.", team: "Sassuolo", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 7564 },
  { id: "theate", name: "Theate", team: "Bologna", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 5675 },
  { id: "balerdi", name: "Balerdi", team: "Roma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4705 },
  { id: "diego-carlos", name: "Diego Carlos", team: "Parma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4137 },
  { id: "djimsiti", name: "Djimsiti", team: "Atalanta", position: "D", mantraRoles: ["Dc"], fantacalcioId: 787 },
  { id: "zappacosta", name: "Zappacosta", team: "Atalanta", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 554 },
  { id: "monterisi", name: "Monterisi", team: "Frosinone", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4952 },
  { id: "cambiaso", name: "Cambiaso", team: "Juventus", position: "D", mantraRoles: ["Dd","Ds","E"], fantacalcioId: 5520 },
  { id: "bartesaghi", name: "Bartesaghi", team: "Milan", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 6496 },
  { id: "birindelli", name: "Birindelli", team: "Monza", position: "D", mantraRoles: ["Dd","Ds","E"], fantacalcioId: 5838 },
  { id: "koulierakis", name: "Koulierakis", team: "Roma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7529 },
  { id: "idzes", name: "Idzes", team: "Sassuolo", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6672 },
  { id: "comuzzo", name: "Comuzzo", team: "Torino", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6495 },
  { id: "ismajli", name: "Ismajli", team: "Torino", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5010 },
  { id: "abankwah", name: "Abankwah", team: "Udinese", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 6021 },
  { id: "sutalo-j", name: "Sutalo J.", team: "Lazio", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7580 },
  { id: "belghali", name: "Belghali", team: "Torino", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 7220 },
  { id: "hien", name: "Hien", team: "Atalanta", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6046 },
  { id: "kolasinac", name: "Kolasinac", team: "Atalanta", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 2640 },
  { id: "ahanor", name: "Ahanor", team: "Atalanta", position: "D", mantraRoles: ["B","Ds","E"], fantacalcioId: 6916 },
  { id: "holm", name: "Holm", team: "Bologna", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 5678 },
  { id: "zortea", name: "Zortea", team: "Bologna", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 4433 },
  { id: "rodriguez-ju", name: "Rodriguez Ju.", team: "Cagliari", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 7268 },
  { id: "romagnoli", name: "Romagnoli", team: "Lazio", position: "D", mantraRoles: ["Dc"], fantacalcioId: 460 },
  { id: "veiga-d", name: "Veiga D.", team: "Lecce", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 6990 },
  { id: "gallo", name: "Gallo", team: "Lecce", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 4502 },
  { id: "gabbia", name: "Gabbia", team: "Milan", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4401 },
  { id: "de-winter", name: "De Winter", team: "Milan", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 5739 },
  { id: "circati", name: "Circati", team: "Parma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6663 },
  { id: "comert", name: "Comert", team: "Torino", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7526 },
  { id: "correia-t", name: "Correia T.", team: "Venezia", position: "D", mantraRoles: ["Dd","Ds","E"], fantacalcioId: 4845 },
  { id: "favasuli", name: "Favasuli", team: "Napoli", position: "D", mantraRoles: ["Dd","Ds","E"], fantacalcioId: 7563 },
  { id: "fortini", name: "Fortini", team: "Torino", position: "D", mantraRoles: ["E"], fantacalcioId: 7069 },
  { id: "badiashile", name: "Badiashile", team: "Napoli", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4664 },
  { id: "caleta-car", name: "Caleta-Car", team: "Sassuolo", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4147 },
  { id: "sugawara", name: "Sugawara", team: "Cagliari", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 7621 },
  { id: "leite", name: "Leite", team: "Lazio", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6319 },
  { id: "bellanova", name: "Bellanova", team: "Atalanta", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 4887 },
  { id: "bernasconi", name: "Bernasconi", team: "Atalanta", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7219 },
  { id: "helland", name: "Helland", team: "Bologna", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 7326 },
  { id: "heggem", name: "Heggem", team: "Bologna", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 7212 },
  { id: "kofler", name: "Kofler", team: "Cagliari", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7532 },
  { id: "kempf", name: "Kempf", team: "Como", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6893 },
  { id: "valdepenas", name: "Valdepenas", team: "Fiorentina", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 7294 },
  { id: "viery", name: "Viery", team: "Fiorentina", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 7410 },
  { id: "marcandalli", name: "Marcandalli", team: "Genoa", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6660 },
  { id: "pavard", name: "Pavard", team: "Inter", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 4177 },
  { id: "gatti", name: "Gatti", team: "Juventus", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5831 },
  { id: "provstgaard", name: "Provstgaard", team: "Lazio", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7012 },
  { id: "pedraza", name: "Pedraza", team: "Lazio", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 4817 },
  { id: "marusic", name: "Marusic", team: "Lazio", position: "D", mantraRoles: ["Dd","Ds","E"], fantacalcioId: 2188 },
  { id: "tomori", name: "Tomori", team: "Milan", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4751 },
  { id: "buongiorno", name: "Buongiorno", team: "Napoli", position: "D", mantraRoles: ["Dc"], fantacalcioId: 2724 },
  { id: "ghilardi", name: "Ghilardi", team: "Roma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6631 },
  { id: "pedersen", name: "Pedersen", team: "Torino", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 6426 },
  { id: "kristensen-t", name: "Kristensen T.", team: "Atalanta", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 6485 },
  { id: "zanoli", name: "Zanoli", team: "Udinese", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 5527 },
  { id: "haps", name: "Haps", team: "Venezia", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 5695 },
  { id: "obrador", name: "Obrador", team: "Sassuolo", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7329 },
  { id: "cinquegrano", name: "Cinquegrano", team: "Sassuolo", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 7573 },
  { id: "patterson", name: "Patterson", team: "Torino", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 5751 },
  { id: "rodriguez-r", name: "Rodriguez R.", team: "Torino", position: "D", mantraRoles: ["B","Ds","E"], fantacalcioId: 2169 },
  { id: "vitik", name: "Vitik", team: "Bologna", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7068 },
  { id: "zappa", name: "Zappa", team: "Cagliari", position: "D", mantraRoles: ["B","Dd","E"], fantacalcioId: 4461 },
  { id: "parisi", name: "Parisi", team: "Fiorentina", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 5449 },
  { id: "cittadini", name: "Cittadini", team: "Frosinone", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5757 },
  { id: "martin", name: "Martin", team: "Genoa", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 2593 },
  { id: "kelly-l", name: "Kelly L.", team: "Juventus", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 6766 },
  { id: "gaspar-k", name: "Gaspar K.", team: "Lecce", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6632 },
  { id: "siebert", name: "Siebert", team: "Lecce", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7240 },
  { id: "estupinan", name: "Estupinan", team: "Milan", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 5273 },
  { id: "delli-carri", name: "Delli Carri", team: "Monza", position: "D", mantraRoles: ["Dc"], fantacalcioId: 2115 },
  { id: "lucchesi", name: "Lucchesi", team: "Monza", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6659 },
  { id: "kouadio", name: "Kouadio", team: "Monza", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 7238 },
  { id: "carboni-a", name: "Carboni A.", team: "Monza", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 4925 },
  { id: "bakoune", name: "Bakoune", team: "Monza", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 7476 },
  { id: "beukema", name: "Beukema", team: "Napoli", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6202 },
  { id: "olivera", name: "Olivera", team: "Napoli", position: "D", mantraRoles: ["B","Ds","E"], fantacalcioId: 5840 },
  { id: "troilo", name: "Troilo", team: "Parma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7235 },
  { id: "britschgi", name: "Britschgi", team: "Parma", position: "D", mantraRoles: ["Dd","Ds","E"], fantacalcioId: 7255 },
  { id: "rensch", name: "Rensch", team: "Roma", position: "D", mantraRoles: ["B","Dd","E"], fantacalcioId: 6986 },
  { id: "bertola", name: "Bertola", team: "Udinese", position: "D", mantraRoles: ["Dd","Ds","Dc"], fantacalcioId: 5820 },
  { id: "bella-kotchap", name: "Bella-Kotchap", team: "Venezia", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7253 },
  { id: "moreno-m", name: "Moreno M.", team: "Venezia", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6890 },
  { id: "terzic", name: "Terzic", team: "Frosinone", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 4375 },
  { id: "juan-jesus", name: "Juan Jesus", team: "Venezia", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 256 },
  { id: "ehizibue", name: "Ehizibue", team: "Genoa", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 6047 },
  { id: "kossounou", name: "Kossounou", team: "Atalanta", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 5578 },
  { id: "smolcic-i", name: "Smolcic I.", team: "Como", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 7014 },
  { id: "pongracic", name: "Pongracic", team: "Fiorentina", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5603 },
  { id: "ranieri-l", name: "Ranieri L.", team: "Fiorentina", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 4378 },
  { id: "mitaj", name: "Mitaj", team: "Genoa", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7537 },
  { id: "floriani-mussolini", name: "Floriani Mussolini", team: "Lazio", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 7131 },
  { id: "athekame", name: "Athekame", team: "Milan", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 7211 },
  { id: "valenti", name: "Valenti", team: "Parma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5307 },
  { id: "angelino", name: "Angelino", team: "Roma", position: "D", mantraRoles: ["E"], fantacalcioId: 4772 },
  { id: "walukiewicz", name: "Walukiewicz", team: "Sassuolo", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 4374 },
  { id: "kabasele", name: "Kabasele", team: "Udinese", position: "D", mantraRoles: ["Dc"], fantacalcioId: 4263 },
  { id: "ebosse", name: "Ebosse", team: "Udinese", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 5994 },
  { id: "arizala", name: "Arizala", team: "Udinese", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7312 },
  { id: "sagrado", name: "Sagrado", team: "Venezia", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 6681 },
  { id: "odenthal", name: "Odenthal", team: "Sassuolo", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7154 },
  { id: "lulli", name: "Lulli", team: "Roma", position: "D", mantraRoles: ["E"], fantacalcioId: 7599 },
  { id: "casale", name: "Casale", team: "Bologna", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5498 },
  { id: "de-silvestri", name: "De Silvestri", team: "Bologna", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 487 },
  { id: "alhassane", name: "Alhassane", team: "Bologna", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7483 },
  { id: "idrissi-r", name: "Idrissi R.", team: "Cagliari", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7125 },
  { id: "joao-mario", name: "Joao Mario", team: "Fiorentina", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 7175 },
  { id: "akpoguma", name: "Akpoguma", team: "Frosinone", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7540 },
  { id: "otoa", name: "Otoa", team: "Genoa", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6977 },
  { id: "puczka", name: "Puczka", team: "Genoa", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7413 },
  { id: "sabelli", name: "Sabelli", team: "Genoa", position: "D", mantraRoles: ["Dd","Ds","E"], fantacalcioId: 791 },
  { id: "marin-r", name: "Marin R.", team: "Napoli", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6638 },
  { id: "candè", name: "Candè", team: "Sassuolo", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 6985 },
  { id: "palma", name: "Palma", team: "Udinese", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6925 },
  { id: "halhal", name: "Halhal", team: "Venezia", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7538 },
  { id: "schingtienne", name: "Schingtienne", team: "Venezia", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6892 },
  { id: "sverko", name: "Sverko", team: "Venezia", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 6673 },
  { id: "franjic", name: "Franjic", team: "Venezia", position: "D", mantraRoles: ["B","Ds","E"], fantacalcioId: 7478 },
  { id: "tchato", name: "Tchato", team: "Frosinone", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 7605 },
  { id: "kambwala", name: "Kambwala", team: "Como", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 6601 },
  { id: "drobnic", name: "Drobnic", team: "Parma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7615 },
  { id: "drameh", name: "Drameh", team: "Genoa", position: "D", mantraRoles: ["Dd","Ds","E"], fantacalcioId: 5742 },
  { id: "raterink", name: "Raterink", team: "Cagliari", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 7346 },
  { id: "goldaniga", name: "Goldaniga", team: "Como", position: "D", mantraRoles: ["Dc"], fantacalcioId: 418 },
  { id: "cuenca-a", name: "Cuenca A.", team: "Como", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 7407 },
  { id: "van-der-brempt", name: "Van Der Brempt", team: "Sassuolo", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 6896 },
  { id: "amey", name: "Amey", team: "Frosinone", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5424 },
  { id: "gelli-j", name: "Gelli J.", team: "Frosinone", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7468 },
  { id: "oyono-j", name: "Oyono J.", team: "Frosinone", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 7470 },
  { id: "corrado", name: "Corrado", team: "Frosinone", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7471 },
  { id: "vogliacco", name: "Vogliacco", team: "Genoa", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 6245 },
  { id: "matturro", name: "Matturro", team: "Genoa", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 6244 },
  { id: "rugani", name: "Rugani", team: "Juventus", position: "D", mantraRoles: ["Dc"], fantacalcioId: 294 },
  { id: "cabal", name: "Cabal", team: "Juventus", position: "D", mantraRoles: ["B","Ds","E"], fantacalcioId: 6039 },
  { id: "patric", name: "Patric", team: "Lazio", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 327 },
  { id: "lazzari", name: "Lazzari", team: "Lazio", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 2263 },
  { id: "pellegrini-lu", name: "Pellegrini Lu.", team: "Lazio", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 2728 },
  { id: "jean", name: "Jean", team: "Lecce", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6883 },
  { id: "perez-m", name: "Perez M.", team: "Lecce", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 7164 },
  { id: "ndaba", name: "Ndaba", team: "Lecce", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7182 },
  { id: "diawara-s", name: "Diawara S.", team: "Milan", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 7525 },
  { id: "antov", name: "Antov", team: "Monza", position: "D", mantraRoles: ["Dc"], fantacalcioId: 5399 },
  { id: "marianucci", name: "Marianucci", team: "Napoli", position: "D", mantraRoles: ["Dc"], fantacalcioId: 6809 },
  { id: "mazzocchi", name: "Mazzocchi", team: "Venezia", position: "D", mantraRoles: ["Dd","Ds","E"], fantacalcioId: 5481 },
  { id: "ndiaye", name: "Ndiaye", team: "Parma", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7202 },
  { id: "carboni-f", name: "Carboni F.", team: "Parma", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 6149 },
  { id: "ziolkowski", name: "Ziolkowski", team: "Monza", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7260 },
  { id: "missori", name: "Missori", team: "Sassuolo", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 6189 },
  { id: "pieragnolo", name: "Pieragnolo", team: "Sassuolo", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7156 },
  { id: "biraghi", name: "Biraghi", team: "Torino", position: "D", mantraRoles: ["B","Ds","E"], fantacalcioId: 252 },
  { id: "mlacic", name: "Mlacic", team: "Udinese", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7356 },
  { id: "gomes", name: "Gomes", team: "Venezia", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 7454 },
  { id: "aurelio", name: "Aurelio", team: "Cagliari", position: "D", mantraRoles: ["Ds","E"], fantacalcioId: 7548 },
  { id: "omar-fayed", name: "Omar Fayed", team: "Frosinone", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7553 },
  { id: "goglichidze", name: "Goglichidze", team: "Monza", position: "D", mantraRoles: ["Dd","Dc"], fantacalcioId: 6537 },
  { id: "macchioni", name: "Macchioni", team: "Sassuolo", position: "D", mantraRoles: ["Dc"], fantacalcioId: 7396 },
  { id: "terracciano-f", name: "Terracciano F.", team: "Milan", position: "D", mantraRoles: ["B","Dd","Ds"], fantacalcioId: 5812 },
  { id: "maye", name: "Maye", team: "Monza", position: "D", mantraRoles: ["Ds","Dc"], fantacalcioId: 7604 },
  { id: "dembelè-a", name: "Dembelè A.", team: "Lecce", position: "D", mantraRoles: ["Dd","E"], fantacalcioId: 6826 },
  { id: "paz-n", name: "Paz N.", team: "Como", position: "C", mantraRoles: ["T","A"], fantacalcioId: 6875 },
  { id: "calhanoglu", name: "Calhanoglu", team: "Inter", position: "C", mantraRoles: ["M","C"], fantacalcioId: 2194 },
  { id: "pulisic", name: "Pulisic", team: "Milan", position: "C", mantraRoles: ["T","A"], fantacalcioId: 2423 },
  { id: "rabiot", name: "Rabiot", team: "Milan", position: "C", mantraRoles: ["C","T"], fantacalcioId: 2379 },
  { id: "mctominay", name: "McTominay", team: "Napoli", position: "C", mantraRoles: ["C","T"], fantacalcioId: 4777 },
  { id: "orsolini", name: "Orsolini", team: "Bologna", position: "C", mantraRoles: ["W","A"], fantacalcioId: 2167 },
  { id: "baturina", name: "Baturina", team: "Como", position: "C", mantraRoles: ["T"], fantacalcioId: 7126 },
  { id: "mora", name: "Mora", team: "Roma", position: "C", mantraRoles: ["T"], fantacalcioId: 7556 },
  { id: "barella", name: "Barella", team: "Inter", position: "C", mantraRoles: ["C"], fantacalcioId: 1870 },
  { id: "zaccagni", name: "Zaccagni", team: "Lazio", position: "C", mantraRoles: ["W","A"], fantacalcioId: 632 },
  { id: "da-cunha", name: "Da Cunha", team: "Como", position: "C", mantraRoles: ["C","T"], fantacalcioId: 5559 },
  { id: "de-bruyne", name: "De Bruyne", team: "Napoli", position: "C", mantraRoles: ["T"], fantacalcioId: 2517 },
  { id: "zaniolo", name: "Zaniolo", team: "Udinese", position: "C", mantraRoles: ["T","A"], fantacalcioId: 2766 },
  { id: "mckennie", name: "McKennie", team: "Juventus", position: "C", mantraRoles: ["C","T"], fantacalcioId: 4973 },
  { id: "moreira", name: "Moreira", team: "Milan", position: "C", mantraRoles: ["E","W"], fantacalcioId: 6372 },
  { id: "samardzic", name: "Samardzic", team: "Atalanta", position: "C", mantraRoles: ["C","T"], fantacalcioId: 5119 },
  { id: "atta", name: "Atta", team: "Fiorentina", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6908 },
  { id: "conceicao", name: "Conceicao", team: "Juventus", position: "C", mantraRoles: ["W","A"], fantacalcioId: 6884 },
  { id: "konè-m", name: "Konè M.", team: "Roma", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5589 },
  { id: "ekkelenkamp", name: "Ekkelenkamp", team: "Udinese", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6684 },
  { id: "mastantuono", name: "Mastantuono", team: "Fiorentina", position: "C", mantraRoles: ["W","T"], fantacalcioId: 7078 },
  { id: "ederson-ds", name: "Ederson D.S.", team: "Atalanta", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5792 },
  { id: "gudmundsson-a", name: "Gudmundsson A.", team: "Lazio", position: "C", mantraRoles: ["T","A"], fantacalcioId: 5800 },
  { id: "zielinski", name: "Zielinski", team: "Inter", position: "C", mantraRoles: ["C"], fantacalcioId: 152 },
  { id: "taylor-k", name: "Taylor K.", team: "Lazio", position: "C", mantraRoles: ["C","T"], fantacalcioId: 7314 },
  { id: "gonzalez-n", name: "Gonzalez N.", team: "Juventus", position: "C", mantraRoles: ["W","A"], fantacalcioId: 4179 },
  { id: "bernardeschi", name: "Bernardeschi", team: "Bologna", position: "C", mantraRoles: ["W","T"], fantacalcioId: 184 },
  { id: "mandragora", name: "Mandragora", team: "Torino", position: "C", mantraRoles: ["C"], fantacalcioId: 1933 },
  { id: "frattesi", name: "Frattesi", team: "Lazio", position: "C", mantraRoles: ["C","T"], fantacalcioId: 2848 },
  { id: "modric", name: "Modric", team: "Milan", position: "C", mantraRoles: ["M","C"], fantacalcioId: 2606 },
  { id: "jones-c", name: "Jones C.", team: "Inter", position: "C", mantraRoles: ["C"], fantacalcioId: 5172 },
  { id: "perrone", name: "Perrone", team: "Como", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6151 },
  { id: "rodriguez-je", name: "Rodriguez Je.", team: "Como", position: "C", mantraRoles: ["W","A"], fantacalcioId: 7129 },
  { id: "calò", name: "Calò", team: "Frosinone", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7472 },
  { id: "diouf", name: "Diouf", team: "Inter", position: "C", mantraRoles: ["E","C"], fantacalcioId: 6274 },
  { id: "alajbegovic", name: "Alajbegovic", team: "Juventus", position: "C", mantraRoles: ["W","T"], fantacalcioId: 7436 },
  { id: "cancellieri", name: "Cancellieri", team: "Lazio", position: "C", mantraRoles: ["W","A"], fantacalcioId: 5500 },
  { id: "saelemaekers", name: "Saelemaekers", team: "Milan", position: "C", mantraRoles: ["E","W"], fantacalcioId: 4892 },
  { id: "lobotka", name: "Lobotka", team: "Napoli", position: "C", mantraRoles: ["M","C"], fantacalcioId: 4287 },
  { id: "politano", name: "Politano", team: "Napoli", position: "C", mantraRoles: ["W"], fantacalcioId: 536 },
  { id: "cristante", name: "Cristante", team: "Roma", position: "C", mantraRoles: ["M","C"], fantacalcioId: 779 },
  { id: "adzic", name: "Adzic", team: "Sassuolo", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6677 },
  { id: "vlasic", name: "Vlasic", team: "Torino", position: "C", mantraRoles: ["T"], fantacalcioId: 5687 },
  { id: "schmid", name: "Schmid", team: "Frosinone", position: "C", mantraRoles: ["W","T"], fantacalcioId: 7551 },
  { id: "kessiè", name: "Kessiè", team: "Atalanta", position: "C", mantraRoles: ["C"], fantacalcioId: 1850 },
  { id: "goncalves-p", name: "Goncalves P.", team: "Fiorentina", position: "C", mantraRoles: ["W","T"], fantacalcioId: 7625 },
  { id: "romano", name: "Romano", team: "Cagliari", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7311 },
  { id: "baldanzi", name: "Baldanzi", team: "Genoa", position: "C", mantraRoles: ["T"], fantacalcioId: 5823 },
  { id: "zhegrova", name: "Zhegrova", team: "Juventus", position: "C", mantraRoles: ["W"], fantacalcioId: 5761 },
  { id: "coulibaly-l", name: "Coulibaly L.", team: "Lecce", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5504 },
  { id: "chukwueze", name: "Chukwueze", team: "Milan", position: "C", mantraRoles: ["E","W"], fantacalcioId: 4856 },
  { id: "rowe", name: "Rowe", team: "Atalanta", position: "C", mantraRoles: ["W","T"], fantacalcioId: 6844 },
  { id: "adopo", name: "Adopo", team: "Cagliari", position: "C", mantraRoles: ["M","C"], fantacalcioId: 4870 },
  { id: "sucic-p", name: "Sucic P.", team: "Inter", position: "C", mantraRoles: ["C"], fantacalcioId: 7070 },
  { id: "zambo-anguissa", name: "Zambo Anguissa", team: "Napoli", position: "C", mantraRoles: ["C"], fantacalcioId: 4220 },
  { id: "vergara", name: "Vergara", team: "Napoli", position: "C", mantraRoles: ["W","T"], fantacalcioId: 7223 },
  { id: "pisilli", name: "Pisilli", team: "Roma", position: "C", mantraRoles: ["C"], fantacalcioId: 6190 },
  { id: "matic", name: "Matic", team: "Sassuolo", position: "C", mantraRoles: ["M","C"], fantacalcioId: 2528 },
  { id: "thorstvedt", name: "Thorstvedt", team: "Sassuolo", position: "C", mantraRoles: ["C","T"], fantacalcioId: 5844 },
  { id: "volpato", name: "Volpato", team: "Sassuolo", position: "C", mantraRoles: ["W","T"], fantacalcioId: 5735 },
  { id: "karlstrom", name: "Karlstrom", team: "Udinese", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6680 },
  { id: "ferguson", name: "Ferguson", team: "Bologna", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5858 },
  { id: "pobega", name: "Pobega", team: "Bologna", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5298 },
  { id: "cambiaghi", name: "Cambiaghi", team: "Bologna", position: "C", mantraRoles: ["W","A"], fantacalcioId: 4436 },
  { id: "winks", name: "Winks", team: "Cagliari", position: "C", mantraRoles: ["M","C"], fantacalcioId: 4260 },
  { id: "fagioli", name: "Fagioli", team: "Fiorentina", position: "C", mantraRoles: ["M","C"], fantacalcioId: 4465 },
  { id: "ndour", name: "Ndour", team: "Fiorentina", position: "C", mantraRoles: ["C"], fantacalcioId: 6294 },
  { id: "locatelli", name: "Locatelli", team: "Juventus", position: "C", mantraRoles: ["M","C"], fantacalcioId: 827 },
  { id: "thuram-k", name: "Thuram K.", team: "Juventus", position: "C", mantraRoles: ["C"], fantacalcioId: 5562 },
  { id: "koopmeiners", name: "Koopmeiners", team: "Juventus", position: "C", mantraRoles: ["C","T"], fantacalcioId: 5685 },
  { id: "isaksen", name: "Isaksen", team: "Lazio", position: "C", mantraRoles: ["W","A"], fantacalcioId: 6398 },
  { id: "akinsanmiro", name: "Akinsanmiro", team: "Monza", position: "C", mantraRoles: ["C"], fantacalcioId: 6593 },
  { id: "colpani", name: "Colpani", team: "Monza", position: "C", mantraRoles: ["T"], fantacalcioId: 5878 },
  { id: "almqvist", name: "Almqvist", team: "Parma", position: "C", mantraRoles: ["W","A"], fantacalcioId: 6207 },
  { id: "bakola", name: "Bakola", team: "Sassuolo", position: "C", mantraRoles: ["C","T"], fantacalcioId: 7036 },
  { id: "cacciamani", name: "Cacciamani", team: "Torino", position: "C", mantraRoles: ["E","W"], fantacalcioId: 7060 },
  { id: "casadei", name: "Casadei", team: "Torino", position: "C", mantraRoles: ["C","T"], fantacalcioId: 5888 },
  { id: "pellegrini-lo", name: "Pellegrini Lo.", team: "Roma", position: "C", mantraRoles: ["C","T"], fantacalcioId: 530 },
  { id: "pasalic", name: "Pasalic", team: "Atalanta", position: "C", mantraRoles: ["C","T"], fantacalcioId: 2077 },
  { id: "odgaard", name: "Odgaard", team: "Bologna", position: "C", mantraRoles: ["T"], fantacalcioId: 2765 },
  { id: "fazzini", name: "Fazzini", team: "Cagliari", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6010 },
  { id: "milla", name: "Milla", team: "Como", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7412 },
  { id: "frendrup", name: "Frendrup", team: "Genoa", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5791 },
  { id: "masini", name: "Masini", team: "Frosinone", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6917 },
  { id: "messias", name: "Messias", team: "Genoa", position: "C", mantraRoles: ["W","T"], fantacalcioId: 4970 },
  { id: "konè-i", name: "Konè I.", team: "Sassuolo", position: "C", mantraRoles: ["C"], fantacalcioId: 6717 },
  { id: "njie", name: "Njie", team: "Fiorentina", position: "C", mantraRoles: ["W","A"], fantacalcioId: 6827 },
  { id: "busio", name: "Busio", team: "Venezia", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5507 },
  { id: "sow", name: "Sow", team: "Genoa", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5946 },
  { id: "hutchinson", name: "Hutchinson", team: "Milan", position: "C", mantraRoles: ["W","A"], fantacalcioId: 7618 },
  { id: "sarr-p", name: "Sarr P.", team: "Juventus", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5680 },
  { id: "mbangula", name: "Mbangula", team: "Bologna", position: "C", mantraRoles: ["W","A"], fantacalcioId: 6833 },
  { id: "braganca", name: "Braganca", team: "Torino", position: "C", mantraRoles: ["C"], fantacalcioId: 7624 },
  { id: "el-shaarawy", name: "El Shaarawy", team: "Genoa", position: "C", mantraRoles: ["W"], fantacalcioId: 795 },
  { id: "gaetano", name: "Gaetano", team: "Atalanta", position: "C", mantraRoles: ["M","C"], fantacalcioId: 4364 },
  { id: "zalewski", name: "Zalewski", team: "Atalanta", position: "C", mantraRoles: ["W"], fantacalcioId: 5422 },
  { id: "caqueret", name: "Caqueret", team: "Como", position: "C", mantraRoles: ["C","T"], fantacalcioId: 5036 },
  { id: "rovella", name: "Rovella", team: "Lazio", position: "C", mantraRoles: ["M","C"], fantacalcioId: 4459 },
  { id: "pierotti", name: "Pierotti", team: "Lecce", position: "C", mantraRoles: ["W"], fantacalcioId: 6549 },
  { id: "gilmour", name: "Gilmour", team: "Napoli", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5131 },
  { id: "keita-m", name: "Keita M.", team: "Parma", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6898 },
  { id: "bernabè", name: "Bernabè", team: "Parma", position: "C", mantraRoles: ["C"], fantacalcioId: 6666 },
  { id: "fitz-jim", name: "Fitz-Jim", team: "Torino", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7535 },
  { id: "oristanio", name: "Oristanio", team: "Torino", position: "C", mantraRoles: ["W","T"], fantacalcioId: 6218 },
  { id: "piotrowski", name: "Piotrowski", team: "Udinese", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7198 },
  { id: "unai-gomez", name: "Unai Gomez", team: "Udinese", position: "C", mantraRoles: ["T"], fantacalcioId: 6783 },
  { id: "cissè-a", name: "Cissè A.", team: "Milan", position: "C", mantraRoles: ["W","T"], fantacalcioId: 6618 },
  { id: "elmas", name: "Elmas", team: "Atalanta", position: "C", mantraRoles: ["W","T"], fantacalcioId: 4479 },
  { id: "monteiro-j", name: "Monteiro J.", team: "Lecce", position: "C", mantraRoles: ["W","A"], fantacalcioId: 7619 },
  { id: "moro-n", name: "Moro N.", team: "Bologna", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6054 },
  { id: "dominguez-b", name: "Dominguez B.", team: "Sassuolo", position: "C", mantraRoles: ["W","A"], fantacalcioId: 6895 },
  { id: "deiola", name: "Deiola", team: "Cagliari", position: "C", mantraRoles: ["M","C"], fantacalcioId: 1871 },
  { id: "liberali", name: "Liberali", team: "Como", position: "C", mantraRoles: ["T"], fantacalcioId: 6678 },
  { id: "oulai", name: "Oulai", team: "Fiorentina", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7464 },
  { id: "fini", name: "Fini", team: "Frosinone", position: "C", mantraRoles: ["W"], fantacalcioId: 6506 },
  { id: "zerbin", name: "Zerbin", team: "Frosinone", position: "C", mantraRoles: ["W"], fantacalcioId: 5998 },
  { id: "ellertsson", name: "Ellertsson", team: "Genoa", position: "C", mantraRoles: ["E","C"], fantacalcioId: 6020 },
  { id: "luis-henrique", name: "Luis Henrique", team: "Inter", position: "C", mantraRoles: ["E","W"], fantacalcioId: 5301 },
  { id: "belahyane", name: "Belahyane", team: "Lazio", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6191 },
  { id: "pessina", name: "Pessina", team: "Monza", position: "C", mantraRoles: ["M","C"], fantacalcioId: 2741 },
  { id: "ondrejka", name: "Ondrejka", team: "Parma", position: "C", mantraRoles: ["W","A"], fantacalcioId: 6984 },
  { id: "gineitis", name: "Gineitis", team: "Torino", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6170 },
  { id: "basic", name: "Basic", team: "Venezia", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5674 },
  { id: "sohm", name: "Sohm", team: "Venezia", position: "C", mantraRoles: ["C"], fantacalcioId: 5319 },
  { id: "perez-k", name: "Perez K.", team: "Venezia", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6994 },
  { id: "de-roon", name: "De Roon", team: "Roma", position: "C", mantraRoles: ["M","C"], fantacalcioId: 22 },
  { id: "amondarain", name: "Amondarain", team: "Bologna", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7528 },
  { id: "prati", name: "Prati", team: "Cagliari", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6424 },
  { id: "felici", name: "Felici", team: "Cagliari", position: "C", mantraRoles: ["W"], fantacalcioId: 6640 },
  { id: "fadera", name: "Fadera", team: "Cagliari", position: "C", mantraRoles: ["W"], fantacalcioId: 6815 },
  { id: "addai", name: "Addai", team: "Como", position: "C", mantraRoles: ["W","A"], fantacalcioId: 7127 },
  { id: "fabbian", name: "Fabbian", team: "Parma", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6206 },
  { id: "cichella", name: "Cichella", team: "Frosinone", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7473 },
  { id: "koutsoupias", name: "Koutsoupias", team: "Frosinone", position: "C", mantraRoles: ["C"], fantacalcioId: 7474 },
  { id: "amorim", name: "Amorim", team: "Genoa", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7341 },
  { id: "meichtry", name: "Meichtry", team: "Genoa", position: "C", mantraRoles: ["W","T"], fantacalcioId: 7409 },
  { id: "traorè-hj", name: "Traorè Hj.", team: "Genoa", position: "C", mantraRoles: ["W","T"], fantacalcioId: 2857 },
  { id: "mkhitaryan", name: "Mkhitaryan", team: "Inter", position: "C", mantraRoles: ["C"], fantacalcioId: 2529 },
  { id: "douglas-luiz", name: "Douglas Luiz", team: "Juventus", position: "C", mantraRoles: ["C"], fantacalcioId: 4911 },
  { id: "dele-bashiru", name: "Dele-Bashiru", team: "Lazio", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6629 },
  { id: "maleh", name: "Maleh", team: "Lecce", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5457 },
  { id: "ngom", name: "Ngom", team: "Lecce", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7322 },
  { id: "berisha-m", name: "Berisha M.", team: "Lecce", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6015 },
  { id: "gandelman", name: "Gandelman", team: "Lecce", position: "C", mantraRoles: ["C","T"], fantacalcioId: 7318 },
  { id: "fofana-y", name: "Fofana Y.", team: "Milan", position: "C", mantraRoles: ["M","C"], fantacalcioId: 4686 },
  { id: "jashari", name: "Jashari", team: "Milan", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7203 },
  { id: "musah", name: "Musah", team: "Milan", position: "C", mantraRoles: ["C","W"], fantacalcioId: 5295 },
  { id: "loftus-cheek", name: "Loftus-Cheek", team: "Milan", position: "C", mantraRoles: ["C","T"], fantacalcioId: 4199 },
  { id: "nicolussi-caviglia", name: "Nicolussi Caviglia", team: "Parma", position: "C", mantraRoles: ["M","C"], fantacalcioId: 4349 },
  { id: "el-aynaoui", name: "El Aynaoui", team: "Roma", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6271 },
  { id: "ilkhan", name: "Ilkhan", team: "Torino", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6005 },
  { id: "ilic", name: "Ilic", team: "Lecce", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5007 },
  { id: "miller-l", name: "Miller L.", team: "Udinese", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7208 },
  { id: "grillitsch", name: "Grillitsch", team: "Frosinone", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7550 },
  { id: "tourè-i", name: "Tourè I.", team: "Monza", position: "C", mantraRoles: ["E","M"], fantacalcioId: 7146 },
  { id: "sulemana-i", name: "Sulemana I.", team: "Sassuolo", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6024 },
  { id: "brescianini", name: "Brescianini", team: "Fiorentina", position: "C", mantraRoles: ["C","T"], fantacalcioId: 4947 },
  { id: "hasa", name: "Hasa", team: "Frosinone", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6903 },
  { id: "miretti", name: "Miretti", team: "Juventus", position: "C", mantraRoles: ["C","T"], fantacalcioId: 5813 },
  { id: "cataldi", name: "Cataldi", team: "Lazio", position: "C", mantraRoles: ["M","C"], fantacalcioId: 333 },
  { id: "gorter", name: "Gorter", team: "Lecce", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7248 },
  { id: "ricci-s", name: "Ricci S.", team: "Como", position: "C", mantraRoles: ["M","C"], fantacalcioId: 5453 },
  { id: "folorunsho", name: "Folorunsho", team: "Monza", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6252 },
  { id: "ordonez-c", name: "Ordonez C.", team: "Parma", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7138 },
  { id: "sorensen-o", name: "Sorensen O.", team: "Parma", position: "C", mantraRoles: ["C"], fantacalcioId: 7209 },
  { id: "diallo-o", name: "Diallo O.", team: "Parma", position: "C", mantraRoles: ["W","A"], fantacalcioId: 7536 },
  { id: "lipani", name: "Lipani", team: "Sassuolo", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6246 },
  { id: "chakvetadze", name: "Chakvetadze", team: "Udinese", position: "C", mantraRoles: ["W","T"], fantacalcioId: 7418 },
  { id: "massolin", name: "Massolin", team: "Cagliari", position: "C", mantraRoles: ["C","T"], fantacalcioId: 7579 },
  { id: "gagliardini", name: "Gagliardini", team: "Cagliari", position: "C", mantraRoles: ["M","C"], fantacalcioId: 801 },
  { id: "fernandez-t", name: "Fernandez T.", team: "Venezia", position: "C", mantraRoles: ["T","A"], fantacalcioId: 7232 },
  { id: "el-azzouzi-o", name: "El Azzouzi O.", team: "Bologna", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6225 },
  { id: "gelli-f", name: "Gelli F.", team: "Frosinone", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6241 },
  { id: "stankovic-a", name: "Stankovic A.", team: "Inter", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6503 },
  { id: "kaba", name: "Kaba", team: "Lecce", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6410 },
  { id: "colombo-l", name: "Colombo L.", team: "Monza", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7477 },
  { id: "cremaschi", name: "Cremaschi", team: "Parma", position: "C", mantraRoles: ["E","C"], fantacalcioId: 7276 },
  { id: "aboukhlal", name: "Aboukhlal", team: "Torino", position: "C", mantraRoles: ["W","A"], fantacalcioId: 7183 },
  { id: "helgason", name: "Helgason", team: "Venezia", position: "C", mantraRoles: ["C","T"], fantacalcioId: 5872 },
  { id: "forson-o", name: "Forson O.", team: "Monza", position: "C", mantraRoles: ["W","T"], fantacalcioId: 6592 },
  { id: "foe-ondoa", name: "Foe Ondoa", team: "Monza", position: "C", mantraRoles: ["C"], fantacalcioId: 7574 },
  { id: "sierro", name: "Sierro", team: "Parma", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7628 },
  { id: "liteta", name: "Liteta", team: "Cagliari", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7165 },
  { id: "lahdo", name: "Lahdo", team: "Como", position: "C", mantraRoles: ["C","T"], fantacalcioId: 7357 },
  { id: "el-azzouzi-a", name: "El Azzouzi A.", team: "Frosinone", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7456 },
  { id: "kone-b", name: "Kone B.", team: "Frosinone", position: "C", mantraRoles: ["C"], fantacalcioId: 5725 },
  { id: "venturino", name: "Venturino", team: "Genoa", position: "C", mantraRoles: ["W"], fantacalcioId: 6980 },
  { id: "przyborek", name: "Przyborek", team: "Lazio", position: "C", mantraRoles: ["W","T"], fantacalcioId: 7345 },
  { id: "fofana-sa", name: "Fofana Sa.", team: "Lecce", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7319 },
  { id: "ciurria", name: "Ciurria", team: "Monza", position: "C", mantraRoles: ["E","W"], fantacalcioId: 5880 },
  { id: "boloca", name: "Boloca", team: "Sassuolo", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6219 },
  { id: "iannoni", name: "Iannoni", team: "Sassuolo", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7157 },
  { id: "anjorin", name: "Anjorin", team: "Torino", position: "C", mantraRoles: ["C","T"], fantacalcioId: 6889 },
  { id: "camara-a", name: "Camara A.", team: "Udinese", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7392 },
  { id: "zarraga", name: "Zarraga", team: "Udinese", position: "C", mantraRoles: ["M","C"], fantacalcioId: 6212 },
  { id: "bjarkason", name: "Bjarkason", team: "Venezia", position: "C", mantraRoles: ["E","W"], fantacalcioId: 5485 },
  { id: "dagasso", name: "Dagasso", team: "Venezia", position: "C", mantraRoles: ["C"], fantacalcioId: 7481 },
  { id: "duncan", name: "Duncan", team: "Venezia", position: "C", mantraRoles: ["C"], fantacalcioId: 526 },
  { id: "laerke", name: "Laerke", team: "Lecce", position: "C", mantraRoles: ["W","A"], fantacalcioId: 7571 },
  { id: "comotto", name: "Comotto", team: "Milan", position: "C", mantraRoles: ["M","C"], fantacalcioId: 7572 },
  { id: "mout", name: "Mout", team: "Monza", position: "C", mantraRoles: ["C"], fantacalcioId: 7575 },
  { id: "ciervo", name: "Ciervo", team: "Cagliari", position: "C", mantraRoles: ["W"], fantacalcioId: 5462 },
  { id: "jovanovic", name: "Jovanovic", team: "Udinese", position: "C", mantraRoles: ["W","T"], fantacalcioId: 7092 },
  { id: "libra", name: "Libra", team: "Bologna", position: "C", mantraRoles: ["C","T"], fantacalcioId: 7629 },
  { id: "lovric", name: "Lovric", team: "Udinese", position: "C", mantraRoles: ["C"], fantacalcioId: 5850 },
  { id: "malen", name: "Malen", team: "Roma", position: "A", mantraRoles: ["Pc"], fantacalcioId: 5585 },
  { id: "martinez-l", name: "Martinez L.", team: "Inter", position: "A", mantraRoles: ["Pc"], fantacalcioId: 2764 },
  { id: "thuram", name: "Thuram", team: "Inter", position: "A", mantraRoles: ["Pc"], fantacalcioId: 4871 },
  { id: "hojlund", name: "Hojlund", team: "Napoli", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6052 },
  { id: "ramos-g", name: "Ramos G.", team: "Milan", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6397 },
  { id: "kean", name: "Kean", team: "Como", position: "A", mantraRoles: ["Pc"], fantacalcioId: 2097 },
  { id: "kolo-muani", name: "Kolo Muani", team: "Juventus", position: "A", mantraRoles: ["Pc"], fantacalcioId: 5951 },
  { id: "douvikas", name: "Douvikas", team: "Como", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7017 },
  { id: "woltemade", name: "Woltemade", team: "Juventus", position: "A", mantraRoles: ["A"], fantacalcioId: 6752 },
  { id: "yildiz", name: "Yildiz", team: "Juventus", position: "A", mantraRoles: ["A"], fantacalcioId: 6434 },
  { id: "scamacca", name: "Scamacca", team: "Atalanta", position: "A", mantraRoles: ["Pc"], fantacalcioId: 2137 },
  { id: "davis-k", name: "Davis K.", team: "Udinese", position: "A", mantraRoles: ["Pc"], fantacalcioId: 5637 },
  { id: "esposito-fp", name: "Esposito F.P.", team: "Inter", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7071 },
  { id: "leao", name: "Leao", team: "Milan", position: "A", mantraRoles: ["A"], fantacalcioId: 4510 },
  { id: "berardi", name: "Berardi", team: "Sassuolo", position: "A", mantraRoles: ["A"], fantacalcioId: 531 },
  { id: "dybala", name: "Dybala", team: "Roma", position: "A", mantraRoles: ["A"], fantacalcioId: 309 },
  { id: "krstovic", name: "Krstovic", team: "Atalanta", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6435 },
  { id: "pellegrino-m", name: "Pellegrino M.", team: "Fiorentina", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7023 },
  { id: "soulè", name: "Soulè", team: "Roma", position: "A", mantraRoles: ["A"], fantacalcioId: 5734 },
  { id: "laurientè", name: "Laurientè", team: "Sassuolo", position: "A", mantraRoles: ["A"], fantacalcioId: 6060 },
  { id: "de-ketelaere", name: "De Ketelaere", team: "Atalanta", position: "A", mantraRoles: ["A"], fantacalcioId: 5995 },
  { id: "dovbyk", name: "Dovbyk", team: "Bologna", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6675 },
  { id: "raspadori", name: "Raspadori", team: "Atalanta", position: "A", mantraRoles: ["A"], fantacalcioId: 4371 },
  { id: "esposito-se", name: "Esposito Se.", team: "Sassuolo", position: "A", mantraRoles: ["A"], fantacalcioId: 4463 },
  { id: "diao", name: "Diao", team: "Como", position: "A", mantraRoles: ["W","A"], fantacalcioId: 6967 },
  { id: "nkunku", name: "Nkunku", team: "Milan", position: "A", mantraRoles: ["A"], fantacalcioId: 4728 },
  { id: "santos-a", name: "Santos A.", team: "Napoli", position: "A", mantraRoles: ["W","A"], fantacalcioId: 7351 },
  { id: "castro-s", name: "Castro S.", team: "Roma", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6572 },
  { id: "simeone", name: "Simeone", team: "Torino", position: "A", mantraRoles: ["Pc"], fantacalcioId: 2061 },
  { id: "romero-d", name: "Romero D.", team: "Parma", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7554 },
  { id: "beto", name: "Beto", team: "Fiorentina", position: "A", mantraRoles: ["Pc"], fantacalcioId: 5694 },
  { id: "raimondo", name: "Raimondo", team: "Frosinone", position: "A", mantraRoles: ["Pc"], fantacalcioId: 5436 },
  { id: "bowie", name: "Bowie", team: "Sassuolo", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7347 },
  { id: "adams-a", name: "Adams A.", team: "Venezia", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7484 },
  { id: "maldini", name: "Maldini", team: "Cagliari", position: "A", mantraRoles: ["T","A"], fantacalcioId: 4896 },
  { id: "ghedjemis", name: "Ghedjemis", team: "Frosinone", position: "A", mantraRoles: ["W","A"], fantacalcioId: 6530 },
  { id: "kvernadze", name: "Kvernadze", team: "Frosinone", position: "A", mantraRoles: ["W","A"], fantacalcioId: 6204 },
  { id: "adams-c", name: "Adams C.", team: "Torino", position: "A", mantraRoles: ["A"], fantacalcioId: 6646 },
  { id: "colombo", name: "Colombo", team: "Genoa", position: "A", mantraRoles: ["Pc"], fantacalcioId: 4923 },
  { id: "dia", name: "Dia", team: "Lazio", position: "A", mantraRoles: ["A"], fantacalcioId: 5672 },
  { id: "noslin", name: "Noslin", team: "Lazio", position: "A", mantraRoles: ["A"], fantacalcioId: 6556 },
  { id: "varela-g", name: "Varela G.", team: "Monza", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7523 },
  { id: "lukaku", name: "Lukaku", team: "Napoli", position: "A", mantraRoles: ["Pc"], fantacalcioId: 2531 },
  { id: "pinamonti", name: "Pinamonti", team: "Lazio", position: "A", mantraRoles: ["Pc"], fantacalcioId: 2038 },
  { id: "tourè-e", name: "Tourè E.", team: "Parma", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6229 },
  { id: "kevin-carlos", name: "Kevin Carlos", team: "Cagliari", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7547 },
  { id: "osmajic", name: "Osmajic", team: "Genoa", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7600 },
  { id: "piccoli", name: "Piccoli", team: "Bologna", position: "A", mantraRoles: ["Pc"], fantacalcioId: 4359 },
  { id: "ratkov", name: "Ratkov", team: "Lazio", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7313 },
  { id: "dallinga", name: "Dallinga", team: "Bologna", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6643 },
  { id: "mendy-p", name: "Mendy P.", team: "Cagliari", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7374 },
  { id: "bonny", name: "Bonny", team: "Inter", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6669 },
  { id: "david", name: "David", team: "Juventus", position: "A", mantraRoles: ["Pc"], fantacalcioId: 5544 },
  { id: "cutrone", name: "Cutrone", team: "Monza", position: "A", mantraRoles: ["Pc"], fantacalcioId: 2155 },
  { id: "yeboah-j", name: "Yeboah J.", team: "Venezia", position: "A", mantraRoles: ["A"], fantacalcioId: 6904 },
  { id: "robinson-j", name: "Robinson J.", team: "Monza", position: "A", mantraRoles: ["A"], fantacalcioId: 7546 },
  { id: "bobcek", name: "Bobcek", team: "Frosinone", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7612 },
  { id: "vitinha-o", name: "Vitinha O.", team: "Genoa", position: "A", mantraRoles: ["A"], fantacalcioId: 6164 },
  { id: "geubbels", name: "Geubbels", team: "Lecce", position: "A", mantraRoles: ["Pc"], fantacalcioId: 5029 },
  { id: "gueye", name: "Gueye", team: "Udinese", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7272 },
  { id: "zeballos", name: "Zeballos", team: "Monza", position: "A", mantraRoles: ["A"], fantacalcioId: 7620 },
  { id: "gnonto", name: "Gnonto", team: "Fiorentina", position: "A", mantraRoles: ["W","A"], fantacalcioId: 7623 },
  { id: "mutandwa", name: "Mutandwa", team: "Cagliari", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6598 },
  { id: "boga", name: "Boga", team: "Juventus", position: "A", mantraRoles: ["W","A"], fantacalcioId: 2832 },
  { id: "stulic", name: "Stulic", team: "Lecce", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7252 },
  { id: "gimenez", name: "Gimenez", team: "Milan", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7008 },
  { id: "mota", name: "Mota", team: "Monza", position: "A", mantraRoles: ["A"], fantacalcioId: 5882 },
  { id: "kulenovic", name: "Kulenovic", team: "Torino", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7349 },
  { id: "rrahmani-al", name: "Rrahmani Al.", team: "Venezia", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7449 },
  { id: "lontani", name: "Lontani", team: "Parma", position: "A", mantraRoles: ["A"], fantacalcioId: 7561 },
  { id: "neres", name: "Neres", team: "Napoli", position: "A", mantraRoles: ["W","A"], fantacalcioId: 6831 },
  { id: "elphege", name: "Elphege", team: "Parma", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7342 },
  { id: "zapata-d", name: "Zapata D.", team: "Torino", position: "A", mantraRoles: ["Pc"], fantacalcioId: 608 },
  { id: "fatah", name: "Fatah", team: "Lecce", position: "A", mantraRoles: ["W","A"], fantacalcioId: 7602 },
  { id: "sulemana-k", name: "Sulemana K.", team: "Atalanta", position: "A", mantraRoles: ["A"], fantacalcioId: 5918 },
  { id: "borrelli", name: "Borrelli", team: "Cagliari", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6243 },
  { id: "morata", name: "Morata", team: "Como", position: "A", mantraRoles: ["Pc"], fantacalcioId: 313 },
  { id: "ndri", name: "N'Dri", team: "Lecce", position: "A", mantraRoles: ["W","A"], fantacalcioId: 7001 },
  { id: "camarda", name: "Camarda", team: "Milan", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6519 },
  { id: "lang", name: "Lang", team: "Napoli", position: "A", mantraRoles: ["A"], fantacalcioId: 7120 },
  { id: "frigan", name: "Frigan", team: "Parma", position: "A", mantraRoles: ["A"], fantacalcioId: 7213 },
  { id: "adorante", name: "Adorante", team: "Venezia", position: "A", mantraRoles: ["Pc"], fantacalcioId: 4387 },
  { id: "milik", name: "Milik", team: "Juventus", position: "A", mantraRoles: ["Pc"], fantacalcioId: 2012 },
  { id: "birligea", name: "Birligea", team: "Frosinone", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7610 },
  { id: "ngonge", name: "Ngonge", team: "Monza", position: "A", mantraRoles: ["A"], fantacalcioId: 6145 },
  { id: "kuhn", name: "Kuhn", team: "Como", position: "A", mantraRoles: ["W","A"], fantacalcioId: 7128 },
  { id: "havel", name: "Havel", team: "Genoa", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7453 },
  { id: "giovane", name: "Giovane", team: "Napoli", position: "A", mantraRoles: ["A"], fantacalcioId: 7162 },
  { id: "lucca", name: "Lucca", team: "Napoli", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6215 },
  { id: "nzola", name: "Nzola", team: "Cagliari", position: "A", mantraRoles: ["Pc"], fantacalcioId: 5336 },
  { id: "ekhator", name: "Ekhator", team: "Juventus", position: "A", mantraRoles: ["A"], fantacalcioId: 6822 },
  { id: "petagna", name: "Petagna", team: "Monza", position: "A", mantraRoles: ["Pc"], fantacalcioId: 383 },
  { id: "bayo-v", name: "Bayo V.", team: "Udinese", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7161 },
  { id: "buksa", name: "Buksa", team: "Udinese", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7249 },
  { id: "lauberbach", name: "Lauberbach", team: "Venezia", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7482 },
  { id: "esteban", name: "Esteban", team: "Lecce", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7647 },
  { id: "albarracin", name: "Albarracin", team: "Cagliari", position: "A", mantraRoles: ["A"], fantacalcioId: 7338 },
  { id: "trepy", name: "Trepy", team: "Cagliari", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7317 },
  { id: "azon", name: "Azon", team: "Como", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7027 },
  { id: "vaz", name: "Vaz", team: "Roma", position: "A", mantraRoles: ["Pc"], fantacalcioId: 6981 },
  { id: "moro-l", name: "Moro L.", team: "Sassuolo", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7158 },
  { id: "lisman", name: "Lisman", team: "Venezia", position: "A", mantraRoles: ["W","A"], fantacalcioId: 7408 },
  { id: "de-martis", name: "De Martis", team: "Parma", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7568 },
  { id: "robinho-junior", name: "Robinho Junior", team: "Genoa", position: "A", mantraRoles: ["A"], fantacalcioId: 7622 },
  { id: "enem", name: "Enem", team: "Bologna", position: "A", mantraRoles: ["Pc"], fantacalcioId: 7627 },
]

function getTitolaritaStyle(value: number) {
  if (value >= 80) return "border-emerald-300/30 bg-emerald-300/15 text-emerald-100"
  if (value >= 60) return "border-amber-200/30 bg-amber-200/15 text-amber-100"
  return "border-rose-300/30 bg-rose-300/15 text-rose-100"
}

function FantaVibesLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center font-black shadow-lg shadow-violet-500/20">FV</div>
      <div className="leading-none"><div className="font-black tracking-tight text-[15px]">FANTA VIBES</div><div className="text-[10px] tracking-[0.2em] opacity-60">FANTACALCIO LAB</div></div>
    </div>
  )
}
function PlayerCard({ p }: { p: Player }) {
  return (
    <div className={`group relative overflow-hidden p-4 rounded-2xl border backdrop-blur-xl bg-zinc-900/70 ${POSITION_COLORS[p.position]} hover:scale-[1.02] transition-all duration-300 hover:shadow-xl`}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-white/10 to-transparent transition" />
      <div className="relative flex justify-between items-start"><div className="font-bold text-sm">{p.name}</div><div className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${getTitolaritaStyle(p.titolarita)}`}>{p.titolarita}%</div></div>
      <div className="relative mt-1 text-xs opacity-70">{p.team} • {p.mantraRoles.join("/")} • {p.position}</div>
      <div className="relative mt-2 text-[11px] opacity-60 line-clamp-2">{p.reason} — {p.opponent}</div>
    </div>
  )
}
function PitchPlayer({ p }: { p: Player }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`h-14 w-14 rounded-full border-2 bg-zinc-900 grid place-items-center font-black text-sm shadow-lg ${POSITION_COLORS[p.position]}`}>{p.name.slice(0,2).toUpperCase()}</div>
      <div className="px-2 py-0.5 rounded-full bg-black/70 border border-white/10 text-[10px] font-bold backdrop-blur">{p.name.split(" ").pop()}</div>
    </div>
  )
}export default function Page() {
  const [squad, setSquad] = useState<Player[]>([])
  const [page, setPage] = useState<Page>("home")
  const [scanning, setScanning] = useState(false)
  const [importingRoster, setImportingRoster] = useState(false)
  const [scanNotice, setScanNotice] = useState("")
  const [progress, setProgress] = useState(0)
  const uploadRef = useRef<HTMLInputElement>(null)
  const rosterFileRef = useRef<HTMLInputElement>(null)
  const [selectedFormation, setSelectedFormation] = useState<Formation>(CLASSIC_FORMATIONS[2])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed?.squad) && parsed.squad.every(isStoredPlayer)) setSquad(parsed.squad)
      }
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ squad })) } catch {}
  }, [squad])

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setScanNotice("")
    try {
      const { createWorker } = await import("tesseract.js")
      const worker = await (createWorker as any)("ita+eng", undefined, { logger: (m: any) => { if (m.progress) setProgress(Math.round(m.progress*100)) } } as any)
      const { data } = await (worker as any).recognize(file)
      await (worker as any).terminate()
      const found = matchRosterFromOcr(data.text || "")
      setSquad(found)
      setPage("roster")
      setScanNotice(found.length? `${found.length} giocatori riconosciuti` : "Nessun giocatore riconosciuto")
    } catch { setScanNotice("Scansione non riuscita") }
    finally { setScanning(false); setProgress(0); if (uploadRef.current) uploadRef.current.value="" }
  }

  const handleRosterFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingRoster(true)
    setScanNotice("")
    try {
      const importedPlayers = await importRosterFile(file)
      setSquad(importedPlayers)
      setPage("roster")
      setScanNotice(importedPlayers.length? `${importedPlayers.length} giocatori importati da ${file.name}` : "Nessun giocatore trovato in " + file.name)
    } catch (err) { console.error(err); setScanNotice("Impossibile leggere il file") }
    finally { setImportingRoster(false); if (rosterFileRef.current) rosterFileRef.current.value="" }
  }

  const grouped = (["P","D","C","A"] as Position[]).map(pos => ({ pos, players: squad.filter(p => p.position===pos) }))
  const totalTitolarita = useMemo(() => squad.length? Math.round(squad.reduce((a,p)=>a+p.titolarita,0)/squad.length) : 0, [squad])

  return (
    <div className="min-h-screen bg-[#07070b] text-zinc-100 relative overflow-hidden selection:bg-violet-500/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(120,80,255,0.18),transparent),radial-gradient(45%_40%_at_90%_20%,rgba(255,80,200,0.14),transparent),radial-gradient(30%_30%_at_10%_80%,rgba(80,200,255,0.1),transparent)]" />

      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-zinc-950/60 border-b border-white/[0.08] px-6 py-4 flex justify-between items-center">
        <FantaVibesLogo />
        <div className="flex items-center gap-2">
          <button onClick={()=>setPage("home")} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${page==="home"? "bg-white text-black shadow-lg" : "bg-zinc-800/60 hover:bg-zinc-800 border border-white/10"}`}>Home</button>
          <button onClick={()=>setPage("roster")} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${page==="roster"? "bg-white text-black shadow-lg" : "bg-zinc-800/60 hover:bg-zinc-800 border border-white/10"}`}>Rosa ({squad.length})</button>
        </div>
      </header>

      <main className="relative z-10 p-6 max-w-7xl mx-auto">
        {page==="home" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="relative rounded-[32px] border border-white/[0.08] bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-8 md:p-10 shadow-2xl overflow-hidden">
              <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 blur-3xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-bold text-violet-300"><Sparkles className="h-3.5 w-3.5" /> IMPORT SMART ATTIVO</div>
                <h1 className="mt-5 text-4xl md:text-5xl font-black tracking-tighter leading-[0.9]">La tua rosa,<br/><span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">riconosciuta in 3 sec.</span></h1>
                <p className="mt-4 text-zinc-400 max-w-xl leading-relaxed">Carica foto, Excel o CSV. Il sistema riconosce automaticamente anche liste senza intestazioni.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={()=>uploadRef.current?.click()} className="group px-6 py-3.5 rounded-2xl bg-white text-black font-black hover:bg-zinc-100 transition flex items-center gap-2 shadow-lg shadow-white/10"><Target className="h-4 w-4" /> Carica foto rosa <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition" /></button>
                  <button onClick={()=>rosterFileRef.current?.click()} className="px-6 py-3.5 rounded-2xl bg-zinc-800 border border-white/10 font-bold hover:bg-zinc-700 transition flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Carica Excel/CSV</button>
                </div>
                <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <input ref={rosterFileRef} type="file" accept=".xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleRosterFile} />
                {scanning && <div className="mt-6 flex items-center gap-3 text-sm"><LoaderCircle className="h-4 w-4 animate-spin" /> Scansione... {progress}%</div>}
                {importingRoster && <div className="mt-6 flex items-center gap-3 text-sm animate-pulse"><LoaderCircle className="h-4 w-4 animate-spin" /> Importazione in corso... </div>}
                {scanNotice && <div className="mt-6 inline-flex px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-200">{scanNotice}</div>}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-[20px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur p-5 hover:bg-zinc-900/80 transition"><div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center mb-3"><Check className="h-5 w-5 text-emerald-400" /></div><div className="font-bold text-sm">Import Excel 25/25</div><div className="text-xs text-zinc-400 mt-1 leading-relaxed">Riconosce anche file senza header e con dati sporchi.</div></div>
              <div className="rounded-[20px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur p-5 hover:bg-zinc-900/80 transition"><div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 grid place-items-center mb-3"><ShieldCheck className="h-5 w-5 text-sky-400" /></div><div className="font-bold text-sm">Foto Fix</div><div className="text-xs text-zinc-400 mt-1 leading-relaxed">Import dinamico, zero schermata bianca su Vercel.</div></div>
              <div className="rounded-[20px] border border-white/[0.08] bg-zinc-900/60 backdrop-blur p-5 hover:bg-zinc-900/80 transition"><div className="h-10 w-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 grid place-items-center mb-3"><Flame className="h-5 w-5 text-fuchsia-400" /></div><div className="font-bold text-sm">Grafica v0</div><div className="text-xs text-zinc-400 mt-1 leading-relaxed">Glassmorphism, gradient, pitch e animazioni originali.</div></div>
            </div>

            {squad.length>0 && (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between"><h2 className="font-black text-lg tracking-tight">Anteprima Rosa • Titolarità media {totalTitolarita}%</h2><button onClick={()=>setPage("roster")} className="text-xs text-violet-300 hover:text-violet-200">Vedi campo →</button></div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{squad.slice(0,12).map(p=><PlayerCard key={p.id} p={p} />)}</div>
              </div>
            )}
          </div>
        )}

        {page==="roster" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center"><button onClick={()=>setPage("home")} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"><ArrowLeft className="h-4 w-4" /> Home</button><div className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 border border-white/10 text-zinc-300">{scanNotice || `${squad.length} giocatori`}</div></div>
            <div className="flex gap-2 flex-wrap">{CLASSIC_FORMATIONS.map(f=><button key={f.name} onClick={()=>setSelectedFormation(f)} className={`px-4 py-2 rounded-full text-xs font-bold border transition ${selectedFormation.name===f.name? "bg-white text-black border-white shadow" : "bg-zinc-800/60 border-white/10 hover:bg-zinc-800 text-zinc-300"}`}>{f.name}</button>)}</div>
            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
              <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-b from-emerald-950/30 via-zinc-950 to-zinc-950 p-6 md:p-8 min-h-[620px] overflow-hidden shadow-2xl">
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:56px_56px]" />
                <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_10%,rgba(16,185,129,0.15),transparent)]" />
                <div className="relative z-10">
                  <div className="flex justify-center mb-6"><div className="px-4 py-1.5 rounded-full bg-black/60 border border-white/10 text-[11px] font-bold tracking-widest backdrop-blur">{selectedFormation.name} • CAMPO</div></div>
                  <div className="space-y-10">
                    {grouped.map(g=>(
                      <div key={g.pos}>
                        <div className="text-center text-[11px] tracking-[0.2em] opacity-50 mb-4 font-bold">{POSITION_NAMES[g.pos].toUpperCase()}</div>
                        <div className="flex flex-wrap gap-5 justify-center">{g.players.length? g.players.map(p=><PitchPlayer key={p.id} p={p} />) : <div className="text-xs opacity-30">Nessun {POSITION_NAMES[g.pos].toLowerCase()}</div>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-black tracking-tight flex items-center gap-2"><Users className="h-4 w-4" /> Rosa completa ({squad.length})</h3>
                <div className="space-y-2.5 max-h-[620px] overflow-auto pr-2 custom-scrollbar">{squad.map(p=><PlayerCard key={p.id} p={p} />)}</div>
              </div>
            </div>
          </div>
        )}
      </main>
      <style>{`
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }
      `}</style>
    </div>
  )
}
