"use client"
// playersData fallback to local DB
const importedPlayersData: Player[] = []
import { useEffect, useMemo, useRef, useState } from "react"
import type { ChangeEvent, CSSProperties } from "react"
import Image from "next/image"
import { read as readWorkbook, utils as workbookUtils } from "xlsx"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FileSpreadsheet,
  Flame,
  LoaderCircle,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  Sun,
  Moon,
  Sparkles,
  Target,
  TriangleAlert,
  Users,
  X,
} from "lucide-react"
type Position = "P" | "D" | "C" | "A"
type Mode = "Classic" | "Mantra"
type Page = "home" | "roster" | "formation"
type Theme = "light" | "dark"
type Player = {
  id: string
  name: string
  team: string
  position: Position
  mantraRoles: string[]
  titolarita: number
  hype: number
  mv: number
  mvSource?: "fantacalcio"
  mvSeason?: string
  officialStats?: OfficialStats
  statsSeason?: string
  recentMatches?: RecentMatchRating[]
  inj: boolean
  suspended?: boolean
  reason: string
  opponent: string
}
type OfficialStats = {
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
type RecentMatchRating = {
  matchday: number
  rating: number
  fantasyRating?: number
  goals?: number
  assists?: number
}
type Formation = { name: string; defense: number; midfield: number; attack: number }
type Lineup = Record<Position, Player[]>
const STORAGE_KEY = "fanta-vibes-v5"
const LEGACY_STORAGE_KEY = "fanta-vibes-v4"
const PLAYER_DB: Player[] = [
  { id: "svilar", name: "Svilar", team: "Roma", position: "P", mantraRoles: ["Por"], titolarita: 95, hype: 77, mv: 6.45, inj: false, reason: "Riferimento affidabile tra i pali, con buone possibilità di voto e interventi decisivi.", opponent: "Torino" },
  { id: "sommer", name: "Sommer", team: "Inter", position: "P", mantraRoles: ["Por"], titolarita: 94, hype: 74, mv: 6.52, inj: false, reason: "Difesa solida alle spalle e ottima continuità di rendimento.", opponent: "Lazio" },
  { id: "maignan", name: "Maignan", team: "Milan", position: "P", mantraRoles: ["Por"], titolarita: 91, hype: 82, mv: 6.48, inj: false, reason: "Il suo potenziale tra i pali rende interessante anche una partita equilibrata.", opponent: "Bologna" },
  { id: "mancini", name: "Mancini", team: "Roma", position: "D", mantraRoles: ["Dc"], titolarita: 91, hype: 70, mv: 6.35, inj: false, reason: "Pericoloso sui piazzati, con una buona base voto e minutaggio costante.", opponent: "Torino" },
  { id: "bastoni", name: "Bastoni", team: "Inter", position: "D", mantraRoles: ["Dc", "Ds"], titolarita: 93, hype: 81, mv: 6.58, inj: false, reason: "La qualità in impostazione crea occasioni da assist oltre a una media voto solida.", opponent: "Lazio" },
  { id: "dilorenzo", name: "Di Lorenzo", team: "Napoli", position: "D", mantraRoles: ["Dd", "E"], titolarita: 90, hype: 78, mv: 6.47, inj: false, reason: "Spinge con continuità e accompagna spesso l'azione offensiva.", opponent: "Udinese" },
  { id: "cambiaso", name: "Cambiaso", team: "Juventus", position: "D", mantraRoles: ["Dd", "Ds", "E"], titolarita: 84, hype: 76, mv: 6.38, inj: false, reason: "La duttilità e la partecipazione alla manovra aumentano le occasioni da bonus.", opponent: "Genoa" },
  { id: "dimarco", name: "Dimarco", team: "Inter", position: "D", mantraRoles: ["Ds", "E"], titolarita: 90, hype: 92, mv: 6.75, inj: false, reason: "Cross, piazzati e conclusioni: profilo difensivo con upside offensivo notevole.", opponent: "Lazio" },
  { id: "zappacosta", name: "Zappacosta", team: "Atalanta", position: "D", mantraRoles: ["E", "Dd"], titolarita: 74, hype: 75, mv: 6.32, inj: false, reason: "Quinto di spinta che può arrivare al cross e alla conclusione.", opponent: "Fiorentina" },
  { id: "scalvini", name: "Scalvini", team: "Atalanta", position: "D", mantraRoles: ["Dc"], titolarita: 68, hype: 64, mv: 6.20, inj: true, reason: "Buon potenziale sui piazzati, ma la condizione fisica richiede attenzione.", opponent: "Fiorentina" },
  { id: "buongiorno", name: "Buongiorno", team: "Napoli", position: "D", mantraRoles: ["Dc"], titolarita: 85, hype: 72, mv: 6.39, inj: false, reason: "Difensore centrale regolare, con presenza in area sulle palle inattive.", opponent: "Udinese" },
  { id: "calhanoglu", name: "Calhanoglu", team: "Inter", position: "C", mantraRoles: ["M", "C"], titolarita: 93, hype: 89, mv: 6.71, inj: false, reason: "Rigori e calci piazzati aggiungono un alto potenziale di bonus.", opponent: "Lazio" },
  { id: "barella", name: "Barella", team: "Inter", position: "C", mantraRoles: ["M", "C"], titolarita: 92, hype: 84, mv: 6.57, inj: false, reason: "Volume di gioco e inserimenti continui: affidabile per voto e bonus.", opponent: "Lazio" },
  { id: "pellegrini", name: "Pellegrini", team: "Roma", position: "C", mantraRoles: ["C", "T"], titolarita: 79, hype: 82, mv: 6.52, inj: false, reason: "Gioca vicino alla porta e cerca spesso l'ultimo passaggio.", opponent: "Torino" },
  { id: "bernabe", name: "Bernabè", team: "Parma", position: "C", mantraRoles: ["C", "T"], titolarita: 86, hype: 74, mv: 6.39, inj: false, reason: "Creatività e passaggi chiave possono fare la differenza anche in una gara chiusa.", opponent: "Como" },
  { id: "dacuhna", name: "Da Cunha", team: "Como", position: "C", mantraRoles: ["M", "C"], titolarita: 69, hype: 66, mv: 6.24, inj: false, reason: "Centrocampista dinamico, con inserimenti e assist possibili.", opponent: "Parma" },
  { id: "pulisic", name: "Pulisic", team: "Milan", position: "C", mantraRoles: ["W", "T"], titolarita: 89, hype: 91, mv: 6.73, inj: false, reason: "Si inserisce con frequenza e partecipa alla maggior parte delle azioni pericolose.", opponent: "Bologna" },
  { id: "zaccagni", name: "Zaccagni", team: "Lazio", position: "C", mantraRoles: ["W", "A"], titolarita: 83, hype: 85, mv: 6.54, inj: false, reason: "Esterno offensivo che attacca l'area e crea superiorità nell'uno contro uno.", opponent: "Inter" },
  { id: "orsolini", name: "Orsolini", team: "Bologna", position: "A", mantraRoles: ["W", "A"], titolarita: 90, hype: 91, mv: 6.70, inj: false, reason: "Conclusioni e responsabilità sui piazzati lo rendono una scelta ad alto potenziale.", opponent: "Milan" },
  { id: "soule", name: "Soulé", team: "Roma", position: "A", mantraRoles: ["W", "A"], titolarita: 85, hype: 89, mv: 6.61, inj: false, reason: "Coinvolto nelle occasioni e nell'ultimo passaggio, con un buon volume di tiri.", opponent: "Torino" },
  { id: "castro", name: "Castro S.", team: "Bologna", position: "A", mantraRoles: ["Pc"], titolarita: 87, hype: 88, mv: 6.59, inj: false, reason: "Centravanti con volume di tiro e presenza costante in area.", opponent: "Milan" },
  { id: "diao", name: "Diao", team: "Como", position: "A", mantraRoles: ["A", "W"], titolarita: 58, hype: 79, mv: 6.34, inj: false, reason: "Attacca la profondità e crea superiorità, ma la titolarità è da verificare.", opponent: "Parma" },
  { id: "lautaro", name: "Lautaro", team: "Inter", position: "A", mantraRoles: ["Pc"], titolarita: 94, hype: 97, mv: 6.91, inj: false, reason: "Finalizzatore con alto volume di occasioni e rigorista della squadra.", opponent: "Lazio" },
  { id: "lookman", name: "Lookman", team: "Atalanta", position: "A", mantraRoles: ["A", "Pc"], titolarita: 88, hype: 94, mv: 6.82, inj: false, reason: "Strappi e conclusioni lo rendono una delle principali fonti di bonus.", opponent: "Fiorentina" },
  { id: "retegui", name: "Retegui", team: "Atalanta", position: "A", mantraRoles: ["Pc"], titolarita: 82, hype: 88, mv: 6.69, inj: false, reason: "Attaccante d'area con buone occasioni da gol e presenza sui cross.", opponent: "Fiorentina" },
]
const playersData: Player[] = (typeof importedPlayersData !== 'undefined' && (importedPlayersData as any)?.length ? (importedPlayersData as Player[]) : PLAYER_DB)
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
const POSITION_NAMES: Record<Position, string> = { P: "Portieri", D: "Difensori", C: "Centrocampisti", A: "Attaccanti" }
const POSITION_COLORS: Record<Position, string> = {
  P: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  D: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  C: "border-amber-200/30 bg-amber-200/10 text-amber-100",
  A: "border-orange-300/30 bg-orange-300/10 text-orange-100",
}
function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}
undefined || (typeof match.assists === "number" && Number.isFinite(match.assists))))))
    && (player.suspended === undefined || typeof player.suspended === "boolean")
    && typeof player.reason === "string" && typeof player.opponent === "string"
}
function getTitolaritaStyle(value: number) {
  if (value >= 80) return "border-emerald-300/30 bg-emerald-300/15 text-emerald-100"
  if (value >= 60) return "border-amber-200/30 bg-amber-200/15 text-amber-100"
  return "border-rose-300/30 bg-rose-300/15 text-rose-100"
}
function FantaVibesLogo({ large = false }: { large?: boolean }) {
  return (
    <span role="img" aria-label="Fanta Vibes" className={`relative block shrink-0 select-none ${large ? "h-[76px] w-[184px]" : "h-[52px] w-[126px]"}`}>
      <span className={`absolute left-1 top-0 -rotate-[8deg] font-black italic leading-none tracking-[-0.09em] text-[#ffe85e] ${large ? "text-[36px]" : "text-[25px]"}`}>FANTA</span>
      <span aria-hidden="true" className={`absolute left-1 -rotate-[8deg] bg-gradient-to-r from-[#ffe85e]/25 via-[#ffe85e] to-[#ffe85e]/30 ${large ? "top-[34px] h-[3px] w-[164px]" : "top-[24px] h-[2px] w-[112px]"}`} />
      <span className={`absolute -rotate-[8deg] font-black italic leading-none tracking-[-0.07em] text-white ${large ? "left-[45px] top-[43px] text-[31px]" : "left-[31px] top-[29px] text-[22px]"}`}>VIBES</span>
    </span>
  )
}
    }
    setScanning(true)
    setProgress(0)
    setScanNotice("")
    try {
      const worker = await createWorker("ita", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") setProgress(Math.round(message.progress * 100))
        },
      })
      try {
        const { data } = await worker.recognize(file)
        const found = matchRosterFromOcr(data.text)
        setSquad(found)
        setPage("roster")
        setScanNotice(found.length
         ? `${found.length} ${found.length === 1? "giocatore riconosciuto" : "giocatori riconosciuti"}. Mostriamo solo i nomi trovati nella tua rosa.`
          : "Nessun giocatore riconosciuto. La rosa resta vuota: prova con uno screenshot più nitido.")
      } finally {
        await worker.terminate()
      }
    } catch {
      setSquad([])
      setPage("roster")
      setScanNotice("Scansione non riuscita. La rosa resta vuota: controlla la connessione e riprova.")
    } finally {
      setScanning(false)
      if (uploadRef.current) uploadRef.current.value = ""
    }
  }
  async function handleRosterFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const supportedFile = /\.(xlsx|csv)$/i.test(file.name)
    if (!supportedFile) {
      setScanNotice("Scegli un file.xlsx o.csv esportato dalla tua lega Fantacalcio.")
      event.target.value = ""
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setScanNotice("Il file supera il limite di 15 MB. Esporta una rosa più leggera e riprova.")
      event.target.value = ""
      return
    }
    setImportingRoster(true)
    setScanNotice("")
    try {
      const importedPlayers = await importRosterFile(file)
      setSquad(importedPlayers)
      setPage("roster")
      setScanNotice(importedPlayers.length
       ? `${importedPlayers.length} ${importedPlayers.length === 1? "giocatore importato" : "giocatori importati"} dal file. Le colonne Infortunato/Squalificato escludono gli indisponibili dalla formazione consigliata.`
        : "Nessun giocatore trovato nel file. Verifica che contenga una colonna Giocatore o Nome e riprova.")
    } catch {
      setSquad([])
      setPage("roster")
      setScanNotice("Impossibile leggere il file. Esporta nuovamente la rosa in formato.xlsx o.csv e riprova.")
    } finally {
      setImportingRoster(false)
      if (rosterFileRef.current) rosterFileRef.current.value = ""
    }
  }
  async function refreshOfficialRatings() {
    if (!squad.length || syncingRatings) return
    setSyncingRatings(true)
    setRatingNotice("")
    try {
      const response = await fetch("/api/fantacalcio/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: squad.map(({ id, name, team }) => ({ id, name, team })) }),
      })
      const result = await response.json() as {
        error?: string
        season?: string
        ratings?: Array<{ id: string; stats: OfficialStats; recentMatches?: RecentMatchRating[] }>
      }
      if (!response.ok ||!result.season ||!Array.isArray(result.ratings)) {
        throw new Error(result.error || "Risposta non valida")
      }
      const officialRatings = new Map(
        result.ratings
         .filter((rating) => typeof rating.id === "string")
         .map((rating) => [rating.id, rating]),
      )
      setSquad((currentSquad) => currentSquad.map((player) => {
        const rating = officialRatings.get(player.id)
        if (!rating) return player
        const hasOfficialRating = Number.isFinite(rating.stats.mv) && (rating.stats.appearances?? 0) > 0
        return {
         ...player,
          officialStats: rating.stats,
          recentMatches: rating.recentMatches?? player.recentMatches,
          statsSeason: result.season,
         ...(hasOfficialRating? { mv: rating.stats.mv!, mvSource: "fantacalcio" as const, mvSeason: result.season } : {}),
        }
      }))
      const matchedCount = result.ratings.length
      const recentFormPlayers = result.ratings.filter((rating) => rating.recentMatches?.length).length
      const missingRatings = squad.length - matchedCount
      setRatingNotice(`${matchedCount} ${matchedCount === 1? "giocatore aggiornato" : "giocatori aggiornati"} con statistiche ufficiali · andamento ultime tre partite disponibile per ${recentFormPlayers} ${recentFormPlayers === 1? "giocatore" : "giocatori"}${missingRatings? ` · ${missingRatings} ${missingRatings === 1? "non trovato" : "non trovati"} nelle statistiche della stagione` : ""} · stagione ${result.season}.`)
    } catch {
      setRatingNotice("Recupero non riuscito. Riprova tra poco: la rosa non è stata modificata.")
    } finally {
      setSyncingRatings(false)
    }
  }
  function goHome() {
    setSelectedPlayer(null)
    setPage("home")
  }
  if (!introEntered) return <FantaVibesIntro onEnter={() => setIntroEntered(true)} />
  return (
    <main className="relative isolate min-h-[100svh] bg-[#071b14] font-sans text-white selection:bg-[#ffe85e] selection:text-[#0a0c1e]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <Image src="/football-pitch-background.png" alt="" fill priority sizes="100vw" className="object-cover object-center opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,15,19,0.48),rgba(5,19,18,0.64)),radial-gradient(ellipse_at_center,transparent_10%,rgba(2,12,14,0.42)_100%)]" />
      </div>
      <div className="relative z-10">
      {page === "home" && <div className="mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col overflow-x-hidden px-4 pb-3 sm:px-8 sm:pb-5">
        <header className="flex shrink-0 items-start justify-between border-b border-white/[0.07] py-4 sm:py-5">
      <div className="flex min-w-0 items-start"><FantaVibesLogo large /><div className="-mt-0.5 ml-1 origin-top-left -rotate-[7deg] whitespace-nowrap text-right text-[8px] font-bold uppercase italic leading-[1.2] tracking-[0.1em] text-white/55"><p>powered by the original</p><p className="mt-1 text-[#ffe85e]/80">chaltrons league</p></div></div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeSwitch theme={theme} onChange={setTheme} compact />
            <button type="button" aria-label="Apri impostazioni" onClick={() => setSettingsOpen(true)} className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#151732] text-white/70 transition hover:border-[#ffe85e]/40 hover:text-[#ffe85e]"><Settings2 size={18} /></button>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-2xl
