export const USER_LANGUAGES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
]

const translations = {
  de: {
    common: {
      language: 'Sprache',
      german: 'Deutsch',
      english: 'English',
      loadingEyebrow: 'Laden',
      loadingTitle: 'Verbindung zur Event-Datenbank wird aufgebaut',
      code: 'Code',
      team: 'Team',
      points: 'Punkte',
      status: 'Status',
      remainingTime: 'Restzeit',
      waitingForStart: 'wartet auf Start',
      switchTeam: 'Gruppe wechseln',
      tasks: 'Aufgaben',
      availableHints: 'Verfuegbare Hinweise',
      hintLevel: 'Hinweis Stufe',
      hintCost: 'Kosten',
      buy: 'Kaufen',
      bought: 'Gekauft',
      locked: 'Gesperrt',
      feedback: 'Rueckmeldung',
      answer: 'Antwort',
      number: 'Zahl',
      sendAnswer: 'Antwort senden',
      uploadPhoto: 'Foto hochladen',
      submitted: 'Antwort gesendet',
      taskDone: 'Aufgabe erledigt',
      noTasks: 'Aktuell sind keine Aufgaben angelegt.',
      collectedFragments: 'Gesammelte Fragmente',
      openHintAfterPurchase: 'Inhalt sichtbar nach dem Kauf',
      buyPreviousHintsFirst: 'Kaufe zuerst die vorherigen Hinweise',
      enlargedHintImage: 'Vergroesserter Hinweis',
      pointsSuffix: 'P',
    },
    login: {
      eyebrow: 'Login',
      title: 'Mit Gruppencode anmelden',
      groupCode: 'Gruppencode',
      groupName: 'Gruppenname',
      groupCodePlaceholder: 'z. B. TEAM-4821',
      groupNamePlaceholder: 'z. B. Team Blitz',
      codeDetected: 'Code erkannt',
      existingGroup: 'Dieser Code oeffnet die vorhandene Gruppe.',
      newGroup:
        'Dieser Code ist neu. Legt zuerst einen Gruppennamen fest, bevor ihr euch anmeldet.',
      setGroupName: 'Gruppennamen festlegen',
      openGroup: 'Gruppe oeffnen',
    },
    teamView: {
      startEyebrow: 'Start',
      notStarted: 'Noch nicht gestartet',
      startInfo:
        'Ihr koennt die Aufgaben schon ansehen. Antworten und Freischaltung sind erst moeglich, sobald das Admin-Team den Event-Timer startet.',
      startListInfo:
        'Die Aufgabenliste bleibt sichtbar, damit ihr euch vorab orientieren koennt.',
      tasksTitle: 'Aufgaben ansehen und bearbeiten',
      tasksHint: 'Klicke auf eine Aufgabe, um diese anzuzeigen und zu bearbeiten.',
      waitingTitle: 'Wartet auf den Start',
      waitingBody:
        'Der Event-Timer wurde noch nicht gestartet. Das Antwortfeld bleibt bis dahin gesperrt.',
      pausedTitle: 'Event pausiert',
      pausedBody:
        'Der Timer ist pausiert. Freischaltungen und Antworten sind aktuell gesperrt.',
      stoppedTitle: 'Event gestoppt',
      stoppedBody:
        'Der Timer wurde gestoppt. Freischaltungen und Antworten sind nicht mehr moeglich.',
      unlockCode: 'Freischaltcode',
      unlockCodeHint: 'Den code findet ihr an der jeweiligen station',
      unlock: 'Freischalten',
      reviewPending:
        'Diese Aufgabe wird gerade geprueft und kann nicht mehr bearbeitet werden.',
      reviewPendingEditable:
        'Diese Aufgabe wird gerade geprueft. Ihr koennt die Abgabe aber noch anpassen und erneut senden.',
      submissionLocked:
        'Diese Aufgabe ist gesperrt und kann nicht erneut bearbeitet werden.',
      solvedNoFragment: 'Diese Aufgabe ist bereits geloest.',
      fragmentCollected: 'Fragment gesammelt:',
    },
    status: {
      solved: 'beantwortet',
      locked: 'wird geprueft',
      rejected: 'abgelehnt',
      wrong: 'falsch beantwortet',
      open: 'offen',
    },
  },
  en: {
    common: {
      language: 'Language',
      german: 'German',
      english: 'English',
      loadingEyebrow: 'Loading',
      loadingTitle: 'Connecting to the event database',
      code: 'Code',
      team: 'Team',
      points: 'Points',
      status: 'Status',
      remainingTime: 'Time left',
      waitingForStart: 'waiting for start',
      switchTeam: 'Switch team',
      tasks: 'Tasks',
      availableHints: 'Available hints',
      hintLevel: 'Hint level',
      hintCost: 'Cost',
      buy: 'Buy',
      bought: 'Bought',
      locked: 'Locked',
      feedback: 'Feedback',
      answer: 'Answer',
      number: 'Number',
      sendAnswer: 'Submit answer',
      uploadPhoto: 'Upload photo',
      submitted: 'Answer submitted',
      taskDone: 'Task completed',
      noTasks: 'There are currently no tasks available.',
      collectedFragments: 'Collected fragments',
      openHintAfterPurchase: 'Content becomes visible after purchase',
      buyPreviousHintsFirst: 'Buy previous hints first',
      enlargedHintImage: 'Enlarged hint image',
      pointsSuffix: 'pts',
    },
    login: {
      eyebrow: 'Login',
      title: 'Sign in with group code',
      groupCode: 'Group code',
      groupName: 'Group name',
      groupCodePlaceholder: 'e.g. TEAM-4821',
      groupNamePlaceholder: 'e.g. Team Flash',
      codeDetected: 'Code detected',
      existingGroup: 'This code opens the existing group.',
      newGroup:
        'This code is new. Set a group name first before signing in.',
      setGroupName: 'Set group name',
      openGroup: 'Open group',
    },
    teamView: {
      startEyebrow: 'Start',
      notStarted: 'Not started yet',
      startInfo:
        'You can already view the tasks. Answers and unlocking only become available once the admin team starts the event timer.',
      startListInfo:
        'The task list stays visible so you can get oriented in advance.',
      tasksTitle: 'View and work on tasks',
      tasksHint: 'Tap a task to open and work on it.',
      waitingTitle: 'Waiting for start',
      waitingBody:
        'The event timer has not been started yet. The answer field stays locked until then.',
      pausedTitle: 'Event paused',
      pausedBody:
        'The timer is paused. Unlocking and answers are currently disabled.',
      stoppedTitle: 'Event stopped',
      stoppedBody:
        'The timer has been stopped. Unlocking and answers are no longer possible.',
      unlockCode: 'Unlock code',
      unlockCodeHint: 'You can find the code at the respective station',
      unlock: 'Unlock',
      reviewPending:
        'This task is currently under review and can no longer be edited.',
      reviewPendingEditable:
        'This task is currently under review. You can still update and submit it again.',
      submissionLocked:
        'This task is locked and can no longer be edited.',
      solvedNoFragment: 'This task has already been solved.',
      fragmentCollected: 'Fragment collected:',
    },
    status: {
      solved: 'answered',
      locked: 'under review',
      rejected: 'rejected',
      wrong: 'wrong',
      open: 'open',
    },
  },
}

export function getTranslation(language) {
  return translations[language] ?? translations.de
}
