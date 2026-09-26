'use client'

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react'
import { recognize } from 'tesseract.js'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  CircleHelp,
  Flame,
  Goal,
  ImagePlus,
  LoaderCircle,
  Plus,
  ScanLine,
  Search,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type Role = 'P' | 'D' | 'C' | 'A'
type Player = {
  name: string
  team: string
  role: Role
  xG: string
  xA: string
  hype: number
  note: string
}

type Formation = { defenders: number; midfielders: number; forwards: number }

type OCRState = { status: 'idle' | 'reading' | 'done' | 'error'; progress: number; message: string }

const catalog: Player[] = [
  { name: 'Svilar', team: 'Roma', role: 'P', xG: '0.02', xA: '0.04', hype: 72, note: 'Una scelta solida tra i pali, con una difesa che può regalare clean sheet.' },
  { name: 'Mancini', team: 'Roma', role: 'D', xG: '0.12', xA: '0.08', hype: 68, note: 'Presenza sui piazzati e tanta continuità: un profilo interessante da schierare.' },
  { name: 'Wesley', team: 'Roma', role: 'D', xG: '0.10', xA: '0.18', hype: 74, note: 'Spinta sulla fascia e possibilità di portare bonus con gli inserimenti.' },
  { name: 'Scalvini', team: 'Atalanta', role: 'D', xG: '0.16', xA: '0.05', hype: 76, note: 'Fisico e pericoloso sui calci piazzati. Occhio al minutaggio dopo il rientro.' },
  { name: 'Zappacosta', team: 'Atalanta', role: 'D', xG: '0.09', xA: '0.21', hype: 78, note: 'Quinto di spinta: il suo contributo offensivo alza il potenziale.' },
  { name: 'Calhanoglu', team: 'Inter', role: 'C', xG: '0.35', xA: '0.42', hype: 91, note: 'Qualità sui piazzati e coinvolgimento costante nella manovra offensiva.' },
  { name: 'Pellegrini', team: 'Roma', role: 'C', xG: '0.24', xA: '0.28', hype: 80, note: 'Trequartista tecnico, con spazio per incidere sia al tiro sia nell\'ultimo passaggio.' },
  { name: 'Bernabè', team: 'Parma', role: 'C', xG: '0.20', xA: '0.24', hype: 75, note: 'Buon mix di inserimenti e rifinitura. Opzione da monitorare.' },
  { name: 'Da Cunha', team: 'Como', role: 'C', xG: '0.18', xA: '0.22', hype: 73, note: 'Centrocampista dinamico che può portare assist e tiri dalla distanza.' },
  { name: 'Soulé', team: 'Roma', role: 'A', xG: '0.48', xA: '0.31', hype: 88, note: 'Creatività e conclusioni: profilo offensivo dal buon potenziale bonus.' },
  { name: 'Castro S.', team: 'Bologna', role: 'A', xG: '0.41', xA: '0.12', hype: 76, note: 'Punta generosa, spesso coinvolta nell\'area. Una scelta da schierare con fiducia.' },
  { name: 'Diao', team: 'Como', role: 'A', xG: '0.52', xA: '0.18', hype: 84, note: 'Attaccante rapido con istinto per la porta: un nome intrigante per la giornata.' },
  { name: 'Boga', team: 'Atalanta', role: 'A', xG: '0.26', xA: '0.20', hype: 70, note: 'Dribbling e imprevedibilità: può accendere la partita partendo largo.' },
]

const demoNames = ['Svilar', 'Mancini', 'Wesley', 'Scalvini', 'Zappacosta', 'Calhanoglu', 'Pellegrini', 'Bernabè', 'Soulé', 'Castro S.', 'Diao']
const formations: Record<string, Formation> = {
  '3-4-3': { defenders: 3, midfielders: 4, forwards: 3 },
  '3-5-2': { defenders: 3, midfielders: 5, forwards: 2 },
  '4-3-3': { defenders: 4, midfielders: 3, forwards: 3 },
  '4-4-2': { defenders: 4, midfielders: 4, forwards: 2 },
  '4-5-1': { defenders: 4, midfielders: 5, forwards: 1 },
  '5-3-2': { defenders: 5, midfielders: 3, forwards: 2 },
  '5-4-1': { defenders: 5, midfielders: 4, forwards: 1 },
}
const roleNames: Record<Role, string> = { P: 'Portiere', D: 'Difensore', C: 'Centrocampista', A: 'Attaccante' }
const roleStyles: Record<Role, string> = {
  P: 'border-vibe-orange text-vibe-orange',
  D: 'border-sky-300 text-sky-200',
  C: 'border-vibe-lime text-vibe-lime',
  A: 'border-rose-300 text-rose-200',
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function levenshtein(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0]
    previous[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j]
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1))
      diagonal = above
    }
  }
  return previous[right.length]
}

function getOCRMatches(text: string) {
  const lines = text.split(/\n+/).map(normalize).filter((line) => line.length > 2)
  return catalog.filter((player) => {
    const name = normalize(player.name)
    const nameParts = name.split(' ')
    return lines.some((line) => {
      if (line.includes(name)) return true
      const words = line.split(' ')
      const maxWords = Math.min(words.length, Math.max(1, nameParts.length + 1))
      for (let start = 0; start < words.length; start += 1) {
        for (let count = 1; count <= maxWords && start + count <= words.length; count += 1) {
          const phrase = words.slice(start, start + count).join(' ')
          if (phrase.length < 4) continue
          if (levenshtein(name, phrase) / Math.max(name.length, phrase.length) < 0.27) return true
        }
      }
      return false
    })
  })
}

function PlayerAvatar({ player, compact = false }: { player: Player; compact?: boolean }) {
  return (
    <span className={`player-avatar ${compact ? 'size-9 text-[10px]' : 'size-11 text-xs'} ${roleStyles[player.role]}`} aria-hidden="true">
      {player.name.slice(0, 3).toUpperCase()}
    </span>
  )
}

function RosterCard({ player, onSelect, onRemove }: { player: Player; onSelect: () => void; onRemove?: () => void }) {
  return (
    <article className="group flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3 transition hover:border-white/[0.14] hover:bg-white/[0.055]">
      <button className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vibe-orange" onClick={onSelect} aria-label={`Apri statistiche di ${player.name}`}>
        <PlayerAvatar player={player} compact />
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-white">{player.name}</span>
          <span className="mt-0.5 block truncate text-[10px] text-white/45">{player.team} · {player.role}</span>
        </span>
      </button>
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label={`Rimuovi ${player.name} dalla rosa`} className="grid size-7 shrink-0 place-items-center rounded-full text-white/35 opacity-100 transition hover:bg-white/10 hover:text-white sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vibe-orange">
          <X aria-hidden="true" />
        </button>
      ) : (
        <button type="button" onClick={onSelect} aria-label={`Apri statistiche di ${player.name}`} className="grid size-7 shrink-0 place-items-center rounded-full text-white/35 transition hover:bg-white/10 hover:text-vibe-orange">
          <ArrowRight aria-hidden="true" />
        </button>
      )}
    </article>
  )
}

function PitchPlayer({ player, onSelect }: { player: Player; onSelect: (player: Player) => void }) {
  return (
    <button onClick={() => onSelect(player)} aria-label={`${player.name}, ${roleNames[player.role]}. Apri dettagli`} className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-1 text-center transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
      <span className={`grid size-10 place-items-center rounded-full border-2 bg-[#101b14] text-[9px] font-extrabold shadow-[0_4px_16px_rgba(0,0,0,0.35)] sm:size-12 sm:text-[10px] ${roleStyles[player.role]}`}>
        {player.name.slice(0, 3).toUpperCase()}
      </span>
      <span className="max-w-[68px] truncate text-[9px] font-semibold text-white sm:max-w-[86px] sm:text-[10px]">{player.name}</span>
      <span className="-mt-1 text-[8px] text-white/60">xG {player.xG}</span>
    </button>
  )
}

function PlayerDialog({ player, onClose }: { player: Player | null; onClose: () => void }) {
  useEffect(() => {
    if (!player) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [player, onClose])

  if (!player) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-[3px] sm:items-center" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="player-dialog-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#171922] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <PlayerAvatar player={player} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{roleNames[player.role]} · {player.team}</p>
              <h2 id="player-dialog-title" className="mt-1 text-2xl font-black tracking-tight">{player.name}</h2>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Chiudi dettagli" onClick={onClose} className="rounded-full text-white/60 hover:bg-white/10 hover:text-white">
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/[0.06] bg-black/25 p-3 text-center"><Target className="mx-auto text-vibe-lime" aria-hidden="true" /><p className="mt-2 text-[10px] text-white/45">xG stimati</p><p className="text-lg font-extrabold">{player.xG}</p></div>
          <div className="rounded-2xl border border-white/[0.06] bg-black/25 p-3 text-center"><TrendingUp className="mx-auto text-sky-300" aria-hidden="true" /><p className="mt-2 text-[10px] text-white/45">xA stimati</p><p className="text-lg font-extrabold">{player.xA}</p></div>
          <div className="rounded-2xl border border-white/[0.06] bg-black/25 p-3 text-center"><Flame className="mx-auto text-vibe-orange" aria-hidden="true" /><p className="mt-2 text-[10px] text-white/45">Indice hype</p><p className="text-lg font-extrabold">{player.hype}<span className="text-xs text-white/40">/100</span></p></div>
        </div>
        <div className="mt-4 rounded-2xl border border-vibe-orange/15 bg-vibe-orange/[0.06] p-4">
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.17em] text-vibe-orange">La dritta</p>
          <p className="text-sm leading-relaxed text-white/80">{player.note}</p>
        </div>
        <p className="mt-4 text-center text-[10px] leading-relaxed text-white/35">Statistiche e consigli dimostrativi, non aggiornati in tempo reale.</p>
      </section>
    </div>
  )
}

export function FantaVibesApp() {
  const [screen, setScreen] = useState<'home' | 'lineup'>('home')
  const [roster, setRoster] = useState<Player[]>(() => demoNames.flatMap((name) => {
    const player = catalog.find((candidate) => candidate.name === name)
    return player ? [player] : []
  }))
  const [formation, setFormation] = useState('4-3-3')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [search, setSearch] = useState('')
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [ocr, setOcr] = useState<OCRState>({ status: 'idle', progress: 0, message: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentFormation = formations[formation]
  const availablePlayers = useMemo(() => {
    const query = normalize(search)
    return catalog.filter((player) => !roster.some((member) => member.name === player.name) && (!query || normalize(`${player.name} ${player.team} ${roleNames[player.role]}`).includes(query))).slice(0, 4)
  }, [roster, search])
  const rankedRoster = useMemo(() => [...roster].sort((a, b) => Number(b.xG) - Number(a.xG)), [roster])
  const defenders = rankedRoster.filter((player) => player.role === 'D').slice(0, currentFormation.defenders)
  const midfielders = rankedRoster.filter((player) => player.role === 'C').slice(0, currentFormation.midfielders)
  const forwards = rankedRoster.filter((player) => player.role === 'A').slice(0, currentFormation.forwards)
  const goalkeeper = roster.find((player) => player.role === 'P')
  const outOfPosition = Math.max(0, roster.length - 1 - currentFormation.defenders - currentFormation.midfielders - currentFormation.forwards - Math.max(0, roster.filter((player) => player.role === 'D').length - currentFormation.defenders) - Math.max(0, roster.filter((player) => player.role === 'C').length - currentFormation.midfielders) - Math.max(0, roster.filter((player) => player.role === 'A').length - currentFormation.forwards))

  useEffect(() => {
    if (!fileUrl) return
    return () => URL.revokeObjectURL(fileUrl)
  }, [fileUrl])

  function addPlayer(player: Player) {
    setRoster((current) => current.some((member) => member.name === player.name) ? current : [...current, player])
    setSearch('')
  }

  function removePlayer(name: string) {
    setRoster((current) => current.filter((player) => player.name !== name))
  }

  async function processFile(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setOcr({ status: 'error', progress: 0, message: 'Scegli un file immagine in formato JPG, PNG o WEBP.' })
      return
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl)
    setFileUrl(URL.createObjectURL(file))
    setOcr({ status: 'reading', progress: 0, message: 'Preparo lo scanner…' })
    try {
      const result = await recognize(file, 'ita', {
        logger: ({ status, progress }) => {
          setOcr({ status: 'reading', progress: Math.round((progress || 0) * 100), message: status || 'Leggo i nomi della rosa…' })
        },
      })
      const matches = getOCRMatches(result.data.text)
      if (matches.length === 0) {
        setOcr({ status: 'done', progress: 100, message: 'Non ho trovato nomi riconoscibili. Prova uno screenshot più nitido o aggiungili dalla ricerca.' })
        return
      }
      setRoster(matches)
      setOcr({ status: 'done', progress: 100, message: `Trovati ${matches.length} ${matches.length === 1 ? 'giocatore' : 'giocatori'}. Puoi modificare la rosa qui sotto.` })
    } catch {
      setOcr({ status: 'error', progress: 0, message: 'Scansione non riuscita. Riprova con un\'immagine più chiara o aggiungi i giocatori manualmente.' })
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void processFile(event.target.files?.[0])
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    void processFile(event.dataTransfer.files?.[0])
  }

  const selectedCount = roster.length
  const eligibleCount = (goalkeeper ? 1 : 0) + defenders.length + midfielders.length + forwards.length
  const allFormats = Object.keys(formations)

  return (
    <main className="min-h-screen overflow-hidden bg-vibe-night text-white">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
        <div className="ambient-glow absolute -right-44 -top-48 size-[30rem] rounded-full bg-vibe-orange/10 blur-[120px]" />
        <div className="ambient-glow absolute -bottom-64 -left-40 size-[28rem] rounded-full bg-vibe-lime/[0.055] blur-[120px]" />
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-8 pt-4 sm:px-7 sm:pt-6 lg:px-10">
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-4 sm:pb-5">
          <button className="flex items-center gap-2.5 text-left" type="button" onClick={() => setScreen('home')} aria-label="Fanta Vibes, torna alla home">
            <span className="grid size-9 place-items-center rounded-xl bg-vibe-orange text-vibe-night shadow-[0_4px_20px_rgba(255,124,69,0.22)]"><Goal aria-hidden="true" /></span>
            <span><span className="block text-sm font-black leading-none tracking-[-0.04em] sm:text-base">fanta<span className="text-vibe-orange">vibes</span></span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">il tuo sesto senso</span></span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-bold tracking-wide text-white/55 sm:inline-flex"><Trophy className="mr-1.5 size-3.5 text-vibe-orange" aria-hidden="true" />Cialtrons League</span>
            <nav aria-label="Navigazione principale" className="flex rounded-full border border-white/[0.08] bg-white/[0.035] p-1">
              <button type="button" onClick={() => setScreen('home')} aria-current={screen === 'home' ? 'page' : undefined} className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition sm:px-4 sm:text-xs ${screen === 'home' ? 'bg-white text-vibe-night' : 'text-white/50 hover:text-white'}`}>La tua rosa</button>
              <button type="button" onClick={() => setScreen('lineup')} aria-current={screen === 'lineup' ? 'page' : undefined} className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition sm:px-4 sm:text-xs ${screen === 'lineup' ? 'bg-white text-vibe-night' : 'text-white/50 hover:text-white'}`}>Formazione</button>
            </nav>
          </div>
        </header>

        {screen === 'home' ? (
          <div className="flex-1 py-5 sm:py-9">
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(330px,0.88fr)] lg:gap-8">
              <div className="flex flex-col justify-center">
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-vibe-orange/20 bg-vibe-orange/[0.07] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-vibe-orange"><Sparkles aria-hidden="true" /> La tua stagione, un\'altra storia</div>
                <h1 className="mt-4 max-w-xl text-[clamp(2.35rem,8vw,4.5rem)] font-black leading-[0.96] tracking-[-0.065em]">Schiera di <span className="text-vibe-orange">pancia.</span><br />Ma scegli di testa.</h1>
                <p className="mt-3 max-w-lg text-xs leading-relaxed text-white/50 sm:text-sm">Carica la tua rosa, scegli il modulo e trova la dritta giusta per la prossima giornata.</p>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-white/45"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5"><ScanLine className="size-3.5 text-vibe-lime" aria-hidden="true" />Riconoscimento automatico</span><span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5"><Shield className="size-3.5 text-sky-300" aria-hidden="true" />La rosa resta nel browser</span></div>
              </div>

              <section aria-labelledby="upload-title" onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`relative overflow-hidden rounded-[26px] border p-4 transition sm:rounded-[30px] sm:p-5 ${isDragging ? 'border-vibe-orange bg-vibe-orange/[0.08]' : 'border-white/[0.09] bg-[#141720]/90'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-vibe-orange">Partiamo dalla tua squadra</p><h2 id="upload-title" className="mt-1 text-base font-extrabold tracking-tight sm:text-lg">Importa la tua rosa</h2></div>
                  <span className="grid size-9 place-items-center rounded-xl bg-vibe-orange/[0.12] text-vibe-orange"><ImagePlus aria-hidden="true" /></span>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-black/15 p-3 sm:gap-4 sm:p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {fileUrl ? <img src={fileUrl} alt="Anteprima dello screenshot della rosa" className="size-12 rounded-xl border border-white/10 object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-white/60"><Camera aria-hidden="true" /></span>}
                    <div className="min-w-0"><p className="truncate text-xs font-bold">Screenshot della rosa</p><p className="mt-1 text-[10px] text-white/40">JPG, PNG o WEBP · tutto resta privato</p></div>
                  </div>
                  <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={ocr.status === 'reading'} className="rounded-full bg-vibe-orange px-3 text-[10px] font-extrabold text-vibe-night hover:bg-vibe-orange/90 sm:px-4 sm:text-xs"><Upload data-icon="inline-start" aria-hidden="true" />Scegli file</Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" aria-label="Seleziona lo screenshot della rosa" onChange={handleFileChange} />
                </div>
                <div className="mt-3 flex min-h-8 items-center gap-2" aria-live="polite" aria-atomic="true">
                  {ocr.status === 'reading' ? <><LoaderCircle className="size-3.5 shrink-0 animate-spin text-vibe-orange" aria-hidden="true" /><p className="min-w-0 text-[10px] text-white/60">{ocr.message} <span className="font-bold text-vibe-orange">{ocr.progress}%</span></p></> : ocr.status === 'done' ? <><Check className="size-3.5 shrink-0 text-vibe-lime" aria-hidden="true" /><p className="text-[10px] text-white/60">{ocr.message}</p></> : ocr.status === 'error' ? <><CircleHelp className="size-3.5 shrink-0 text-rose-300" aria-hidden="true" /><p className="text-[10px] text-rose-200">{ocr.message}</p></> : <p className="text-[10px] text-white/35">Oppure trascina qui lo screenshot. Riconosciamo i nomi, poi li puoi correggere.</p>}
                </div>
                {ocr.status === 'reading' && <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-vibe-orange transition-all" style={{ width: `${ocr.progress}%` }} /></div>}
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3">
                  <span className="text-[10px] text-white/45">Giocatori in rosa</span><span className="text-xs font-extrabold"><span className="text-vibe-lime">{selectedCount}</span><span className="text-white/40"> / 25</span></span>
                </div>
              </section>
            </section>

            <section aria-labelledby="roster-heading" className="mt-7 sm:mt-10">
              <div className="flex items-end justify-between gap-4">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.17em] text-white/35">La tua squadra</p><h2 id="roster-heading" className="mt-1 text-lg font-extrabold tracking-tight">La rosa <span className="text-white/35">({selectedCount})</span></h2></div>
                <Button type="button" onClick={() => setScreen('lineup')} variant="ghost" className="h-8 rounded-full px-3 text-[10px] font-bold text-vibe-orange hover:bg-vibe-orange/10 hover:text-vibe-orange">Vedi formazione <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {roster.length ? roster.slice(0, 4).map((player) => <RosterCard key={player.name} player={player} onSelect={() => setSelectedPlayer(player)} />) : <div className="col-span-full rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/45">La rosa è vuota. Importa lo screenshot o aggiungi un giocatore qui sotto.</div>}
                {roster.length > 4 && <button type="button" onClick={() => setScreen('lineup')} className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 px-3 text-[10px] font-bold text-white/45 transition hover:border-vibe-orange/30 hover:text-vibe-orange"><Plus aria-hidden="true" />{roster.length - 4} altri in rosa <ArrowRight aria-hidden="true" /></button>}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="player-search" className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" aria-hidden="true" />
                  <input id="player-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Aggiungi un giocatore alla rosa…" className="h-10 w-full rounded-xl border border-white/[0.09] bg-[#141720] pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-vibe-orange/50 focus:ring-2 focus:ring-vibe-orange/10" />
                </label>
                {search && <div className="flex flex-wrap gap-2" aria-live="polite">{availablePlayers.length ? availablePlayers.map((player) => <button type="button" key={player.name} onClick={() => addPlayer(player)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[10px] font-semibold text-white/75 transition hover:border-vibe-orange/50 hover:text-vibe-orange"><Plus aria-hidden="true" />{player.name} <span className="text-white/35">· {player.team}</span></button>) : <span className="self-center text-[10px] text-white/40">Nessun giocatore disponibile con questo nome.</span>}</div>}
              </div>
              {roster.length > 4 && <p className="mt-3 text-[10px] text-white/30">Tocca "Formazione" per visualizzare e modificare tutti i giocatori.</p>}
            </section>

            <section className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"><span className="grid size-9 place-items-center rounded-xl bg-vibe-lime/[0.09] text-vibe-lime"><Target aria-hidden="true" /></span><span><span className="block text-[10px] text-white/40">Modulo consigliato</span><span className="text-xs font-extrabold">{formation} <span className="text-white/35">· {eligibleCount}/11 in campo</span></span></span></div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"><span className="grid size-9 place-items-center rounded-xl bg-vibe-orange/[0.09] text-vibe-orange"><Flame aria-hidden="true" /></span><span><span className="block text-[10px] text-white/40">Indice hype medio</span><span className="text-xs font-extrabold">{roster.length ? Math.round(roster.reduce((total, player) => total + player.hype, 0) / roster.length) : '—'}<span className="text-white/35">/100</span></span></span></div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"><span className="grid size-9 place-items-center rounded-xl bg-sky-300/[0.09] text-sky-200"><Sparkles aria-hidden="true" /></span><span><span className="block text-[10px] text-white/40">Consigli & statistiche</span><span className="text-xs font-extrabold">Dati dimostrativi</span></span></div>
            </section>
          </div>
        ) : (
          <div className="flex-1 py-4 sm:py-7">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div><button type="button" onClick={() => setScreen('home')} className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold text-white/45 hover:text-white"><ArrowLeft aria-hidden="true" /> La tua rosa</button><h1 className="text-xl font-black tracking-tight sm:text-2xl">La formazione <span className="text-vibe-orange">giusta</span></h1></div>
              <span className="hidden items-center gap-1.5 rounded-full border border-vibe-lime/15 bg-vibe-lime/[0.06] px-3 py-1.5 text-[9px] font-bold text-vibe-lime sm:inline-flex"><Sparkles aria-hidden="true" />Suggerimenti demo</span>
            </div>
            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="Scegli modulo">
              {allFormats.map((format) => <button type="button" key={format} onClick={() => setFormation(format)} aria-pressed={formation === format} className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-extrabold transition sm:px-4 sm:text-xs ${formation === format ? 'bg-vibe-orange text-vibe-night' : 'border border-white/[0.08] bg-white/[0.035] text-white/55 hover:text-white'}`}>{format}</button>)}
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:gap-5">
              <section aria-label={`Campo, modulo ${formation}`} className="football-pitch relative flex min-h-[370px] flex-col justify-between overflow-hidden rounded-[24px] border border-white/15 px-2 py-3 shadow-inner sm:min-h-[430px] sm:px-5 sm:py-5">
                <div className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 sm:size-32" aria-hidden="true" />
                <div className="pointer-events-none absolute left-0 right-0 top-1/2 border-t border-white/15" aria-hidden="true" />
                <div className="relative z-10 flex justify-center">{goalkeeper ? <PitchPlayer player={goalkeeper} onSelect={setSelectedPlayer} /> : <div className="grid size-10 place-items-center rounded-full border border-dashed border-white/40 text-[9px] font-bold text-white/50">POR</div>}</div>
                <div className="relative z-10 flex justify-around gap-0.5">{defenders.length ? defenders.map((player) => <PitchPlayer key={player.name} player={player} onSelect={setSelectedPlayer} />) : <EmptyLine text="Aggiungi difensori" />}</div>
                <div className="relative z-10 flex justify-around gap-0.5">{midfielders.length ? midfielders.map((player) => <PitchPlayer key={player.name} player={player} onSelect={setSelectedPlayer} />) : <EmptyLine text="Aggiungi centrocampisti" />}</div>
                <div className="relative z-10 flex justify-around gap-0.5">{forwards.length ? forwards.map((player) => <PitchPlayer key={player.name} player={player} onSelect={setSelectedPlayer} />) : <EmptyLine text="Aggiungi attaccanti" />}</div>
                <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.22em] text-white/20">FANTA VIBES · MATCHDAY</span>
              </section>
              <aside className="flex flex-col gap-3">
                <section className="rounded-[22px] border border-white/[0.08] bg-[#141720] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">La tua tattica</p><h2 className="mt-1 text-lg font-black">{formation} <span className="text-xs font-semibold text-white/45">· formazione</span></h2></div><span className="grid size-9 place-items-center rounded-xl bg-vibe-lime/[0.09] text-vibe-lime"><Shield aria-hidden="true" /></span></div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-black/20 p-2"><span className="block text-lg font-black text-vibe-lime">{eligibleCount}</span><span className="text-[9px] text-white/40">in campo</span></div><div className="rounded-xl bg-black/20 p-2"><span className="block text-lg font-black text-vibe-orange">{selectedCount}</span><span className="text-[9px] text-white/40">in rosa</span></div><div className="rounded-xl bg-black/20 p-2"><span className="block text-lg font-black text-sky-200">{roster.filter((player) => player.role === 'P').length}</span><span className="text-[9px] text-white/40">portieri</span></div></div>
                  {!goalkeeper && <p className="mt-3 rounded-xl bg-vibe-orange/[0.08] p-2.5 text-[10px] text-vibe-orange">Manca un portiere: aggiungilo per completare la formazione.</p>}
                  <p className="mt-3 text-[10px] leading-relaxed text-white/40">{outOfPosition ? `${outOfPosition} ${outOfPosition === 1 ? 'giocatore' : 'giocatori'} non mostrati nel modulo selezionato.` : 'Tocca un giocatore sul campo per vedere statistiche e consiglio.'}</p>
                </section>
                <section className="rounded-[22px] border border-vibe-orange/15 bg-gradient-to-br from-vibe-orange/[0.09] to-[#141720] p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-vibe-orange"><Sparkles aria-hidden="true" /><h2 className="text-xs font-extrabold">La dritta della giornata</h2></div>
                  {rankedRoster.length ? <button type="button" onClick={() => setSelectedPlayer(rankedRoster.find((player) => player.role === 'A') || rankedRoster[0])} className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/15 p-3 text-left transition hover:border-vibe-orange/30"><span className="flex min-w-0 items-center gap-2.5"><PlayerAvatar player={rankedRoster.find((player) => player.role === 'A') || rankedRoster[0]} compact /><span className="min-w-0"><span className="block truncate text-xs font-extrabold">Punta su { (rankedRoster.find((player) => player.role === 'A') || rankedRoster[0]).name }</span><span className="mt-1 block text-[9px] leading-relaxed text-white/45">Tra i tuoi, il profilo offensivo con l\'indice hype più alto.</span></span></span><ArrowRight className="shrink-0 text-white/40" aria-hidden="true" /></button> : <p className="mt-3 text-xs text-white/45">Aggiungi giocatori per ricevere suggerimenti.</p>}
                  <p className="mt-3 text-[9px] text-white/30">Analisi dimostrativa · nessun dato live</p>
                </section>
                <section className="rounded-[22px] border border-white/[0.08] bg-[#141720] p-4 sm:p-5">
                  <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">Riepilogo rosa</p><h2 className="mt-1 text-sm font-extrabold">Scegli chi schierare</h2></div><span className="text-[10px] font-bold text-white/35">{selectedCount} giocatori</span></div>
                  <div className="mt-3 flex flex-col gap-1.5">{roster.length ? roster.map((player) => <RosterCard key={player.name} player={player} onSelect={() => setSelectedPlayer(player)} onRemove={() => removePlayer(player.name)} />) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-white/40">La rosa è vuota: torna alla pagina iniziale per importare i tuoi giocatori.</p>}</div>
                </section>
              </aside>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[9px] leading-relaxed text-white/30"><CircleHelp aria-hidden="true" />Le statistiche e i suggerimenti sono esempi, non aggiornati in tempo reale. Verifica sempre le probabili formazioni.</p>
          </div>
        )}
        <footer className="mt-auto border-t border-white/[0.07] pt-4 text-center text-[9px] text-white/30">Fanta Vibes <span className="px-1.5 text-white/15">/</span> Compagni di panchina, mai al posto tuo.</footer>
      </div>
      <PlayerDialog player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </main>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <span className="rounded-full border border-dashed border-white/30 bg-black/10 px-3 py-2 text-[9px] font-semibold text-white/55">{text}</span>
}

export default FantaVibesApp
