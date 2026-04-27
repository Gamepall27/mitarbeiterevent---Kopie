export const STORAGE_KEY = 'mitarbeiterevent-demo-v2'
export const ADMIN_CODE = 'ADMIN-2026'
export const EVENT_DURATION_MINUTES = 135

export function generateUnlockCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join('')
}

export const stationCatalog = [
  {
    id: 'node-check',
    name: 'Node Check',
    zone: 'Startpunkt / Nordseite',
    area: 'Nordroute',
    type: 'qr',
    requiresUnlockCode: true,
    format: 'Kontroll-Station',
    mandatory: true,
    points: 120,
    fragment: 'SYS',
    locationHint: 'Am Startbanner neben dem Orga-Desk',
    task:
      'Scannt den Vor-Ort-Code am Startbanner. Ohne Check-in bleibt das Kernmodul gesperrt.',
    answer: 'NODE-17',
    placeholder: 'z. B. NODE-17',
    rewardHint:
      'Die ersten beiden Fragmente bilden zusammen den Start des Finalbefehls.',
    unlockCode: '0001',
  },
  {
    id: 'rasterprobe',
    name: 'Rasterprobe',
    zone: 'Parkweg West',
    area: 'Nordroute',
    type: 'text',
    requiresUnlockCode: true,
    format: 'Logikfrage',
    mandatory: true,
    points: 90,
    fragment: 'TEM',
    locationHint: 'Nahe der Sitzbaenke mit Blick auf die Glasfassade',
    task:
      'Welcher Begriff beschreibt ein sauberes, wiederkehrendes Muster in Daten und Flaeche? Tipp: sechs Buchstaben.',
    answer: 'raster',
    placeholder: 'Antwort eingeben',
    rewardHint: 'Die ersten beiden Fragmente gehoeren direkt hintereinander.',
    unlockCode: '0002',
  },
  {
    id: 'latenzfenster',
    name: 'Latenzfenster',
    zone: 'Innenhof',
    area: 'Zentralroute',
    type: 'number',
    requiresUnlockCode: true,
    format: 'Beobachtungsaufgabe',
    mandatory: true,
    points: 110,
    fragment: 'F',
    locationHint: 'Zaehlt die schmalen Fenstersegmente am Innenhof',
    task:
      'Wie viele schmale Fenstersegmente seht ihr an der Innenhofseite des Gebaeudes? Gebt nur die Zahl ein.',
    answer: '28',
    placeholder: '28',
    rewardHint:
      'Der zweite Teil des Endbefehls beginnt mit einem einzelnen Buchstaben.',
    unlockCode: '0003',
  },
  {
    id: 'protokollwahl',
    name: 'Protokollwahl',
    zone: 'Campusplatz',
    area: 'Zentralroute',
    type: 'choice',
    requiresUnlockCode: true,
    format: 'Strategiefrage',
    mandatory: true,
    points: 95,
    fragment: 'REI',
    locationHint: 'An der grossen Uebersichtstafel',
    task:
      'Welcher Ansatz verhindert bei 10 Teams am zuverlaessigsten Stau an einzelnen Hotspots?',
    choices: [
      {
        id: 'a',
        label: 'Alle Teams starten an derselben Station und rotieren gemeinsam.',
      },
      {
        id: 'b',
        label: 'Nur Bonusaufgaben digitalisieren, damit alle auf Papier arbeiten.',
      },
      {
        id: 'c',
        label: 'Routen verteilen und Stationen modular statt linear anbieten.',
      },
    ],
    answer: 'c',
    rewardHint:
      'Der zweite Begriff des Finales ist ein Verb und wird hier weiter zusammengesetzt.',
    unlockCode: '0004',
  },
  {
    id: 'brueckenreview',
    name: 'Brueckenreview',
    zone: 'Suedroute / Kanalbruecke',
    area: 'Suedroute',
    type: 'manual',
    requiresUnlockCode: true,
    format: 'Freitext mit Freigabe',
    mandatory: true,
    points: 130,
    fragment: 'GEB',
    locationHint:
      'Trefft euch als Team an der Bruecke und entwickelt einen Plan B',
    task:
      'Beschreibt in 2 bis 3 Saetzen euren Plan B, falls zwei Stationen gleichzeitig blockiert waeren. Diese Antwort muss im Admin-Panel freigegeben werden.',
    placeholder: 'Kurzer Freitext',
    rewardHint: 'Nach der Freigabe ist der finale Verbteil fast komplett.',
    unlockCode: '0005',
  },
  {
    id: 'loop-scan',
    name: 'Loop Scan',
    zone: 'Suedroute / Torbogen',
    area: 'Suedroute',
    type: 'qr',
    requiresUnlockCode: true,
    format: 'Kontroll-Station',
    mandatory: true,
    points: 125,
    fragment: 'EN',
    locationHint: 'Unter dem Torbogen am Rueckweg',
    task:
      'Scannt den zweiten Kontrollcode am Torbogen, um die Rueckschleife zu bestaetigen.',
    answer: 'SYNC-09',
    placeholder: 'z. B. SYNC-09',
    rewardHint:
      'Mit diesem Fragment sollte der finale Befehl lesbar werden.',
    unlockCode: '0006',
  },
  {
    id: 'reflexfoto',
    name: 'Reflexfoto',
    zone: 'Schaufensterpassage',
    area: 'Bonus',
    type: 'photo',
    requiresUnlockCode: true,
    format: 'Foto-Challenge',
    mandatory: false,
    points: 70,
    fragment: null,
    locationHint: 'Sucht eine reflektierende Oberflaeche',
    task:
      'Ladet ein Teamfoto hoch, auf dem mindestens drei Personen und eine Spiegelung zu sehen sind.',
    rewardHint:
      'Bonusstation fuer schnelle Teams. Kein Kernfragment, aber wertvolle Punkte.',
    unlockCode: '0007',
  },
  {
    id: 'debug-cache',
    name: 'Debug Cache',
    zone: 'Altstadt Ost',
    area: 'Bonus',
    type: 'text',
    requiresUnlockCode: true,
    format: 'Bonusfrage',
    mandatory: false,
    points: 80,
    fragment: null,
    locationHint: 'Im Bereich mit den kleinen Kopfsteinpflastergassen',
    task:
      'Welche Eigenschaft macht ein gutes Event-Setup robuster: linear, modular oder zufaellig?',
    answer: 'modular',
    placeholder: 'Antwort eingeben',
    rewardHint: 'Bonusstation fuer Gruppen mit freier Kapazitaet.',
    unlockCode: '0008',
  },
]

export function createStationProgress(
  stations = stationCatalog,
  overrides = {},
) {
  const base = Object.fromEntries(
    stations.map((station) => [
      station.id,
      {
        status: 'open',
        attempts: 0,
        answer: '',
        pointsAwarded: 0,
        solvedAt: null,
        submittedAt: null,
        assetName: '',
        assetUrl: '',
        submittedBy: '',
        reviewNote: '',
        reviewedAt: null,
        unlocked: station.requiresUnlockCode === false,
        boughtHints: [],
      },
    ]),
  )

  return Object.entries(overrides).reduce((accumulator, [stationId, patch]) => {
    accumulator[stationId] = { ...accumulator[stationId], ...patch }
    return accumulator
  }, base)
}

export function createEmptyTeam({
  id,
  code,
  name,
  sessionId = '',
  started = false,
  startedAt = null,
  stations = stationCatalog,
}) {
  return {
    id,
    name: name.trim(),
    code,
    members: [],
    currentSessionId: sessionId,
    sessionSeenAt: sessionId ? new Date().toISOString() : null,
    started,
    startedAt,
    active: true,
    bonusPoints: 0,
    penaltyPoints: 0,
    stationProgress: createStationProgress(stations),
    activityLog: [
      {
        id: crypto.randomUUID(),
        text: `Gruppe ${code} wurde aktiviert`,
        createdAt: new Date().toISOString(),
      },
    ],
    selectedStationId: 'node-check',
  }
}

export function createInitialAppState() {
  return {
    eventDurationMinutes: EVENT_DURATION_MINUTES,
    eventStartedAt: null,
    eventStatus: 'idle',
    eventPausedAt: null,
    eventPausedDurationMs: 0,
    accessCodes: [],
    stations: stationCatalog,
    teams: [],
  }
}
