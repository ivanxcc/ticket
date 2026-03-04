export const APP_VERSION = '1.2.2';

export const CHANGELOG: { version: string; date: string; changes: string[] }[] = [
  {
    version: '1.2.2',
    date: 'Mar 2026',
    changes: [
      'Swipe left on a ticket to edit or delete',
      'Branded splash screen on launch',
      'Overdue and due-today tickets sort to the top',
      '"Due Today" badge on tickets due today',
      'Deadline calendar now scrolls into view automatically',
      'Fixed: today was not selectable as a deadline',
      'Fixed: tickets due today showed as overdue',
    ],
  },
  {
    version: '1.2.1',
    date: 'Mar 2026',
    changes: [
      'New app icon',
      'Notifications can now be cleared',
      'Ticket card now shows assignee name and deadline date',
      'Improved haptic feedback on key actions',
      'Confetti effect increased when completing tickets',
    ],
  },
  {
    version: '1.2.0',
    date: 'Mar 2026',
    changes: [
      'Multiple assignees per ticket',
      'Ticket deadlines with overdue badge',
      'Status history timeline on ticket detail',
      'Send Feedback in Settings',
    ],
  },
  {
    version: '1.1.0',
    date: 'Mar 2026',
    changes: [
      'Edit tickets after creation',
      'Confetti celebration when a ticket is completed',
      'App version number and changelog',
      'Filter bar display fix',
    ],
  },
  {
    version: '1.0.0',
    date: 'Feb 2026',
    changes: [
      'Initial release',
      'Household ticketing with real-time sync',
      'Push notifications (infrastructure)',
      'Dark mode',
    ],
  },
];
