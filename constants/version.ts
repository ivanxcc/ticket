export const APP_VERSION = '1.2.0';

export const CHANGELOG: { version: string; date: string; changes: string[] }[] = [
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
