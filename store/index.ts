import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Status = 'submitted' | 'in_progress' | 'pending' | 'complete';
export type Priority = 'low' | 'medium' | 'urgent';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Member {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  category: string;
  assignedTo: string;
  createdBy: string;
  status: Status;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

interface AppStore {
  _hydrated: boolean;
  _setHydrated: () => void;

  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  members: Member[];
  currentMemberId: string;
  setCurrentMember: (id: string) => void;
  updateMember: (id: string, updates: Partial<Pick<Member, 'name' | 'emoji' | 'color'>>) => void;

  tickets: Ticket[];
  nextTicketNumber: number;
  addTicket: (data: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>) => void;
  updateTicketStatus: (id: string, status: Status) => void;
  deleteTicket: (id: string) => void;
}

const DEFAULT_MEMBERS: Member[] = [
  { id: 'member-1', name: 'You', emoji: '🏠', color: '#5B8DEF' },
  { id: 'member-2', name: 'Partner', emoji: '💛', color: '#A855F7' },
];

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      _hydrated: false,
      _setHydrated: () => set({ _hydrated: true }),

      themeMode: 'system',
      setThemeMode: (mode) => set({ themeMode: mode }),

      members: DEFAULT_MEMBERS,
      currentMemberId: 'member-1',
      setCurrentMember: (id) => set({ currentMemberId: id }),
      updateMember: (id, updates) =>
        set((state) => ({
          members: state.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      tickets: [],
      nextTicketNumber: 1,
      addTicket: (data) => {
        const ticketNumber = get().nextTicketNumber;
        const ticket: Ticket = {
          ...data,
          id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ticketNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          tickets: [ticket, ...state.tickets],
          nextTicketNumber: state.nextTicketNumber + 1,
        }));
      },
      updateTicketStatus: (id, status) =>
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t,
          ),
        })),
      deleteTicket: (id) =>
        set((state) => ({
          tickets: state.tickets.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'ticket-app-v1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);
