import { addDays, daysBetween, seedDb, TODAY, type ApptStatus, type Db, type Stage } from './data';

export interface State extends Db {
  toast: string;
  doneToday: number;
}

export type Action =
  | { type: 'send'; apptId: string }
  | { type: 'approve'; apptId: string }
  | { type: 'approveAll' }
  | { type: 'mark'; apptId: string; status: ApptStatus }
  | { type: 'rebook'; apptId: string }
  | { type: 'call'; patientId: string }
  | { type: 'nudge'; patientId: string }
  | { type: 'advance'; patientId: string }
  | { type: 'toast'; text: string };

export const initial = (): State => ({ ...seedDb(), toast: '', doneToday: 0 });

const NEXT: Record<Stage, Stage> = { tests: 'referred', referred: 'booked', booked: 'treated', treated: 'treated' };
const nameOf = (s: State, id: string) => s.patients.find((p) => p.id === id)?.first ?? '';

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'toast':
      return { ...s, toast: a.text };
    case 'send': {
      const ap = s.appts.find((x) => x.id === a.apptId)!;
      return { ...s, appts: s.appts.map((x) => (x.id === a.apptId ? { ...x, msg: 'sent' } : x)), toast: `Message sent to ${nameOf(s, ap.patientId)}` };
    }
    case 'approve':
      return { ...s, appts: s.appts.map((x) => (x.id === a.apptId ? { ...x, msg: 'scheduled' } : x)), toast: 'Approved and scheduled' };
    case 'approveAll': {
      const n = s.appts.filter((x) => x.msg === 'draft').length;
      return { ...s, appts: s.appts.map((x) => (x.msg === 'draft' ? { ...x, msg: 'scheduled' } : x)), doneToday: s.doneToday + 1, toast: `${n} messages approved` };
    }
    case 'mark': {
      const ap = s.appts.find((x) => x.id === a.apptId)!;
      return { ...s, appts: s.appts.map((x) => (x.id === a.apptId ? { ...x, status: a.status } : x)), toast: `${nameOf(s, ap.patientId)} marked ${a.status}` };
    }
    case 'rebook': {
      const old = s.appts.find((x) => x.id === a.apptId)!;
      let date = addDays(TODAY, 7 + (s.appts.length % 3));
      while ([0].includes(new Date(date).getUTCDay())) date = addDays(date, 1);
      const sat = new Date(date).getUTCDay() === 6;
      const fresh = { ...old, id: `a${s.appts.length + 1}`, date, time: sat ? '10:00' : '17:30', status: 'booked' as const, msg: 'sent' as const, msgKind: 'rebook' as const };
      return {
        ...s,
        appts: [...s.appts.map((x) => (x.id === old.id ? { ...x, status: 'rebooked' as const } : x)), fresh],
        doneToday: s.doneToday + 1,
        toast: `${nameOf(s, old.patientId)} rebooked, new time sent`,
      };
    }
    case 'call':
      return { ...s, patients: s.patients.map((p) => (p.id === a.patientId ? { ...p, called: true } : p)), doneToday: s.doneToday + 1, toast: `Call to ${nameOf(s, a.patientId)} logged` };
    case 'nudge':
      return { ...s, cases: s.cases.map((c) => (c.patientId === a.patientId ? { ...c, nudged: true } : c)), doneToday: s.doneToday + 1, toast: `Follow-up nudge sent to ${nameOf(s, a.patientId)}` };
    case 'advance':
      return {
        ...s,
        cases: s.cases.map((c) => {
          if (c.patientId !== a.patientId) return c;
          const stage = NEXT[c.stage];
          return { ...c, stage, since: TODAY, dueBy: addDays(TODAY, stage === 'referred' ? 42 : 14), nudged: false };
        }),
        toast: `${nameOf(s, a.patientId)} moved to the next step`,
      };
  }
}

/** Days until the recommended date; negative when late. */
export const daysLeft = (dueBy: string) => daysBetween(TODAY, dueBy);
