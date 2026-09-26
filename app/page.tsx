"use client"

import { useMemo, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import Fuse from "fuse.js"
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleDot,
  FileImage,
  Flame,
  LoaderCircle,
  ScanLine,
  Settings2,
  Shield,
  Sparkles,
  Target,
  TriangleAlert,
  Users,
  X,
} from "lucide-react"
import { createWorker } from "tesseract.js"

type Position = "P" | "D" | "C" | "A"
type Mode = "Classic" | "Mantra"
type Player = {
  id: string
  name: string
  team: string
  position: Position
  mantraRoles: string[]
  titolarita: number
  xg: number
  xa: number
  hype: number
  mv: number
  inj: boolean
  reason: string
  opponent: string
}
type Formation = { name: string; defense: number; midfield: number; attack: number }
type Lineup = Record<Position, Player[]>

const BASE_SQUAD: Player[] = [
  { id: "svilar", name: "Svilar", team: "Roma", position: "P", mantraRoles: ["Por"], titolarita: 95, xg: 0.02, xa: 0.01, hype: 77, mv: 6.35, inj: false, reason: "Tra i pali è una scelta affidabile: buon volume di parate e possibilità di voto solido anche senza clean sheet.", opponent: "avversario demo" },
  { id: "meret", name: "Meret", team: "Napoli", position: "P", mantraRoles: ["Por"], titolarita: 91, xg: 0.01, xa: 0.01, hype: 68, mv: 6.18, inj: false, reason: "Portiere da modificatore con una base voto interessante. Il suo profilo premia la continuità.", opponent: "avversario demo" },
  { id: "mancini", name: "Mancini", team: "Roma", position: "D", mantraRoles: ["Dc"], titolarita: 91, xg: 0.11, xa: 0.04, hype: 69, mv: 6.22, inj: false, reason: "Pericoloso sui piazzati e presente in area. Buon mix di minutaggio e possibilità di bonus aereo.", opponent: "avversario demo" },
  { id: "bastoni", name: "Bastoni", team: "Inter", position: "D", mantraRoles: ["Dc", "Ds"], titolarita: 92, xg: 0.09, xa: 0.12, hype: 79, mv: 6.42, inj: false, reason: "Qualità in impostazione e inserimenti: può portare un assist oltre a un voto da modificatore.", opponent: "avversario demo" },
  { id: "dilorenzo", name: "Di Lorenzo", team: "Napoli", position: "D", mantraRoles: ["Dd", "E"], titolarita: 88, xg: 0.08, xa: 0.14, hype: 75, mv: 6.30, inj: false, reason: "Spinge con continuità e accompagna spesso l'azione. Profilo interessante per gli assist.", opponent: "avversario demo" },
  { id: "cambiaso", name: "Cambiaso", team: "Juventus", position: "D", mantraRoles: ["Dd", "Ds", "E"], titolarita: 83, xg: 0.07, xa: 0.15, hype: 76, mv: 6.28, inj: false, reason: "La duttilità e la partecipazione alla manovra gli danno più strade per portare bonus.", opponent: "avversario demo" },
  { id: "dimarco", name: "Dimarco", team: "Inter", position: "D", mantraRoles: ["Ds", "E"], titolarita: 89, xg: 0.15, xa: 0.29, hype: 90, mv: 6.55, inj: false, reason: "Cross, piazzati e conclusioni: tra i difensori è uno dei profili con più upside offensivo.", opponent: "avversario demo" },
  { id: "bremer", name: "Bremer", team: "Juventus", position: "D", mantraRoles: ["Dc"], titolarita: 76, xg: 0.12, xa: 0.02, hype: 70, mv: 6.20, inj: true, reason: "Quando disponibile garantisce fisicità e pericolosità sui calci piazzati. Controlla la condizione prima della consegna.", opponent: "avversario demo" },
  { id: "zappacosta", name: "Zappacosta", team: "Atalanta", position: "D", mantraRoles: ["E", "Dd"], titolarita: 72, xg: 0.12, xa: 0.23, hype: 75, mv: 6.26, inj: false, reason: "Quinto di spinta con occasioni per arrivare al cross e al tiro. Upside offensivo sopra la media.", opponent: "avversario demo" },
  { id: "calhanoglu", name: "Calhanoglu", team: "Inter", position: "C", mantraRoles: ["M", "C"], titolarita: 93, xg: 0.19, xa: 0.28, hype: 87, mv: 6.58, inj: false, reason: "Rigori e piazzati alzano il potenziale bonus. È uno dei centrocampisti più completi della rosa.", opponent: "avversario demo" },
  { id: "barella", name: "Barella", team: "Inter", position: "C", mantraRoles: ["M", "C"], titolarita: 91, xg: 0.16, xa: 0.20, hype: 84, mv: 6.48, inj: false, reason: "Volume di gioco e inserimenti continui. Una scelta da buon voto con chance di bonus.", opponent: "avversario demo" },
  { id: "pellegrini", name: "Pellegrini", team: "Roma", position: "C", mantraRoles: ["C", "T"], titolarita: 78, xg: 0.22, xa: 0.24, hype: 81, mv: 6.43, inj: false, reason: "Gioca vicino alla porta e cerca l'ultimo passaggio. Buon equilibrio tra gol e assist.", opponent: "avversario demo" },
  { id: "bernabe", name: "Bernabè", team: "Parma", position: "C", mantraRoles: ["C", "T"], titolarita: 86, xg: 0.15, xa: 0.27, hype: 73, mv: 6.32, inj: false, reason: "Creatività e passaggi chiave: può essere decisivo anche in una partita combattuta.", opponent: "avversario demo" },
  { id: "dacuhna", name: "Da Cunha", team: "Como", position: "C", mantraRoles: ["M", "C"], titolarita: 69, xg: 0.10, xa: 0.19, hype: 65, mv: 6.18, inj: false, reason: "Centrocampista dinamico da buon voto, con inserimenti e assist possibili.", opponent: "avversario demo" },
  { id: "zaccagni", name: "Zaccagni", team: "Lazio", position: "C", mantraRoles: ["W", "A"], titolarita: 84, xg: 0.30, xa: 0.22, hype: 83, mv: 6.41, inj: false, reason: "Esterno offensivo che attacca l'area e crea superiorità. Tra le scelte con più potenziale bonus.", opponent: "avversario demo" },
  { id: "orsolini", name: "Orsolini", team: "Bologna", position: "A", mantraRoles: ["W", "A"], titolarita: 89, xg: 0.41, xa: 0.23, hype: 89, mv: 6.53, inj: false, reason: "Conclusioni e responsabilità sui piazzati lo rendono uno dei profili offensivi più appetibili.", opponent: "avversario demo" },
  { id: "soule", name: "Soulé", team: "Roma", position: "A", mantraRoles: ["W", "A"], titolarita: 85, xg: 0.37, xa: 0.30, hype: 88, mv: 6.50, inj: false, reason: "Coinvolto nelle occasioni e nell'ultimo passaggio. Dribbling e tiri lo rendono una prima scelta.", opponent: "avversario demo" },
  { id: "castro", name: "Castro S.", team: "Bologna", position: "A", mantraRoles: ["Pc"], titolarita: 87, xg: 0.43, xa: 0.18, hype: 86, mv: 6.47, inj: false, reason: "Centravanti con volume di tiro e presenza in area: stima xG tra le più alte della rosa.", opponent: "avversario demo" },
  { id: "diao", name: "Diao", team: "Como", position: "A", mantraRoles: ["A", "W"], titolarita: 58, xg: 0.32, xa: 0.19, hype: 78, mv: 6.25, inj: false, reason: "Attacca la profondità e crea superiorità nell'uno contro uno. Rischio titolarità elevato in questo esempio.", opponent: "avversario demo" },
  { id: "lautaro", name: "Lautaro", team: "Inter", position: "A", mantraRoles: ["Pc"], titolarita: 94, xg: 0.56, xa: 0.14, hype: 96, mv: 6.71, inj: false, reason: "Finalizzatore centrale con grande volume di occasioni. Il suo profilo alza il potenziale offensivo.", opponent: "avversario demo" },
]

const CLASSIC_FORMATIONS: Formation[] = [
  { name: "3-4-3", defense: 3, midfield: 4, attack: 3 },
  { name: "3-5-2", defense: 3, midfield: 5, attack: 2 },
  { name: "4-3-3", defense: 4, midfield: 3, attack: 3 },
  { name: "4-4-2", defense: 4, midfield: 4, attack: 2 },
  { name: "4-5-1", defense: 4, midfield: 5, attack: 1 },
  { name: "5-3-2", defense: 5, midfield: 3, attack: 2 },
  { name: "5-4-1", defense: 5, midfield: 4, attack: 1 },
]
const MANTRA_FORMATIONS: Formation[] = [
  { name: "3-4-2-1", defense: 3, midfield: 6, attack: 1 },
  { name: "3-4-3", defense: 3, midfield: 4, attack: 3 },
  { name: "4-3-3", defense: 4, midfield: 3, attack: 3 },
  { name: "4-2-3-1", defense: 4, midfield: 5, attack: 1 },
  { name: "4-4-2", defense: 4, midfield: 4, attack: 2 },
]
const POSITION_NAMES: Record<Position, string> = { P: "Portiere", D: "Difesa", C: "Centrocampo", A: "Attacco" }
const POSITION_COLORS: Record<Position, string> = {
  P: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  D: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  C: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  A: "border-orange-400/30 bg-orange-400/10 text-orange-200",
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getScore(player: Player) {
  return (player.xg + player.xa) * (player.titolarita / 100)
}

function canPlay(player: Player, position: Position, mode: Mode) {
  if (mode === "Classic") return player.position === position
  const roles = player.mantraRoles.map((role) => role.toLowerCase())
  if (position === "P") return roles.includes("por")
  if (position === "D") return roles.some((role) => ["dc", "dd", "ds", "e"].includes(role))
  if (position === "C") return roles.some((role) => ["m", "c", "t", "w", "e"].includes(role))
  return roles.some((role) => ["pc", "a", "w"].includes(role))
}

function selectPlayers(pool: Player[], position: Position, count: number, mode: Mode, avoidRisk: boolean, excluded: Set<string>) {
  if (count <= 0) return []
  const candidates = pool.filter((player) => !excluded.has(player.id) && canPlay(player, position, mode)).sort((a, b) => getScore(b) - getScore(a))
  const safe = avoidRisk ? candidates.filter((player) => player.titolarita >= 60) : candidates
  const picked = safe.slice(0, count)
  if (picked.length < count) {
    const pickedIds = new Set(picked.map((player) => player.id))
    picked.push(...candidates.filter((player) => !pickedIds.has(player.id)).slice(0, count - picked.length))
  }
  return picked
}

function getBestLineup(squad: Player[], formation: Formation, mode: Mode, avoidRisk: boolean): Lineup {
  const goalkeeper = squad.find((player) => canPlay(player, "P", mode))
  const lineup: Lineup = { P: goalkeeper ? [goalkeeper] : [], D: [], C: [], A: [] }
  const used = new Set(lineup.P.map((player) => player.id))
  for (const [position, count] of [["A", formation.attack], ["C", formation.midfield], ["D", formation.defense]] as const) {
    lineup[position] = selectPlayers(squad, position, count, mode, avoidRisk, used)
    lineup[position].forEach((player) => used.add(player.id))
  }
  return lineup
}

function matchRosterFromOcr(text: string) {
  const matcher = new Fuse(BASE_SQUAD, { keys: ["name"], includeScore: true, threshold: 0.48, ignoreLocation: true, minMatchCharLength: 3 })
  const matched = new Set<string>()
  const lines = text.split(/[\n\r|]+/).map((line) => line.replace(/\d+[.,]?\d*/g, " ").replace(/[^\p{L}\s.'-]/gu, " ").trim()).filter(Boolean)
  const skip = /^(rosa|titolari|panchina|formazione|giocatori|giocatore|portieri|portiere|difensori|centrocampisti|attaccanti|rendimento|quotazione|fantacalcio|punteggio|totale|voti|lega|mercato|svincolati|infortunati)$/i
  for (const line of lines) {
    if (line.length < 3 || skip.test(line)) continue
    const words = line.split(/\s+/).filter((word) => word.length > 1)
    const candidates = new Set([line, ...words])
    for (let size = 2; size <= Math.min(4, words.length); size += 1) {
      for (let start = 0; start <= words.length - size; start += 1) candidates.add(words.slice(start, start + size).join(" "))
    }
    for (const candidate of candidates) {
      const result = matcher.search(candidate)[0]
      if (result && (result.score ?? 1) < 0.4) matched.add(result.item.id)
    }
  }
  return BASE_SQUAD.filter((player) => matched.has(player.id))
}

function getTitolaritaStyle(value: number) {
  if (value >= 80) return "border-emerald-300/30 bg-emerald-400/20 text-emerald-100"
  if (value >= 60) return "border-amber-300/30 bg-amber-300/20 text-amber-100"
  return "border-rose-300/30 bg-rose-400/20 text-rose-100"
}

function PlayerModal({ player, onClose }: { player: Player; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="player-modal-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-t-[28px] border border-white/10 bg-[#131713] shadow-2xl sm:rounded-[28px]">
        <div className="h-1 bg-gradient-to-r from-lime-300 via-yellow-300 to-orange-400" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`mb-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${POSITION_COLORS[player.position]}`}>{player.position} · {player.team}</div>
              <h2 id="player-modal-title" className="text-3xl font-black tracking-tight text-white">{player.name}</h2>
              <p className="mt-1 text-sm text-white/50">Prossima partita: {player.opponent}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Chiudi dettagli giocatore" className="rounded-full border border-white/10 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[ ["xG", player.xg.toFixed(2), "text-lime-300"], ["xA", player.xa.toFixed(2), "text-sky-300"], ["Hype", `${player.hype}%`, "text-orange-300"], ["Titolare", `${player.titolarita}%`, "text-emerald-200"], ["Media voto", player.mv.toFixed(2), "text-violet-200"], ["Disponibilità", player.inj ? "Da verificare" : "Disponibile", player.inj ? "text-rose-200" : "text-emerald-200"] ].map(([label, value, color]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"><div className={`mb-3 text-[10px] font-bold uppercase tracking-widest ${color}`}>{label}</div><div className="text-xl font-black text-white">{value}</div></div>)}
          </div>
          <div className="mt-5 rounded-2xl border border-lime-300/10 bg-lime-300/[0.045] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-lime-200"><Sparkles size={14} /> Perché schierarlo</div>
            <p className="mt-2 text-sm leading-6 text-white/75">{player.reason}</p>
          </div>
          <p className="mt-4 text-[10px] leading-5 text-white/40">Statistiche, titolarità e avversario sono valori dimostrativi, non aggiornamenti live.</p>
          <button type="button" onClick={onClose} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-3.5 text-sm font-black text-[#14180e] transition hover:bg-lime-200">FATTO <Check size={16} /></button>
        </div>
      </section>
    </div>
  )
}

function PitchPlayer({ player, onSelect }: { player: Player; onSelect: (player: Player) => void }) {
  const initials = player.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)
  return (
    <button type="button" onClick={() => onSelect(player)} aria-label={`Apri dettagli ${player.name}, ${player.titolarita}% titolarità`} className={`group flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1 text-center transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300 ${player.inj ? "opacity-30 grayscale" : ""}`}>
      <span className={`relative flex size-9 items-center justify-center rounded-full border-2 bg-[#172819] text-[10px] font-black text-white shadow-[0_4px_18px_rgba(0,0,0,0.3)] transition group-hover:scale-110 sm:size-11 sm:text-xs ${player.titolarita < 60 ? "border-dashed border-rose-300" : "border-white/65 group-hover:border-lime-200"}`}>
        {initials}
        <span className={`absolute -right-3 -top-2 rounded-full border px-1 py-0.5 text-[7px] font-black leading-none sm:text-[8px] ${getTitolaritaStyle(player.titolarita)}`}>{player.titolarita}%</span>
      </span>
      <span className="max-w-[68px] truncate text-[9px] font-bold text-white sm:max-w-[96px] sm:text-[11px]">{player.name}</span>
      <span className="text-[9px] font-semibold text-lime-100/70">xG {player.xg.toFixed(2)}</span>
    </button>
  )
}

export default function Home() {
  const [screen, setScreen] = useState<"home" | "tips">("home")
  const [squad, setSquad] = useState<Player[]>(BASE_SQUAD)
  const [hasUploaded, setHasUploaded] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [notice, setNotice] = useState("")
  const [mode, setMode] = useState<Mode>("Classic")
  const [defenseModifier, setDefenseModifier] = useState(true)
  const [avoidRisk, setAvoidRisk] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [formationIndex, setFormationIndex] = useState(0)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [liveTeams, setLiveTeams] = useState<Record<string, string>>({})
  const [loadingTips, setLoadingTips] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)
  const formations = mode === "Classic" ? CLASSIC_FORMATIONS : MANTRA_FORMATIONS
  const currentFormation = formations[formationIndex] ?? formations[0]
  const lineup = useMemo(() => getBestLineup(squad, currentFormation, mode, avoidRisk), [squad, currentFormation, mode, avoidRisk])
  const starters = useMemo(() => Object.values(lineup).flat(), [lineup])
  const lineupXgXa = starters.reduce((sum, player) => sum + player.xg + player.xa, 0)
  const averageTitolarita = starters.length ? starters.reduce((sum, player) => sum + player.titolarita, 0) / starters.length : 0
  const lowRiskFallbacks = starters.filter((player) => avoidRisk && player.titolarita < 60)
  const injuredStarters = starters.filter((player) => player.inj)
  const missingStarters = Math.max(0, 11 - starters.length)
  const previewPlayers = squad.slice(0, 8)

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setNotice("Scegli un'immagine PNG, JPG o WEBP.")
      return
    }
    setScreenshotUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return URL.createObjectURL(file)
    })
    setFileName(file.name)
    setScanning(true)
    setProgress(0)
    setNotice("")
    try {
      const worker = await createWorker("ita", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") setProgress(Math.round(message.progress * 100))
        },
      })
      try {
        const { data } = await worker.recognize(file)
        const found = matchRosterFromOcr(data.text)
        if (found.length > 0) {
          setSquad(found)
          setNotice(`${found.length} giocator${found.length === 1 ? "e riconosciuto" : "i riconosciuti"} con OCR.`)
        } else {
          setNotice("Non ho trovato nomi del database demo nello screenshot. Puoi usare comunque la rosa demo.")
        }
      } finally {
        await worker.terminate()
      }
    } catch {
      setNotice("Scansione non riuscita: controlla la connessione e riprova. Puoi usare la rosa demo.")
    } finally {
      setScanning(false)
      setHasUploaded(true)
      if (uploadRef.current) uploadRef.current.value = ""
    }
  }

  async function fetchTeamInfo(players: Player[]) {
    const results = await Promise.allSettled(players.map(async (player) => {
      const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(player.name)}`, { signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw new Error("Ricerca giocatore non disponibile")
      const data = await response.json() as { player?: Array<{ strTeam?: string | null; strPlayer?: string | null }> | null }
      const target = normalizeName(player.name.replace(/\s+S\.?$/i, ""))
      const match = data.player?.find((result) => result.strPlayer && (normalizeName(result.strPlayer) === target || (target.length >= 7 && normalizeName(result.strPlayer).includes(target))))
      return match?.strTeam ? [player.id, match.strTeam] as const : null
    }))
    setLiveTeams((previous) => {
      const next = { ...previous }
      for (const result of results) if (result.status === "fulfilled" && result.value) next[result.value[0]] = result.value[1]
      return next
    })
  }

  async function openTips() {
    setSettingsOpen(false)
    setFormationIndex(0)
    setScreen("tips")
    setLoadingTips(true)
    await fetchTeamInfo(squad)
    setLoadingTips(false)
  }

  function returnHome() {
    setSelectedPlayer(null)
    setScreen("home")
  }

  return (
    <main className="min-h-[100svh] bg-[#0b0d0b] font-sans text-white selection:bg-lime-300 selection:text-black">
      {screen === "home" ? (
        <div className="relative flex h-[100svh] flex-col overflow-hidden px-4 pb-3 sm:px-8 sm:pb-4">
          <header className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between border-b border-white/[0.07] py-3 sm:py-4">
            <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-xl bg-lime-300 text-[#10140b]"><CircleDot size={18} strokeWidth={2.6} /></span><h1 className="text-sm font-black tracking-[0.1em] sm:text-base">A S <span className="text-lime-300">TRONZO</span></h1></div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-orange-300/20 bg-orange-300/[0.06] px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.13em] text-orange-200 sm:px-3 sm:text-[9px] sm:tracking-[0.17em]">CIALTRONS</span>
              <button type="button" aria-label="Apri impostazioni" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((value) => !value)} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white/65 transition hover:border-white/20 hover:text-white"><Settings2 size={17} /></button>
            </div>
          </header>

          <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-center gap-3 pb-2 pt-3 sm:gap-4 sm:pt-4">
            <div className="shrink-0 text-center">
              <div className="mb-1.5 flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] text-lime-300 sm:text-[9px]"><span className="size-1 rounded-full bg-lime-300" />La tua panchina, la tua legge</div>
              <p className="text-xs text-white/45 sm:text-sm">La prossima giornata, giocata con più <span className="text-white/80">vibes.</span></p>
            </div>

            <section className="grid w-full max-w-2xl shrink-0 overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#111411] shadow-[0_20px_90px_rgba(0,0,0,0.28)] sm:grid-cols-[1fr_150px]">
              <div className="flex min-h-[150px] flex-col items-center justify-center px-5 py-4 text-center sm:min-h-[164px] sm:px-8">
                {scanning ? <>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-xl border border-lime-300/20 bg-lime-300/10 text-lime-300"><LoaderCircle size={19} className="animate-spin" /></div>
                  <p className="text-sm font-bold">Sto leggendo la tua rosa</p><p className="mt-1 max-w-[240px] truncate text-[10px] text-white/45">{fileName} · {progress}%</p>
                  <div className="mt-2.5 h-1 w-40 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime-300 transition-all" style={{ width: `${progress}%` }} /></div>
                </> : <>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-xl border border-lime-300/20 bg-lime-300/10 text-lime-300"><ScanLine size={19} /></div>
                  <h2 className="text-sm font-bold sm:text-base">Carica lo screenshot della rosa</h2>
                  <p className="mt-1 max-w-xs text-[10px] leading-4 text-white/45 sm:text-xs">Leggiamo i nomi con OCR e li abbiniamo al database con Fuse.js.</p>
                  <label htmlFor="roster-image" className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#13170e] transition hover:bg-lime-200 sm:text-[11px]"><FileImage size={15} />{hasUploaded ? "Cambia screenshot rosa" : "Carica screenshot rosa"}<ArrowRight size={14} /></label>
                </>}
                <input ref={uploadRef} id="roster-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="sr-only" aria-label="Carica screenshot della rosa" />
              </div>
              <div className="relative hidden min-h-[164px] overflow-hidden border-l border-white/[0.07] bg-[#161c15] sm:block">
                {screenshotUrl ? <img src={screenshotUrl} alt="Anteprima dello screenshot caricato" className="absolute inset-0 size-full object-cover opacity-65" /> : <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(163,230,53,.18),transparent_62%)]" />}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  {!screenshotUrl && <div className="grid grid-cols-3 gap-1.5 opacity-70">{Array.from({ length: 9 }).map((_, index) => <span key={index} className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]"><Users size={12} className="text-lime-200/70" /></span>)}</div>}
                  {screenshotUrl && <span className="rounded-full bg-black/65 px-3 py-1.5 text-[9px] font-bold text-lime-100 backdrop-blur">SCREENSHOT CARICATO</span>}
                  {!screenshotUrl && <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">La tua rosa, in campo</p>}
                </div>
              </div>
            </section>

            <section className="w-full max-w-2xl shrink-0" aria-label="Anteprima rosa">
              <div className="mb-1.5 flex items-center justify-between px-0.5">
                <div className="flex items-center gap-2"><span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/50">{hasUploaded ? "ROSA RICONOSCIUTA" : "ROSA DEMO · 20 GIOCATORI"}</span><span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold text-white/40">{squad.length}</span></div>
                <span className="flex items-center gap-1 text-[9px] text-white/30"><span className={`size-1.5 rounded-full ${hasUploaded ? (scanning ? "animate-pulse bg-amber-300" : "bg-lime-300") : "bg-white/25"}`} />{hasUploaded ? (scanning ? "scansione" : "rosa pronta") : "esempio"}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 sm:gap-1.5">
                {previewPlayers.map((player) => <div key={player.id} className="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#111411] px-1.5 py-1.5 sm:gap-2 sm:px-2"><span className={`flex size-5 shrink-0 items-center justify-center rounded-md border text-[8px] font-black ${POSITION_COLORS[player.position]}`}>{player.position}</span><span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-white/75 sm:text-[10px]">{player.name}</span><span className={`shrink-0 rounded-md border px-1 py-0.5 text-[8px] font-black ${getTitolaritaStyle(player.titolarita)}`}>{player.titolarita}%</span></div>)}
                {squad.length > previewPlayers.length && <div className="flex items-center justify-center rounded-lg border border-dashed border-white/10 px-2 py-1.5 text-[9px] font-bold text-white/40 sm:col-span-2">+{squad.length - previewPlayers.length} in rosa</div>}
              </div>
              {notice && <p aria-live="polite" className="mt-1.5 text-center text-[9px] text-lime-100/75">{notice}</p>}
              {!hasUploaded && <p className="mt-1.5 text-center text-[9px] text-white/30">Valori di esempio · non sono dati live</p>}
            </section>
          </div>

          {hasUploaded && <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-[#0b0d0b]/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl sm:px-8 sm:pt-3"><button type="button" disabled={scanning || loadingTips} onClick={() => void openTips()} className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-2xl bg-[#f3dc55] px-5 py-3 text-[11px] font-black tracking-[0.08em] text-[#171608] shadow-[0_8px_35px_rgba(243,220,85,0.12)] transition hover:bg-[#ffe96a] disabled:cursor-wait disabled:opacity-50 sm:py-3.5 sm:text-xs">{loadingTips ? <LoaderCircle size={16} className="animate-spin" /> : <Flame size={16} fill="currentColor" />} CONSIGLI PROSSIMA <ArrowRight size={16} /></button></div>}

          {settingsOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] sm:bg-black/35" onClick={() => setSettingsOpen(false)}>
            <section role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()} className="absolute right-3 top-[62px] w-[min(340px,calc(100vw-24px))] rounded-2xl border border-white/10 bg-[#151915] p-4 shadow-2xl sm:right-[max(calc((100vw-1152px)/2),32px)] sm:top-[76px]">
              <div className="mb-4 flex items-center justify-between"><h2 id="settings-title" className="text-sm font-black">Impostazioni</h2><button type="button" aria-label="Chiudi impostazioni" onClick={() => setSettingsOpen(false)} className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"><X size={16} /></button></div>
              <div className="flex flex-col gap-4">
                <div><p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">Modalità fantacalcio</p><div className="grid grid-cols-2 gap-2">{(["Classic", "Mantra"] as Mode[]).map((option) => <button key={option} type="button" aria-pressed={mode === option} onClick={() => { setMode(option); setFormationIndex(0) }} className={`rounded-xl border px-3 py-2.5 text-xs font-black transition ${mode === option ? "border-lime-300 bg-lime-300 text-[#13170e]" : "border-white/10 bg-white/[0.03] text-white/65 hover:text-white"}`}>{option}</button>)}</div></div>
                <SettingToggle label="Modificatore difesa" description="Mostra e valorizza la linea difensiva" checked={defenseModifier} onChange={setDefenseModifier} />
                <SettingToggle label="Evita rischio <60%" description="Esclude i titolari incerti, con fallback se servono" checked={avoidRisk} onChange={setAvoidRisk} />
              </div>
            </section>
          </div>}
        </div>
      ) : (
        <div className="min-h-[100svh] px-4 pb-8 sm:px-8">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between border-b border-white/[0.07] py-3.5 sm:py-5">
            <button type="button" onClick={returnHome} className="inline-flex items-center gap-2 text-[10px] font-bold text-white/55 transition hover:text-white sm:text-[11px]"><ArrowLeft size={16} />TORNA ALLA ROSA</button>
            <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.12em] sm:text-[11px]">A S <span className="text-lime-300">TRONZO</span></div>
            <div className="flex items-center gap-1.5 rounded-full border border-lime-300/15 bg-lime-300/[0.05] px-2.5 py-1.5 text-[8px] font-bold text-lime-100/70 sm:px-3 sm:text-[9px]"><Activity size={12} />{loadingTips ? "RICERCA SQUADRE" : "ANALISI ROSA"}</div>
          </header>

          <div className="mx-auto max-w-6xl pt-5 sm:pt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><div className="mb-1.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-lime-300"><Sparkles size={13} />ANALISI DELLA GIORNATA</div><h1 className="text-2xl font-black tracking-[-0.06em] sm:text-4xl">I tuoi <span className="text-lime-300">consigli.</span></h1><p className="mt-1 text-[10px] text-white/45 sm:text-xs">{squad.length} giocatori · {mode} · scegli il modulo</p></div>
              <span className="rounded-full border border-orange-300/20 bg-orange-300/[0.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-orange-200">CIALTRONS</span>
            </div>

            <nav aria-label={`Moduli ${mode}`} className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-6">
              {formations.map((formation, index) => <button key={formation.name} type="button" onClick={() => setFormationIndex(index)} aria-pressed={index === formationIndex} className={`shrink-0 rounded-xl border px-3.5 py-2 text-[11px] font-black tracking-wide transition sm:px-4 sm:py-2.5 sm:text-xs ${index === formationIndex ? "border-lime-300 bg-lime-300 text-[#10150d] shadow-[0_4px_20px_rgba(190,242,100,.12)]" : "border-white/[0.08] bg-white/[0.025] text-white/55 hover:border-white/20 hover:text-white"}`}>{formation.name}</button>)}
            </nav>

            <section aria-label={`Campo ${currentFormation.name}`} className="relative mt-2 min-h-[60vh] overflow-hidden rounded-[22px] border border-emerald-100/10 bg-[#183322] shadow-[0_22px_70px_rgba(0,0,0,.3)] sm:mt-3">
              <div className="pointer-events-none absolute inset-2.5 rounded-[13px] border border-white/20 sm:inset-5" />
              <div className="pointer-events-none absolute left-2.5 right-2.5 top-1/2 border-t border-white/20 sm:left-5 sm:right-5" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 sm:size-32" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
              <div className="pointer-events-none absolute left-1/2 top-2.5 h-9 w-28 -translate-x-1/2 rounded-b-xl border-x border-b border-white/20 sm:top-5 sm:h-16 sm:w-48" />
              <div className="pointer-events-none absolute bottom-2.5 left-1/2 h-9 w-28 -translate-x-1/2 rounded-t-xl border-x border-t border-white/20 sm:bottom-5 sm:h-16 sm:w-48" />
              <div className="relative z-10 grid min-h-[60vh] grid-rows-4 px-3 py-5 sm:px-9 sm:py-8">
                {(["P", "D", "C", "A"] as Position[]).map((position) => {
                  const players = lineup[position]
                  return <div key={position} className="flex min-w-0 flex-col items-center justify-center gap-1 sm:gap-2">
                    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.17em] text-white/50 backdrop-blur-sm sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[8px]"><span className={`size-1.5 rounded-full ${position === "A" ? "bg-orange-300" : position === "C" ? "bg-amber-200" : position === "D" ? "bg-emerald-200" : "bg-sky-200"}`} />{position} · {players.length}</div>
                    <div className="flex w-full flex-wrap items-center justify-center gap-x-1 gap-y-0 sm:gap-x-5 sm:gap-y-1">{players.map((player) => <PitchPlayer key={player.id} player={player} onSelect={setSelectedPlayer} />)}</div>
                  </div>
                })}
              </div>
              <div className="absolute bottom-2 right-4 text-[7px] font-black uppercase tracking-[0.18em] text-white/25 sm:bottom-3 sm:right-6 sm:text-[8px]">A S TRONZO · {currentFormation.name}</div>
            </section>

            <section aria-label="Riepilogo formazione" className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.07] bg-[#111411] p-3 sm:grid-cols-4 sm:gap-3 sm:p-4">
              <SummaryMetric label="xG + xA totali" value={lineupXgXa.toFixed(2)} accent="text-lime-200" />
              <SummaryMetric label="Titolarità media" value={`${averageTitolarita.toFixed(0)}%`} accent="text-emerald-200" />
              <SummaryMetric label="Modalità" value={mode} accent="text-sky-200" />
              <SummaryMetric label="Modificatore" value={defenseModifier ? "ON" : "OFF"} accent={defenseModifier ? "text-amber-200" : "text-white/50"} />
            </section>

            <div role="status" className={`mt-3 flex items-start gap-2 rounded-xl border px-3.5 py-3 text-[10px] leading-5 sm:text-xs ${injuredStarters.length || lowRiskFallbacks.length || missingStarters ? "border-amber-300/15 bg-amber-300/[0.05] text-amber-100/75" : "border-lime-300/10 bg-lime-300/[0.035] text-white/50"}`}>
              {injuredStarters.length || lowRiskFallbacks.length || missingStarters ? <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-200" /> : <Shield size={14} className="mt-0.5 shrink-0 text-lime-200/70" />}
              <span>{missingStarters ? `Formazione incompleta: mancano ${missingStarters} giocator${missingStarters === 1 ? "e" : "i"} per arrivare a 11. Carica uno screenshot più leggibile o completo. ` : ""}{injuredStarters.length ? `Da verificare: ${injuredStarters.map((player) => player.name).join(", ")} risulta indisponibile nel database demo. ` : ""}{lowRiskFallbacks.length ? `Fallback titolarità: ${lowRiskFallbacks.map((player) => `${player.name} (${player.titolarita}%)`).join(", ")} schierat${lowRiskFallbacks.length === 1 ? "o" : "i"} per completare la formazione. ` : ""}{defenseModifier ? `Modificatore difesa attivo: media voto dei difensori ${lineup.D.length ? (lineup.D.reduce((sum, player) => sum + player.mv, 0) / lineup.D.length).toFixed(2) : "—"}.` : "Modificatore difesa disattivato."}</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-[9px] text-white/30"><span>Statistiche, avversari e titolarità sono stime demo, non dati live.</span><button type="button" onClick={() => { setScreen("home"); setSettingsOpen(true) }} className="inline-flex items-center gap-1 text-white/50 transition hover:text-white">Impostazioni <ChevronDown size={12} /></button></div>
          </div>
        </div>
      )}
      {selectedPlayer && <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </main>
  )
}

function SettingToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition hover:bg-white/[0.05]"><span><span className="block text-xs font-bold text-white/85">{label}</span><span className="mt-1 block text-[10px] text-white/40">{description}</span></span><span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-lime-300" : "bg-white/20"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-[#10140b] transition ${checked ? "left-[18px]" : "left-0.5"}`} /></span></button>
}

function SummaryMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="flex flex-col gap-1 border-white/[0.06] px-1 sm:border-r sm:px-2 last:border-r-0"><span className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/35 sm:text-[9px]">{label}</span><span className={`text-sm font-black ${accent} sm:text-base`}>{value}</span></div>
}
