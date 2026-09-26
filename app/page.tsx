"use client"

import { useMemo, useRef, useState } from "react"
import Fuse from "fuse.js"
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDot,
  Crown,
  FileImage,
  Flame,
  Info,
  LoaderCircle,
  ScanLine,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react"
import { createWorker } from "tesseract.js"

type Position = "P" | "D" | "C" | "A"
type Player = {
  id: string
  name: string
  position: Position
  team: string
  xg: number
  xa: number
  hype: number
  reason: string
  opponent: string
  note: string
}
type Formation = { name: string; defense: number; midfield: number; attack: number }

const BASE_SQUAD: Player[] = [
  { id: "svilar", name: "Svilar", position: "P", team: "Roma", xg: 0.02, xa: 0.01, hype: 74, reason: "Clean sheet potenziale e buona forma tra i pali. Contro squadre che concedono tanti tiri, può portare bonus anche senza porta inviolata.", opponent: "Lazio", note: "Titolare · rigorista no" },
  { id: "mancini", name: "Mancini", position: "D", team: "Roma", xg: 0.12, xa: 0.04, hype: 66, reason: "Pericoloso sui piazzati e presenza costante in area. Scelta solida se cerchi minutaggio e un possibile bonus di testa.", opponent: "Lazio", note: "Piazzati · titolare" },
  { id: "wesley", name: "Wesley", position: "D", team: "Roma", xg: 0.11, xa: 0.19, hype: 72, reason: "Spinta sulla fascia e coinvolgimento nelle progressioni. L'upside offensivo lo rende una scelta interessante in questa giornata.", opponent: "Lazio", note: "Spinta offensiva" },
  { id: "scalvini", name: "Scalvini", position: "D", team: "Atalanta", xg: 0.09, xa: 0.03, hype: 61, reason: "Difensore affidabile nelle letture, con qualche occasione sui calci piazzati. Buon profilo per completare la linea.", opponent: "Fiorentina", note: "Minutaggio in crescita" },
  { id: "zappacosta", name: "Zappacosta", position: "D", team: "Atalanta", xg: 0.13, xa: 0.22, hype: 76, reason: "Quinto di spinta con occasioni per arrivare al cross e al tiro. Ha più upside offensivo rispetto alla media dei difensori.", opponent: "Fiorentina", note: "Quinto · cross" },
  { id: "calhanoglu", name: "Calhanoglu", position: "C", team: "Inter", xg: 0.18, xa: 0.27, hype: 82, reason: "Piazzati e rigori alzano il suo potenziale bonus. È il centrocampista più completo della rosa per qualità e occasioni create.", opponent: "Milan", note: "Rigorista · piazzati" },
  { id: "pellegrini", name: "Pellegrini", position: "C", team: "Roma", xg: 0.21, xa: 0.23, hype: 77, reason: "Gioca vicino alla porta e cerca spesso l'ultimo passaggio. Buon equilibrio tra possibilità di segnare e assist.", opponent: "Lazio", note: "Inserimenti · piazzati" },
  { id: "bernabe", name: "Bernabè", position: "C", team: "Parma", xg: 0.15, xa: 0.25, hype: 71, reason: "Creatività e buon volume di passaggi chiave. Può essere decisivo anche in una partita complicata.", opponent: "Torino", note: "Creatore di gioco" },
  { id: "dacuhna", name: "Da Cunha", position: "C", team: "Como", xg: 0.10, xa: 0.18, hype: 63, reason: "Centrocampista dinamico che porta equilibrio e qualche inserimento. Profilo da buon voto, con bonus possibile.", opponent: "Genoa", note: "Buon minutaggio" },
  { id: "soule", name: "Soulé", position: "A", team: "Roma", xg: 0.36, xa: 0.29, hype: 86, reason: "Tra i più coinvolti nelle occasioni della squadra. Dribbling e conclusioni lo rendono una delle prime scelte davanti.", opponent: "Lazio", note: "Tiri · ultimo passaggio" },
  { id: "castro", name: "Castro S.", position: "A", team: "Bologna", xg: 0.42, xa: 0.17, hype: 84, reason: "Centravanti con volume di tiro e presenza in area. Il suo xG stimato è tra i più alti della rosa.", opponent: "Juventus", note: "Prima punta" },
  { id: "diao", name: "Diao", position: "A", team: "Como", xg: 0.31, xa: 0.20, hype: 79, reason: "Attacca la profondità e crea superiorità nell'uno contro uno. Profilo adatto a una formazione aggressiva.", opponent: "Genoa", note: "Attacca la profondità" },
  { id: "boga", name: "Boga", position: "A", team: "Juventus", xg: 0.27, xa: 0.22, hype: 73, reason: "Imprevedibile nell'ultimo terzo, può trovare il bonus con una giocata. Interessante come terza punta.", opponent: "Napoli", note: "Uno contro uno" },
]

const FORMATIONS: Formation[] = [
  { name: "3-4-3", defense: 3, midfield: 4, attack: 3 },
  { name: "3-5-2", defense: 3, midfield: 5, attack: 2 },
  { name: "4-3-3", defense: 4, midfield: 3, attack: 3 },
  { name: "4-4-2", defense: 4, midfield: 4, attack: 2 },
  { name: "4-5-1", defense: 4, midfield: 5, attack: 1 },
  { name: "5-3-2", defense: 5, midfield: 3, attack: 2 },
  { name: "5-4-1", defense: 5, midfield: 4, attack: 1 },
]

const POSITION_NAMES: Record<Position, string> = { P: "Portiere", D: "Difensore", C: "Centrocampista", A: "Attaccante" }
const POSITION_COLORS: Record<Position, string> = {
  P: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  D: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  C: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  A: "border-orange-400/30 bg-orange-400/10 text-orange-200",
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getBestLineup(squad: Player[], formation: Formation) {
  const choose = (position: Position, count: number) => squad
    .filter((player) => player.position === position)
    .sort((a, b) => b.xg - a.xg)
    .slice(0, count)
  return {
    P: choose("P", 1),
    D: choose("D", formation.defense),
    C: choose("C", formation.midfield),
    A: choose("A", formation.attack),
  }
}

function matchRosterFromOcr(text: string) {
  const matcher = new Fuse(BASE_SQUAD, {
    keys: ["name"],
    includeScore: true,
    threshold: 0.48,
    ignoreLocation: true,
    minMatchCharLength: 3,
  })
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
      if (result && (result.score ?? 1) < 0.40) matched.add(result.item.id)
    }
  }
  return BASE_SQUAD.filter((player) => matched.has(player.id))
}

function PlayerModal({ player, onClose, liveTeam }: { player: Player; onClose: () => void; liveTeam?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="player-modal-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-t-[28px] border border-white/10 bg-[#131713] shadow-2xl sm:rounded-[28px]">
        <div className="h-1 bg-gradient-to-r from-lime-300 via-yellow-300 to-orange-400" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`mb-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${POSITION_COLORS[player.position]}`}>{POSITION_NAMES[player.position]}</div>
              <h2 id="player-modal-title" className="text-3xl font-black tracking-tight text-white">{player.name}</h2>
              <p className="mt-1 text-sm text-white/50">{liveTeam || player.team} <span className="mx-1.5 text-white/20">/</span> Avversario demo: {player.opponent}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Chiudi dettagli giocatore" className="rounded-full border border-white/10 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"><Target className="mb-3 text-lime-300" size={17} /><div className="text-[10px] font-bold uppercase tracking-widest text-white/40">xG stimato</div><div className="mt-1 text-2xl font-black text-white">{player.xg.toFixed(2)}</div></div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"><TrendingUp className="mb-3 text-sky-300" size={17} /><div className="text-[10px] font-bold uppercase tracking-widest text-white/40">xA stimato</div><div className="mt-1 text-2xl font-black text-white">{player.xa.toFixed(2)}</div></div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"><Flame className="mb-3 text-orange-300" size={17} /><div className="text-[10px] font-bold uppercase tracking-widest text-white/40">Hype</div><div className="mt-1 text-2xl font-black text-white">{player.hype}%</div></div>
          </div>
          <div className="mt-5 rounded-2xl border border-lime-300/10 bg-lime-300/[0.045] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-lime-200"><Sparkles size={14} /> Perché schierarlo</div>
            <p className="mt-2 text-sm leading-6 text-white/75">{player.reason}</p>
          </div>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-white/[0.035] p-3 text-xs leading-5 text-white/45"><Info className="mt-0.5 shrink-0 text-white/35" size={14} />La squadra viene cercata su TheSportsDB quando il nome corrisponde con precisione. Avversario, xG, xA e hype sono stime demo, non dati live.</div>
          <button type="button" onClick={onClose} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-3.5 text-sm font-black text-[#14180e] transition hover:bg-lime-200">FATTO <Check size={16} /></button>
        </div>
      </section>
    </div>
  )
}

function PitchPlayer({ player, onSelect }: { player: Player; onSelect: (player: Player) => void }) {
  return (
    <button type="button" onClick={() => onSelect(player)} aria-label={`Apri i dettagli di ${player.name}, xG ${player.xg.toFixed(2)}`} className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-1 text-center transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300">
      <span className="relative flex size-9 items-center justify-center rounded-full border-2 border-white/65 bg-[#172819] text-[10px] font-black text-white shadow-[0_4px_18px_rgba(0,0,0,0.3)] transition group-hover:scale-110 group-hover:border-lime-200 sm:size-11 sm:text-xs">{player.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}<span className="absolute -right-1 -top-1 size-2 rounded-full bg-lime-300 ring-2 ring-[#1b3d28]" /></span>
      <span className="max-w-[66px] truncate text-[9px] font-bold text-white sm:max-w-[100px] sm:text-[11px]">{player.name}</span>
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
  const [formationIndex, setFormationIndex] = useState(0)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [liveTeams, setLiveTeams] = useState<Record<string, string>>({})
  const [loadingTips, setLoadingTips] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)
  const currentFormation = FORMATIONS[formationIndex]
  const lineup = useMemo(() => getBestLineup(squad, currentFormation), [squad, currentFormation])
  const lineupXg = Object.values(lineup).flat().reduce((sum, player) => sum + player.xg, 0)
  const previewPlayers = squad.slice(0, 6)

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
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
    setHasUploaded(true)
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
          setNotice(`${found.length} giocator${found.length === 1 ? "e riconosciuto" : "i riconosciuti"} con OCR. Controlla la rosa prima di schierare.`)
        } else {
          setNotice("Non ho trovato nomi della rosa demo nello screenshot. Puoi comunque aprire i consigli demo.")
        }
      } finally {
        await worker.terminate()
      }
    } catch {
      setNotice("Scansione non riuscita: controlla la connessione e riprova. Puoi comunque usare la rosa demo.")
    } finally {
      setScanning(false)
      if (uploadRef.current) uploadRef.current.value = ""
    }
  }

  async function fetchTeamInfo(players: Player[]) {
    const results = await Promise.allSettled(players.map(async (player) => {
      const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(player.name)}`, { signal: AbortSignal.timeout(7000) })
      if (!response.ok) throw new Error("Ricerca giocatore non disponibile")
      const data = await response.json() as { player?: Array<{ strTeam?: string | null; strPlayer?: string | null }> | null }
      const aliases: Record<string, string[]> = { castro: ["santiagocastro", "castrosantiago"] }
      const target = normalizeName(player.name)
      const acceptedNames = aliases[player.id] ?? [target]
      const match = data.player?.find((result) => {
        if (!result.strPlayer) return false
        const resultName = normalizeName(result.strPlayer)
        return acceptedNames.some((name) => resultName === name || (name.length >= 8 && resultName.includes(name)))
      })
      return match?.strTeam ? [player.id, match.strTeam] as const : null
    }))
    setLiveTeams((previous) => {
      const next = { ...previous }
      for (const result of results) if (result.status === "fulfilled" && result.value) next[result.value[0]] = result.value[1]
      return next
    })
  }

  async function openTips() {
    setLoadingTips(true)
    setScreen("tips")
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
        <div className="relative grid h-[100svh] grid-rows-[auto_1fr] overflow-hidden px-4 pb-5 sm:px-8 sm:pb-7">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between border-b border-white/[0.07] py-3.5 sm:py-5">
            <a href="#home" onClick={(event) => event.preventDefault()} className="flex items-center gap-2.5" aria-label="A S Tronzo home">
              <span className="flex size-8 items-center justify-center rounded-xl bg-lime-300 text-[#10140b]"><CircleDot size={18} strokeWidth={2.6} /></span>
              <span className="text-[13px] font-black tracking-[0.12em] sm:text-sm">FANTA<span className="text-lime-300">VIBES</span></span>
            </a>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">STAGIONE FANTACALCIO</span>
          </header>

          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-col items-center justify-center gap-4 pb-3 pt-3 sm:gap-5 sm:pb-5 sm:pt-5">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-lime-300"><span className="size-1 rounded-full bg-lime-300" />LA TUA PANCHINA, LA TUA LEGGE</div>
              <h1 className="text-4xl font-black leading-none tracking-[-0.075em] sm:text-6xl">A S <span className="text-lime-300">TRONZO</span></h1>
              <p className="mt-2 text-[11px] text-white/45 sm:text-sm">La prossima giornata, giocata con più <span className="text-white/80">vibes.</span></p>
            </div>

            <section className="grid w-full max-w-3xl overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#111411] shadow-[0_20px_90px_rgba(0,0,0,0.28)] sm:grid-cols-[1fr_180px]">
              <div className="flex min-h-[154px] flex-col items-center justify-center px-5 py-5 text-center sm:min-h-[174px] sm:px-8">
                {scanning ? (
                  <>
                    <div className="mb-3 flex size-10 items-center justify-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-lime-300"><LoaderCircle size={21} className="animate-spin" /></div>
                    <p className="text-sm font-bold">Sto leggendo la tua rosa</p>
                    <p className="mt-1 text-[11px] text-white/45">{fileName} · {progress}%</p>
                    <div className="mt-3 h-1 w-40 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime-300 transition-all" style={{ width: `${progress}%` }} /></div>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex size-10 items-center justify-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-lime-300"><ScanLine size={20} /></div>
                    <h2 className="text-sm font-bold sm:text-base">Hai uno screenshot della rosa?</h2>
                    <p className="mt-1 max-w-xs text-[10px] leading-4 text-white/45 sm:text-xs">Caricalo e riconosciamo i giocatori con scansione OCR.</p>
                    <label htmlFor="roster-image" className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#13170e] transition hover:bg-lime-200 sm:text-[11px]">
                      <FileImage size={15} />{hasUploaded ? "Cambia screenshot rosa" : "Carica screenshot rosa"}<ArrowUpRight size={14} />
                    </label>
                  </>
                )}
                <input ref={uploadRef} id="roster-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="sr-only" aria-label="Carica screenshot della rosa" />
              </div>
              <div className="relative hidden overflow-hidden border-l border-white/[0.07] bg-[#161c15] sm:block">
                {screenshotUrl ? <img src={screenshotUrl} alt="Anteprima screenshot caricato" className="absolute inset-0 size-full object-cover opacity-70" /> : <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(163,230,53,.16),transparent_62%)]" />}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                  {!screenshotUrl && <div className="grid grid-cols-3 gap-1.5 opacity-70">{Array.from({ length: 9 }).map((_, index) => <span key={index} className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]"><Users size={12} className="text-lime-200/70" /></span>)}</div>}
                  {screenshotUrl && <div className="rounded-full bg-black/65 px-3 py-1.5 text-[9px] font-bold text-lime-100 backdrop-blur">SCREENSHOT CARICATO</div>}
                  {!screenshotUrl && <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">La tua rosa, in campo</p>}
                </div>
              </div>
            </section>

            <section className="w-full max-w-3xl" aria-label="Anteprima rosa">
              <div className="mb-2 flex items-center justify-between px-0.5">
                <div className="flex items-center gap-2"><span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/50">{hasUploaded ? "ROSA RICONOSCIUTA" : "ROSA DEMO"}</span><span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold text-white/40">{squad.length}</span></div>
                <span className="flex items-center gap-1 text-[9px] text-white/30"><span className={`size-1.5 rounded-full ${hasUploaded ? "bg-lime-300" : "bg-white/25"}`} />{hasUploaded ? (scanning ? "scansione in corso" : "anteprima pronta") : "rosa di esempio"}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 sm:gap-2">
                {previewPlayers.map((player) => <div key={player.id} className="flex min-w-0 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-[#111411] px-2 py-2 sm:gap-2 sm:px-2.5"><span className={`flex size-6 shrink-0 items-center justify-center rounded-lg border text-[9px] font-black ${POSITION_COLORS[player.position]}`}>{player.position}</span><span className="min-w-0 truncate text-[9px] font-semibold text-white/75 sm:text-[10px]">{player.name}</span></div>)}
                {squad.length > 6 && <div className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-2 py-2 text-[9px] font-bold text-white/40 sm:text-[10px]">+{squad.length - 6} in rosa</div>}
              </div>
              {notice && <p aria-live="polite" className="mt-2 text-center text-[10px] text-lime-100/75">{notice}</p>}
              {!hasUploaded && <button type="button" onClick={() => void openTips()} className="mx-auto mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-white/35 transition hover:text-white/70">Dai un&apos;occhiata ai consigli demo <ChevronRight size={13} /></button>}
            </section>
          </div>

          {hasUploaded && <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.06] bg-[#0b0d0b]/95 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-8 sm:pt-4"><button type="button" disabled={scanning || loadingTips} onClick={() => void openTips()} className="mx-auto flex w-full max-w-3xl items-center justify-center gap-2.5 rounded-2xl bg-[#f3dc55] px-5 py-3.5 text-[11px] font-black tracking-[0.08em] text-[#171608] shadow-[0_8px_35px_rgba(243,220,85,0.12)] transition hover:bg-[#ffe96a] disabled:cursor-wait disabled:opacity-50 sm:py-4 sm:text-xs">{loadingTips ? <LoaderCircle size={16} className="animate-spin" /> : <Flame size={16} fill="currentColor" />} CONSIGLI PROSSIMA PARTITA <ArrowRight size={16} /></button></div>}
        </div>
      ) : (
        <div className="min-h-[100svh] px-4 pb-10 sm:px-8">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between border-b border-white/[0.07] py-4 sm:py-5">
            <button type="button" onClick={returnHome} className="inline-flex items-center gap-2 text-[11px] font-bold text-white/55 transition hover:text-white"><ArrowLeft size={16} />TORNA ALLA ROSA</button>
            <div className="flex items-center gap-2 text-[11px] font-black tracking-[0.12em]">FANTA<span className="text-lime-300">VIBES</span></div>
            <div className="hidden items-center gap-1.5 rounded-full border border-lime-300/15 bg-lime-300/[0.05] px-3 py-1.5 text-[9px] font-bold text-lime-100/70 sm:flex"><Activity size={12} />{loadingTips ? "AGGIORNAMENTO DATI" : "ANALISI ROSA"}</div>
          </header>

          <div className="mx-auto max-w-6xl pt-7 sm:pt-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-lime-300"><Sparkles size={13} />ANALISI DELLA GIORNATA</div>
                <h1 className="text-3xl font-black tracking-[-0.06em] sm:text-4xl">I tuoi <span className="text-lime-300">consigli.</span></h1>
                <p className="mt-1.5 text-xs text-white/45">{squad.length} giocatori · {hasUploaded ? "rosa da screenshot" : "rosa demo"} · scegli il modulo</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-2.5"><div className="flex size-8 items-center justify-center rounded-lg bg-lime-300/10 text-lime-200"><Target size={16} /></div><div><div className="text-[9px] font-bold uppercase tracking-widest text-white/35">xG formazione</div><div className="text-sm font-black text-white">{lineupXg.toFixed(2)} <span className="text-[9px] font-medium text-white/40">stimato</span></div></div></div>
            </div>

            <nav aria-label="Moduli" className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FORMATIONS.map((formation, index) => <button key={formation.name} type="button" onClick={() => setFormationIndex(index)} aria-pressed={index === formationIndex} className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-black tracking-wide transition ${index === formationIndex ? "border-lime-300 bg-lime-300 text-[#10150d] shadow-[0_4px_20px_rgba(190,242,100,.12)]" : "border-white/[0.08] bg-white/[0.025] text-white/55 hover:border-white/20 hover:text-white"}`}>{formation.name}</button>)}
            </nav>

            <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-start lg:gap-7">
              <section aria-label={`Campo ${currentFormation.name}`} className="mx-auto w-full max-w-[820px] overflow-hidden rounded-[22px] border border-emerald-100/10 bg-[#183322] shadow-[0_22px_70px_rgba(0,0,0,.3)] lg:mx-0">
                <div className="relative min-h-[470px] overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(107,166,87,.22),transparent_72%),repeating-linear-gradient(0deg,rgba(255,255,255,.025)_0px,rgba(255,255,255,.025)_38px,rgba(0,0,0,.035)_38px,rgba(0,0,0,.035)_76px)] sm:min-h-[560px]">
                  <div className="pointer-events-none absolute inset-3 rounded-[13px] border border-white/20 sm:inset-5" />
                  <div className="pointer-events-none absolute left-3 right-3 top-1/2 border-t border-white/20 sm:left-5 sm:right-5" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 sm:size-32" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
                  <div className="pointer-events-none absolute left-1/2 top-3 h-12 w-36 -translate-x-1/2 rounded-b-xl border-x border-b border-white/20 sm:top-5 sm:h-16 sm:w-48" />
                  <div className="pointer-events-none absolute bottom-3 left-1/2 h-12 w-36 -translate-x-1/2 rounded-t-xl border-x border-t border-white/20 sm:bottom-5 sm:h-16 sm:w-48" />
                  <div className="relative z-10 grid min-h-[470px] grid-rows-[1fr_1fr_1fr_1fr] px-5 py-7 sm:min-h-[560px] sm:px-9 sm:py-9">
                    {(["A", "C", "D", "P"] as Position[]).map((position) => {
                      const players = lineup[position]
                      return <div key={position} className="flex min-w-0 flex-col items-center justify-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/45 backdrop-blur-sm"><span className={`size-1.5 rounded-full ${position === "A" ? "bg-orange-300" : position === "C" ? "bg-amber-200" : position === "D" ? "bg-emerald-200" : "bg-sky-200"}`} />{POSITION_NAMES[position]} <span className="text-white/25">· {players.length}</span></div>
                        <div className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:gap-x-6 sm:gap-y-2">{players.map((player) => <PitchPlayer key={player.id} player={player} onSelect={setSelectedPlayer} />)}</div>
                      </div>
                    })}
                  </div>
                  <div className="absolute bottom-2 right-5 text-[8px] font-black uppercase tracking-[0.2em] text-white/20">A S TRONZO · {currentFormation.name}</div>
                </div>
              </section>

              <aside className="flex flex-col gap-3 lg:pt-0.5">
                <div className="flex items-center justify-between"><div><h2 className="text-xs font-black uppercase tracking-[0.15em]">La top XI</h2><p className="mt-1 text-[10px] text-white/40">Ordinata per xG stimato</p></div><span className="flex items-center gap-1 rounded-lg bg-lime-300/10 px-2 py-1 text-[9px] font-black text-lime-100"><Crown size={12} />{currentFormation.defense + currentFormation.midfield + currentFormation.attack + 1} TITOLARI</span></div>
                {(["A", "C", "D", "P"] as Position[]).flatMap((position) => lineup[position]).sort((a, b) => b.xg - a.xg).slice(0, 5).map((player, index) => (
                  <button type="button" key={player.id} onClick={() => setSelectedPlayer(player)} className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#111411] p-3 text-left transition hover:border-lime-300/20 hover:bg-[#151b14]">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.045] text-[10px] font-black text-white/45">{String(index + 1).padStart(2, "0")}</span>
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg border text-[9px] font-black ${POSITION_COLORS[player.position]}`}>{player.position}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-white/85">{player.name}</span><span className="block truncate text-[9px] text-white/35">{liveTeams[player.id] || player.team} · avv. demo {player.opponent}</span></span>
                    <span className="text-right"><span className="block text-[11px] font-black text-lime-200">{player.xg.toFixed(2)}</span><span className="text-[8px] uppercase tracking-widest text-white/30">xG</span></span>
                    <ChevronRight size={13} className="text-white/20 transition group-hover:translate-x-0.5 group-hover:text-lime-200" />
                  </button>
                ))}
                <div className="mt-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/55"><Shield size={13} className="text-lime-200" />Come leggere i consigli</div><p className="mt-2 text-[10px] leading-5 text-white/40">I titolari sono selezionati per ruolo e ordinati in base all&apos;xG stimato. Tocca un giocatore sul campo per il dettaglio.</p></div>
                <div className="flex items-start gap-2 px-1 text-[9px] leading-4 text-white/30"><Info size={12} className="mt-0.5 shrink-0" />TheSportsDB fornisce informazioni sulla squadra quando disponibili. xG, xA e hype sono stime indicative del modello demo.</div>
              </aside>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[9px] text-white/25"><span>Consigli indicativi, non garanzia di bonus.</span><span className="flex items-center gap-1.5"><Flame size={11} />FANTA VIBES</span></div>
          </div>
        </div>
      )}
      {selectedPlayer && <PlayerModal player={selectedPlayer} liveTeam={liveTeams[selectedPlayer.id]} onClose={() => setSelectedPlayer(null)} />}
    </main>
  )
}
