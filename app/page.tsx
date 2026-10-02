"use client"
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
type CatalogPlayer = {
  id: string
  name: string
  team: string
  position: Position
  mantraRoles: string[]
  fantacalcioId?: number
}
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
const STORAGE_KEY = "fanta-vibes-v6"
const LEGACY_STORAGE_KEY = "fanta-vibes-v4"
const PLAYER_DB: CatalogPlayer[] = [
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
function isUnavailable(player: Player) {
  return player.inj || player.suspended === true
}
function getAvailability(player: Player) {
  if (isUnavailable(player)) return 0
  return player.titolarita / 100
}
function getRecentFormAverage(player: Player) {
  const recentRatings = (player.recentMatches?? []).slice(0, 3).map((match) => match.rating)
  return recentRatings.length
   ? recentRatings.reduce((total, rating) => total + rating, 0) / recentRatings.length
    : undefined
}
function getExpectedPlayerValue(player: Player) {
  const recentFormAverage = getRecentFormAverage(player)
  const formAdjustedRating = recentFormAverage === undefined
   ? player.mv
    : player.mv * 0.5 + recentFormAverage * 0.5
  return formAdjustedRating * getAvailability(player)
}
function canPlay(player: Player, position: Position, mode: Mode) {
  if (mode === "Classic") return player.position === position
  const roles = player.mantraRoles.map((role) => role.toLowerCase())
  if (position === "P") return roles.includes("por")
  if (position === "D") return roles.some((role) => ["dc", "dd", "ds", "e"].includes(role))
  if (position === "C") return roles.some((role) => ["m", "c", "t", "w", "e"].includes(role))
  return roles.some((role) => ["pc", "a", "w"].includes(role))
}
type FormationAdvice = { index: number; lineup: Lineup; playerValue: number; modifierBonus: number; score: number; filledSlots: number }
function getModifierAverage(defenders: Player[], goalkeeper: Player[] = []) {
  if (defenders.length!== 4 || goalkeeper.length!== 1) return null
  const bestThreeDefenderRatings = defenders.map((player) => player.mv).sort((a, b) => b - a).slice(0, 3)
  return [...bestThreeDefenderRatings, goalkeeper[0].mv].reduce((total, rating) => total + rating, 0) / 4
}
function getModifierBonus(defenders: Player[], goalkeeper: Player[] = []) {
  const averageMv = getModifierAverage(defenders, goalkeeper)
  if (averageMv === null) return 0
  return averageMv >= 7? 3 : averageMv >= 6.5? 2 : averageMv >= 6? 1 : 0
}
function getBestLineup(squad: Player[], formation: Formation, mode: Mode, avoidRisk: boolean, considerModifier: boolean): Lineup {
  const lineup: Lineup = { P: [], D: [], C: [], A: [] }
  const requested: Record<Position, number> = { P: 1, D: formation.defense, C: formation.midfield, A: formation.attack }
  const positions = (Object.keys(requested) as Position[]).filter((position) => requested[position] > 0)
  const availableSquad = squad.filter((player) =>!isUnavailable(player))
  const candidateCount = Object.fromEntries(positions.map((position) => [position, availableSquad.filter((player) => canPlay(player, position, mode)).length])) as Record<Position, number>
  positions.sort((a, b) => candidateCount[a] / requested[a] - candidateCount[b] / requested[b])
  const used = new Set<string>()
  for (const position of positions) {
    const candidates = availableSquad.filter((player) =>!used.has(player.id) && canPlay(player, position, mode))
    const safe = avoidRisk? candidates.filter((player) => player.titolarita >= 60) : candidates
    const orderedCandidates = (safe.length >= requested[position]? safe : candidates).sort((a, b) => {
      const aDefenderModifierValue = considerModifier && position === "D"? Math.max(0, a.mv - 6) * getAvailability(a) * 0.08 : 0
      const bDefenderModifierValue = considerModifier && position === "D"? Math.max(0, b.mv - 6) * getAvailability(b) * 0.08 : 0
      return getExpectedPlayerValue(b) + bDefenderModifierValue - getExpectedPlayerValue(a) - aDefenderModifierValue
    })
    lineup[position] = orderedCandidates.slice(0, requested[position])
    lineup[position].forEach((player) => used.add(player.id))
  }
  return lineup
}
function evaluateFormation(squad: Player[], formation: Formation, index: number, mode: Mode, avoidRisk: boolean, considerModifier: boolean): FormationAdvice {
  const lineup = getBestLineup(squad, formation, mode, avoidRisk, considerModifier)
  const players = Object.values(lineup).flat()
  const playerValue = players.reduce((total, player) => total + getExpectedPlayerValue(player), 0)
  const modifierBonus = considerModifier? getModifierBonus(lineup.D, lineup.P) * [...lineup.D,...lineup.P].reduce((probability, player) => probability * getAvailability(player), 1) : 0
  const filledSlots = players.length
  return { index, lineup, playerValue, modifierBonus, score: playerValue + modifierBonus, filledSlots }
}
function recommendFormation(squad: Player[], formations: Formation[], mode: Mode, avoidRisk: boolean, considerModifier: boolean): FormationAdvice {
  const fallback: FormationAdvice = {
    index: 0,
    lineup: { P: [], D: [], C: [], A: [] },
    playerValue: 0,
    modifierBonus: 0,
    score: 0,
    filledSlots: 0,
  }
  if (!formations.length) return fallback
  const options = formations.map((formation, index) => evaluateFormation(squad, formation, index, mode, avoidRisk, considerModifier))
  return options.sort((a, b) => b.score - a.score || b.filledSlots - a.filledSlots || b.playerValue - a.playerValue)[0] ?? fallback
}
function recommendBench(squad: Player[], starters: Player[], mode: Mode, avoidRisk: boolean) {
  const starterIds = new Set(starters.map((player) => player.id))
  return squad
   .filter((player) =>!starterIds.has(player.id))
   .map((player) => {
      const possiblePositions = (["P","D","C","A"] as Position[]).filter((position) => canPlay(player, position, mode))
      const bestPosition = possiblePositions[0]?? "C" as Position
      return { player, position: bestPosition, flexible: possiblePositions.length > 1, expectedValue: getExpectedPlayerValue(player) }
    })
   .sort((a,b) => b.expectedValue - a.expectedValue)
}
const NAME_HEADERS = new Set(["giocatore", "calciatore", "nome", "nominativo", "nomegiocatore", "nomecalciatore", "player", "playername", "atleta"])
const TEAM_HEADERS = new Set(["squadra", "teamsquadra", "club", "clubsquadra", "squadraappartenenza"])
const ROLE_HEADERS = new Set(["ruolo", "ruoliclassic", "ruolomantra", "ruoli", "posizione", "r", "mantra"])
const INJURY_HEADERS = new Set(["infortunio", "infortunata", "infortunato", "infortunatao", "injury", "injured", "indisponibile", "out"])
const SUSPENSION_HEADERS = new Set(["squalifica", "squalificato", "squalificata", "suspended", "suspension"])
const STATUS_HEADERS = new Set(["stato", "status", "note", "disponibilita", "disponibilitagiocatore"])
function parseAvailabilityFlag(value: string | undefined, kind: "injury" | "suspension", explicitField = false) {
  const normalized = normalizeName(value?? "")
  if (!normalized) return undefined
  const unavailablePattern = kind === "injury"? /infortun|injur|indisponibil/ : /squalific|suspend|sospes/
  if (unavailablePattern.test(normalized) || (kind === "injury" && normalized === "out")) return true
  if (explicitField && ["si", "yes", "true", "1", "x"].includes(normalized)) return true
  if (["no", "false", "0", "disponibile", "disponibilita", "regolare"].includes(normalized)) return false
  return undefined
}
function getImportedRole(roleText: string, existing?: Player) {
  const tokens = roleText.toUpperCase().match(/POR|PC|DC|DD|DS|[PMDCETWA]/g)?? []
  const mantraRoles = [...new Set(tokens.map((role) => role === "P"? "Por" : role[0] + role.slice(1).toLowerCase()))]
  const position: Position | undefined = tokens.some((role) => role === "P" || role === "POR")? "P"
    : tokens.some((role) => ["D", "DC", "DD", "DS"].includes(role))? "D"
      : tokens.some((role) => ["A", "PC", "W"].includes(role))? "A"
        : tokens.some((role) => ["M", "C", "T", "E"].includes(role))? "C"
          : existing?.position
  return { position: position?? "C", mantraRoles: mantraRoles.length? mantraRoles : existing?.mantraRoles?? [] }
}
function buildPlayerFromCatalog(catalog: CatalogPlayer, overrides: Partial<Player> = {}): Player {
  return {
    id: catalog.id,
    name: catalog.name,
    team: catalog.team || "Sconosciuta",
    position: catalog.position,
    mantraRoles: catalog.mantraRoles ?? [],
    titolarita: 75,
    hype: 0,
    mv: 6,
    recentMatches: [],
    inj: false,
    suspended: false,
    reason: "Dati di disponibilità non disponibili.",
    opponent: "—",
    ...overrides,
  }
}

function createImportedPlayer(
  name: string,
  team: string = "",
  role: string = "",
  isTop: boolean = false,
  isLowCost: boolean = false,
): Player | undefined {
  const cleanName = String(name).trim()
  if (!cleanName || cleanName.length < 2) return undefined

  const normalizedName = normalizeName(cleanName)
  const found = PLAYER_DB.find((player) => normalizeName(player.name) === normalizedName)

  if (found) {
    const importedRole = getImportedRole(role, buildPlayerFromCatalog(found))
    return buildPlayerFromCatalog(found, {
      team: team || found.team,
      position: importedRole.position,
      mantraRoles: importedRole.mantraRoles.length ? importedRole.mantraRoles : found.mantraRoles,
      reason: isTop ? "Giocatore riconosciuto nel database Fanta Vibes · profilo top." : "Giocatore riconosciuto nel database Fanta Vibes.",
      hype: isTop ? 75 : 0,
    })
  }

  const importedRole = getImportedRole(role)
  return {
    id: `imported_${normalizedName}_${Date.now()}`,
    name: cleanName,
    team: team || "Sconosciuta",
    position: importedRole.position,
    mantraRoles: importedRole.mantraRoles.length ? importedRole.mantraRoles : [importedRole.position],
    titolarita: 50,
    hype: 0,
    mv: 6,
    inj: false,
    suspended: false,
    reason: isLowCost
      ? "Statistiche non disponibili: giocatore importato dalla rosa · profilo low cost."
      : "Statistiche non disponibili: giocatore importato dalla rosa.",
    opponent: "—",
    recentMatches: [],
  }
}

function parseRosterRows(rows: unknown[][]) {
  const players: Player[] = []
  const seen = new Set<string>()
  console.log("Stalingrado RAW:", rows?.length, "prime righe:", rows?.slice(0,3))

  for (const r of rows as any[]) {
    if (!r) continue
    let raw = ""
    if (Array.isArray(r)) {
      // prende la prima cella piena in tutta la riga
      for (const cell of r) {
        if (!cell) continue
        const s = String(cell).trim()
        if (s.length < 2) continue
        if (/^(foglio1|nome|giocatore|lista)$/i.test(s)) continue
        raw = s
        break
      }
    } else if (typeof r === "object") {
      raw = String(Object.values(r as any)[0] || "").trim()
    } else {
      raw = String(r).trim()
    }

    if (!raw || raw.length < 2) continue
    const k = raw.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)

    const p = createImportedPlayer(raw, "", "", false, false)
    if (p) players.push(p)
  }
  console.log("Stalingrado PARSED:", players.length, players.map(p=>p.name))
  return players
}
function getCsvDelimiter(text: string) {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0]?? ""
  const counts = [";", ",", "\t"].map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length }))
  const detected = counts.sort((a, b) => b.count - a.count)[0]
  return detected.count > 1? detected.delimiter : ","
}
function readBrowserFile(file: File, format: "text"): Promise<string>
function readBrowserFile(file: File, format: "arrayBuffer"): Promise<ArrayBuffer>
function readBrowserFile(file: File, format: "text" | "arrayBuffer"): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error?? new Error("Unable to read selected file"))
    reader.onabort = () => reject(new Error("File reading was cancelled"))
    reader.onload = () => {
      if (format === "text" && typeof reader.result === "string") resolve(reader.result)
      else if (format === "arrayBuffer" && reader.result instanceof ArrayBuffer) resolve(reader.result)
      else reject(new Error("Unexpected file format"))
    }
    if (format === "text") reader.readAsText(file)
    else reader.readAsArrayBuffer(file)
  })
}
async function importRosterFile(file: File): Promise<Player[]> {
  const extension = file.name.toLowerCase().split(".").pop() || ""
  if (["png","jpg","jpeg","webp","bmp"].includes(extension)) {
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker()
      await (worker as any).loadLanguage?.('ita+eng')
      await (worker as any).initialize?.('ita+eng')
      const ret = await (worker as any).recognize(file)
      const text = ret.data?.text || ""
      await (worker as any).terminate()
      console.log("OCR text:", text)
      if (!text.trim()) return []
      return matchRosterFromOcr(text)
    } catch (e) {
      console.error("OCR error", e)
      alert("Errore OCR: " + e)
      return []
    }
  }
  if (["txt","csv"].includes(extension)) {
    const text = await file.text()
    return matchRosterFromOcr(text)
  }
  let workbook
  if (extension === "csv") {
    const csv = await readBrowserFile(file, "text") as string
    workbook = readWorkbook(csv, { type: "string", FS: getCsvDelimiter(csv) })
  } else {
    const fileBytes = await readBrowserFile(file, "arrayBuffer") as ArrayBuffer
    workbook = readWorkbook(fileBytes, { type: "array" })
  }
  const players: Player[] = workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    return sheet
      ? parseRosterRows(workbookUtils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }))
      : []
  })
  return [...new Map(players.map((player) => [player.id, player])).values()]
}
function matchRosterFromOcr(text: string): Player[] {
  const players: Player[] = []
  const seen = new Set<string>()
  const lines = text.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.length < 3 || line.length > 60) continue
    const cleaned = line.replace(/^\d+[\.\)\-\s]+/, "").replace(/[^a-zA-ZÀ-ÿ\s']/g, " ").trim()
    const words = cleaned.split(/\s+/).filter(w => w.length >= 2)
    if (words.length >= 2 && words.length <= 4) {
      const name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
      const key = name.toLowerCase().replace(/\s+/g, "")
      if (key.length < 3 || seen.has(key)) continue
      seen.add(key)
      const player = createImportedPlayer(name, "", "")
      if (player) players.push(player)
    }
  }
  return players
}
function isStoredPlayer(value: unknown): value is Player {
  if (!value || typeof value !== "object") return false
  const p = value as Partial<Player>
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.team === "string" &&
    (p.position === "P" || p.position === "D" || p.position === "C" || p.position === "A") &&
    Array.isArray(p.mantraRoles) &&
    p.mantraRoles.every((role) => typeof role === "string") &&
    typeof p.titolarita === "number" && Number.isFinite(p.titolarita) &&
    typeof p.hype === "number" && Number.isFinite(p.hype) &&
    typeof p.mv === "number" && Number.isFinite(p.mv) &&
    typeof p.inj === "boolean" &&
    typeof p.reason === "string" &&
    typeof p.opponent === "string"
  )
}
function getTitolaritaStyle(value: number) {
  if (value >= 80) return "border-emerald-300/30 bg-emerald-300/15 text-emerald-100"
  if (value >= 60) return "border-amber-200/30 bg-amber-200/15 text-amber-100"
  return "border-rose-300/30 bg-rose-300/15 text-rose-100"
}
function FantaVibesLogo({ large = false }: { large?: boolean }) {
  return (
    <span role="img" aria-label="Fanta Vibes" className={`relative block shrink-0 select-none ${large? "h-[76px] w-[184px]" : "h-[52px] w-[126px]"}`}>
      <span className={`absolute left-1 top-0 -rotate-[8deg] font-black italic leading-none tracking-[-0.09em] text-[#ffe85e] ${large? "text-[36px]" : "text-[25px]"}`}>FANTA</span>
      <span aria-hidden="true" className={`absolute left-1 -rotate-[8deg] bg-gradient-to-r from-[#ffe85e]/25 via-[#ffe85e] to-[#ffe85e]/30 ${large? "top-[34px] h-[3px] w-[164px]" : "top-[24px] h-[2px] w-[112px]"}`} />
      <span className={`absolute -rotate-[8deg] font-black italic leading-none tracking-[-0.07em] text-white ${large? "left-[45px] top-[43px] text-[31px]" : "left-[31px] top-[29px] text-[22px]"}`}>VIBES</span>
    </span>
  )
}
function FantaVibesIntro({ onEnter }: { onEnter: () => void }) {
  const [arrived, setArrived] = useState(false)
  const confettiColors = ["#ffe85e", "#ffffff", "#68e1ff", "#ff8a65", "#b69cff", "#8affc1"]
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setArrived(true)
      return
    }
    const timer = window.setTimeout(() => setArrived(true), 3600)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <section aria-label="Benvenuto in Fanta Vibes" className="fixed inset-0 z-[100] isolate min-h-[100svh] overflow-hidden bg-[#0754bd] text-white">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_40%,#2789f7_0%,#1266d3_48%,#073b9b_100%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[36svh] bg-gradient-to-t from-[#031942]/60 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 34 }, (_, index) => (
          <span
            key={index}
            className={`intro-confetti-fall absolute top-0 ${index % 3 === 0? "h-2.5 w-1 rounded-full" : index % 3 === 1? "h-3 w-1.5 rounded-sm" : "size-1.5 rounded-full"}`}
            style={{
              left: `${(index * 37 + 5) % 100}%`,
              backgroundColor: confettiColors[index % confettiColors.length],
              animationDelay: `${-((index * 13) % 95) / 10}s`,
              animationDuration: `${7 + (index % 7)}s`,
              "--confetti-drift": `${((index * 23) % 180) - 90}px`,
              "--confetti-spin": `${(index % 2? 1 : -1) * (540 + index * 13)}deg`,
            } as CSSProperties}
          />
        ))}
      </div>
      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible">
        <path d="M 21 76 C 28 47, 63 20, 66 34 C 69 47, 59 54, 50 57" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth=".28" strokeLinecap="round" strokeDasharray="110" className="intro-trail-draw" />
        <path d="M 21 76 C 28 47, 63 20, 66 34 C 69 47, 59 54, 50 57" fill="none" stroke="rgba(113,220,255,.85)" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="110" className="intro-trail-glow" />
      </svg>
      <div className="intro-football-flight absolute left-1/2 top-1/2 z-10 size-36 sm:size-48" aria-hidden="true">
        <Image src="/intro-football.png" alt="" fill priority sizes="(max-width: 640px) 144px, 192px" className="object-contain drop-shadow-[0_18px_24px_rgba(1,19,61,0.42)]" />
      </div>
      <div className="absolute inset-x-0 top-[6%] z-20 flex justify-center px-5">
        {arrived && (
          <div className="intro-logo-reveal flex flex-col items-center text-center">
            <h1 className="sr-only">Fanta Vibes</h1>
            <div aria-hidden="true"><FantaVibesLogo large /></div>
            <p className="-mt-1 text-xs font-semibold tracking-[0.24em] text-white/75">NON ANDARE IN OVERTHINKING!</p>
            <button type="button" onClick={onEnter} className="mt-7 inline-flex min-h-12 min-w-40 items-center justify-center gap-3 rounded-full border border-white/30 bg-[#ffe85e] px-8 py-3 text-base font-black tracking-[0.18em] text-[#082453] shadow-[0_10px_38px_rgba(255,232,94,0.32)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white">
              ENTRA <ArrowRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{arrived? "Fanta Vibes è pronto. Premi Entra per continuare." : "Un pallone sta arrivando: Fanta Vibes si sta preparando."}</p>
    </section>
  )
}
function PlayerAvatar({ player, className }: { player: Player; className: string }) {
  const initials = player.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
  const hasPortrait = PLAYER_DB.some((catalogPlayer) => catalogPlayer.id === player.id)
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-[#122b20] font-black text-white ${className}`} aria-hidden="true">
      <span className="absolute inset-0 flex items-center justify-center">{initials}</span>
      {hasPortrait && <Image src={`/players/avatars/${player.id}.png`} alt="" fill sizes="64px" className="scale-125 object-cover" />}
    </span>
  )
}
function getPlayerLineupReasons(player: Player, isRecommendedStarter: boolean, strongerAlternative?: Player) {
  const reasons: string[] = []
  const recentMatches = player.recentMatches?? []
  const recentAverage = getRecentFormAverage(player)
  const roleReason: Record<Position, string> = {
    P: "Tra i pali può puntare a una prestazione utile per il voto e a mantenere la porta inviolata.",
    D: "In difesa può offrire una base per il voto e cercare un bonus sulle palle inattive.",
    C: "A centrocampo può contribuire al voto e trovare spazio per inserimenti o assist.",
    A: "In attacco può trasformare tiri e occasioni in un bonus utile alla squadra.",
  }
  const unavailableReason = /statistiche non disponibili|non sono state trovate|nessun dato|nessuna informazione|motivazione non disponibile/i.test(player.reason.trim())
  if (!isRecommendedStarter) {
    if (player.inj) reasons.push("Non consigliato titolare: risulta infortunato; verifica le ultime notizie prima di inserirlo.")
    if (player.suspended) reasons.push("Non consigliato titolare: risulta squalificato per la prossima gara.")
    if (!isUnavailable(player) && player.titolarita < 60) reasons.push(`La titolarità stimata è solo del ${player.titolarita}%: il rischio di pochi minuti o di non prendere voto è elevato.`)
    else if (!isUnavailable(player) && player.titolarita < 80) reasons.push(`La titolarità stimata è del ${player.titolarita}%: il minutaggio è meno sicuro rispetto a un titolare fisso.`)
    if (!isUnavailable(player) && recentAverage!== undefined && recentAverage < 6) {
      reasons.push(`Nelle ultime ${recentMatches.length} ${recentMatches.length === 1? "partita ha" : "partite ha"} una media voto di ${recentAverage.toFixed(2)}: la forma recente non offre una garanzia sufficiente.`)
    }
    if (strongerAlternative) {
      reasons.push(`Nel modulo scelto il posto è assegnato a ${strongerAlternative.name}: la sua valutazione attesa, che considera media stagionale, ultime tre partite e titolarità, è superiore (${getExpectedPlayerValue(strongerAlternative).toFixed(2)} contro ${getExpectedPlayerValue(player).toFixed(2)}).`)
    }
    if (!reasons.length) reasons.push("La panchina dipende dai posti disponibili nel modulo scelto: gli altri titolari hanno un profilo complessivo più adatto per questa formazione.")
    if (recentAverage!== undefined && recentAverage >= 6) {
      reasons.push(`La forma resta positiva: media ${recentAverage.toFixed(2)} nelle ultime ${recentMatches.length} ${recentMatches.length === 1? "partita" : "partite"}; può essere una prima alternativa dalla panchina.`)
    }
    return reasons
  }
  reasons.push(!unavailableReason && player.reason.trim()? player.reason : roleReason[player.position])
  reasons.push(player.titolarita >= 80
  ? `Titolarità stimata alta (${player.titolarita}%): aumenta la probabilità di minutaggio e di voto. `
    : player.titolarita >= 60
    ? `Titolarità stimata al ${player.titolarita}%: il potenziale giustifica la scelta, con un po' di rischio sul minutaggio. `
      : `Titolarità stimata al ${player.titolarita}%: è una scommessa, consigliata solo se le alternative sono limitate.`)
  if (recentAverage!== undefined) {
    const recentDetail = recentMatches.map((match) => `G${match.matchday} ${match.rating.toFixed(1)}`).join(" · ")
    const trend = recentAverage >= player.mv + 0.2
    ? "in crescita rispetto alla media stagionale"
      : recentAverage <= player.mv - 0.2
      ? "in calo rispetto alla media stagionale"
        : "in linea con la media stagionale"
    reasons.push(`Forma recente: ${recentDetail} · media ${recentAverage.toFixed(2)}, ${trend}. I voti delle ultime tre partite pesano per metà nel consiglio di formazione.`)
  }
  const stats = player.officialStats
  if (stats?.appearances!== undefined) {
    reasons.push(`In stagione ha raccolto ${stats.appearances} ${stats.appearances === 1? "presenza" : "presenze"}${stats.mv!== undefined? ` con media voto ${stats.mv.toFixed(2)}` : ""}${stats.goals? ` e ${stats.goals} ${stats.goals === 1? "gol" : "gol"}` : ""}${stats.assists? ` più ${stats.assists} ${stats.assists === 1? "assist" : "assist"}` : ""}.`)
  }
  if (player.opponent && player.opponent!== "—") reasons.push(`Prossimo avversario: ${player.opponent}.`)
  if (isUnavailable(player)) reasons.push("Attenzione: la disponibilità va verificata prima di confermarlo in formazione.")
  return reasons
}

function PlayerModal({ player, onClose, lineup, mode }: { player: Player; onClose: () => void; lineup: Lineup; mode: Mode }) {
  const isRecommendedStarter = Object.values(lineup).flat().some((starter) => starter.id === player.id)
  const isRisk = player.titolarita < 60 || isUnavailable(player)
  const strongerAlternative =!isRecommendedStarter
  ? (Object.keys(lineup) as Position[])
    .filter((position) => canPlay(player, position, mode))
    .flatMap((position) => lineup[position])
    .filter((starter) => getExpectedPlayerValue(starter) > getExpectedPlayerValue(player))
    .sort((a, b) => getExpectedPlayerValue(b) - getExpectedPlayerValue(a))[0]
    : undefined
  const lineupReasons = getPlayerLineupReasons(player, isRecommendedStarter, strongerAlternative)
  const officialStats = player.officialStats
  const officialStatItems: Array<[string, number | string | undefined]> = [
    ["Presenze", officialStats?.appearances],
    ["Media voto", officialStats?.mv],
    ["FantaMedia", officialStats?.fantasyAverage],
    ["Gol", officialStats?.goals],
    ["Assist", officialStats?.assists],
    ["Gol subiti", officialStats?.goalsConceded],
    ["Rigori segnati / tirati", officialStats?.penaltiesScored!== undefined && officialStats.penaltiesTaken!== undefined? `${officialStats.penaltiesScored} / ${officialStats.penaltiesTaken}` : undefined],
    ["Rigori parati", officialStats?.penaltiesSaved],
    ["Ammonizioni", officialStats?.yellowCards],
    ["Espulsioni", officialStats?.redCards],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="player-modal-title" onClick={(event) => event.stopPropagation()} className="max-h-[92svh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[28px] border border-white/10 bg-[#151732] shadow-2xl sm:rounded-[28px]">
        <div className="h-1 bg-gradient-to-r from-[#ffe85e] via-orange-300 to-rose-400" />
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <PlayerAvatar player={player} className="size-16 rounded-2xl text-sm" />
              <div>
                <div className={`mb-2 inline-flex rounded-full border px-2.5 py-1 text-[12px] font-bold uppercase tracking-widest ${POSITION_COLORS[player.position]}`}>{player.position} · {player.team} · {player.mantraRoles.join(" / ")}</div>
                <h2 id="player-modal-title" className="text-3xl font-black tracking-tight">{player.name}</h2>
                <p className="mt-1 text-sm text-white/50">Avversario: {player.opponent}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Chiudi dettagli" className="rounded-full border border-white/10 p-2 text-white/60 hover:bg-white/10"><X size={18} /></button>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[["Hype", `${player.hype}%`, "text-orange-200"], ["Titolare", `${player.titolarita}%`, "text-emerald-200"], ["Rischio", isRisk? "ALTO" : "BASSO", isRisk? "text-rose-200" : "text-emerald-200"]].map(([label, value, color]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3"><div className={`mb-2 text-[13px] font-bold uppercase tracking-widest ${color}`}>{label}</div><div className="text-lg font-black">{value}</div></div>)}
          </div>
          <section className="mt-4 rounded-2xl border border-violet-200/15 bg-violet-200/[0.04] p-4" aria-label="Statistiche ufficiali Fantacalcio.it">
            <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-[12px] font-bold uppercase tracking-widest text-violet-100">Statistiche ufficiali</h3><span className="text-[12px] text-white/40">{player.statsSeason?? player.mvSeason?? "Stagione corrente"}</span></div>
            {officialStats? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{officialStatItems.map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.06] bg-black/15 p-2.5"><div className="text-[12px] leading-4 text-white/45">{label}</div><div className="mt-1 text-base font-black text-white">{typeof value === "number"? value.toLocaleString("it-IT", { minimumFractionDigits: Number.isInteger(value)? 0 : 1, maximumFractionDigits: 2 }) : value?? "—"}</div></div>)}</div> : <p className="text-[13px] leading-5 text-white/45">Nessun dato caricato. Torna alla rosa e aggiorna le statistiche.</p>}
            <a href="https://www.fantacalcio.it/statistiche-serie-a" target="_blank" rel="noreferrer" className="mt-3 inline-block text-[12px] font-bold text-violet-100/60 underline underline-offset-2 hover:text-violet-100">Fonte: Fantacalcio.it</a>
          </section>
          <section className="mt-4 rounded-2xl border border-sky-200/15 bg-sky-200/[0.04] p-4" aria-label="Voti delle ultime tre partite">
            <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-[12px] font-bold uppercase tracking-widest text-sky-100">Ultime tre partite</h3><span className="text-[12px] text-white/40">Voti Fantacalcio.it</span></div>
            {player.recentMatches?.length? <div className="grid grid-cols-3 gap-2">{player.recentMatches.map((match) => <div key={match.matchday} className="rounded-xl border border-white/[0.06] bg-black/15 p-2.5"><div className="text-[12px] text-white/45">Giornata {match.matchday}</div><div className="mt-1 text-lg font-black text-white">{match.rating.toFixed(1)}<span className="ml-1 text-[12px] font-medium text-white/45">voto</span></div>{match.fantasyRating!== undefined && <div className="text-[12px] text-sky-100/65">Fantavoto {match.fantasyRating.toFixed(1)}</div>}{Boolean(match.goals) && <div className="mt-1 text-[12px] font-bold text-emerald-200">{match.goals} gol</div>}{Boolean(match.assists) && <div className="text-[12px] font-bold text-emerald-200">{match.assists} assist</div>}</div>)}</div> : <p className="text-[13px] leading-5 text-white/45">Aggiorna le statistiche per caricare i voti delle ultime partite disputate.</p>}
          </section>
          <div className={`mt-4 rounded-2xl border p-4 ${isRecommendedStarter? "border-[#ffe85e]/10 bg-[#ffe85e]/[0.045]" : "border-amber-200/15 bg-amber-200/[0.04]"}`}>
            <div className={`flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest ${isRecommendedStarter? "text-[#ffe85e]" : "text-amber-100"}`}>
              {isRecommendedStarter? <Sparkles size={14} /> : <TriangleAlert size={14} />}
              {isRecommendedStarter? "Perché consigliamo di schierarlo" : "Perché lo lasciamo in panchina"}
            </div>
            <ul className="mt-3 space-y-2">{lineupReasons.map((reason) => <li key={reason} className="flex items-start gap-2 text-sm leading-5 text-white/75"><span aria-hidden="true" className={`mt-1 shrink-0 ${isRecommendedStarter? "text-emerald-200" : "text-amber-200"}`}>{isRecommendedStarter? <Check size={14} /> : <ChevronRight size={14} />}</span><span>{reason}</span></li>)}</ul>
          </div>
          <p className="mt-3 text-[12px] leading-5 text-white/35">Hype, titolarità, avversario e consiglio sono stime; i dati nella sezione viola sono quelli pubblicati da Fantacalcio.it.</p>
          <button type="button" onClick={onClose} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffe85e] px-4 py-3 text-sm font-black text-[#0a0c1e] hover:bg-yellow-200">CHIUDI <Check size={16} /></button>
        </div>
      </section>
    </div>
  )
}
function PitchPlayer({ player, onSelect }: { player: Player; onSelect: (player: Player) => void }) {
  return (
    <button type="button" onClick={() => onSelect(player)} aria-label={`Apri dettagli ${player.name}, ${player.titolarita}% titolarità`} className={`group flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-1.5 text-center transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffe85e] ${isUnavailable(player)? "opacity-30 grayscale" : ""}`}>
      <span className="relative">
        <PlayerAvatar player={player} className={`size-12 rounded-full border-2 text-sm shadow-lg sm:size-14 sm:text-sm ${player.titolarita < 60? "border-dashed border-rose-300" : "border-white/65 group-hover:border-[#ffe85e]"}`} />
        <span className={`absolute -right-3 -top-2 rounded-full border px-1.5 py-0.5 text-[12px] font-black leading-none ${getTitolaritaStyle(player.titolarita)}`}>{player.titolarita}%</span>
      </span>
      <span className="max-w-[80px] truncate text-[12px] font-bold sm:max-w-28 sm:text-[13px]">{player.name}</span>
    </button>
  )
}
function SettingSwitch({ label, detail, checked, onChange, large = false }: { label: string; detail?: string; checked: boolean; onChange: (value: boolean) => void; large?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`flex w-full items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] text-left transition hover:border-white/15 ${large? "px-4 py-3.5 sm:px-5 sm:py-4" : "px-3 py-3"}`}>
      <span><span className={`block font-bold ${large? "text-sm sm:text-base" : "text-sm"}`}>{label}</span>{detail && <span className="mt-1 block text-[12px] text-white/40">{detail}</span>}</span>
      <span className={`relative flex h-7 w-12 shrink-0 items-center rounded-full transition ${checked? "bg-[#ffe85e]" : "bg-white/15"}`}><span className={`size-5 rounded-full bg-[#0a0c1e] shadow transition-transform ${checked? "translate-x-6" : "translate-x-1"}`} /></span>
    </button>
  )
}
function ThemeSwitch({ theme, onChange, compact = false }: { theme: Theme; onChange: (value: Theme) => void; compact?: boolean }) {
  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Chiaro", icon: Sun },
    { value: "dark", label: "Scuro", icon: Moon },
  ]
  return (
    <div aria-label="Tema dell’app" role="group" className={`inline-flex rounded-xl border border-white/10 bg-black/15 p-1 ${compact? "gap-0.5" : "w-full gap-1"}`}>
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          onClick={() => onChange(value)}
          title={`Tema ${label.toLowerCase()}`}
          aria-label={`Attiva tema ${label.toLowerCase()}`}
          className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe85e] ${compact? "min-w-9 px-2" : "flex-1 px-3"} ${theme === value? "bg-[#ffe85e] text-[#0a0c1e] shadow-sm" : "text-white/55 hover:bg-white/10 hover:text-white"}`}
        >
          <Icon size={15} aria-hidden="true" />
          {!compact && <span>{label}</span>}
        </button>
      ))}
    </div>
  )
}function SettingsPanel({ mode, setMode, theme, onThemeChange, defenseModifier, setDefenseModifier, avoidRisk, setAvoidRisk, onClose }: { mode: Mode; setMode: (value: Mode) => void; theme: Theme; onThemeChange: (value: Theme) => void; defenseModifier: boolean; setDefenseModifier: (value: boolean) => void; avoidRisk: boolean; setAvoidRisk: (value: boolean) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 p-4 pt-16 backdrop-blur-sm sm:items-center sm:pt-4" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-[26px] border border-white/10 bg-[#151732] p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-[13px] font-black uppercase tracking-[0.2em] text-[#ffe85e]">La tua lega</p><h2 id="settings-title" className="mt-1 text-xl font-black">Impostazioni</h2></div><button type="button" onClick={onClose} aria-label="Chiudi impostazioni" className="rounded-xl border border-white/10 p-2 text-white/55 hover:bg-white/10"><X size={17} /></button></div>
        <div className="flex flex-col gap-3">
          <div><p className="mb-2 text-[13px] font-bold uppercase tracking-widest text-white/45">Modalità di gioco</p><div className="grid grid-cols-2 gap-2">{(["Classic", "Mantra"] as Mode[]).map((option) => <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)} className={`rounded-xl border px-4 py-3 text-sm font-black transition ${mode === option? "border-[#ffe85e] bg-[#ffe85e] text-[#0a0c1e]" : "border-white/10 bg-white/[0.03] text-white/65 hover:text-white"}`}>{option.toUpperCase()}</button>)}</div></div>
          <ThemeSwitch theme={theme} onChange={onThemeChange} />
          <SettingSwitch label="Modificatore difesa" detail="Media migliori 3 difensori + portiere: 6–6,49 = +1; 6,5–6,99 = +2; da 7 = +3." checked={defenseModifier} onChange={setDefenseModifier} />
          <SettingSwitch label="Evita titolarità sotto 60%" detail="Usa un fallback solo se necessario" checked={avoidRisk} onChange={setAvoidRisk} />
        </div>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-[#ffe85e] px-4 py-3 text-sm font-black text-[#0a0c1e]">SALVA IMPOSTAZIONI</button>
      </section>
    </div>
  )
}
export default function Home() {
  const [page, setPage] = useState<Page>("home")
  const [theme, setTheme] = useState<Theme>("dark")
  const [introEntered, setIntroEntered] = useState(false)
  const [squad, setSquad] = useState<Player[]>([])
  const [mode, setMode] = useState<Mode>("Classic")
  const [defenseModifier, setDefenseModifier] = useState(true)
  const [avoidRisk, setAvoidRisk] = useState(true)
  const [teamName, setTeamName] = useState("")
  const [formationIndex, setFormationIndex] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [importingRoster, setImportingRoster] = useState(false)
  const [syncingRatings, setSyncingRatings] = useState(false)
  const [ratingNotice, setRatingNotice] = useState("")
  const [progress, setProgress] = useState(0)
  const [scanNotice, setScanNotice] = useState("")
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)
  const rosterFileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      const legacy =!saved? localStorage.getItem(LEGACY_STORAGE_KEY) : null
      const storedValue = saved?? legacy
      if (storedValue) {
        const value = JSON.parse(storedValue) as { mode?: Mode; theme?: Theme; defenseModifier?: boolean; avoidRisk?: boolean; teamName?: string; players?: unknown[] }
        if (value.theme === "light" || value.theme === "dark") setTheme(value.theme)
        if (value.mode === "Classic" || value.mode === "Mantra") setMode(value.mode)
        if (typeof value.defenseModifier === "boolean") setDefenseModifier(value.defenseModifier)
        if (typeof value.avoidRisk === "boolean") setAvoidRisk(value.avoidRisk)
        if (typeof value.teamName === "string") setTeamName(value.teamName)
        if (saved && Array.isArray(value.players)) {
          const storedPlayers = value.players.filter(isStoredPlayer).map((player) => {
            const cleanPlayer = {...player } as Player & { xg?: number; xa?: number; avatarUrl?: string }
            delete cleanPlayer.xg
            delete cleanPlayer.xa
            delete cleanPlayer.avatarUrl
            return cleanPlayer
          })
          setSquad(storedPlayers)
          if (storedPlayers.length) setPage("roster")
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      setSquad([])
      setPage("home")
    }
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, theme, defenseModifier, avoidRisk, teamName, players: squad, page }))
    } catch {
    }
  }, [hydrated, mode, theme, defenseModifier, avoidRisk, teamName, squad, page])
  useEffect(() => {
    if (!hydrated) return
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [hydrated, theme])
  const formations = mode === "Classic"? CLASSIC_FORMATIONS : MANTRA_FORMATIONS
  const formationAdvice = useMemo(() => ({
    withoutModifier: recommendFormation(squad, formations, mode, avoidRisk, false),
    withModifier: recommendFormation(squad, formations, mode, avoidRisk, true),
  }), [squad, formations, mode, avoidRisk])
  const recommendedAdvice = defenseModifier? formationAdvice.withModifier : formationAdvice.withoutModifier
  const recommendedIndex = recommendedAdvice.index
  const currentFormation = formations[formationIndex] ?? formations[0] ?? CLASSIC_FORMATIONS[0]
  const lineup = useMemo(() => getBestLineup(squad, currentFormation, mode, avoidRisk, defenseModifier), [squad, currentFormation, mode, avoidRisk, defenseModifier])
  const starters = useMemo(() => Object.values(lineup).flat(), [lineup])
  const benchAdvice = useMemo(() => recommendBench(squad, starters, mode, avoidRisk), [squad, starters, mode, avoidRisk])
  const currentModifierBonus = defenseModifier? getModifierBonus(lineup.D, lineup.P) * [...lineup.D,...lineup.P].reduce((probability, player) => probability * getAvailability(player), 1) : 0
  const expectedAttendance = starters.reduce((total, player) => total + getAvailability(player), 0)
  const expectedBaseRating = starters.reduce((total, player) => total + player.mv, 0)
  const expectedAverageRating = starters.length > 0? expectedBaseRating / starters.length : 0
  const expectedTeamScore = expectedBaseRating + currentModifierBonus
  const allRatingsOfficial = starters.length > 0 && starters.every((player) => player.mvSource === "fantacalcio")
  const expectedTeamGoals = Math.max(0, Math.floor((expectedTeamScore - 60) / 6))
  const nextGoalThreshold = expectedTeamGoals === 0? 66 : 66 + expectedTeamGoals * 6
  const pointsToNextGoal = Math.max(0, nextGoalThreshold - expectedTeamScore)
  const scoreProgress = Math.max(0, Math.min(100, ((expectedTeamScore - (nextGoalThreshold - 6)) / 6) * 100))
  const modifierGain = formationAdvice.withModifier.score - formationAdvice.withoutModifier.score
  const modifierChangesPlan = formationAdvice.withModifier.index!== formationAdvice.withoutModifier.index
  const riskPlayers = starters.filter((player) => player.titolarita < 60 || player.inj)
  const fallbackPlayers = starters.filter((player) => avoidRisk && player.titolarita < 60)
  const missingStarters = Math.max(0, 11 - starters.length)
  const defenders = lineup.D
  const defenderAverage = getModifierAverage(defenders, lineup.P)?? 0
  const defenseBonus = getModifierBonus(defenders, lineup.P)
  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setScanNotice("Scegli un'immagine PNG, JPG o WEBP.")
      event.target.value = ""
      return
    }
    setScanning(true)
    setProgress(0)
    setScanNotice("")
    try {
      const { createWorker } = await import('tesseract.js')
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
        <div className="mx-auto flex w-full max-w-2xl flex-col justify-start gap-2.5 py-2 sm:min-h-0 sm:flex-1 sm:justify-center sm:gap-3.5 sm:py-4">
          <section className="flex shrink-0 items-center gap-3 rounded-[22px] border border-white/[0.09] bg-[#151732] px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-[#ffe85e]/20 bg-[#ffe85e]/[0.08] text-[#ffe85e] sm:size-16"><span className="text-[30px] leading-none" aria-hidden="true">?</span></div>
            <div className="min-w-0 flex-1"><h2 className="text-sm font-black leading-tight sm:text-base">Carica la tua rosa Fantacalcio</h2><p className="mt-1 hidden text-[12px] text-white/45 sm:block">Screenshot con OCR oppure importazione esatta da file ufficiale XLSX o CSV.</p><label htmlFor="roster-image" className={`mt-2.5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-[12px] font-black text-[#0a0c1e] transition hover:bg-[#ffe85e] sm:mt-3 sm:px-4 sm:py-2.5 sm:text-sm`}>{scanning? <><LoaderCircle size={14} className="animate-spin" />LETTURA {progress}%</> : <><Users size={14} />SCEGLI IMMAGINE</>}</label><button type="button" onClick={() => rosterFileRef.current?.click()} disabled={importingRoster || scanning} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#ffe85e]/35 bg-[#ffe85e]/[0.07] px-3 py-2 text-[13px] font-black text-[#ffe85e] transition hover:bg-[#ffe85e]/15 disabled:opacity-50 sm:min-h-10 sm:text-[12px]">{importingRoster? <LoaderCircle size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}IMPORTA XLSX / CSV</button></div>
            <input ref={uploadRef} id="roster-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="sr-only" aria-label="Scegli screenshot della rosa" disabled={scanning || importingRoster} />
            <input ref={rosterFileRef} id="roster-file" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleRosterFileUpload} className="sr-only" aria-label="Importa rosa da file XLSX o CSV" disabled={scanning || importingRoster} />
          </section>
          <label className="flex shrink-0 flex-col gap-1 text-[13px] font-bold uppercase tracking-[0.14em] text-white/55">Nome squadra<input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="es. La mia squadra" className="h-10 rounded-xl border border-white/10 bg-[#151732] px-3 text-sm font-semibold normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-[#ffe85e]/60 sm:h-11" /></label>
          <fieldset className="shrink-0"><legend className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.14em] text-white/55">Scegli la tua lega</legend><div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {([{ name: "Classic" as Mode, icon: "⚽", roles: "Dif · C · A" }, { name: "Mantra" as Mode, icon: "🧩", roles: "Dc · Dd · E · M · C · T · W · Pc" }]).map((option) => <button key={option.name} type="button" aria-pressed={mode === option.name} onClick={() => { setMode(option.name); setFormationIndex(0) }} className={`flex min-h-[80px] flex-col items-start justify-center rounded-2xl border px-3.5 py-2.5 text-left transition sm:min-h-[94px] sm:px-5 sm:py-3 ${mode === option.name? "border-[#ffe85e] bg-[#ffe85e]/[0.12] shadow-[0_0_24px_rgba(255,232,94,0.07)]" : "border-white/10 bg-[#151732] hover:border-white/25"}`}><span className="flex w-full items-center justify-between"><span className="text-[23px] leading-none" aria-hidden="true">{option.icon}</span>{mode === option.name && <Check size={15} className="text-[#ffe85e]" />}</span><span className={`mt-1.5 text-sm font-black tracking-[0.11em] sm:text-sm ${mode === option.name? "text-[#ffe85e]" : "text-white/85"}`}>{option.name.toUpperCase()}</span><span className="mt-0.5 text-[12px] text-white/45 sm:text-[13px]">{option.roles}</span></button>)}
          </div></fieldset>
          <SettingSwitch label="MODIFICATORE DIFESA" detail="Migliori 3 difensori + portiere: 6–6,49 = +1; 6,5–6,99 = +2; da 7 = +3." checked={defenseModifier} onChange={setDefenseModifier} large />
          {scanNotice && <p role="status" className="text-center text-[12px] leading-4 text-amber-100/80">{scanNotice}</p>}
          <p className="text-center text-[12px] text-white/25">Le tue preferenze vengono salvate automaticamente su questo dispositivo.</p>
        </div>
        {settingsOpen && <SettingsPanel mode={mode} setMode={(value) => { const options = value === "Classic"? CLASSIC_FORMATIONS : MANTRA_FORMATIONS; setMode(value); setFormationIndex(recommendFormation(squad, options, value, avoidRisk, defenseModifier).index) }} theme={theme} onThemeChange={setTheme} defenseModifier={defenseModifier} setDefenseModifier={(value) => { setDefenseModifier(value); setFormationIndex(value? formationAdvice.withModifier.index : formationAdvice.withoutModifier.index) }} avoidRisk={avoidRisk} setAvoidRisk={(value) => { setAvoidRisk(value); setFormationIndex(recommendFormation(squad, formations, mode, value, defenseModifier).index) }} onClose={() => setSettingsOpen(false)} />}
      </div>}
      {page === "roster" && <div className="min-h-[100svh] px-4 pb-28 sm:px-8 sm:pb-32">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 border-b border-white/[0.07] py-3.5 sm:py-5"><button type="button" onClick={goHome} className="inline-flex shrink-0 items-center gap-2 text-[12px] font-bold text-white/55 hover:text-white sm:text-sm"><ArrowLeft size={16} /> HOME</button><FantaVibesLogo /><span className="hidden rounded-full border border-[#ffe85e]/25 bg-[#ffe85e]/[0.08] px-3 py-1.5 text-[13px] font-black tracking-[0.14em] text-[#ffe85e] sm:inline-flex">{mode.toUpperCase()}</span><ThemeSwitch theme={theme} onChange={setTheme} compact /><button type="button" onClick={() => uploadRef.current?.click()} disabled={scanning} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#151732] px-2.5 py-2 text-[13px] font-bold text-white/65 hover:text-white"><Users size={13} />CAMBIA ROSA</button><button type="button" onClick={() => rosterFileRef.current?.click()} disabled={scanning || importingRoster} className="inline-flex items-center gap-1.5 rounded-lg border border-[#ffe85e]/25 bg-[#151732] px-2 py-2 text-[12px] font-black text-[#ffe85e] hover:bg-[#ffe85e]/10 disabled:opacity-50 sm:px-2.5 sm:text-[13px]">{importingRoster? <LoaderCircle size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}XLSX / CSV</button><input ref={uploadRef} id="roster-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="sr-only" aria-label="Carica un altro screenshot" disabled={scanning || importingRoster} /><input ref={rosterFileRef} id="roster-file" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleRosterFileUpload} className="sr-only" aria-label="Importa rosa da file XLSX o CSV" disabled={scanning || importingRoster} /></header>
        <section className="mx-auto max-w-5xl pt-5 sm:pt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-[13px] font-black uppercase tracking-[0.2em] text-[#ffe85e]">La tua rosa</p><h1 className="text-3xl font-black tracking-tight sm:text-5xl">{teamName.trim() || "La tua squadra"}</h1></div><div className="flex items-baseline gap-2 rounded-2xl border border-white/10 bg-[#151732] px-4 py-2.5"><span className="text-2xl font-black text-[#ffe85e]">{squad.length}</span><span className="text-[12px] font-bold uppercase tracking-widest text-white/50">giocatori trovati</span></div></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-[#ffe85e]/25 bg-[#ffe85e]/[0.1] px-3.5 py-2 text-[12px] font-black tracking-[0.14em] text-[#ffe85e]">{mode.toUpperCase()} <span className="size-1 rounded-full bg-[#ffe85e]" />MOD {defenseModifier? "ON" : "OFF"}</span><span className="text-[13px] text-white/40">Mostrati esclusivamente i giocatori riconosciuti</span></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-300/15 bg-violet-300/[0.045] px-3.5 py-3"><p className="text-[12px] leading-4 text-white/55">Recupera presenze, statistiche stagionali e voti delle ultime tre partite disputate: il trend influenza i titolari consigliati.</p><a href="https://www.fantacalcio.it/statistiche-serie-a" target="_blank" rel="noreferrer" className="text-[13px] font-bold text-white/45 underline decoration-white/20 underline-offset-2 hover:text-white/75">Fonte Fantacalcio.it</a><button type="button" onClick={refreshOfficialRatings} disabled={!squad.length || syncingRatings} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-violet-200/25 bg-violet-200/[0.1] px-3 py-2 text-[13px] font-black text-violet-100 transition hover:bg-violet-200/[0.18] disabled:cursor-not-allowed disabled:opacity-45">{syncingRatings? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />} {syncingRatings? "AGGIORNA STATISTICHE…" : "AGGIORNA STATISTICHE"}</button></div>
          {ratingNotice && <p role="status" className="mt-3 rounded-xl border border-violet-300/15 bg-violet-300/[0.05] px-4 py-3 text-[12px] leading-5 text-violet-100/80">{ratingNotice}</p>}
          {scanNotice && <p role="status" className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-5 ${squad.length? "border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-100/80" : "border-amber-300/20 bg-amber-300/[0.05] text-amber-100/80"}`}>{scanNotice}</p>}
          {squad.length? <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{squad.map((player) => <button key={player.id} type="button" onClick={() => setSelectedPlayer(player)} aria-label={`Apri valutazione di ${player.name}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#151732] p-3.5 text-left transition hover:border-[#ffe85e]/35 hover:bg-[#1b1e3b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe85e] sm:p-4"><PlayerAvatar player={player} className="size-14 rounded-xl text-base" /><div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-2"><h2 className="truncate text-base font-black">{player.name}</h2><span className="truncate text-[13px] text-white/45">{player.team}</span></div><p className="mt-1 truncate text-[13px] text-white/45"><span className={`mr-1 rounded border px-1 py-0.5 text-[12px] font-black ${POSITION_COLORS[player.position]}`}>{player.position}</span>Mantra {player.mantraRoles.join(" / ")}</p><div className="mt-2 flex items-center justify-between"><span className={`rounded-lg border px-2 py-1 text-[13px] font-black ${getTitolaritaStyle(player.titolarita)}`}>{player.titolarita}% titolarità</span><span title={player.mvSource === "fantacalcio"? `Media voto ufficiale Fantacalcio.it · ${player.mvSeason}` : "Media voto stimata, non ancora sincronizzata"} className={`text-[13px] font-bold ${player.mvSource === "fantacalcio"? "text-violet-200" : "text-white/45"}`}>{player.mvSource === "fantacalcio"? "MV FC" : "MV stima"} {player.mv.toFixed(2)}</span></div></div></button>)}</div> : <div className="mt-5 flex min-h-48 flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-[#151732]/70 px-5 text-center"><div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.05] text-white/35"><Users size={22} /></div><h2 className="mt-3 text-lg font-black">Rosa vuota</h2><p className="mt-1 max-w-sm text-sm leading-5 text-white/45">Non è stato riconosciuto nessun giocatore nel file caricato. Non aggiungiamo elementi dal database: carica uno screenshot più nitido per riprovare.</p><button type="button" onClick={() => uploadRef.current?.click()} className="mt-4 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#0a0c1e]">RIPROVA OCR</button></div>}
        </section>
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.07] bg-[#0a0c1e]/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-8"><button type="button" disabled={!squad.length} onClick={() => { setFormationIndex(recommendedIndex); setPage("formation") }} className="mx-auto flex w-full max-w-5xl items-center justify-center gap-2 rounded-2xl bg-[#ffe85e] px-5 py-3.5 text-sm font-black tracking-[0.08em] text-[#0a0c1e] transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-35 sm:py-4 sm:text-sm"><Flame size={17} fill="currentColor" />FORMAZIONE CONSIGLIATA <ArrowRight size={17} /></button></div>
      </div>}
      {page === "formation" && <div className="min-h-[100svh] px-3 pb-8 sm:px-8">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 border-b border-white/[0.07] py-3 sm:py-4"><button type="button" onClick={() => setPage("roster")} className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-bold text-white/55 hover:text-white sm:text-sm"><ArrowLeft size={15} /> ROSA <span className="hidden sm:inline">· {squad.length}</span></button><FantaVibesLogo /><div className="min-w-0 px-2 text-center"><h1 className="truncate text-sm font-black sm:text-lg">{teamName.trim() || "La tua squadra"}</h1><p className="text-[12px] font-bold uppercase tracking-widest text-[#ffe85e]">{mode} · {currentFormation.name}</p></div><ThemeSwitch theme={theme} onChange={setTheme} compact /><button type="button" aria-label="Apri impostazioni formazione" onClick={() => setSettingsOpen(true)} className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#151732] text-white/70 hover:border-[#ffe85e]/40 hover:text-[#ffe85e]"><Settings2 size={17} /></button></header>
        <div className="mx-auto max-w-6xl pt-3 sm:pt-5"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-[13px] font-black uppercase tracking-[0.17em] text-white/50">Scegli modulo <span className="text-[#ffe85e]">· {mode}</span></p><span className="shrink-0 rounded-full border border-[#ffe85e]/25 bg-[#ffe85e]/[0.08] px-2.5 py-1 text-[12px] font-black tracking-wider text-[#ffe85e]">{mode.toUpperCase()}</span></div>
          <nav aria-label={`Moduli ${mode}`} className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{formations.map((formation, index) => <button key={formation.name} type="button" aria-pressed={index === formationIndex} onClick={() => setFormationIndex(index)} className={`relative shrink-0 rounded-2xl border px-5 py-3 text-sm font-black tracking-wide transition ${index === formationIndex? "border-[#ffe85e] bg-[#ffe85e] text-[#0a0c1e] shadow-[0_5px_22px_rgba(255,232,94,0.13)]" : "border-white/15 bg-[#151732] text-white/70 hover:border-[#ffe85e]/40 hover:text-white"}`}><span>{formation.name}</span>{index === recommendedIndex && <span className={`ml-2 rounded-full px-1.5 py-0.5 align-middle text-[13px] font-black tracking-wider ${index === formationIndex? "bg-[#0a0c1e]/10 text-[#0a0c1e]" : "bg-[#ffe85e]/15 text-[#ffe85e]"}`}>CONSIGLIATO</span>}</button>)}</nav>
          <section aria-label="Confronto strategia modificatore" className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#ffe85e]/15 bg-[#ffe85e]/[0.045] px-3.5 py-3"><div className="flex min-w-0 items-start gap-2.5"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#ffe85e]" /><div><p className="text-[12px] font-black uppercase tracking-wider text-white">{defenseModifier? "Miglior modulo con modificatore" : "Miglior modulo senza modificatore"}: <span className="text-[#ffe85e]">{formations[recommendedIndex]?.name}</span></p><p className="mt-1 text-[13px] leading-4 text-white/50">Probabilità di presenza inclusa nella valutazione. {modifierChangesPlan? `Senza modificatore conviene ${formations[formationAdvice.withoutModifier.index]?.name}; con il modificatore ${formations[formationAdvice.withModifier.index]?.name}.` : `Il modulo migliore resta ${formations[recommendedIndex]?.name} in entrambi gli scenari.`}</p></div></div><div className="shrink-0 rounded-xl border border-white/[0.08] bg-[#151732] px-3 py-2 text-right"><p className="text-[12px] font-bold uppercase tracking-wider text-white/40">Vantaggio mod atteso</p><p className={`text-sm font-black ${modifierGain > 0.01? "text-sky-200" : "text-white/55"}`}>{modifierGain > 0.01? `+${modifierGain.toFixed(2)} pt` : "non conviene"}</p></div></section>
          {riskPlayers.length > 0 || missingStarters > 0? <div role="alert" className="mt-2 flex items-start gap-2.5 rounded-2xl border border-rose-300/30 bg-rose-400/10 px-3.5 py-3 text-[12px] leading-5 text-rose-100 sm:text-sm"><TriangleAlert size={16} className="mt-0.5 shrink-0 text-rose-300" /><div><p className="font-black uppercase tracking-wider">{missingStarters? `Formazione incompleta · ${missingStarters} ${missingStarters === 1? "posto" : "posti"} vuoti` : "Attenzione: rischio formazione"}</p><p className="mt-0.5 text-rose-100/75">{riskPlayers.length? `Da verificare: ${riskPlayers.map((player) => `${player.name}${player.inj? " · infortunio" : ` · ${player.titolarita}%`}`).join(", ")}.` : "Carica altri giocatori per completare l'undici."}{fallbackPlayers.length > 0? ` Fallback sotto il 60%: ${fallbackPlayers.map((player) => player.name).join(", ")}.` : ""}</p></div></div> : null}
          <section aria-label={`Campo formazione ${currentFormation.name}`} className="relative mt-2 min-h-[65vh] overflow-hidden rounded-[24px] border border-emerald-100/10 bg-[linear-gradient(135deg,#14532d,#166534_48%,#14532d)] shadow-[0_22px_70px_rgba(0,0,0,.32)] sm:mt-3">
            <div className="pointer-events-none absolute inset-2 rounded-[17px] border border-white/20 sm:inset-4" /><div className="pointer-events-none absolute left-2 right-2 top-1/2 border-t border-white/20 sm:left-4 sm:right-4" /><div className="pointer-events-none absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 sm:size-28" /><div className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" /><div className="pointer-events-none absolute left-1/2 top-2 h-8 w-28 -translate-x-1/2 rounded-b-xl border-x border-b border-white/20 sm:top-4 sm:h-14 sm:w-44" /><div className="pointer-events-none absolute bottom-2 left-1/2 h-8 w-28 -translate-x-1/2 rounded-t-xl border-x border-t border-white/20 sm:bottom-4 sm:h-14 sm:w-44" />
            <div className="relative z-10 grid min-h-[65vh] grid-rows-4 px-2 py-4 sm:px-8 sm:py-6">{(["P", "D", "C", "A"] as Position[]).map((position) => { const players = lineup[position]; return <div key={position} className="flex min-w-0 flex-col items-center justify-center gap-1"><div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[12px] font-black uppercase tracking-[0.15em] text-white/55 backdrop-blur-sm"><span className={`size-1.5 rounded-full ${position === "A"? "bg-orange-300" : position === "C"? "bg-amber-200" : position === "D"? "bg-emerald-200" : "bg-sky-200"}`} />{position} · {POSITION_NAMES[position]} · {players.length}</div><div className="flex w-full flex-wrap items-center justify-center gap-x-1 gap-y-0.5 sm:gap-x-5">{players.map((player) => <PitchPlayer key={player.id} player={player} onSelect={setSelectedPlayer} />)}</div></div>})}</div>
            <span className="absolute bottom-3 right-5 text-[12px] font-black uppercase tracking-[0.16em] text-white/30">FANTA VIBES · {currentFormation.name}</span>
          </section>
          <section aria-label="Panchina completa" className="mt-4 rounded-[24px] border border-white/[0.08] bg-[#10132a] p-3.5 sm:p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-sm font-black uppercase tracking-[0.14em] text-white sm:text-sm">Panchina completa</h2><p className="mt-1 text-[13px] leading-4 text-white/45">Tutti i giocatori non schierati, ordinati per ruolo e voto atteso. Indisponibili inclusi e segnalati.</p></div><span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] font-bold text-white/45">{benchAdvice.length} riserve</span></div>
            {benchAdvice.length? <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">{benchAdvice.map(({ player, position, flexible }, index) => <li key={player.id}><button type="button" onClick={() => setSelectedPlayer(player)} aria-label={`Apri scheda tecnica di ${player.name}`} className={`w-full min-w-0 rounded-2xl border p-2.5 text-left transition hover:border-[#ffe85e]/40 hover:bg-[#202344] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffe85e] sm:p-3 ${isUnavailable(player)? "border-rose-300/20 bg-rose-400/[0.045]" : "border-white/[0.07] bg-[#181b36]"}`}><span className="flex items-center justify-between gap-1"><span className="text-[12px] font-black uppercase tracking-wider text-white/35">{index + 1}ª riserva</span><span className={`rounded-md border px-1.5 py-0.5 text-[12px] font-black ${POSITION_COLORS[position]}`}>{flexible? "JOLLY" : position}</span></span><span className="mt-2 flex min-w-0 items-center gap-2"><PlayerAvatar player={player} className="size-8 rounded-lg text-[12px]" /><span className="min-w-0"><span className="block truncate text-[13px] font-black text-white" title={player.name}>{player.name}</span><span className="block truncate text-[12px] text-white/40">{player.team}</span></span></span><span className="mt-2 flex flex-wrap gap-1"><span className={`rounded-md border px-1.5 py-1 text-[12px] font-bold ${getTitolaritaStyle(player.titolarita)}`}>{player.titolarita}% titol.</span><span className="rounded-md bg-white/[0.06] px-1.5 py-1 text-[12px] font-bold text-white/65">MV {player.mv.toFixed(2)}</span></span><span className={`mt-1.5 block text-[12px] font-bold ${isUnavailable(player)? "text-rose-200" : "text-violet-200"}`}>{isUnavailable(player)? player.suspended? "Squalificato" : "Infortunato" : `Voto atteso ${getExpectedPlayerValue(player).toFixed(2)}`}</span></button></li>)}</ol> : <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-[12px] text-white/45">Non ci sono altri giocatori in rosa oltre ai titolari.</p>}
          </section>
          <section aria-label="Risultato probabile" className="relative isolate mt-4 overflow-hidden rounded-[28px] border border-[#ffe85e]/35 bg-[radial-gradient(ellipse_at_85%_8%,rgba(255,232,94,.22),transparent_42%),linear-gradient(135deg,#202044_0%,#12152e_52%,#262044_100%)] p-5 shadow-[0_0_42px_rgba(255,232,94,.12)] sm:p-7"><div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 size-44 rounded-full bg-[#ffe85e]/10 blur-3xl" /><div className="relative grid grid-cols-1 items-center gap-5 sm:grid-cols-[1fr_auto] sm:gap-8"><div className="min-w-0"><p className="inline-flex items-center gap-2 rounded-full border border-[#ffe85e]/25 bg-[#ffe85e]/10 px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.18em] text-[#ffe85e]"><span aria-hidden="true" className="size-1.5 rounded-full bg-[#ffe85e] shadow-[0_0_10px_#ffe85e]" />Risultato probabile</p><p className="mt-3 text-[14px] leading-5 text-white/55">Media voto dei giocatori schierati: <span className="font-bold text-white">{expectedAverageRating.toFixed(2)}</span>{allRatingsOfficial? " (Fantacalcio.it)" : ""}{defenseModifier? " + modificatore difesa atteso" : ""}.</p><p className="mt-1 text-[12px] font-bold uppercase tracking-[0.12em] text-white/35">Stima su {starters.length} titolari</p></div><div className="relative flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-4 sm:min-w-[230px] sm:justify-center sm:gap-5 sm:px-6"><div className="absolute inset-y-3 left-1/2 w-px bg-white/10 sm:block" aria-hidden="true"/><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Punteggio</p><p className="mt-1 whitespace-nowrap text-[44px] font-black leading-none tracking-[-0.065em] text-[#ffe85e] drop-shadow-[0_0_22px_rgba(255,232,94,.35)] sm:text-[56px]" aria-label={`${expectedTeamScore.toFixed(1)} punti probabili`}>{expectedTeamScore.toFixed(1)}<span className="ml-1 text-[15px] font-bold tracking-normal text-[#ffe85e]/70">pt</span></p></div><div className="min-w-[76px] text-center"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Gol</p><p className="mt-1 text-4xl font-black leading-none text-white sm:text-[44px]">{expectedTeamGoals}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/35">attesi</p></div></div></div><div className="relative mt-5 rounded-2xl border border-white/[0.07] bg-black/15 px-3.5 py-3 sm:px-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[12px] font-black text-white">Verso il prossimo gol</p><p className="mt-1 text-[12px] text-white/50">Primo gol a 66 pt, poi uno ogni 6 · {pointsToNextGoal > 0? `${pointsToNextGoal.toFixed(1)} pt al prossimo gol (soglia ${nextGoalThreshold})` : `Soglia ${nextGoalThreshold} raggiunta`}</p></div><span className="shrink-0 rounded-xl border border-[#ffe85e]/20 bg-[#ffe85e]/10 px-3 py-2 text-[12px] font-black text-[#ffe85e]">{expectedAttendance.toFixed(1)} / {starters.length} presenze</span></div></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30" role="progressbar" aria-label="Avanzamento verso la prossima soglia gol" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(scoreProgress)}><div className="h-full rounded-full bg-[#ffe85e] transition-[width] duration-500" style={{ width: `${scoreProgress}%` }} /></div><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-medium text-white/40"><span>Media voto {expectedAverageRating.toFixed(2)}</span><span>Punteggio atteso {expectedTeamScore.toFixed(1)} pt</span>{defenseModifier && <span>Mod. difesa {currentModifierBonus.toFixed(1)}</span>}</div></section>
          {defenseModifier && <section aria-label="Modificatore difesa" className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-sky-300/20 bg-sky-400/[0.08] px-4 py-3"><div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-300/10 text-sky-200"><ShieldCheck size={18} /></span><div><p className="text-[13px] font-black uppercase tracking-widest text-sky-100">Modificatore difesa · ON</p><p className="mt-1 text-[12px] text-white/55">Media 3 migliori difensori + portiere: <strong className="text-white">{defenders.length? defenderAverage.toFixed(2) : "—"}</strong></p></div></div><div className="shrink-0 text-right"><p className="text-[12px] font-bold uppercase tracking-widest text-white/40">Bonus · atteso</p><p className="text-xl font-black text-sky-200">+{defenseBonus} <span className="text-[12px] text-sky-100/55">({currentModifierBonus.toFixed(2)})</span></p></div></section>}
          <p className="mt-3 text-center text-[13px] text-white/35">Formazione calcolata soltanto sui {squad.length} giocatori riconosciuti nella tua rosa. Le statistiche sono illustrative.</p>
        </div>
        {settingsOpen && <SettingsPanel mode={mode} setMode={(value) => { const options = value === "Classic"? CLASSIC_FORMATIONS : MANTRA_FORMATIONS; setMode(value); setFormationIndex(recommendFormation(squad, options, value, avoidRisk, defenseModifier).index) }} theme={theme} onThemeChange={setTheme} defenseModifier={defenseModifier} setDefenseModifier={(value) => { setDefenseModifier(value); setFormationIndex(value? formationAdvice.withModifier.index : formationAdvice.withoutModifier.index) }} avoidRisk={avoidRisk} setAvoidRisk={(value) => { setAvoidRisk(value); setFormationIndex(recommendFormation(squad, formations, mode, value, defenseModifier).index) }} onClose={() => setSettingsOpen(false)} />}
      </div>}
      </div>
      {selectedPlayer && <PlayerModal player={selectedPlayer} lineup={lineup} mode={mode} onClose={() => setSelectedPlayer(null)} />}
    </main>
  )
}  
  
