import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, type DbNotification, type DbTicket } from '@/lib/supabase';

export type Status = 'submitted' | 'in_progress' | 'pending' | 'complete';
export type Priority = 'low' | 'medium' | 'urgent';
export type ThemeMode = 'system' | 'light' | 'dark';
export type NotificationType = 'ticket_assigned' | 'ticket_reassigned' | 'ticket_status_changed';

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

export interface AppNotification {
  id: string;
  userId: string;
  householdId: string | null;
  ticketId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

type PendingOp =
  | { type: 'insert'; ticket: Ticket; householdId: string }
  | { type: 'update'; id: string; status: Status }
  | { type: 'delete'; id: string };

function normalizeUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : null;
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function dbToTicket(t: DbTicket): Ticket {
  return {
    id: t.id,
    ticketNumber: t.ticket_number,
    title: t.title,
    description: t.description,
    category: t.category,
    assignedTo: t.assigned_to ?? '',
    createdBy: t.created_by ?? '',
    status: t.status as Status,
    priority: t.priority as Priority,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

function dbToNotification(n: DbNotification): AppNotification {
  return {
    id: n.id,
    userId: n.user_id,
    householdId: n.household_id,
    ticketId: n.ticket_id,
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.is_read,
    createdAt: n.created_at,
  };
}

// Realtime channel reference (not serializable, lives outside store)
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

interface AppStore {
  _hydrated: boolean;
  _setHydrated: () => void;

  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Auth state (cached for fast startup, refreshed on init)
  userId: string | null;
  householdId: string | null;
  householdInviteCode: string | null;
  setUserId: (id: string | null) => void;
  setHousehold: (id: string, inviteCode: string) => void;
  clearAuth: () => void;

  // Members (populated from Supabase profiles)
  members: Member[];
  currentMemberId: string;
  setCurrentMember: (id: string) => void;
  updateMember: (id: string, updates: Partial<Pick<Member, 'name' | 'emoji' | 'color'>>) => void;

  // Tickets
  tickets: Ticket[];
  nextTicketNumber: number;
  addTicket: (data: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>) => void;
  updateTicketStatus: (id: string, status: Status) => void;
  deleteTicket: (id: string) => void;

  // Notifications
  notifications: AppNotification[];
  unreadNotifications: number;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Supabase sync
  pendingOps: PendingOp[];
  initFromSupabase: () => Promise<void>;
  startRealtimeSync: () => void;
  stopRealtimeSync: () => void;
  flushPendingOps: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      _hydrated: false,
      _setHydrated: () => set({ _hydrated: true }),

      themeMode: 'system',
      setThemeMode: (mode) => set({ themeMode: mode }),

      // Auth
      userId: null,
      householdId: null,
      householdInviteCode: null,
      setUserId: (id) => set({ userId: id, currentMemberId: id ?? '' }),
      setHousehold: (id, inviteCode) => set({ householdId: id, householdInviteCode: inviteCode }),
      clearAuth: () =>
        set({
          userId: null,
          householdId: null,
          householdInviteCode: null,
          members: [],
          currentMemberId: '',
          tickets: [],
          notifications: [],
          unreadNotifications: 0,
          pendingOps: [],
          nextTicketNumber: 1,
        }),

      // Members
      members: [],
      currentMemberId: '',
      setCurrentMember: (id) => set({ currentMemberId: id }),
      updateMember: (id, updates) => {
        set((state) => ({
          members: state.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));

        if (id === get().userId) {
          supabase.from('profiles').update(updates).eq('id', id).then(({ error }) => {
            if (error) console.warn('Failed to update profile:', error.message);
          });
        }
      },

      // Tickets
      tickets: [],
      nextTicketNumber: 1,

      addTicket: (data) => {
        const { householdId, userId, nextTicketNumber } = get();
        if (!householdId || !userId) return;

        const tempId = generateId();
        const now = new Date().toISOString();
        const ticket: Ticket = {
          ...data,
          id: tempId,
          ticketNumber: nextTicketNumber,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          tickets: [ticket, ...state.tickets],
          nextTicketNumber: state.nextTicketNumber + 1,
        }));

        supabase
          .from('tickets')
          .insert({
            id: tempId,
            household_id: householdId,
            title: ticket.title,
            description: ticket.description,
            category: ticket.category,
            assigned_to: normalizeUuid(ticket.assignedTo),
            created_by: normalizeUuid(ticket.createdBy),
            status: ticket.status,
            priority: ticket.priority,
          })
          .select()
          .single()
          .then(({ data: dbTicket, error }) => {
            if (error) {
              console.warn('addTicket sync failed, queuing:', error.message);
              set((state) => ({
                pendingOps: [...state.pendingOps, { type: 'insert', ticket, householdId }],
              }));
              return;
            }

            if (dbTicket) {
              set((state) => ({
                tickets: state.tickets.map((t) =>
                  t.id === tempId ? { ...t, ticketNumber: dbTicket.ticket_number } : t,
                ),
              }));
            }
          });
      },

      updateTicketStatus: (id, status) => {
        set((state) => ({
          tickets: state.tickets.map((t) =>
            t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t,
          ),
        }));

        supabase
          .from('tickets')
          .update({ status })
          .eq('id', id)
          .then(({ error }) => {
            if (error) {
              console.warn('updateTicketStatus sync failed, queuing:', error.message);
              set((state) => ({
                pendingOps: [...state.pendingOps, { type: 'update', id, status }],
              }));
            }
          });
      },

      deleteTicket: (id) => {
        set((state) => ({
          tickets: state.tickets.filter((t) => t.id !== id),
        }));

        supabase
          .from('tickets')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) {
              console.warn('deleteTicket sync failed, queuing:', error.message);
              set((state) => ({
                pendingOps: [...state.pendingOps, { type: 'delete', id }],
              }));
            }
          });
      },

      // Notifications
      notifications: [],
      unreadNotifications: 0,

      fetchNotifications: async () => {
        const { userId } = get();
        if (!userId) return;

        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (data) {
          const notifications = data.map(dbToNotification);
          const unreadNotifications = notifications.filter((n) => !n.isRead).length;
          set({ notifications, unreadNotifications });
        }
      },

      markNotificationRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n,
          );
          const unreadNotifications = notifications.filter((n) => !n.isRead).length;
          return { notifications, unreadNotifications };
        });

        supabase.from('notifications').update({ is_read: true }).eq('id', id).then(({ error }) => {
          if (error) console.warn('markNotificationRead failed:', error.message);
        });
      },

      markAllNotificationsRead: () => {
        const { userId } = get();
        if (!userId) return;

        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadNotifications: 0,
        }));

        supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
          .eq('is_read', false)
          .then(({ error }) => {
            if (error) console.warn('markAllNotificationsRead failed:', error.message);
          });
      },

      // Offline queue
      pendingOps: [],

      flushPendingOps: async () => {
        const { pendingOps, householdId } = get();
        if (!pendingOps.length || !householdId) return;

        const remaining: PendingOp[] = [];
        for (const op of pendingOps) {
          let failed = false;
          if (op.type === 'insert') {
            const { error } = await supabase.from('tickets').insert({
              id: op.ticket.id,
              household_id: op.householdId,
              title: op.ticket.title,
              description: op.ticket.description,
              category: op.ticket.category,
              assigned_to: normalizeUuid(op.ticket.assignedTo),
              created_by: normalizeUuid(op.ticket.createdBy),
              status: op.ticket.status,
              priority: op.ticket.priority,
            });
            if (error) failed = true;
          } else if (op.type === 'update') {
            const { error } = await supabase
              .from('tickets')
              .update({ status: op.status })
              .eq('id', op.id);
            if (error) failed = true;
          } else if (op.type === 'delete') {
            const { error } = await supabase.from('tickets').delete().eq('id', op.id);
            if (error) failed = true;
          }
          if (failed) remaining.push(op);
        }
        set({ pendingOps: remaining });
      },

      // Supabase init: fetch profiles + household + tickets + notifications
      initFromSupabase: async () => {
        const { userId } = get();
        if (!userId) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!profile?.household_id) return;

        const { data: household } = await supabase
          .from('households')
          .select('*')
          .eq('id', profile.household_id)
          .single();

        if (household) {
          set({ householdId: household.id, householdInviteCode: household.invite_code });
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('household_id', profile.household_id);

        if (profiles) {
          const members: Member[] = profiles.map((p) => ({
            id: p.id,
            name: p.name,
            emoji: p.emoji,
            color: p.color,
          }));
          set({ members, currentMemberId: userId });
        }

        const { data: dbTickets } = await supabase
          .from('tickets')
          .select('*')
          .eq('household_id', profile.household_id)
          .order('created_at', { ascending: false });

        if (dbTickets) {
          const serverTickets = dbTickets.map(dbToTicket);
          const pendingInsertTickets = get()
            .pendingOps
            .filter((op): op is Extract<PendingOp, { type: 'insert' }> => op.type === 'insert')
            .map((op) => op.ticket)
            .filter((pt) => !serverTickets.some((st) => st.id === pt.id));

          const mergedTickets = [...pendingInsertTickets, ...serverTickets];
          const maxNum = mergedTickets.reduce((m, t) => Math.max(m, t.ticketNumber), 0);
          set({ tickets: mergedTickets, nextTicketNumber: maxNum + 1 });
        }

        await get().fetchNotifications();
        get().flushPendingOps();
        get().startRealtimeSync();
      },

      startRealtimeSync: () => {
        const { householdId, userId } = get();
        if (!householdId || !userId || realtimeChannel) return;

        realtimeChannel = supabase
          .channel(`household-${householdId}-user-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tickets',
              filter: `household_id=eq.${householdId}`,
            },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const newTicket = dbToTicket(payload.new as DbTicket);
                if (newTicket.createdBy === userId) return;
                set((state) => {
                  if (state.tickets.find((t) => t.id === newTicket.id)) return state;
                  return {
                    tickets: [newTicket, ...state.tickets],
                    nextTicketNumber: Math.max(state.nextTicketNumber, newTicket.ticketNumber + 1),
                  };
                });
              } else if (payload.eventType === 'UPDATE') {
                const updated = dbToTicket(payload.new as DbTicket);
                set((state) => ({
                  tickets: state.tickets.map((t) => (t.id === updated.id ? updated : t)),
                }));
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as { id: string }).id;
                set((state) => ({
                  tickets: state.tickets.filter((t) => t.id !== deletedId),
                }));
              }
            },
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const notification = dbToNotification(payload.new as DbNotification);
                set((state) => {
                  if (state.notifications.find((n) => n.id === notification.id)) return state;
                  const notifications = [notification, ...state.notifications];
                  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
                  return { notifications, unreadNotifications };
                });
              } else if (payload.eventType === 'UPDATE') {
                const updated = dbToNotification(payload.new as DbNotification);
                set((state) => {
                  const notifications = state.notifications.map((n) =>
                    n.id === updated.id ? updated : n,
                  );
                  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
                  return { notifications, unreadNotifications };
                });
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as { id: string }).id;
                set((state) => {
                  const notifications = state.notifications.filter((n) => n.id !== deletedId);
                  const unreadNotifications = notifications.filter((n) => !n.isRead).length;
                  return { notifications, unreadNotifications };
                });
              }
            },
          )
          .subscribe();
      },

      stopRealtimeSync: () => {
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
      },

      signOut: async () => {
        get().stopRealtimeSync();
        await supabase.auth.signOut();
        get().clearAuth();
      },
    }),
    {
      name: 'ticket-app-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        userId: state.userId,
        householdId: state.householdId,
        householdInviteCode: state.householdInviteCode,
        members: state.members,
        currentMemberId: state.currentMemberId,
        tickets: state.tickets,
        nextTicketNumber: state.nextTicketNumber,
        notifications: state.notifications,
        unreadNotifications: state.unreadNotifications,
        pendingOps: state.pendingOps,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);
