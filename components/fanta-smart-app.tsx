"use client"

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { createWorker } from "tesseract.js"
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Flame,
  Goal,
  ImagePlus,
  LoaderCircle,
  ScanLine,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  X,
  Zap,
} from "lucide-react"

type Role = "P" | "D" | "C" | "A"
type Player = {
  nome: string
  squadra: string
  ruolo: Role
  xG: number
  xA: number
  hype: number
  motivo: string
}

const playerPool: Player[] = [
  { nome: "Svilar", squadra: "Roma", ruolo: "P", xG: 0.04, xA: 0.02, hype: 68, motivo: "Portiere affidabile, con chance di porta inviolata." },
  { nome: "Mancini", squadra: "Roma", ruolo: "D", xG: 0.12, xA: 0.08, hype: 71, motivo: "Pericoloso sui calci piazzati e titolare fisso." },
  { nome: "Wesley", squadra: "Roma", ruolo: "D", xG: 0.18, xA: 0.24, hype: 77, motivo: "Spinge sulla fascia e accompagna spesso l'azione." },
  { nome: "Scalvini", squadra: "Atalanta", ruolo: "D", xG: 0.09, xA: 0.07, hype: 70, motivo: "Presenza solida e pericoloso nell'area avversaria." },
  { nome: "Zappacosta", squadra: "Atalanta", ruolo: "D", xG: 0.14, xA: 0.28, hype: 74, motivo: "Gli inserimenti e i cross alzano il suo potenziale assist." },
  { nome: "Calhanoglu", squadra: "Inter", ruolo: "C", xG: 0.35, xA: 0.42, hype: 91, motivo: "Rigorista dell'Inter, crea occasioni e ha un xA tra i più alti." },
  { nome: "Pellegrini", squadra: "Roma", ruolo: "C", xG: 0.22, xA: 0.31, hype: 79, motivo: "Qualità sui piazzati e ottimo coinvolgimento offensivo." },
  { nome: "Bernabè", squadra: "Parma", ruolo: "C", xG: 0.19, xA: 0.26, hype: 73, motivo: "Centrocampista creativo, spesso nel vivo delle azioni." },
  { nome: "Da Cunha", squadra: "Como", ruolo: "C", xG: 0.16, xA: 0.21, hype: 70, motivo: "Continuità e buoni numeri di partecipazione alla manovra." },
  { nome: "Soulé", squadra: "Roma", ruolo: "A", xG: 0.48, xA: 0.31, hype: 88, motivo: "Bonus in canna: ottimo xG e responsabilità sui piazzati." },
  { nome: "Castro S.", squadra: "Bologna", ruolo: "A", xG: 0.41, xA: 0.12, hype: 76, motivo: "Punta centrale con un buon volume di occasioni recenti." },
  { nome: "Diao", squadra: "Como", ruolo: "A", xG: 0.52, xA: 0.18, hype: 84, motivo: "Attaccante incisivo, con un volume di tiri da bonus." },
  { nome: "Boga", squadra: "Atalanta", ruolo: "A", xG: 0.25, xA: 0.17, hype: 72, motivo: "Uno contro uno e strappi: può creare occasioni dal nulla." },
]

const formations: Record<string, { D: number; C: number; A: number }> = {
  "3-4-3": { D: 3, C: 4, A: 3 },
  "3-5-2": { D: 3, C: 5, A: 2 },
  "4-3-3": { D: 4, C: 3, A: 3 },
  "4-4-2": { D: 4, C: 4, A: 2 },
  "4-5-1": { D: 4, C: 5, A: 1 },
  "5-3-2": { D: 5, C: 3, A: 2 },
  "5-4-1": { D: 5, C: 4, A: 1 },
}

const roleNames: Record<Role, string> = { P: "Portiere", D: "Difensore", C: "Centrocampista", A: "Attaccante" }
const roleColors: Record<Role, string> = {
  P: "text-amber-300 border-amber-300/35 bg-amber-300/10",
  D: "text-sky-300 border-sky-300/35 bg-sky-300/10",
  C: "text-emerald-300 border-emerald-300/35 bg-emerald-300/10",
  A: "text-rose-300 border-rose-300/35 bg-rose-300/10",
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
}

function matchPlayer(line: string) {
  const normalizedLine = normalize(line)
  return playerPool.find((player) => {
    const name = normalize(player.nome)
    if (normalizedLine.includes(name)) return true
    const tokens = name.split(" ").filter((token) => token.length > 2)
    return tokens.length > 0 && tokens.every((token) => normalizedLine.includes(token))
  })
}

export function FantaSmartApp() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [roster, setRoster] = useState<Player[]>([])
  const [formation, setFormation] = useState("4-3-3")
  const [view, setView] = useState<"home" | "lineup">("home")
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [status, setStatus] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const suggestedLineup = useMemo(() => {
    const starters: Record<Role, Player[]> = { P: [], D: [], C: [], A: [] }
    const shape = formations[formation]
    for (const role of ["P", "D", "C", "A"] as Role[]) {
      const limit = role === "P" ? 1 : shape[role]
      starters[role] = roster.filter((player) => player.ruolo === role).sort((a, b) => b.xG - a.xG).slice(0, limit)
    }
    return starters
  }, [formation, roster])

  const starters = Object.values(suggestedLineup).flat()
  const totalXg = starters.reduce((sum, player) => sum + player.xG, 0)
  const averageHype = starters.length ? Math.round(starters.reduce((sum, player) => sum + player.hype, 0) / starters.length) : 0

  async function processImage(file?: File) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setStatus("Scegli un file immagine per caricare la rosa.")
      return
    }
    setProgress(0)
    setStatus("Prepariamo la scansione della tua rosa…")
    let worker: Awaited<ReturnType<typeof createWorker>> | undefined
    try {
      worker = await createWorker("ita", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") setProgress(Math.round(message.progress * 100))
          if (message.status === "loading language traineddata") setStatus("Scarichiamo il riconoscimento italiano…")
          else if (message.status === "recognizing text") setStatus("Stiamo leggendo i nomi dei giocatori…")
        },
      })
      const result = await worker.recognize(file)
      const found = result.data.text.split(/\n/).map(matchPlayer).filter((player): player is Player => Boolean(player))
      const uniquePlayers = [...new Map(found.map((player) => [player.nome, player])).values()]
      if (!uniquePlayers.length) {
        setStatus("Non abbiamo trovato giocatori riconoscibili. Prova con uno screenshot più nitido.")
        return
      }
      setRoster(uniquePlayers)
      setStatus(`Rosa letta: ${uniquePlayers.length} giocatori riconosciuti.`)
    } catch {
      setStatus("Scansione non riuscita. Riprova con un'immagine più nitida.")
    } finally {
      await worker?.terminate()
      setProgress(null)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void processImage(event.target.files?.[0])
    event.target.value = ""
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDragging(false)
    void processImage(event.dataTransfer.files[0])
  }

  function useDemoRoster() {
    setRoster(playerPool)
    setStatus("Rosa demo pronta. Tocca un giocatore per i suoi numeri.")
  }

  return (
    <main className="min-h-screen bg-[#080b13] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,112,54,0.12),transparent_35%),radial-gradient(ellipse_at_bottom_left,rgba(44,116,255,0.09),transparent_34%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-4 sm:px-7 sm:pt-6 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/[0.08] pb-4 sm:pb-5">
          <a href="#home" onClick={(event) => { event.preventDefault(); setView("home") }} className="group flex items-center gap-3" aria-label="FantaSmart home">
            <span className="flex size-10 items-center justify-center rounded-[14px] bg-[#ff723e] text-[#17100b] shadow-[0_8px_28px_rgba(255,114,62,0.22)]"><Flame size={22} strokeWidth={2.7} /></span>
            <span className="flex flex-col leading-none"><span className="text-[17px] font-black tracking-[-0.07em]">FANTA<span className="text-[#ff8b59]">SMART</span></span><span className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">La tua marcia in più</span></span>
          </a>
          <div className="flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-[10px] font-semibold tracking-[0.04em] text-white/70 sm:px-4 sm:text-xs">
            <span className="size-1.5 rounded-full bg-[#b7f36b] shadow-[0_0_10px_#b7f36b]" /> CIALTRONS LEAGUE
          </div>
        </header>

        {view === "home" ? (
          <section className="flex flex-1 flex-col py-9 sm:py-12">
            <div className="mx-auto w-full max-w-3xl text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ff8b59]/20 bg-[#ff8b59]/[0.08] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#ff9c72] sm:text-[11px]">
                <Sparkles size={13} /> Consigli per la prossima giornata
              </div>
              <h1 className="text-balance text-[clamp(2.2rem,8vw,4.4rem)] font-black leading-[0.99] tracking-[-0.075em]">La formazione giusta.<br /><span className="text-[#ff8b59]">Meno intuito, più dati.</span></h1>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/50 sm:mt-5 sm:text-base">Carica uno screenshot della tua rosa e scopri chi schierare, modulo per modulo.</p>
            </div>

            <div className="mx-auto mt-8 grid w-full max-w-4xl gap-4 sm:mt-10 md:grid-cols-[1.25fr_0.75fr] md:gap-5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`group flex min-h-[236px] flex-col items-center justify-center rounded-[26px] border border-dashed px-5 py-7 text-center transition-all sm:min-h-[270px] sm:px-10 ${isDragging ? "border-[#ff8b59] bg-[#ff8b59]/10" : "border-white/[0.17] bg-[#11151e]/90 hover:border-[#ff8b59]/50 hover:bg-[#151922]"}`}
                aria-label="Carica screenshot della rosa"
              >
                <span className="mb-4 flex size-[58px] items-center justify-center rounded-[20px] border border-[#ff8b59]/20 bg-[#ff8b59]/10 text-[#ff8b59] transition-transform group-hover:scale-105"><ImagePlus size={25} /></span>
                <span className="text-lg font-extrabold tracking-tight sm:text-xl">Carica screenshot rosa</span>
                <span className="mt-1.5 text-xs text-white/45 sm:text-sm">PNG o JPG · trascina qui o scegli dal dispositivo</span>
                <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ff8b59] px-5 py-2.5 text-xs font-extrabold text-[#1a0f0a] shadow-[0_7px_22px_rgba(255,114,62,0.2)] transition-transform group-hover:-translate-y-0.5"><Upload size={14} /> Scegli screenshot <ArrowRight size={14} /></span>
              </button>

              <div className="flex flex-col justify-between rounded-[26px] border border-white/[0.08] bg-[#11151e]/85 p-5 sm:p-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/45"><ScanLine size={15} className="text-[#ff8b59]" /> Come funziona</div>
                  <ol className="mt-5 flex flex-col gap-4">
                    {["Carica la rosa della tua squadra", "L'AI riconosce i tuoi giocatori", "Scegli modulo e scopri i consigli"].map((step, index) => (
                      <li key={step} className="flex items-start gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[10px] font-black text-[#ff9c72]">0{index + 1}</span><span className="pt-1 text-xs leading-5 text-white/75">{step}</span></li>
                    ))}
                  </ol>
                </div>
                <button type="button" onClick={useDemoRoster} className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.09] bg-white/[0.035] px-3.5 py-3 text-left transition-colors hover:bg-white/[0.07]">
                  <span className="flex items-center gap-2 text-xs font-semibold text-white/70"><CircleHelp size={15} className="text-white/40" /> Vuoi dare un'occhiata?</span><span className="text-xs font-bold text-[#ff9c72]">Prova demo <ArrowRight size={13} className="ml-1 inline" /></span>
                </button>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" aria-label="Seleziona un'immagine della rosa" />

            {(progress !== null || status) && (
              <div className="mx-auto mt-4 flex w-full max-w-4xl items-center gap-3 rounded-2xl border border-white/[0.09] bg-[#11151e] px-4 py-3" role="status" aria-live="polite">
                {progress !== null ? <LoaderCircle size={17} className="shrink-0 animate-spin text-[#ff8b59]" /> : <Check size={17} className={`shrink-0 ${roster.length ? "text-[#b7f36b]" : "text-amber-300"}`} />}
                <div className="min-w-0 flex-1"><p className="text-xs text-white/75">{status}</p>{progress !== null && <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#ff8b59] transition-[width]" style={{ width: `${Math.max(progress, 3)}%` }} /></div>}</div>
                {progress !== null && <span className="text-[10px] tabular-nums text-white/45">{progress}%</span>}
              </div>
            )}

            {roster.length > 0 && (
              <div className="mx-auto mt-5 w-full max-w-4xl rounded-[24px] border border-white/[0.08] bg-[#11151e] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold">La tua rosa <span className="ml-1 text-white/40">{roster.length} giocatori</span></h2><p className="mt-1 text-[11px] text-white/40">Controlla i nomi riconosciuti prima dei consigli.</p></div><button type="button" onClick={() => fileInputRef.current?.click()} className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold text-white/75 hover:bg-white/[0.06]"><Upload size={12} /> Aggiorna</button></div>
                <div className="mt-4 flex flex-wrap gap-2">{roster.map((player) => <span key={player.nome} className={`rounded-full border px-2.5 py-1.5 text-[10px] font-semibold ${roleColors[player.ruolo]}`}>{player.nome}</span>)}</div>
                <button type="button" onClick={() => setView("lineup")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#b7f36b] py-3.5 text-sm font-black text-[#14200c] transition-transform hover:-translate-y-0.5">🔥 Genera i consigli <ArrowRight size={16} /></button>
              </div>
            )}

            <footer className="mt-auto pt-10 text-center text-[10px] text-white/25">I dati mostrati sono indicativi e a scopo di intrattenimento.</footer>
          </section>
        ) : (
          <section className="flex flex-1 flex-col pt-5 sm:pt-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => setView("home")} className="inline-flex items-center gap-2 text-xs font-semibold text-white/55 transition-colors hover:text-white"><ArrowLeft size={15} /> La mia rosa</button>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#b7f36b]/20 bg-[#b7f36b]/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[#b7f36b]"><span className="size-1.5 animate-pulse rounded-full bg-[#b7f36b]" /> Analisi attiva</div>
            </div>

            <div className="mt-5 flex flex-col gap-1 sm:mt-7"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff9c72]">La prossima giornata</p><div className="flex items-end justify-between gap-2"><h1 className="text-3xl font-black tracking-[-0.06em] sm:text-4xl">La tua formazione</h1><span className="pb-1 text-[10px] text-white/35">Tocca un giocatore per i dettagli</span></div></div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Scegli il modulo">
              {Object.keys(formations).map((module) => <button key={module} type="button" onClick={() => setFormation(module)} aria-pressed={formation === module} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors ${formation === module ? "border-[#ff8b59] bg-[#ff8b59] text-[#1a0f0a]" : "border-white/[0.09] bg-white/[0.035] text-white/60 hover:bg-white/[0.08]"}`}>{module}</button>)}
            </div>

            <div className="pitch relative mt-3 flex min-h-[510px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/15 px-4 py-5 shadow-[inset_0_0_60px_rgba(9,37,23,0.3)] sm:min-h-[590px] sm:px-8 sm:py-7">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="size-[138px] rounded-full border border-white/15 sm:size-[175px]" /></div>
              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/15" />
              <div className="pointer-events-none absolute inset-x-[14%] top-0 h-[16%] rounded-b-[45%] border-x border-b border-white/15" />
              <div className="pointer-events-none absolute inset-x-[14%] bottom-0 h-[16%] rounded-t-[45%] border-x border-t border-white/15" />
              <div className="relative z-10 flex min-h-[46px] justify-center"><PlayerDot player={suggestedLineup.P[0]} onSelect={setSelectedPlayer} /></div>
              <div className="relative z-10 flex min-h-[58px] items-center justify-around gap-1 sm:min-h-[70px]"><FormationRow players={suggestedLineup.D} onSelect={setSelectedPlayer} /></div>
              <div className="relative z-10 flex min-h-[58px] items-center justify-around gap-1 sm:min-h-[70px]"><FormationRow players={suggestedLineup.C} onSelect={setSelectedPlayer} /></div>
              <div className="relative z-10 flex min-h-[58px] items-center justify-around gap-1 sm:min-h-[70px]"><FormationRow players={suggestedLineup.A} onSelect={setSelectedPlayer} /></div>
              {starters.length === 0 && <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-xs text-white/60">Non ci sono ancora giocatori sufficienti per questo modulo.<br />Torna alla rosa per aggiungerne altri.</div>}
              <div className="absolute bottom-3 right-4 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/50"><span className="size-1.5 rounded-full bg-[#b7f36b]" /> Campo da gioco</div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
              <StatCard icon={<Target size={15} />} label="xG squadra" value={totalXg.toFixed(2)} accent="orange" />
              <StatCard icon={<TrendingUp size={15} />} label="Hype medio" value={`${averageHype}%`} accent="green" />
              <StatCard icon={<Trophy size={15} />} label="In campo" value={`${starters.length}/11`} accent="blue" />
            </div>

            <div className="mt-4 mb-8 flex items-start gap-3 rounded-2xl border border-[#ff8b59]/15 bg-[#ff8b59]/[0.07] p-4">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#ff8b59]/10 text-[#ff9c72]"><Zap size={16} /></span>
              <div className="min-w-0 flex-1"><p className="text-xs font-bold">La formazione che spinge</p><p className="mt-1 text-[11px] leading-5 text-white/50">Abbiamo ordinato i titolari per potenziale xG. Cambia modulo per trovare il miglior equilibrio tra attacco e copertura.</p></div>
              <ChevronDown size={15} className="mt-1 shrink-0 rotate-[-90deg] text-white/30" />
            </div>
          </section>
        )}
      </div>

      {selectedPlayer && <PlayerDialog player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </main>
  )
}

function FormationRow({ players, onSelect }: { players: Player[]; onSelect: (player: Player) => void }) {
  return <>{players.map((player) => <PlayerDot key={player.nome} player={player} onSelect={onSelect} />)}</>
}

function PlayerDot({ player, onSelect }: { player?: Player; onSelect: (player: Player) => void }) {
  if (!player) return null
  return (
    <button type="button" onClick={() => onSelect(player)} aria-label={`${player.nome}, ${roleNames[player.ruolo]}, xG ${player.xG.toFixed(2)}`} className="group flex min-w-0 flex-col items-center gap-1 transition-transform hover:-translate-y-1">
      <span className={`relative flex size-10 items-center justify-center rounded-full border-2 bg-[#101a14]/95 text-[9px] font-black shadow-[0_3px_12px_rgba(0,0,0,0.35)] sm:size-12 sm:text-[10px] ${player.ruolo === "P" ? "border-amber-300 text-amber-200" : player.ruolo === "D" ? "border-sky-300 text-sky-100" : player.ruolo === "C" ? "border-emerald-300 text-emerald-100" : "border-rose-300 text-rose-100"}`}><Shield size={15} className="absolute opacity-20" /><span className="relative">{player.nome.slice(0, 3).toUpperCase()}</span></span>
      <span className="max-w-[74px] truncate rounded bg-[#0a130d]/75 px-1.5 py-0.5 text-[9px] font-bold text-white sm:max-w-[94px] sm:text-[10px]">{player.nome}</span>
      <span className="flex items-center gap-0.5 text-[8px] font-semibold text-[#d0f39c] sm:text-[9px]"><Goal size={9} /> {player.xG.toFixed(2)} xG</span>
    </button>
  )
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: "orange" | "green" | "blue" }) {
  const colors = { orange: "text-[#ff9c72]", green: "text-[#b7f36b]", blue: "text-sky-300" }
  return <div className="rounded-2xl border border-white/[0.08] bg-[#11151e] px-3 py-3.5 sm:px-4"><div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/40 sm:text-[10px]`}>{icon}{label}</div><p className={`mt-2 text-xl font-black tracking-tight sm:text-2xl ${colors[accent]}`}>{value}</p></div>
}

function PlayerDialog({ player, onClose }: { player: Player; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="player-dialog-title" className="w-full max-w-md rounded-t-[28px] border border-white/10 bg-[#11151e] p-5 shadow-2xl sm:rounded-[28px] sm:p-6">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/20 sm:hidden" />
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff9c72]">{roleNames[player.ruolo]} · {player.squadra}</p><h2 id="player-dialog-title" className="mt-1 text-2xl font-black tracking-tight">{player.nome}</h2></div><button type="button" onClick={onClose} aria-label="Chiudi dettagli giocatore" className="rounded-full p-2 text-white/45 hover:bg-white/[0.08] hover:text-white"><X size={18} /></button></div>
        <div className="mt-5 grid grid-cols-3 gap-2"><Metric label="xG" value={player.xG.toFixed(2)} icon={<Goal size={13} />} /><Metric label="xA" value={player.xA.toFixed(2)} icon={<ArrowDownRight size={13} />} /><Metric label="Hype" value={`${player.hype}%`} icon={<Flame size={13} />} /></div>
        <div className="mt-4 rounded-2xl border border-sky-300/10 bg-sky-300/[0.06] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200/75">Perché schierarlo</p><p className="mt-2 text-sm leading-6 text-white/75">{player.motivo}</p></div>
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-full bg-white py-3 text-sm font-extrabold text-[#11151e] transition-colors hover:bg-white/85">Chiudi</button>
      </section>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl bg-[#090c12] px-3 py-3.5"><p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{icon}{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>
}
