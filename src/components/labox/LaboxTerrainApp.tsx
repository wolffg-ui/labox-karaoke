'use client';

import React, { useState, useEffect } from 'react';

interface Task { id: string; label: string }
interface Slot { id: string; time: string; tasks: Task[] }
interface Shift { id: string; label: string; sub: string; slots: Slot[] }
interface HistoryEntry { id: string; date: string; day: number; profile: string; shiftId: string; tasksTotal: number; tasksDone: number; completion: number; ts: number }
interface Unforeseen { id: string; dateStart: string; dateEnd: string; timeSlot: 'full' | 'morning' | 'afternoon' | 'custom'; customTime?: { start: string; end: string }; profile: string; reason: string; status: 'pending' | 'accepted' | 'rejected'; replacementRequest?: string }
interface Replacement { id: string; unforeseen: string; volunteers: Array<{ profile: string; accepted: boolean }> }
interface EffectiveAssignment {
  profile: string;
  originalProfile: string;
  isReplacement: boolean;
  timeSlot?: 'full' | 'morning' | 'afternoon' | 'custom';
  shiftId: string;
}
interface WeekValidation { dateStart: string; dateEnd: string; validatedAt: string | null; deadline: string }
interface ManagementTask { id: string; label: string; checked: boolean; deadline: string; weekStart: string; weekEnd: string }

const SHIFTS_DEFAULT: Record<string, Shift> = {
  ASTREINTE: {
    id: "ASTREINTE",
    label: "Astreinte",
    sub: "Logistique & Karaoké",
    slots: [
      { id: "matin", time: "Matin", tasks: [
        { id: "a1", label: "Nettoyage WC 1" }, { id: "a2", label: "Nettoyage WC 2" }, { id: "a3", label: "Nettoyage WC 3" },
        { id: "a4", label: "Nettoyage salle complète" }, { id: "a5", label: "Nettoyage bar" }, { id: "a6", label: "Vérification matériel karaoké" },
      ]},
      { id: "journee", time: "Journée", tasks: [
        { id: "b1", label: "Réapprovisionnement stock" }, { id: "b2", label: "Courses Métro si nécessaire" }, { id: "b3", label: "Bricolage / maintenance" },
        { id: "b4", label: "Gestion réservations entrantes" }, { id: "b5", label: "Confirmer réservations à venir" },
      ]},
      { id: "karaoke", time: "14h00 — Karaoké", tasks: [
        { id: "c1", label: "Ouverture karaoké" }, { id: "c2", label: "Vérifier réservations du jour" }, { id: "c3", label: "Lancer sessions karaoké" },
        { id: "c4", label: "Accueil clients karaoké" }, { id: "c5", label: "Service boissons si demande" },
      ]},
      { id: "fermeture_a", time: "23h30 — Fermeture", tasks: [
        { id: "d1", label: "Fermer les sessions karaoké" }, { id: "d2", label: "Micros + tablettes en charge" }, { id: "d3", label: "Nettoyage WC fermeture" },
        { id: "d4", label: "Nettoyage bar / salle" }, { id: "d5", label: "Poubelles : sortir + remplacer sacs" }, { id: "d6", label: "Réassort frigos" },
        { id: "d7", label: "Relevé températures frigo" }, { id: "d8", label: "Éteindre tout — check final" },
      ]},
    ]
  },
  STANDARD: {
    id: "STANDARD", label: "Shift Standard", sub: "Bar + Karaoké",
    slots: [
      { id: "ouv_s", time: "13h45 — Ouverture", tasks: [
        { id: "e1", label: "Allumer lumières + néons" }, { id: "e2", label: "Machine à café + chauffe-tasses" }, { id: "e3", label: "Musique / ambiance" },
        { id: "e4", label: "Café / lait / sucre / glaçons OK" }, { id: "e5", label: "Frigos vérifiés (softs / bières)" }, { id: "e6", label: "Caisse prête" },
        { id: "e7", label: "Réservations du jour vérifiées" }, { id: "e8", label: "Terrasse installée (si météo OK)" },
      ]},
      { id: "serv_s", time: "14h00 — Service", tasks: [
        { id: "f1", label: "Accueil clients actif" }, { id: "f2", label: "Vente active (boissons / cocktails)" }, { id: "f3", label: "Sessions karaoké lancées" },
        { id: "f4", label: "Terrasse propre en continu" }, { id: "f5", label: "Suivi réservations karaoké" },
      ]},
      { id: "creux_s", time: "Creux — Entretien", tasks: [
        { id: "g1", label: "Frigo + réassort léger" }, { id: "g2", label: "WC : propreté / papier / savon" }, { id: "g3", label: "Nettoyage box karaoké" },
        { id: "g4", label: "Compléter liste de courses" },
      ]},
      { id: "ferm_s", time: "23h30 — Fermeture", tasks: [
        { id: "h1", label: "Terrasse : cendriers / menus / tables" }, { id: "h2", label: "Terrasse : mobilier / bâche / stop trottoir" }, { id: "h3", label: "Bar / Salle : surfaces + tables + sol" },
        { id: "h4", label: "WC : nettoyage + réassort papier/savon" }, { id: "h5", label: "Poubelles : sortir + remplacer sacs" }, { id: "h6", label: "Réassort : frigos / café / lait / glaçons" },
        { id: "h7", label: "Karaoké : micros + tablettes en charge" }, { id: "h8", label: "Karaoké : matériel rangé" }, { id: "h9", label: "Relevé températures frigo" },
        { id: "h10", label: "Éteindre tout — check final" },
      ]},
    ]
  },
  WEEKEND_OPEN: {
    id: "WEEKEND_OPEN", label: "Weekend · Ouverture", sub: "Bar + Karaoké (matin)",
    slots: [
      { id: "ouv_wo", time: "9h45 — Ouverture", tasks: [
        { id: "i1", label: "Allumer lumières + néons" }, { id: "i2", label: "Machine à café + chauffe-tasses" }, { id: "i3", label: "Musique / ambiance" },
        { id: "i4", label: "Café / lait / sucre / glaçons OK" }, { id: "i5", label: "Frigos vérifiés (softs / bières)" }, { id: "i6", label: "Caisse prête" },
        { id: "i7", label: "WC : propreté / papier / savon" },
      ]},
      { id: "terr_wo", time: "10h00 — Terrasse + Service", tasks: [
        { id: "j1", label: "Tables installées selon plan" }, { id: "j2", label: "Chaises positionnées proprement" }, { id: "j3", label: "Cendriers propres en place" },
        { id: "j4", label: "Menus déposés" }, { id: "j5", label: "Parasols ouverts (si météo OK)" }, { id: "j6", label: "Accueil clients + service bar actif" },
      ]},
      { id: "kar_wo", time: "12h00 — Karaoké", tasks: [
        { id: "k1", label: "Sessions karaoké lancées" }, { id: "k2", label: "Réservations du jour vérifiées" }, { id: "k3", label: "Clients karaoké accompagnés" },
        { id: "k4", label: "Transitions entre sessions gérées" },
      ]},
      { id: "relais_wo", time: "16h15 — Relais", tasks: [
        { id: "l1", label: "Niveaux stock + frigos vérifiés" }, { id: "l2", label: "Réservations en cours récapitulées" }, { id: "l3", label: "Incidents signalés si nécessaire" },
        { id: "l4", label: "Caisse transmise" }, { id: "l5", label: "Briefing passation — rien en suspens" },
      ]},
    ]
  },
  WEEKEND_CLOSE: {
    id: "WEEKEND_CLOSE", label: "Weekend · Fermeture", sub: "Bar + Karaoké (soir)",
    slots: [
      { id: "prise_wc", time: "17h00 — Prise de poste", tasks: [
        { id: "m1", label: "Briefing avec l'équipe ouverture" }, { id: "m2", label: "Frigos / glaçons / café vérifiés" }, { id: "m3", label: "Réservations karaoké soirée vérifiées" },
      ]},
      { id: "serv_wc", time: "17h30 — Service soir", tasks: [
        { id: "n1", label: "Accueil / commandes / encaissement" }, { id: "n2", label: "Upsell actif (cocktails / planches)" }, { id: "n3", label: "Gestion karaoké (sessions / transitions)" },
        { id: "n4", label: "Terrasse propre en continu" }, { id: "n5", label: "Réassort si nécessaire" },
      ]},
      { id: "ferm_wc", time: "23h30 — Fermeture", tasks: [
        { id: "o1", label: "Terrasse : cendriers / menus / tables" }, { id: "o2", label: "Terrasse : mobilier / bâche / stop trottoir" }, { id: "o3", label: "Bar / Salle : surfaces + tables + sol" },
        { id: "o4", label: "WC : nettoyage + réassort papier/savon" }, { id: "o5", label: "Poubelles : sortir + remplacer sacs" }, { id: "o6", label: "Réassort : frigos / café / lait / glaçons" },
        { id: "o7", label: "Karaoké : micros + tablettes en charge" }, { id: "o8", label: "Karaoké : matériel rangé" }, { id: "o9", label: "Relevé températures frigo" },
        { id: "o10", label: "Éteindre tout — check final" },
      ]},
    ]
  }
};

const PLANNING_DEFAULT: Record<number, Array<{ id: string; shiftId: string; profile: string }>> = {
  0: [{ id: "p0a", shiftId: "WEEKEND_OPEN", profile: "CLÉMENT" }, { id: "p0b", shiftId: "WEEKEND_CLOSE", profile: "JORDAN" }],
  1: [{ id: "p1a", shiftId: "ASTREINTE", profile: "JORDAN" }],
  2: [{ id: "p2a", shiftId: "ASTREINTE", profile: "JORDAN" }],
  3: [{ id: "p3a", shiftId: "STANDARD", profile: "CLÉMENT" }],
  4: [{ id: "p4a", shiftId: "STANDARD", profile: "CLÉMENT" }],
  5: [{ id: "p5a", shiftId: "STANDARD", profile: "CLÉMENT" }],
  6: [{ id: "p6a", shiftId: "WEEKEND_OPEN", profile: "JORDAN" }, { id: "p6b", shiftId: "WEEKEND_CLOSE", profile: "CLÉMENT" }],
};

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAYS_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const PROFILES = ["JORDAN", "CLÉMENT"];

// PLANNING VALIDATION UTILITIES
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function getWeekKey(date: Date): string {
  const monday = getMonday(date);
  return formatDate(monday);
}

function getWeekDateRange(weekStart: string): { start: Date; end: Date; startStr: string; endStr: string } {
  const start = parseLocalDate(weekStart) || new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = start.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const endStr = end.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return { start, end, startStr, endStr };
}

function getValidationDeadline(weekStart: string): string {
  const start = parseLocalDate(weekStart) || new Date();
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() - 7); // 7 jours avant la semaine
  return formatDate(deadline);
}

function getDaysUntilDeadline(deadline: string, now: Date): number {
  const deadlineDate = parseLocalDate(deadline) || new Date();
  const diffTime = deadlineDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getWeekValidationStatus(weekStart: string, validations: Record<string, WeekValidation>, now: Date): { status: 'validated' | 'warning' | 'critical'; daysUntil: number } {
  const validation = validations[weekStart];
  if (!validation) return { status: 'critical', daysUntil: -999 };
  if (validation.validatedAt) return { status: 'validated', daysUntil: 0 };

  const daysUntil = getDaysUntilDeadline(validation.deadline, now);
  if (daysUntil <= 0) return { status: 'critical', daysUntil };
  if (daysUntil <= 3) return { status: 'warning', daysUntil };
  return { status: 'critical', daysUntil };
}

function generateManagementTasks(now: Date, validations: Record<string, WeekValidation>): ManagementTask[] {
  const tasks: ManagementTask[] = [];

  // Générer les tâches pour les 4 prochaines semaines
  for (let i = 0; i < 4; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + (i * 7));

    const weekStart = getMonday(checkDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekKey = formatDate(weekStart);
    const weekValidation = validations[weekKey] || {
      dateStart: formatDate(weekStart),
      dateEnd: formatDate(weekEnd),
      validatedAt: null,
      deadline: getValidationDeadline(formatDate(weekStart))
    };

    const startStr = weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    const endStr = weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

    tasks.push({
      id: `mgmt-${weekKey}`,
      label: `Valider le planning du ${startStr} au ${endStr}`,
      checked: !!weekValidation.validatedAt,
      deadline: weekValidation.deadline,
      weekStart: formatDate(weekStart),
      weekEnd: formatDate(weekEnd)
    });
  }

  return tasks;
}

function uid(prefix: string) { return `${prefix}${Date.now()}${Math.floor(Math.random()*1000)}`; }
function todaysAssignments(planning: Record<number, any[]>, dayIdx: number) { return (planning[dayIdx] || []); }
function pickShiftForProfile(planning: Record<number, any[]>, profile: string, dayIdx: number, hour: number) {
  const assigns = todaysAssignments(planning, dayIdx);
  const mine = assigns.filter(a => a.profile === profile);
  if (mine.length === 0) return assigns.length ? assigns[0].shiftId : "STANDARD";
  if (mine.length === 1) return mine[0].shiftId;
  const closeOnes = mine.filter(a => a.shiftId.includes("CLOSE"));
  if (closeOnes.length && hour >= 16) return closeOnes[0].shiftId;
  const openOnes = mine.filter(a => !a.shiftId.includes("CLOSE"));
  return openOnes.length ? openOnes[0].shiftId : mine[0].shiftId;
}

function getDateFromDayOffset(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function formatDate(d: Date | null | undefined): string {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
    return "";
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse a YYYY-MM-DD string to a local Date (avoiding timezone issues)
function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) {
    console.log(`[DEBUG] parseLocalDate: received empty/null dateStr`);
    return null;
  }
  console.log(`[DEBUG] parseLocalDate: parsing "${dateStr}"`);
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) {
    console.error(`[DEBUG] parseLocalDate: invalid date format "${dateStr}"`);
    return null;
  }
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  console.log(`[DEBUG] parseLocalDate: result = ${d.toLocaleDateString('fr-FR')}`);
  return d;
}

// Normalize a date string or Date object to YYYY-MM-DD format
function formatDateString(input: string | Date | null | undefined): string {
  if (!input) {
    return "";
  }
  if (typeof input === 'string') {
    // If it's already a string, ensure it's in YYYY-MM-DD format
    // Remove any time component if present
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return input;
  }
  // If it's a Date object, use formatDate
  return formatDate(input);
}

function getEffectiveAssignment(
  date: Date,
  assignment: { shiftId: string; profile: string },
  unforeseens: Unforeseen[]
): EffectiveAssignment {
  const dateFormatted = formatDate(date);

  // Check if the assigned person has an unforeseen on this date
  const relevantUnforeseen = unforeseens.find(u => {
    const profileMatch = u.profile === assignment.profile;
    const statusMatch = u.status === "pending" || u.status === "accepted";
    if (!u.dateStart || !u.dateEnd) return false;
    const dateStart = formatDateString(u.dateStart); // Normalize stored date
    const dateEnd = formatDateString(u.dateEnd);     // Normalize stored date
    if (!dateStart || !dateEnd) return false;
    const dateInRange = dateFormatted && dateFormatted >= dateStart && dateFormatted <= dateEnd;

    if (profileMatch && statusMatch) {
      console.log(`[DEBUG] Checking unforeseen: profile=${u.profile}, dateStart=${u.dateStart} (normalized: ${dateStart}), dateEnd=${u.dateEnd} (normalized: ${dateEnd}), dateFormatted=${dateFormatted}, inRange=${dateInRange}`);
    }

    return profileMatch && statusMatch && dateInRange;
  });

  if (!relevantUnforeseen) {
    return {
      profile: assignment.profile,
      originalProfile: assignment.profile,
      isReplacement: false,
      shiftId: assignment.shiftId
    };
  }

  // Find the replacement (the other person)
  const replacementProfile = PROFILES.find(p => p !== assignment.profile) || assignment.profile;

  return {
    profile: replacementProfile,
    originalProfile: assignment.profile,
    isReplacement: true,
    timeSlot: relevantUnforeseen.timeSlot,
    shiftId: assignment.shiftId
  };
}

function Checkbox({ checked, onClick, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{width: 20, height: 20, borderRadius: 3, flexShrink: 0, border: `1.5px solid ${checked ? "#0A0A0A" : disabled ? "#DDD" : "#B0B0B0"}`, background: checked ? "#0A0A0A" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", padding: 0, transition: "all 0.12s ease"}}>
      {checked && <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4.5 7L10 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </button>
  );
}

function Pill({ active, onClick, children }: any) {
  return <button onClick={onClick} style={{padding:"8px 14px", borderRadius:3, border:`1.5px solid ${active ? "#0A0A0A" : "#E0E0E0"}`, background: active ? "#0A0A0A" : "#fff", color: active ? "#fff" : "#555", fontSize:11, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit"}}>{children}</button>;
}

function StatBox({ big, small }: any) {
  return <div style={{border:"1px solid #F0F0F0", borderRadius:3, padding:"16px 14px"}}><div style={{fontSize:24, fontWeight:900}}>{big}</div><div style={{fontSize:11, color:"#999", marginTop:2}}>{small}</div></div>;
}

const label = { fontSize:10, color:"#AAA", letterSpacing:"0.12em", textTransform:"uppercase" as const, marginBottom:8 };
const btnDark = { background:"#0A0A0A", color:"#fff", border:"none", borderRadius:3, padding:"12px 18px", fontSize:12, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" as const, cursor:"pointer", fontFamily:"inherit" };
const btnGhost = { background:"none", border:"1px solid #E0E0E0", borderRadius:3, padding:"11px 18px", fontSize:11, color:"#999", letterSpacing:"0.1em", textTransform:"uppercase" as const, cursor:"pointer", fontFamily:"inherit" };
const inputStyle = { padding:"10px 12px", border:"1px solid #E0E0E0", borderRadius:3, fontSize:13, fontFamily:"inherit", color:"#0A0A0A", background:"#fff", outline:"none" };

export default function App() {
  const [screen, setScreen] = useState("profile");
  const [profile, setProfile] = useState<string | null>(null);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [tab, setTab] = useState("terrain");
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [shifts, setShifts] = useState<Record<string, Shift>>(SHIFTS_DEFAULT);
  const [planning, setPlanning] = useState<Record<number, any[]>>(PLANNING_DEFAULT);
  const [planningValidated, setPlanningValidated] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [gState, setGState] = useState<any>({ weekly:{}, monthly:{} });
  const [varTasks, setVarTasks] = useState<any[]>([]);
  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [newTaskBySlot, setNewTaskBySlot] = useState<Record<string, string>>({});
  const [newSlotLabel, setNewSlotLabel] = useState("");
  const [newTask, setNewTask] = useState("");
  const [unforeseens, setUnforeseens] = useState<Unforeseen[]>([]);
  const [showUnforeseen, setShowUnforeseen] = useState(false);
  const [unforeseen, setUnforeseen] = useState<{ dateStart: string; dateEnd: string; timeSlot: 'full' | 'morning' | 'afternoon' | 'custom'; reason: string; customTime: { start: string; end: string }; assignedProfile: string }>({ dateStart: "", dateEnd: "", timeSlot: "full", reason: "", customTime: { start: "", end: "" }, assignedProfile: "JORDAN" });
  const [unforeseen_error, setUnforeseen_error] = useState<string>("");
  const [unforeseen_success, setUnforeseen_success] = useState<boolean>(false);
  const [editingUnforeseenId, setEditingUnforeseenId] = useState<string | null>(null);
  const [editingUnforeseen, setEditingUnforeseen] = useState<Unforeseen | null>(null);
  const [weekValidations, setWeekValidations] = useState<Record<string, WeekValidation>>({});
  const [managementTasks, setManagementTasks] = useState<ManagementTask[]>([]);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    console.log("[DEBUG] App mounted, calling loadAll()");
    loadAll();
  }, []);

  // CRITICAL FIX: Sauvegarde les imprévus quand le state change
  useEffect(() => {
    if (unforeseens.length > 0 || localStorage.getItem("lb-unforeseens")) {
      console.log("[DEBUG AUTOSAVE] Saving unforeseens to localStorage. Count:", unforeseens.length);
      try {
        localStorage.setItem("lb-unforeseens", JSON.stringify(unforeseens));
        console.log("[DEBUG AUTOSAVE] ✓ Successfully auto-saved");
      } catch (e) {
        console.error("[DEBUG AUTOSAVE] ✗ Failed to auto-save:", e);
      }
    }
  }, [unforeseens]);

  // Sauvegarde et gestion des validations de semaine
  useEffect(() => {
    const validations = weekValidations;
    if (Object.keys(validations).length > 0) {
      try {
        localStorage.setItem("lb-week-validations", JSON.stringify(validations));
      } catch (e) {
        console.error("[DEBUG] Failed to save week validations:", e);
      }
    }
  }, [weekValidations]);

  // Génération des tâches de gestion
  useEffect(() => {
    const tasks = generateManagementTasks(now, weekValidations);
    setManagementTasks(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, weekValidations]);

  function validateWeekNew(weekStart: string, weekEnd: string) {
    const key = weekStart;
    const updated = {
      ...weekValidations,
      [key]: {
        dateStart: weekStart,
        dateEnd: weekEnd,
        validatedAt: formatDate(now),
        deadline: getValidationDeadline(weekStart)
      }
    };
    setWeekValidations(updated);
  }

  function toggleManagementTask(taskId: string) {
    const task = managementTasks.find(t => t.id === taskId);
    if (task && !task.checked) {
      validateWeekNew(task.weekStart, task.weekEnd);
    }
  }

  async function loadAll() {
    console.log("[DEBUG] ========== LOADALL STARTED ==========");
    try { const s = localStorage.getItem("lb-shifts"); if (s) setShifts(JSON.parse(s)); } catch (_) {}
    try { const p = localStorage.getItem("lb-planning"); if (p) setPlanning(JSON.parse(p)); } catch (_) {}
    try { const pv = localStorage.getItem("lb-planning-validated"); if (pv) setPlanningValidated(JSON.parse(pv)); } catch (_) {}
    try { const wv = localStorage.getItem("lb-week-validations"); if (wv) setWeekValidations(JSON.parse(wv)); } catch (_) {}
    try {
      const u = localStorage.getItem("lb-unforeseens");
      console.log("[DEBUG] localStorage.getItem('lb-unforeseens'):", u);
      if (u) {
        const parsed = JSON.parse(u);
        console.log("[DEBUG] ✓ Successfully loaded unforeseens from localStorage");
        console.log("[DEBUG] Count:", parsed.length);
        console.log("[DEBUG] Content:", parsed.map((uf: Unforeseen) => ({
          id: uf.id,
          profile: uf.profile,
          dateStart: uf.dateStart,
          dateEnd: uf.dateEnd,
          status: uf.status,
          reason: uf.reason
        })));
        setUnforeseens(parsed);
      } else {
        console.log("[DEBUG] ℹ No unforeseens in localStorage (empty)");
      }
    } catch (e) {
      console.error("[DEBUG] ✗ CRITICAL ERROR loading unforeseens:", e);
    }
    try { const h = localStorage.getItem("lb-history"); if (h) setHistory(JSON.parse(h)); } catch (_) {}
    try { const d = localStorage.getItem("lb-daily"); if (d) { const parsed = JSON.parse(d); const today = new Date().toDateString(); if (parsed.date === today) { if (parsed.profile) setProfile(parsed.profile); if (parsed.shiftId) { setShiftId(parsed.shiftId); setScreen("active"); } if (parsed.checked) setChecked(parsed.checked); if (parsed.varTasks) setVarTasks(parsed.varTasks); } } } catch (_) {}
    try { const g = localStorage.getItem("lb-gestion"); if (g) setGState(JSON.parse(g)); else setGState({ weekly:{}, monthly:{} }); } catch (_) { setGState({ weekly:{}, monthly:{} }); }
    console.log("[DEBUG] ========== LOADALL COMPLETED ==========");
    setLoading(false);
  }

  async function saveDaily(patch: any) { const u = { date: new Date().toDateString(), profile, shiftId, checked, varTasks, ...patch }; try { localStorage.setItem("lb-daily", JSON.stringify(u)); } catch (_) {} }

  function chooseProfile(p: string) { const dayIdx = now.getDay(); const s = pickShiftForProfile(planning, p, dayIdx, now.getHours()); setProfile(p); setShiftId(s); setScreen("shift"); saveDaily({ profile: p, shiftId: s }); }

  async function play() { setLaunching(true); await new Promise(r => setTimeout(r, 550)); setScreen("active"); setLaunching(false); saveDaily({ shiftId, checked: {} }); setChecked({}); }

  function toggle(id: string) { const u = { ...checked, [id]: !checked[id] }; setChecked(u); saveDaily({ checked: u }); }

  function toggleG(kind: string, id: string) { const u = { ...gState, [kind]: { ...gState[kind], [id]: !gState[kind][id] } }; setGState(u); try { localStorage.setItem("lb-gestion", JSON.stringify(u)); } catch (_) {} }

  function addVar() { if (!newTask.trim()) return; const t = { id: uid("v"), label: newTask.trim() }; const u = [...varTasks, t]; setVarTasks(u); setNewTask(""); saveDaily({ varTasks: u }); }
  function removeVar(id: string) { const u = varTasks.filter(t => t.id !== id); setVarTasks(u); saveDaily({ varTasks: u }); }
  function toggleVar(id: string) { const u = varTasks.map(t => t.id === id ? { ...t, done: !t.done } : t); setVarTasks(u); saveDaily({ varTasks: u }); }

  async function endShift() { const shift = shifts[shiftId || ""]; if (shift && profile) { const all = shift.slots.flatMap(s => s.tasks); const done = all.filter(t => checked[t.id]).length; const entry = { id: uid("h"), date: new Date().toDateString(), day: now.getDay(), profile: profile as string, shiftId: shiftId as string, tasksTotal: all.length, tasksDone: done, completion: all.length ? Math.round((done/all.length)*100) : 0, ts: Date.now() }; const u = [...history, entry]; setHistory(u); try { localStorage.setItem("lb-history", JSON.stringify(u)); } catch (_) {} } setScreen("profile"); setProfile(null); setShiftId(null); setChecked({}); setVarTasks([]); try { localStorage.removeItem("lb-daily"); } catch (_) {} }

  function updateTaskLabel(shId: string, slotId: string, taskId: string, val: string) { const u = { ...shifts }; const sh = { ...u[shId] }; sh.slots = sh.slots.map(sl => sl.id !== slotId ? sl : { ...sl, tasks: sl.tasks.map(t => t.id === taskId ? { ...t, label: val } : t) }); u[shId] = sh; setShifts(u); try { localStorage.setItem("lb-shifts", JSON.stringify(u)); } catch (_) {} }
  function removeTask(shId: string, slotId: string, taskId: string) { const u = { ...shifts }; const sh = { ...u[shId] }; sh.slots = sh.slots.map(sl => sl.id !== slotId ? sl : { ...sl, tasks: sl.tasks.filter(t => t.id !== taskId) }); u[shId] = sh; setShifts(u); try { localStorage.setItem("lb-shifts", JSON.stringify(u)); } catch (_) {} }
  function addTask(shId: string, slotId: string) { const text = (newTaskBySlot[slotId] || "").trim(); if (!text) return; const u = { ...shifts }; const sh = { ...u[shId] }; sh.slots = sh.slots.map(sl => sl.id !== slotId ? sl : { ...sl, tasks: [...sl.tasks, { id: uid("t"), label: text }] }); u[shId] = sh; setShifts(u); try { localStorage.setItem("lb-shifts", JSON.stringify(u)); } catch (_) {} setNewTaskBySlot({ ...newTaskBySlot, [slotId]: "" }); }
  function removeSlot(shId: string, slotId: string) { const u = { ...shifts }; const sh = { ...u[shId] }; sh.slots = sh.slots.filter(sl => sl.id !== slotId); u[shId] = sh; setShifts(u); try { localStorage.setItem("lb-shifts", JSON.stringify(u)); } catch (_) {} }
  function addSlot(shId: string) { if (!newSlotLabel.trim()) return; const u = { ...shifts }; const sh = { ...u[shId] }; sh.slots = [...sh.slots, { id: uid("slot"), time: newSlotLabel.trim(), tasks: [] }]; u[shId] = sh; setShifts(u); try { localStorage.setItem("lb-shifts", JSON.stringify(u)); } catch (_) {} setNewSlotLabel(""); }
  function addAssignment(dayIdx: number, shId: string, prof: string) { const u = { ...planning }; const arr = u[dayIdx] || []; u[dayIdx] = [...arr, { id: uid("p"), shiftId: shId, profile: prof }]; setPlanning(u); try { localStorage.setItem("lb-planning", JSON.stringify(u)); } catch (_) {} }
  function removeAssignment(dayIdx: number, id: string) { const u = { ...planning }; u[dayIdx] = (u[dayIdx] || []).filter(a => a.id !== id); setPlanning(u); try { localStorage.setItem("lb-planning", JSON.stringify(u)); } catch (_) {} }

  // Note: validateWeek() remplacée par validateWeekNew() pour le nouveau système de validation

  function addUnforeseen() {
    console.log("[DEBUG] ========== addUnforeseen() CALLED ==========");
    console.log("[DEBUG] Current unforeseen state:", unforeseen);

    // VALIDATION 1: Vérifier dateStart
    if (!unforeseen.dateStart || unforeseen.dateStart.trim() === "") {
      const msg = "❌ ERREUR: La date de début est obligatoire";
      console.error("[DEBUG] VALIDATION FAILED - dateStart empty:", msg);
      setUnforeseen_error(msg);
      return;
    }

    // VALIDATION 2: Vérifier dateEnd
    if (!unforeseen.dateEnd || unforeseen.dateEnd.trim() === "") {
      const msg = "❌ ERREUR: La date de fin est obligatoire";
      console.error("[DEBUG] VALIDATION FAILED - dateEnd empty:", msg);
      setUnforeseen_error(msg);
      return;
    }

    // VALIDATION 3: Vérifier reason
    if (!unforeseen.reason || unforeseen.reason.trim() === "") {
      const msg = "❌ ERREUR: La raison de l'absence est obligatoire";
      console.error("[DEBUG] VALIDATION FAILED - reason empty:", msg);
      setUnforeseen_error(msg);
      return;
    }

    // VALIDATION 4: Vérifier que la date de fin >= date de début
    const startDate = new Date(unforeseen.dateStart);
    const endDate = new Date(unforeseen.dateEnd);
    if (endDate < startDate) {
      const msg = "❌ ERREUR: La date de fin doit être après la date de début";
      console.error("[DEBUG] VALIDATION FAILED - dateEnd before dateStart:", msg);
      setUnforeseen_error(msg);
      return;
    }

    console.log("[DEBUG] ✓ All validations passed");
    setUnforeseen_error(""); // Effacer les erreurs précédentes

    // Normaliser les dates en YYYY-MM-DD
    const normalizedStart = formatDateString(unforeseen.dateStart);
    const normalizedEnd = formatDateString(unforeseen.dateEnd);

    console.log("[DEBUG] Raw input - dateStart:", unforeseen.dateStart, "dateEnd:", unforeseen.dateEnd);
    console.log("[DEBUG] Normalized - dateStart:", normalizedStart, "dateEnd:", normalizedEnd);
    console.log("[DEBUG] Profile:", unforeseen.assignedProfile);
    console.log("[DEBUG] TimeSlot:", unforeseen.timeSlot);
    console.log("[DEBUG] Reason:", unforeseen.reason.substring(0, 50) + "...");

    // Créer l'objet Unforeseen
    const u: Unforeseen = {
      id: uid("uf"),
      dateStart: normalizedStart,
      dateEnd: normalizedEnd,
      timeSlot: unforeseen.timeSlot,
      customTime: unforeseen.timeSlot === "custom" ? unforeseen.customTime : undefined,
      profile: unforeseen.assignedProfile,
      reason: unforeseen.reason.trim(),
      status: "pending"
    };

    const updated = [...unforeseens, u];
    console.log("[DEBUG] Created unforeseen object:", JSON.stringify(u, null, 2));
    console.log("[DEBUG] Total unforeseens after add:", updated.length);
    console.log("[DEBUG] All unforeseens:", updated.map(uf => ({ id: uf.id, profile: uf.profile, dateStart: uf.dateStart, dateEnd: uf.dateEnd, status: uf.status })));

    // Mettre à jour l'état (la sauvegarde en localStorage sera faite automatiquement par le useEffect)
    console.log("[DEBUG] Calling setUnforeseens with", updated.length, "items");
    setUnforeseens(updated);

    // Réinitialiser le formulaire
    console.log("[DEBUG] Resetting form state");
    setUnforeseen({ dateStart: "", dateEnd: "", timeSlot: "full", reason: "", customTime: { start: "", end: "" }, assignedProfile: "JORDAN" });

    // Fermer le formulaire
    console.log("[DEBUG] Closing form (setShowUnforeseen to false)");
    setShowUnforeseen(false);

    // Afficher le message de succès
    setUnforeseen_success(true);
    setTimeout(() => {
      console.log("[DEBUG] Clearing success message");
      setUnforeseen_success(false);
    }, 3000);

    console.log("[DEBUG] ✓ Unforeseen added successfully. Will be auto-saved by useEffect");
  }

  function updateUnforeseen(id: string, status: "pending" | "accepted" | "rejected") {
    console.log(`[DEBUG] ========== UPDATE UNFORESEEN START ==========`);
    console.log(`[DEBUG] Updating unforeseen ${id} to status: ${status}`);
    console.log(`[DEBUG] Current unforeseens count: ${unforeseens.length}`);

    // Chercher l'imprévu à mettre à jour
    const targetUnforeseen = unforeseens.find(uf => uf.id === id);
    if (!targetUnforeseen) {
      console.error(`[DEBUG] ✗ CRITICAL ERROR: No unforeseen found with id=${id}`);
      console.error(`[DEBUG] Available IDs:`, unforeseens.map(uf => uf.id));
      return;
    }

    console.log(`[DEBUG] Found unforeseen: profile=${targetUnforeseen.profile}, dateStart=${targetUnforeseen.dateStart}, current status=${targetUnforeseen.status}`);

    // Créer le nouvel array
    const u = unforeseens.map(uf => {
      if (uf.id === id) {
        console.log(`[DEBUG] Updating: ${uf.profile} from "${uf.status}" to "${status}"`);
        return { ...uf, status };
      }
      return uf;
    });

    // Vérifier que la mise à jour a bien eu lieu
    const updated = u.find(uf => uf.id === id);
    if (updated && updated.status !== status) {
      console.error(`[DEBUG] ✗ CRITICAL ERROR: Status update failed! Expected: ${status}, Got: ${updated.status}`);
      return;
    }

    console.log("[DEBUG] Updated array:", u.map(uf => ({ id: uf.id, profile: uf.profile, status: uf.status, reason: uf.reason.substring(0, 30) })));

    // Mettre à jour le state (ceci sera auto-sauvegardé par le useEffect)
    console.log("[DEBUG] Calling setUnforeseens()...");
    setUnforeseens(u);

    console.log(`[DEBUG] ✓ Successfully updated unforeseen ${id} to ${status}`);
    console.log(`[DEBUG] ========== UPDATE UNFORESEEN END ==========`);
  }

  function deleteUnforeseen(id: string) {
    console.log(`[DEBUG] ========== DELETE UNFORESEEN START ==========`);
    console.log(`[DEBUG] Deleting unforeseen ${id}`);

    const confirmed = window.confirm("Êtes-vous sûr de vouloir supprimer cet imprévu ? Cette action ne peut pas être annulée.");
    if (!confirmed) {
      console.log("[DEBUG] Deletion cancelled by user");
      return;
    }

    const u = unforeseens.filter(uf => uf.id !== id);

    console.log("[DEBUG] Updated array:", u.map(uf => ({ id: uf.id, profile: uf.profile, status: uf.status })));
    console.log("[DEBUG] Calling setUnforeseens()...");

    setUnforeseens(u);
    console.log(`[DEBUG] ✓ Successfully deleted unforeseen ${id}`);
    console.log(`[DEBUG] ========== DELETE UNFORESEEN END ==========`);
  }

  function startEditUnforeseen(id: string) {
    console.log(`[DEBUG] ========== EDIT UNFORESEEN START ==========`);
    console.log(`[DEBUG] Starting edit for unforeseen ${id}`);

    const targetUnforeseen = unforeseens.find(uf => uf.id === id);
    if (!targetUnforeseen) {
      console.error(`[DEBUG] ✗ No unforeseen found with id=${id}`);
      return;
    }

    setEditingUnforeseenId(id);
    setEditingUnforeseen({
      ...targetUnforeseen,
      customTime: targetUnforeseen.customTime || { start: "", end: "" }
    });
    console.log("[DEBUG] Editing unforeseen:", targetUnforeseen);
  }

  function saveEditedUnforeseen() {
    console.log(`[DEBUG] ========== SAVE EDITED UNFORESEEN START ==========`);

    if (!editingUnforeseen) {
      console.error("[DEBUG] ✗ No unforeseen being edited");
      return;
    }

    // Validations
    if (!editingUnforeseen.dateStart || editingUnforeseen.dateStart.trim() === "") {
      setUnforeseen_error("❌ ERREUR: La date de début est obligatoire");
      return;
    }

    if (!editingUnforeseen.dateEnd || editingUnforeseen.dateEnd.trim() === "") {
      setUnforeseen_error("❌ ERREUR: La date de fin est obligatoire");
      return;
    }

    if (!editingUnforeseen.reason || editingUnforeseen.reason.trim() === "") {
      setUnforeseen_error("❌ ERREUR: La raison de l'absence est obligatoire");
      return;
    }

    const startDate = new Date(editingUnforeseen.dateStart);
    const endDate = new Date(editingUnforeseen.dateEnd);
    if (endDate < startDate) {
      setUnforeseen_error("❌ ERREUR: La date de fin doit être après la date de début");
      return;
    }

    setUnforeseen_error("");

    // Normaliser les dates
    const normalizedStart = formatDateString(editingUnforeseen.dateStart);
    const normalizedEnd = formatDateString(editingUnforeseen.dateEnd);

    // Mettre à jour dans le tableau
    const u = unforeseens.map(uf => {
      if (uf.id === editingUnforeseenId) {
        return {
          ...editingUnforeseen,
          dateStart: normalizedStart,
          dateEnd: normalizedEnd,
          customTime: editingUnforeseen.timeSlot === "custom" ? editingUnforeseen.customTime : undefined
        };
      }
      return uf;
    });

    console.log("[DEBUG] Updated unforeseens:", u.map(uf => ({ id: uf.id, profile: uf.profile, status: uf.status })));

    setUnforeseens(u);
    setEditingUnforeseenId(null);
    setEditingUnforeseen(null);

    setUnforeseen_success(true);
    setTimeout(() => setUnforeseen_success(false), 3000);

    console.log(`[DEBUG] ✓ Successfully saved edited unforeseen`);
    console.log(`[DEBUG] ========== SAVE EDITED UNFORESEEN END ==========`);
  }

  function cancelEditUnforeseen() {
    console.log("[DEBUG] Cancelling edit");
    setEditingUnforeseenId(null);
    setEditingUnforeseen(null);
    setUnforeseen_error("");
  }

  if (loading) return <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#fff" }}><div style={{ fontFamily:"monospace", fontSize:11, color:"#CCC", letterSpacing:"0.2em" }}>CHARGEMENT</div></div>;

  // Debug: Log unforeseens state on every render
  console.log(`[DEBUG RENDER] ========== RENDER STATE ==========`);
  console.log(`[DEBUG RENDER] Total unforeseens in state: ${unforeseens.length}`);
  if (unforeseens.length > 0) {
    console.log("[DEBUG RENDER] Unforeseens content:", unforeseens.map(u => ({
      id: u.id,
      profile: u.profile,
      dateStart: u.dateStart,
      dateEnd: u.dateEnd,
      status: u.status,
      reason: u.reason,
      normalized: { start: u.dateStart ? formatDateString(u.dateStart) : 'N/A', end: u.dateEnd ? formatDateString(u.dateEnd) : 'N/A' }
    })));
    const pending = unforeseens.filter(u => u.status === "pending");
    console.log(`[DEBUG RENDER] Pending unforeseens: ${pending.length}`);
  } else {
    console.log("[DEBUG RENDER] No unforeseens in state");
  }

  const shift = shiftId ? shifts[shiftId] : null;
  const hour = now.getHours();
  const allTasks = shift ? shift.slots.flatMap(s => s.tasks) : [];
  const doneCount = allTasks.filter(t => checked[t.id]).length;
  const progress = allTasks.length ? Math.round((doneCount / allTasks.length) * 100) : 0;
  const timeStr = `${hour}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateStr = `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  const wrap = { maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"#fff", fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif", color:"#0A0A0A" };
  const hdr  = { padding:"18px 20px 14px", borderBottom:"1px solid #E8E8E8", display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"sticky" as const, top:0, background:"#fff", zIndex:20 };
  const logo = { fontSize:13, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase" as const };
  const eyebrow = { fontSize:10, color:"#AAA", letterSpacing:"0.1em", textTransform:"uppercase" as const, marginTop:2 };
  const body = { padding:"0 20px 120px" };

  function slotState(slot: Slot, idx: number, slots: Slot[]) {
    for (let i = 0; i < idx; i++) { const prevDone = slots[i].tasks.every(t => checked[t.id]); if (!prevDone && slots[i].tasks.length > 0) return "locked"; }
    const done = slot.tasks.length > 0 && slot.tasks.every(t => checked[t.id]);
    if (done) return "done";
    return "open";
  }

  const myHistory = history.filter(h => h.profile === profile);
  const totalShifts = myHistory.length;
  const avgCompletion = totalShifts ? Math.round(myHistory.reduce((a,h)=>a+h.completion,0)/totalShifts) : 0;
  const totalTasksDone = myHistory.reduce((a,h)=>a+h.tasksDone,0);
  let streak = 0;
  const sorted = [...myHistory].sort((a,b)=>b.ts-a.ts);
  for (const h of sorted) { if (h.completion >= 90) streak++; else break; }
  const last7 = sorted.slice(0,7).reverse();

  // SCREEN: PROFILE
  if (screen === "profile") return (
    <>
      <div style={wrap as any}>
        <div style={hdr as any}><div><div style={logo as any}>La Box</div><div style={eyebrow as any}>Metz</div></div><div style={{ fontSize:11, color:"#CCC", letterSpacing:"0.05em", marginTop:4 }}>{dateStr}</div></div>
        <div style={{ ...body, paddingTop:64 } as any}>
          <div style={{ ...label, marginBottom:32 } as any}>Qui prend le shift ?</div>
          {PROFILES.map(p => (
            <button key={p} onClick={() => chooseProfile(p)} style={{ display:"block", width:"100%", padding:"20px 24px", marginBottom:10, background:"#0A0A0A", color:"#fff", border:"none", borderRadius:3, fontSize:15, fontWeight:800, letterSpacing:"0.16em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", textAlign:"left" } as any}>{p}</button>
          ))}
          <div style={{ marginTop:40, paddingTop:16, borderTop:"1px solid #F0F0F0", display:"flex", flexDirection:"column", gap:8 } as any}>
            <div style={{ ...label, marginBottom:4 } as any}>Outils</div>
            <button onClick={() => setScreen("calendar")} style={{ ...btnGhost, width:"100%", textAlign:"left" } as any}>📆 Calendrier visuel →</button>
            <button onClick={() => setScreen("planning")} style={{ ...btnGhost, width:"100%", textAlign:"left" } as any}>📅 Planning 2 semaines →</button>
            <button onClick={() => setScreen("editor")} style={{ ...btnGhost, width:"100%", textAlign:"left" } as any}>🛠 Modifier les fiches de poste →</button>
            <button onClick={() => { setScreen("active"); setTab("gestion"); }} style={{ ...btnGhost, width:"100%", textAlign:"left" } as any}>📋 Tâches de gestion →</button>
            <button onClick={() => setScreen("unforeseens")} style={{ ...btnGhost, width:"100%", textAlign:"left" } as any}>⚠️ Imprévus & Remplaçants →</button>
          </div>
        </div>
      </div>
    </>
  );

  // SCREEN: CALENDAR (VISUAL & PRINTABLE)
  if (screen === "calendar") return (
    <div style={{ background:"linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%)", minHeight:"100vh", padding:"30px 20px", fontFamily:"'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:40, maxWidth:1200, margin:"0 auto 40px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <button onClick={() => setScreen("profile")} style={{ padding:"10px 16px", background:"#fff", color:"#666", border:"1px solid #ddd", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", boxShadow:"0 1px 3px rgba(0,0,0,0.08)" }}>← RETOUR</button>
          <button onClick={() => { window.print(); }} style={{ padding:"10px 16px", background:"#0A0A0A", color:"#fff", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.15)" }}>🖨️ IMPRIMER</button>
        </div>
        <h1 style={{ margin:"0 0 6px 0", fontSize:42, fontWeight:900, color:"#0A0A0A", letterSpacing:"-1px" }}>La Box Karaoke</h1>
        <h2 style={{ margin:0, fontSize:20, color:"#666", fontWeight:500 }}>Planning Mensuel — {MONTHS[now.getMonth()]} {now.getFullYear()}</h2>
        <p style={{ margin:"12px 0 0 0", fontSize:13, color:"#999" }}>{DAYS_FULL[now.getDay()]} {now.getDate()} {MONTHS[now.getMonth()]}</p>
      </div>

      {/* Calendar Grid */}
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        {Array.from({ length: 4 }).map((_, weekIdx) => {
          const mondayOffset = Math.ceil((now.getDay() - 1) * -1);
          const weekStart = getDateFromDayOffset(mondayOffset + weekIdx * 7);
          const weekEnd = getDateFromDayOffset(mondayOffset + weekIdx * 7 + 6);
          const weekStartStr = weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
          const weekEndStr = weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

          return (
            <div key={weekIdx} style={{ marginBottom:48, pageBreakInside:"avoid" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <h3 style={{ fontSize:16, fontWeight:800, margin:0, color:"#0A0A0A", flex:1 }}>
                  📅 Semaine du {weekStartStr} au {weekEndStr}
                </h3>
                <div style={{ height:2, flex:1, background:"linear-gradient(90deg, #2196F3 0%, #FF9800 100%)", borderRadius:1 }} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:12 }}>
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const offset = mondayOffset + weekIdx * 7 + dayIdx;
                  const date = getDateFromDayOffset(offset);
                  const dayOfWeek = date.getDay();
                  const dIdx = dayOfWeek;
                  const assigns = todaysAssignments(planning, dIdx);
                  const dateFormatted = formatDate(date);
                  const isToday = formatDate(now) === dateFormatted;

                  // Check if any unforeseen exists for this date
                  if (unforeseens.length > 0) {
                    console.log(`[DEBUG CALENDAR] Date=${dateFormatted}, unforeseens count=${unforeseens.length}`);
                    unforeseens.forEach(u => {
                      const normStart = u.dateStart ? formatDateString(u.dateStart) : 'N/A';
                      const normEnd = u.dateEnd ? formatDateString(u.dateEnd) : 'N/A';
                      console.log(`  - Profile=${u.profile}, status=${u.status}, dateStart=${u.dateStart}(norm: ${normStart}), dateEnd=${u.dateEnd}(norm: ${normEnd})`);
                    });
                  }
                  const unforeseenEvents = unforeseens.filter(u => {
                    if (!u.dateStart || !u.dateEnd) return false;
                    const normStart = formatDateString(u.dateStart);
                    const normEnd = formatDateString(u.dateEnd);
                    if (!normStart || !normEnd) return false;
                    return (u.status === "pending" || u.status === "accepted") && dateFormatted >= normStart && dateFormatted <= normEnd;
                  });
                  const hasUnforeseen = unforeseenEvents.length > 0;

                  return (
                    <div
                      key={dayIdx}
                      style={{
                        borderRadius: 12,
                        padding: 18,
                        background: isToday ? "linear-gradient(135deg, #fff3e0 0%, #ffe8cc 100%)" : hasUnforeseen ? "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)" : "#fff",
                        minHeight: 280,
                        display: "flex",
                        flexDirection: "column",
                        pageBreakInside: "avoid",
                        border: isToday ? "3px solid #FF6F00" : hasUnforeseen ? "3px solid #DC3545" : "1px solid #e0e0e0",
                        boxShadow: isToday ? "0 8px 24px rgba(255, 111, 0, 0.2)" : hasUnforeseen ? "0 8px 24px rgba(220, 53, 69, 0.15)" : "0 2px 8px rgba(0, 0, 0, 0.06)",
                        position: "relative" as const,
                        overflow: "hidden" as const
                      }}
                    >
                      {/* Decorative corner accent */}
                      <div style={{ position:"absolute", top:0, right:0, width:60, height:60, background:"radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 100%)", borderRadius:"0 0 0 100%" }} />

                      {/* Day Header */}
                      <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "2px solid rgba(0,0,0,0.08)", position:"relative", zIndex:1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#999", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{DAYS[dIdx]}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                          <div style={{ fontSize: 32, fontWeight: 900, color: "#0A0A0A", lineHeight:1 }}>{date.getDate()}</div>
                          {isToday && <span style={{ background:"#FF6F00", color:"#fff", padding:"2px 8px", borderRadius:4, fontSize:9, fontWeight:700, letterSpacing:"0.05em" }}>AUJOURD&apos;HUI</span>}
                        </div>
                        <div style={{ fontSize: 10, color: "#999", marginTop:2 }}>{MONTHS[date.getMonth()]}</div>
                      </div>

                      {/* Unforeseen Events */}
                      {hasUnforeseen && (
                        <div style={{ marginBottom: 14, padding: 12, background: "rgba(220, 53, 69, 0.08)", borderLeft: "4px solid #DC3545", borderRadius: 6 }}>
                          {unforeseenEvents.map((uf, idx) => {
                            const timeLabel = uf.timeSlot === "full" ? "Journée complète" :
                                             uf.timeSlot === "morning" ? "Matin (08h-12h)" :
                                             uf.timeSlot === "afternoon" ? "Après-midi (14h-19h)" :
                                             `${uf.customTime?.start || "—"} - ${uf.customTime?.end || "—"}`;
                            return (
                              <div key={idx} style={{ marginBottom: idx < unforeseenEvents.length - 1 ? 8 : 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#DC3545", marginBottom: 3, display:"flex", gap:4, alignItems:"center" }}>
                                  <span style={{fontSize:14}}>🔴</span> {uf.reason}
                                </div>
                                <div style={{ fontSize: 10, color: "#C41C3B", marginBottom: 2, display:"flex", gap:4, alignItems:"center" }}>
                                  <span>🕐</span> {timeLabel}
                                </div>
                                <div style={{ fontSize: 9, color: "#999" }}>({uf.profile})</div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Assignments */}
                      <div style={{ flex: 1, position:"relative", zIndex:1 }}>
                        {assigns.length === 0 ? (
                          <div style={{ fontSize: 12, color: "#ccc", fontStyle:"italic", textAlign:"center", paddingTop:20, paddingBottom:20 }}>Aucune affectation</div>
                        ) : (
                          assigns.map((a, idx) => {
                            const effective = getEffectiveAssignment(date, a, unforeseens);
                            const isJordan = effective.profile === "JORDAN";
                            const bgGradient = isJordan ? "linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)" : "linear-gradient(135deg, #F57C00 0%, #FFB74D 100%)";
                            const accentColor = isJordan ? "#0D47A1" : "#E65100";

                            const customUnforeseen = effective.timeSlot === "custom" ? unforeseens.find(u => {
                              if (!u.dateStart || !u.dateEnd) return false;
                              const dateStr = formatDate(date);
                              return u.profile === effective.originalProfile && dateStr && dateStr >= u.dateStart && dateStr <= u.dateEnd;
                            }) : null;
                            const timeLabel = effective.isReplacement
                              ? effective.timeSlot === "full"
                                ? "Journée complète"
                                : effective.timeSlot === "morning"
                                ? "Matin (08h-12h)"
                                : effective.timeSlot === "afternoon"
                                ? "Après-midi (14h-19h)"
                                : `${customUnforeseen?.customTime?.start || "—"} - ${customUnforeseen?.customTime?.end || "—"}`
                              : "";

                            return (
                              <div
                                key={idx}
                                style={{
                                  fontSize: 11,
                                  marginBottom: idx < assigns.length - 1 ? 10 : 0,
                                  padding: 11,
                                  background: bgGradient,
                                  color: "#fff",
                                  borderRadius: 8,
                                  borderLeft: `4px solid ${accentColor}`,
                                  boxShadow: effective.isReplacement ? "0 4px 12px rgba(220,53,69,0.25)" : "0 2px 6px rgba(0,0,0,0.12)",
                                  position:"relative",
                                  overflow:"hidden",
                                  opacity: effective.isReplacement ? 1 : 1,
                                  borderTop: effective.isReplacement ? "2px solid rgba(255,255,255,0.5)" : "none"
                                }}
                              >
                                <div style={{position:"absolute", top:0, right:0, width:30, height:30, background:"rgba(255,255,255,0.1)", borderRadius:"0 0 0 100%"}} />
                                <div style={{position:"relative", zIndex:1}}>
                                  <div style={{ fontWeight: 700, fontSize:12, marginBottom:2, display:"flex", alignItems:"center", gap:6 }}>
                                    <span>👤</span> {effective.profile}
                                    {effective.isReplacement && <span style={{ fontSize:10, background:"rgba(255,255,255,0.3)", padding:"2px 6px", borderRadius:3, fontWeight:700, marginLeft:"auto" }}>⚠️ REMPLACE</span>}
                                  </div>
                                  {effective.isReplacement && (
                                    <div style={{ fontSize: 9, opacity: 0.8, marginBottom: 2, color: "rgba(255,255,255,0.9)" }}>remplace {effective.originalProfile}</div>
                                  )}
                                  <div style={{ fontSize: 10, opacity: 0.95, marginBottom:2 }}>{(shifts[effective.shiftId] || {}).label || effective.shiftId}</div>
                                  {effective.isReplacement && effective.timeSlot && effective.timeSlot !== "full" && (
                                    <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 4, marginTop: 4 }}>🕐 {timeLabel}</div>
                                  )}
                                  <div style={{ fontSize: 9, opacity: 0.8 }}>{(shifts[effective.shiftId] || {}).sub || "—"}</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend & Info */}
      <div style={{ maxWidth:1200, margin:"0 auto", marginTop:50, pageBreakInside:"avoid" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:20, marginBottom:30 }}>
          {/* Color Legend */}
          <div style={{ padding:20, background:"#fff", borderRadius:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", border:"1px solid #e0e0e0" }}>
            <h4 style={{ margin:"0 0 16px 0", fontSize:13, fontWeight:700, color:"#0A0A0A", display:"flex", gap:8, alignItems:"center" }}>
              <span style={{fontSize:18}}>🎨</span> Couleurs & Assignations
            </h4>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ width:24, height:24, background:"linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)", borderRadius:6, boxShadow:"0 2px 4px rgba(0,0,0,0.1)" }} />
                <div>
                  <div style={{fontWeight:700, fontSize:12, color:"#0A0A0A"}}>Jordan</div>
                  <div style={{fontSize:10, color:"#666"}}>Bleu — Assignations habituelles</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ width:24, height:24, background:"linear-gradient(135deg, #F57C00 0%, #FFB74D 100%)", borderRadius:6, boxShadow:"0 2px 4px rgba(0,0,0,0.1)" }} />
                <div>
                  <div style={{fontWeight:700, fontSize:12, color:"#0A0A0A"}}>Clément</div>
                  <div style={{fontSize:10, color:"#666"}}>Orange — Assignations habituelles</div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div style={{ padding:20, background:"#fff", borderRadius:12, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", border:"1px solid #e0e0e0" }}>
            <h4 style={{ margin:"0 0 16px 0", fontSize:13, fontWeight:700, color:"#0A0A0A", display:"flex", gap:8, alignItems:"center" }}>
              <span style={{fontSize:18}}>📌</span> États des jours
            </h4>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ width:24, height:24, background:"#fff", border:"3px solid #FF6F00", borderRadius:6, boxShadow:"0 2px 4px rgba(255,111,0,0.2)" }} />
                <div>
                  <div style={{fontWeight:700, fontSize:12, color:"#0A0A0A"}}>Aujourd&apos;hui</div>
                  <div style={{fontSize:10, color:"#666"}}>Jour courant — Mis en évidence</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ width:24, height:24, background:"#ffebee", border:"3px solid #DC3545", borderRadius:6, boxShadow:"0 2px 4px rgba(220,53,69,0.15)" }} />
                <div>
                  <div style={{fontWeight:700, fontSize:12, color:"#0A0A0A"}}>Imprévu</div>
                  <div style={{fontSize:10, color:"#666"}}>🔴 Signalé — À gérer</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div style={{ padding:20, background:"linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)", borderRadius:12, border:"1px solid #c5cae9" }}>
          <div style={{ fontSize:12, color:"#333", lineHeight:1.6 }}>
            <strong>💡 Informations :</strong> Ce planning affiche tous les shifts assignés et les imprévus signalés.
            Les jours avec un imprévu sont surlignés en rouge. Pour mettre à jour le planning,
            utilisez la section &quot;Planning 2 semaines&quot; ou &quot;Imprévus &amp; Remplaçants&quot;.
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: #fff !important; }
          div { background-image: none !important; box-shadow: none !important; }
          button { display: none !important; }
          div[style*="pageBreakInside"] { page-break-inside: avoid !important; }
          a { color: black !important; }
        }
      `}</style>
    </div>
  );

  // SCREEN: PLANNING (2 WEEKS)
  if (screen === "planning") return (
    <div style={wrap as any}>
      <div style={hdr as any}><div><div style={logo as any}>Planning 2 semaines</div><div style={eyebrow as any}>Assignation par jour</div></div><button onClick={() => setScreen("profile")} style={{ background:"none", border:"none", fontSize:11, color:"#AAA", cursor:"pointer", fontFamily:"inherit", marginTop:4 } as any}>← retour</button></div>
      <div style={{ ...body, paddingTop:24 } as any}>
        {/* Affichage des semaines avec badges de deadline */}
        {Array.from({ length: 4 }).map((_, weekIdx) => {
          const mondayOffset = Math.ceil((now.getDay() - 1) * -1);
          const weekStart = getDateFromDayOffset(mondayOffset + weekIdx * 7);
          const weekEnd = getDateFromDayOffset(mondayOffset + weekIdx * 7 + 6);
          const weekKey = formatDate(weekStart);
          const validation = weekValidations[weekKey];
          const { status, daysUntil } = getWeekValidationStatus(weekKey, weekValidations, now);

          const weekStartStr = weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
          const weekEndStr = weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
          const deadline = validation?.deadline || getValidationDeadline(weekKey);

          let badgeBg = "#F5F5F5", badgeColor = "#999", badgeText = "⏳ À valider";
          if (status === "validated") {
            badgeBg = "#D4EDDA";
            badgeColor = "#28A745";
            badgeText = "✓ Validé";
          } else if (status === "critical" && daysUntil < 0) {
            badgeBg = "#F8D7DA";
            badgeColor = "#DC3545";
            badgeText = "⚠️ Deadline passée";
          } else if (status === "warning") {
            badgeBg = "#FFF3CD";
            badgeColor = "#856404";
            badgeText = `⏳ Deadline dans ${daysUntil} jour${daysUntil !== 1 ? 's' : ''}`;
          }

          return (
            <div key={weekIdx} style={{ marginBottom:32, paddingBottom:24, borderBottom: weekIdx === 1 ? "none" : "2px solid #E8E8E8" }}>
              <div style={{ marginBottom:14, padding:12, background:badgeBg, borderRadius:4, border:`1px solid ${badgeColor}30` }}>
                <div style={{ fontSize:11, fontWeight:700, color:badgeColor, marginBottom:4 }}>📅 Semaine du {weekStartStr} au {weekEndStr}</div>
                <div style={{ fontSize:11, fontWeight:700, color:badgeColor }}>{badgeText}</div>
                {!validation?.validatedAt && <div style={{ fontSize:10, color:badgeColor, marginTop:4, opacity:0.8 }}>À valider avant le {deadline}</div>}
                {!validation?.validatedAt && <button onClick={() => { validateWeekNew(formatDate(weekStart), formatDate(weekEnd)); setTab("gestion"); }} style={{ marginTop:8, padding:"6px 12px", background:badgeColor, color:"#fff", border:"none", borderRadius:3, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" } as any}>Valider →</button>}
              </div>

              {/* Affichage des jours de la semaine */}
              {Array.from({ length: 7 }).map((_, dayOffset) => {
                const offset = (weekIdx * 7) + dayOffset;
                const date = getDateFromDayOffset(mondayOffset + offset);
                const dIdx = (now.getDay() + offset) % 7;
                const dName = DAYS_FULL[dIdx];
                const dateStr = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
                const assigns = todaysAssignments(planning, dIdx);
                const dateFormatted = formatDate(date);
                const unforeseenEvents = unforeseens.filter(u => {
                  if (!u.dateStart || !u.dateEnd) return false;
                  const normStart = formatDateString(u.dateStart);
                  const normEnd = formatDateString(u.dateEnd);
                  if (!normStart || !normEnd) return false;
                  return (u.status === "pending" || u.status === "accepted") && dateFormatted >= normStart && dateFormatted <= normEnd;
                });
                const hasUnforeseen = unforeseenEvents.length > 0;

                return (
                  <div key={offset} style={{ marginBottom:16, paddingBottom:12, borderBottom:"1px solid #F0F0F0" }}>
                    <div style={{ fontSize:13, fontWeight:800, letterSpacing:"0.04em", marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
                      {dName} {dateStr}
                      {hasUnforeseen && <span style={{ fontSize:11, color:"#DC3545" }}>🔴 Imprévu</span>}
                    </div>
                    {hasUnforeseen && (
                      <div style={{ marginBottom: 12, padding: 10, background: "rgba(220, 53, 69, 0.08)", borderLeft: "4px solid #DC3545", borderRadius: 6 }}>
                        {unforeseenEvents.map((uf, idx) => {
                          const timeLabel = uf.timeSlot === "full" ? "Journée complète" :
                                           uf.timeSlot === "morning" ? "Matin (08h-12h)" :
                                           uf.timeSlot === "afternoon" ? "Après-midi (14h-19h)" :
                                           `${uf.customTime?.start || "—"} - ${uf.customTime?.end || "—"}`;
                          return (
                            <div key={idx} style={{ marginBottom: idx < unforeseenEvents.length - 1 ? 8 : 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#DC3545", marginBottom: 2, display:"flex", gap:4, alignItems:"center" }}>
                                <span style={{fontSize:12}}>🔴</span> {uf.reason}
                              </div>
                              <div style={{ fontSize: 10, color: "#C41C3B", marginBottom: 2, display:"flex", gap:4, alignItems:"center" }}>
                                <span>🕐</span> {timeLabel}
                              </div>
                              <div style={{ fontSize: 9, color: "#999" }}>({uf.profile})</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {assigns.length === 0 && !hasUnforeseen && <div style={{ fontSize:12, color:"#CCC", marginBottom:10 }}>Aucune affectation</div>}
                    {assigns.map(a => {
                      const effective = getEffectiveAssignment(date, a, unforeseens);
                      const customUnforeseen2 = effective.timeSlot === "custom" ? unforeseens.find(u => {
                        if (!u.dateStart || !u.dateEnd) return false;
                        const dateStr = formatDate(date);
                        return u.profile === effective.originalProfile && dateStr && dateStr >= u.dateStart && dateStr <= u.dateEnd;
                      }) : null;
                      const timeLabel = effective.isReplacement
                        ? effective.timeSlot === "full"
                          ? "Journée complète"
                          : effective.timeSlot === "morning"
                          ? "Matin (08h-12h)"
                          : effective.timeSlot === "afternoon"
                          ? "Après-midi (14h-19h)"
                          : `${customUnforeseen2?.customTime?.start || "—"} - ${customUnforeseen2?.customTime?.end || "—"}`
                          : "";

                      return (
                        <div key={a.id} style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"10px 12px", background: effective.isReplacement ? "#FFF3CD" : "#FAFAFA", borderRadius:3, marginBottom:6, borderLeft: effective.isReplacement ? "4px solid #FF9800" : "none" }}>
                          <div style={{ fontSize:13, flex:1 }}>
                            <div>
                              <b>{effective.profile}</b>
                              {effective.isReplacement && <span style={{ marginLeft:8, fontSize:11, fontWeight:700, color:"#FF6F00" }}>⚠️ REMPLACE</span>}
                            </div>
                            {effective.isReplacement && (
                              <div style={{ fontSize:11, color:"#999", marginTop:2 }}>remplace {effective.originalProfile}</div>
                            )}
                            <span style={{ color:"#999", fontSize:12 }}>· {(shifts[effective.shiftId]||{}).label || effective.shiftId}</span>
                            {effective.isReplacement && effective.timeSlot && effective.timeSlot !== "full" && (
                              <div style={{ fontSize:11, color:"#999", marginTop:2 }}>🕐 {timeLabel}</div>
                            )}
                          </div>
                          <button onClick={() => removeAssignment(dIdx, a.id)} style={{ background:"none", border:"none", fontSize:16, color:"#DDD", cursor:"pointer", flexShrink:0, marginLeft:8 } as any}>×</button>
                        </div>
                      );
                    })}
                    <AddAssignmentRow shifts={shifts} onAdd={(shId: string, prof: string) => addAssignment(dIdx, shId, prof)} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  // SCREEN: UNFORESEENS
  if (screen === "unforeseens") return (
    <div style={wrap as any}>
      <div style={hdr as any}><div><div style={logo as any}>Imprévus</div><div style={eyebrow as any}>Gestion des remplaçants</div></div><button onClick={() => setScreen("profile")} style={{ background:"none", border:"none", fontSize:11, color:"#AAA", cursor:"pointer", fontFamily:"inherit", marginTop:4 } as any}>← retour</button></div>
      <div style={{ ...body, paddingTop:24 } as any}>
        <div style={{ marginBottom:32 }}>
          <div style={{ ...label, marginBottom:16 } as any}>Signaler un imprévu</div>
          {unforeseen_success && (
            <div style={{ padding:12, marginBottom:12, background:"#d4edda", border:"1px solid #c3e6cb", borderRadius:3, color:"#155724", fontSize:13, fontWeight:700, display:"flex", gap:8, alignItems:"center" }}>
              <span style={{fontSize:16}}>✓</span> Imprévu ajouté avec succès! Le formulaire va se fermer...
            </div>
          )}
          <button onClick={() => { console.log("[DEBUG] Toggling showUnforeseen from", showUnforeseen); setShowUnforeseen(!showUnforeseen); setUnforeseen_error(""); }} style={{ ...btnGhost, width:"100%" } as any}>+ Ajouter un imprévu</button>
          {showUnforeseen && (
            <div style={{ marginTop:16, padding:16, border:"1px solid #E0E0E0", borderRadius:3 }}>
              {unforeseen_error && (
                <div style={{ padding:12, marginBottom:12, background:"#f8d7da", border:"1px solid #f5c6cb", borderRadius:3, color:"#721c24", fontSize:13, fontWeight:700, display:"flex", gap:8, alignItems:"flex-start" }}>
                  <span style={{fontSize:16, flexShrink:0}}>⚠️</span>
                  <span>{unforeseen_error}</span>
                </div>
              )}

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>Qui est absent ?</label>
                <select value={unforeseen.assignedProfile} onChange={e => setUnforeseen({ ...unforeseen, assignedProfile: e.target.value as any })} style={{ ...inputStyle, width:"100%" } as any}>
                  <option value="JORDAN">Jordan</option>
                  <option value="CLÉMENT">Clément</option>
                </select>
              </div>

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>Date de début *</label>
                <input
                  type="date"
                  value={unforeseen.dateStart}
                  onChange={e => { console.log("[DEBUG] dateStart changed to:", e.target.value); setUnforeseen({ ...unforeseen, dateStart: e.target.value }); }}
                  required
                  style={{ ...inputStyle, width:"100%", borderColor: unforeseen_error && !unforeseen.dateStart ? "#dc3545" : "#E0E0E0" } as any}
                />
              </div>

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>Date de fin *</label>
                <input
                  type="date"
                  value={unforeseen.dateEnd}
                  onChange={e => { console.log("[DEBUG] dateEnd changed to:", e.target.value); setUnforeseen({ ...unforeseen, dateEnd: e.target.value }); }}
                  required
                  style={{ ...inputStyle, width:"100%", borderColor: unforeseen_error && !unforeseen.dateEnd ? "#dc3545" : "#E0E0E0" } as any}
                />
              </div>

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>Créneau horaire</label>
                <select value={unforeseen.timeSlot} onChange={e => setUnforeseen({ ...unforeseen, timeSlot: e.target.value as any })} style={{ ...inputStyle, width:"100%" } as any}>
                  <option value="full">Journée complète</option>
                  <option value="morning">Matin (08h-12h)</option>
                  <option value="afternoon">Après-midi (14h-19h)</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </div>

              {unforeseen.timeSlot === "custom" && (
                <div style={{ marginBottom:12, padding:12, background:"#F5F5F5", borderRadius:3 }}>
                  <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <div style={{ flex:1 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>De</label>
                      <input type="time" value={unforeseen.customTime.start} onChange={e => setUnforeseen({ ...unforeseen, customTime: { ...unforeseen.customTime, start: e.target.value } })} style={{ ...inputStyle, width:"100%" } as any} />
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>À</label>
                      <input type="time" value={unforeseen.customTime.end} onChange={e => setUnforeseen({ ...unforeseen, customTime: { ...unforeseen.customTime, end: e.target.value } })} style={{ ...inputStyle, width:"100%" } as any} />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>Raison de l&apos;absence *</label>
                <textarea
                  value={unforeseen.reason}
                  onChange={e => { console.log("[DEBUG] reason changed, length:", e.target.value.length); setUnforeseen({ ...unforeseen, reason: e.target.value }); }}
                  placeholder="Raison (maladie, urgence, vacances, ...)"
                  required
                  style={{ ...inputStyle, width:"100%", height:60, marginBottom:0, borderColor: unforeseen_error && !unforeseen.reason ? "#dc3545" : "#E0E0E0" } as any}
                />
                <div style={{ fontSize:9, color:"#999", marginTop:4 }}>{unforeseen.reason.length} caractères</div>
              </div>

              <div style={{ display:"flex", gap:8, marginTop:16 }}>
                <button onClick={() => { console.log("[DEBUG] Signaler button clicked"); addUnforeseen(); }} style={{ ...btnDark, flex:1 } as any}>Signaler</button>
                <button onClick={() => { console.log("[DEBUG] Cancel button clicked"); setShowUnforeseen(false); setUnforeseen_error(""); }} style={btnGhost as any}>Annuler</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop:32, padding:16, background:"#F9F9F9", borderRadius:3 }}>
          <div style={{ ...label, marginBottom:16 } as any}>Imprévus en attente</div>
          {editingUnforeseenId && editingUnforeseen ? (
            <div style={{ padding:16, border:"1px solid #E0E0E0", borderRadius:3, background:"#fff", marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12, color:"#0A0A0A" }}>Modifier l&apos;imprévu</div>

              {unforeseen_error && (
                <div style={{ padding:12, marginBottom:12, background:"#f8d7da", border:"1px solid #f5c6cb", borderRadius:3, color:"#721c24", fontSize:13, fontWeight:700, display:"flex", gap:8, alignItems:"flex-start" }}>
                  <span style={{fontSize:16, flexShrink:0}}>⚠️</span>
                  <span>{unforeseen_error}</span>
                </div>
              )}

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>Qui est absent ?</label>
                <select value={editingUnforeseen.profile} onChange={e => setEditingUnforeseen({ ...editingUnforeseen, profile: e.target.value as any })} style={{ ...inputStyle, width:"100%" } as any}>
                  <option value="JORDAN">Jordan</option>
                  <option value="CLÉMENT">Clément</option>
                </select>
              </div>

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>Date de début *</label>
                <input
                  type="date"
                  value={editingUnforeseen.dateStart}
                  onChange={e => setEditingUnforeseen({ ...editingUnforeseen, dateStart: e.target.value })}
                  style={{ ...inputStyle, width:"100%" } as any}
                />
              </div>

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>Date de fin *</label>
                <input
                  type="date"
                  value={editingUnforeseen.dateEnd}
                  onChange={e => setEditingUnforeseen({ ...editingUnforeseen, dateEnd: e.target.value })}
                  style={{ ...inputStyle, width:"100%" } as any}
                />
              </div>

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>Créneau horaire</label>
                <select value={editingUnforeseen.timeSlot} onChange={e => setEditingUnforeseen({ ...editingUnforeseen, timeSlot: e.target.value as any })} style={{ ...inputStyle, width:"100%" } as any}>
                  <option value="full">Journée complète</option>
                  <option value="morning">Matin (08h-12h)</option>
                  <option value="afternoon">Après-midi (14h-19h)</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </div>

              {editingUnforeseen.timeSlot === "custom" && (
                <div style={{ marginBottom:12, padding:12, background:"#F5F5F5", borderRadius:3 }}>
                  <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <div style={{ flex:1 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>De</label>
                      <input type="time" value={editingUnforeseen.customTime?.start || ""} onChange={e => setEditingUnforeseen({ ...editingUnforeseen, customTime: { start: e.target.value, end: editingUnforeseen.customTime?.end || "" } })} style={{ ...inputStyle, width:"100%" } as any} />
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>À</label>
                      <input type="time" value={editingUnforeseen.customTime?.end || ""} onChange={e => setEditingUnforeseen({ ...editingUnforeseen, customTime: { start: editingUnforeseen.customTime?.start || "", end: e.target.value } })} style={{ ...inputStyle, width:"100%" } as any} />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#666", display:"block", marginBottom:4 }}>Raison de l&apos;absence *</label>
                <textarea
                  value={editingUnforeseen.reason}
                  onChange={e => setEditingUnforeseen({ ...editingUnforeseen, reason: e.target.value })}
                  style={{ ...inputStyle, width:"100%", height:60, marginBottom:0 } as any}
                />
                <div style={{ fontSize:9, color:"#999", marginTop:4 }}>{editingUnforeseen.reason.length} caractères</div>
              </div>

              <div style={{ display:"flex", gap:8, marginTop:16 }}>
                <button onClick={saveEditedUnforeseen} style={{ ...btnDark, flex:1 } as any}>Enregistrer</button>
                <button onClick={cancelEditUnforeseen} style={btnGhost as any}>Annuler</button>
              </div>
            </div>
          ) : null}

          {(() => {
            console.log(`[DEBUG DISPLAY] Rendering unforeseens. Total count: ${unforeseens.length}`);
            console.log(`[DEBUG DISPLAY] All unforeseens in state:`, unforeseens.map(u => ({ id: u.id, profile: u.profile, status: u.status })));

            if (unforeseens.length === 0) {
              console.log(`[DEBUG DISPLAY] No unforeseens found`);
              return <div style={{ fontSize:12, color:"#AAA", fontStyle:"italic" }}>Aucun imprévu</div>;
            }

            return unforeseens.map(uf => {
              console.log(`[DEBUG DISPLAY] Rendering unforeseen:`, { id: uf.id, profile: uf.profile, dateStart: uf.dateStart, dateEnd: uf.dateEnd, status: uf.status });

              if (!uf.dateStart || !uf.dateEnd) {
                console.error(`[DEBUG DISPLAY] Invalid unforeseen ${uf.id}: dateStart or dateEnd is missing`);
                return null;
              }

              const timeLabel = uf.timeSlot === "full" ? "Journée complète" : uf.timeSlot === "morning" ? "Matin (08h-12h)" : uf.timeSlot === "afternoon" ? "Après-midi (14h-19h)" : `${uf.customTime?.start} - ${uf.customTime?.end}`;
              const startDate = parseLocalDate(uf.dateStart);
              const endDate = parseLocalDate(uf.dateEnd);

              if (!startDate || !endDate) {
                console.error(`[DEBUG DISPLAY] Failed to parse dates for unforeseen ${uf.id}: startDate=${startDate}, endDate=${endDate}`);
                return null;
              }

              console.log(`[DEBUG DISPLAY] ${uf.profile}: ${startDate.toLocaleDateString('fr-FR')} → ${endDate.toLocaleDateString('fr-FR')} | Raison: ${uf.reason.substring(0, 30)}`);

              const statusIcon = uf.status === "pending" ? "⏳ En attente" : uf.status === "accepted" ? "✓ Accepté" : "✗ Refusé";
              const bgColor = uf.status === "pending" ? "#FFF3CD" : uf.status === "accepted" ? "#D4EDDA" : "#F8D7DA";
              const borderColor = uf.status === "pending" ? "#FFE0A3" : uf.status === "accepted" ? "#C3E6CB" : "#F5C6CB";

              return (
                <div key={uf.id} style={{ padding:14, background:bgColor, borderRadius:3, marginBottom:12, border:`1px solid ${borderColor}` }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:6, display:"flex", gap:8, alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{fontSize:16}}>⚠️</span>
                      <span>{uf.profile}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color: uf.status === "pending" ? "#FF9800" : uf.status === "accepted" ? "#28A745" : "#DC3545" }}>
                      {statusIcon}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:"#666", marginBottom:4 }}>
                    📅 {startDate.toLocaleDateString("fr-FR")} → {endDate.toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{ fontSize:11, color:"#666", marginBottom:8 }}>🕐 {timeLabel}</div>
                  <div style={{ fontSize:12, color:"#333", marginBottom:10, padding:"8px", background:"rgba(0,0,0,0.03)", borderRadius:2 }}>&quot;{uf.reason}&quot;</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {uf.status === "pending" && (
                      <>
                        <button onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("[DEBUG BUTTON] ACCEPT clicked. uf.id=", uf.id, "status before=", uf.status);
                          updateUnforeseen(uf.id, "accepted");
                        }} style={{ ...btnDark, fontSize:11, padding:"8px 12px" } as any}>✓ Accepter</button>
                        <button onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("[DEBUG BUTTON] REJECT clicked. uf.id=", uf.id, "status before=", uf.status);
                          updateUnforeseen(uf.id, "rejected");
                        }} style={{ background:"#DC3545", color:"#fff", border:"none", borderRadius:3, padding:"8px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" } as any}>✗ Refuser</button>
                      </>
                    )}
                    <button onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("[DEBUG BUTTON] EDIT clicked. uf.id=", uf.id);
                      startEditUnforeseen(uf.id);
                    }} style={{ background:"#FFA500", color:"#fff", border:"none", borderRadius:3, padding:"8px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" } as any}>✏️ Modifier</button>
                    <button onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("[DEBUG BUTTON] DELETE clicked. uf.id=", uf.id);
                      deleteUnforeseen(uf.id);
                    }} style={{ background:"#DC3545", color:"#fff", border:"none", borderRadius:3, padding:"8px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" } as any}>🗑️ Supprimer</button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );

  // SCREEN: EDITOR (list)
  if (screen === "editor" && !editingShift) return (
    <div style={wrap as any}>
      <div style={hdr as any}><div><div style={logo as any}>Fiches de poste</div><div style={eyebrow as any}>Choisir une fiche à modifier</div></div><button onClick={() => setScreen("profile")} style={{ background:"none", border:"none", fontSize:11, color:"#AAA", cursor:"pointer", fontFamily:"inherit", marginTop:4 } as any}>← retour</button></div>
      <div style={{ ...body, paddingTop:24 } as any}>
        {Object.values(shifts).map(sh => (
          <button key={sh.id} onClick={() => setEditingShift(sh.id)} style={{ display:"block", width:"100%", textAlign:"left", padding:"16px 18px", marginBottom:10, border:"1px solid #E8E8E8", borderRadius:3, background:"#fff", cursor:"pointer", fontFamily:"inherit" } as any}>
            <div style={{ fontSize:14, fontWeight:800 }}>{sh.label}</div>
            <div style={{ fontSize:12, color:"#999", marginTop:2 }}>{sh.sub} · {sh.slots.length} créneaux</div>
          </button>
        ))}
      </div>
    </div>
  );

  // SCREEN: EDITOR (detail)
  if (screen === "editor" && editingShift) {
    const sh = shifts[editingShift];
    return (
      <>
        <div style={wrap as any}>
          <div style={hdr as any}><div><div style={logo as any}>{sh.label}</div><div style={eyebrow as any}>Édition des tâches</div></div><button onClick={() => setEditingShift(null)} style={{ background:"none", border:"none", fontSize:11, color:"#AAA", cursor:"pointer", fontFamily:"inherit", marginTop:4 } as any}>← retour</button></div>
          <div style={{ ...body, paddingTop:24 } as any}>
            {sh.slots.map(slot => (
              <div key={slot.id} style={{ marginBottom:28, paddingBottom:20, borderBottom:"1px solid #F0F0F0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontSize:13, fontWeight:800, letterSpacing:"0.04em" }}>{slot.time}</div>
                  <button onClick={() => removeSlot(editingShift, slot.id)} style={{ background:"none", border:"none", fontSize:11, color:"#CCC", cursor:"pointer", fontFamily:"inherit" } as any}>supprimer créneau</button>
                </div>
                {slot.tasks.map(t => (
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <input defaultValue={t.label} onBlur={e => updateTaskLabel(editingShift, slot.id, t.id, (e.target as HTMLInputElement).value)} style={{ ...inputStyle, flex:1 } as any} />
                    <button onClick={() => removeTask(editingShift, slot.id, t.id)} style={{ background:"none", border:"none", fontSize:18, color:"#DDD", cursor:"pointer", fontFamily:"inherit" } as any}>×</button>
                  </div>
                ))}
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <input value={newTaskBySlot[slot.id] || ""} onChange={e => setNewTaskBySlot({ ...newTaskBySlot, [slot.id]: e.target.value })} onKeyDown={e => e.key === "Enter" && addTask(editingShift, slot.id)} placeholder="Nouvelle tâche..." style={{ ...inputStyle, flex:1 } as any} />
                  <button onClick={() => addTask(editingShift, slot.id)} style={btnDark as any}>+</button>
                </div>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <input value={newSlotLabel} onChange={e => setNewSlotLabel(e.target.value)} placeholder="Nom du nouveau créneau (ex: 18h00 — Livraison)" style={{ ...inputStyle, flex:1 } as any} />
              <button onClick={() => addSlot(editingShift)} style={btnDark as any}>+ Créneau</button>
            </div>
          </div>
        </div>
        </>
    );
  }

  // SCREEN: SHIFT
  if (screen === "shift" && shift) return (
    <div style={wrap as any}>
      <div style={hdr as any}><div><div style={logo as any}>La Box — {profile}</div><div style={eyebrow as any}>{dateStr} · {timeStr}</div></div><button onClick={() => setScreen("profile")} style={{ background:"none", border:"none", fontSize:11, color:"#AAA", cursor:"pointer", fontFamily:"inherit", marginTop:4 } as any}>← retour</button></div>
      <div style={{ ...body, paddingTop:40 } as any}>
        <div style={label as any}>Shift assigné aujourd&apos;hui</div>
        <div style={{ fontSize:26, fontWeight:900, letterSpacing:"-0.01em", lineHeight:1.1 }}>{shift.label}</div>
        <div style={{ fontSize:13, color:"#888", marginTop:4, marginBottom:40 }}>{shift.sub}</div>
        <div style={{ marginBottom:40 }}>
          {shift.slots.map((s, i) => (
            <div key={s.id} style={{ display:"flex", gap:14, paddingBottom:16, alignItems:"flex-start" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:5 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", border:"1.5px solid #0A0A0A", background:"#fff", flexShrink:0 }} />
                {i < shift.slots.length - 1 && <div style={{ width:1, flex:1, background:"#E0E0E0", minHeight:20, marginTop:4 }} />}
              </div>
              <div><div style={{ fontSize:12, fontWeight:700, letterSpacing:"0.04em" }}>{s.time}</div><div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>{s.tasks.length} tâches</div></div>
            </div>
          ))}
        </div>
        <div style={label as any}>Corriger le shift ?</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:48 }}>
          {Object.values(shifts).map(sh => (
            <Pill key={sh.id} active={shiftId === sh.id} onClick={() => { setShiftId(sh.id); saveDaily({ shiftId: sh.id }); }}>{sh.label}</Pill>
          ))}
        </div>
        <button onClick={play} disabled={launching} style={{ width:"100%", padding:"22px", background: launching ? "#555" : "#0A0A0A", color:"#fff", border:"none", borderRadius:3, fontSize:14, fontWeight:900, letterSpacing:"0.22em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:14 } as any}>
          {launching ? <span style={{ fontSize:12, letterSpacing:"0.18em" }}>LANCEMENT...</span> : <><span style={{ fontSize:18, lineHeight:1 }}>▶</span> Démarrer la journée</>}
        </button>
      </div>
    </div>
  );

  // SCREEN: ACTIVE
  if (screen === "active") {
    return (
      <>
        <div style={wrap as any}>
        <div style={{ ...hdr, flexDirection:"column", gap:0 } as any}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", width:"100%" }}>
            <div><div style={logo as any}>{profile ? `${profile} — ` : ""}{shift ? shift.label : "Gestion"}</div><div style={eyebrow as any}>{dateStr} · {timeStr}</div></div>
            {shift && (<div style={{ textAlign:"right" }}><div style={{ fontSize:18, fontWeight:900 }}>{progress}%</div><div style={{ fontSize:10, color:"#AAA", letterSpacing:"0.08em" }}>{doneCount}/{allTasks.length}</div></div>)}
          </div>
          {shift && (<div style={{ marginTop:10, height:2, background:"#F0F0F0", borderRadius:1, width:"100%" }}><div style={{ height:"100%", width:`${progress}%`, background:"#0A0A0A", borderRadius:1, transition:"width 0.3s ease" }} /></div>)}
          <div style={{ display:"flex", gap:0, marginTop:14, width:"100%" }}>
            {["terrain", "gestion", "profil"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:"8px 0", border:"none", borderBottom:`2px solid ${tab === t ? "#0A0A0A" : "transparent"}`, background:"none", fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color: tab === t ? "#0A0A0A" : "#CCC", cursor:"pointer", fontFamily:"inherit" } as any}>{t}</button>
            ))}
          </div>
        </div>

        {/* TERRAIN */}
        {tab === "terrain" && (
          <div style={{ paddingBottom:100 }}>
            {!shift ? (
              <div style={{ padding:"40px 20px", textAlign:"center", color:"#AAA", fontSize:13 }}>
                Sélectionne un profil pour voir les tâches terrain.<br/><br/>
                <button onClick={() => setScreen("profile")} style={btnDark as any}>Choisir un profil →</button>
              </div>
            ) : (
              <>
                {shift.slots.map((slot, idx) => {
                  const st = slotState(slot, idx, shift.slots);
                  const slotDone = slot.tasks.filter(t => checked[t.id]).length;
                  const locked = st === "locked";
                  const isDone = st === "done";
                  return (
                    <div key={slot.id} style={{ borderBottom:"1px solid #F0F0F0" }}>
                      <div style={{ padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", background: !locked && !isDone ? "#0A0A0A" : "#fff" }}>
                        <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color: !locked && !isDone ? "#fff" : locked ? "#CCC" : "#0A0A0A" }}>
                          {!locked && !isDone && <span style={{ marginRight:8, fontSize:8 }}>●</span>}
                          {locked && <span style={{ marginRight:6 }}>🔒</span>}
                          {slot.time}
                        </div>
                        <div style={{ fontSize:11, letterSpacing:"0.05em", color: !locked && !isDone ? "rgba(255,255,255,0.5)" : "#CCC" }}>{slotDone}/{slot.tasks.length}</div>
                      </div>
                      {locked ? (
                        <div style={{ padding:"14px 20px", fontSize:12, color:"#CCC" }}>Termine le créneau précédent pour débloquer.</div>
                      ) : (
                        <div>
                          {slot.tasks.map(task => {
                            const done = !!checked[task.id];
                            return (
                              <div key={task.id} onClick={() => toggle(task.id)} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 20px", borderTop:"1px solid #F8F8F8", cursor:"pointer", background: done ? "#FAFAFA" : "#fff" }}>
                                <Checkbox checked={done} onClick={() => toggle(task.id)} />
                                <span style={{ fontSize:14, lineHeight:1.4, color: done ? "#BBB" : "#0A0A0A", textDecoration: done ? "line-through" : "none" }}>{task.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ padding:"28px 20px", textAlign:"center" }}><button onClick={endShift} style={btnGhost as any}>Terminer le shift</button></div>
              </>
            )}
          </div>
        )}

        {/* GESTION */}
        {tab === "gestion" && (
          <div style={{ ...body, paddingTop:24 } as any}>
            {/* Tâches de validation du planning */}
            <div style={{ marginBottom:36 }}>
              <div style={{ fontSize:12, fontWeight:800, letterSpacing:"0.06em", marginBottom:14, color:"#0A0A0A" }}>VALIDATIONS DU PLANNING</div>
              {managementTasks.length === 0 ? (
                <div style={{ fontSize:12, color:"#AAA", fontStyle:"italic" }}>Pas de tâches de validation</div>
              ) : (
                managementTasks.map(task => {
                  const daysUntil = getDaysUntilDeadline(task.deadline, now);
                  const statusColor = task.checked ? "#28A745" : daysUntil <= 0 ? "#DC3545" : daysUntil <= 3 ? "#FFC107" : "#999";
                  const statusBg = task.checked ? "#D4EDDA" : daysUntil <= 0 ? "#F8D7DA" : daysUntil <= 3 ? "#FFF3CD" : "#F5F5F5";

                  return (
                    <div key={task.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 14px", marginBottom:8, background:statusBg, borderRadius:4, border:`1px solid ${statusColor}20` }}>
                      <div onClick={() => !task.checked && toggleManagementTask(task.id)} style={{ display:"flex", alignItems:"center", gap:14, flex:1, cursor: !task.checked ? "pointer" : "default" }}>
                        <Checkbox checked={task.checked} onClick={() => !task.checked && toggleManagementTask(task.id)} disabled={task.checked} />
                        <div style={{flex:1}}>
                          <div style={{ fontSize:13, fontWeight:700, color: task.checked ? "#666" : "#0A0A0A", textDecoration: task.checked ? "line-through" : "none" }}>{task.label}</div>
                          <div style={{ fontSize:10, color: statusColor, marginTop:2 }}>
                            {task.checked ? "✓ Validé" : `À valider avant le ${task.deadline}`}
                            {!task.checked && daysUntil <= 3 && <span style={{marginLeft:8}}>({daysUntil} jour{daysUntil !== 1 ? 's' : ''})</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <hr style={{ margin:"24px 0", border:"none", borderTop:"1px solid #E0E0E0" }} />

            {/* Tâches variables du jour */}
            <div style={{ marginBottom:36 }}>
              <div style={{ fontSize:12, fontWeight:800, letterSpacing:"0.06em", marginBottom:14, color:"#0A0A0A" }}>TÂCHES VARIABLES DU JOUR</div>
              {varTasks.map(task => (
                <div key={task.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:"1px solid #F4F4F4" }}>
                  <div onClick={() => toggleVar(task.id)} style={{ display:"flex", alignItems:"center", gap:14, flex:1, cursor:"pointer" }}>
                    <Checkbox checked={!!task.done} onClick={() => toggleVar(task.id)} />
                    <span style={{ fontSize:14, color: task.done ? "#BBB" : "#0A0A0A", textDecoration: task.done ? "line-through" : "none" }}>{task.label}</span>
                  </div>
                  <button onClick={() => removeVar(task.id)} style={{ background:"none", border:"none", fontSize:18, color:"#DDD", cursor:"pointer", padding:"0 4px", fontFamily:"inherit" } as any}>×</button>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:16 }}>
                <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addVar()} placeholder="Ajouter une tâche..." style={{ ...inputStyle, flex:1 } as any} />
                <button onClick={addVar} style={btnDark as any}>+</button>
              </div>
            </div>
            {shift && (<div style={{ marginTop:48, textAlign:"center" }}><button onClick={endShift} style={btnGhost as any}>Terminer le shift</button></div>)}
          </div>
        )}

        {/* PROFIL / SCORING */}
        {tab === "profil" && (
          <div style={{ ...body, paddingTop:24 } as any}>
            <div style={{ fontSize:22, fontWeight:900 }}>{profile || "—"}</div>
            <div style={{ fontSize:12, color:"#999", marginBottom:32 }}>Profil employé</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:32 }}>
              <StatBox big={totalShifts} small="Shifts terminés" />
              <StatBox big={`${avgCompletion}%`} small="Complétion moyenne" />
              <StatBox big={totalTasksDone} small="Tâches réalisées" />
              <StatBox big={streak} small="Streak (≥90%)" />
            </div>
            <div style={label as any}>7 derniers shifts</div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80, marginBottom:32 }}>
              {last7.length === 0 && <div style={{ fontSize:12, color:"#CCC" }}>Pas encore d&apos;historique.</div>}
              {last7.map(h => (
                <div key={h.id} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ width:"100%", height:Math.max(4, h.completion*0.7), background: h.completion>=90?"#0A0A0A":h.completion>=50?"#999":"#DDD", borderRadius:2 }} />
                  <div style={{ fontSize:9, color:"#CCC" }}>{DAYS[h.day]}</div>
                </div>
              ))}
            </div>
            <div style={label as any}>Historique récent</div>
            {sorted.slice(0,10).map(h => (
              <div key={h.id} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #F4F4F4", fontSize:13 }}>
                <span>{h.date} · {(shifts[h.shiftId]||{}).label || h.shiftId}</span>
                <span style={{ fontWeight:700, color: h.completion>=90?"#0A0A0A":"#999" }}>{h.completion}%</span>
              </div>
            ))}
          </div>
        )}
        </div>
        </>
    );
  }

  return null;
}

function AddAssignmentRow({ shifts, onAdd }: { shifts: Record<string, Shift>; onAdd: (shId: string, prof: string) => void }) {
  const [shId, setShId] = useState(Object.keys(shifts)[0]);
  const [prof, setProf] = useState(PROFILES[0]);
  return (
    <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
      <select value={shId} onChange={e => setShId(e.target.value)} style={{ ...inputStyle, flex:1, minWidth:120 } as any}>
        {Object.values(shifts).map((sh: Shift) => <option key={sh.id} value={sh.id}>{sh.label}</option>)}
      </select>
      <select value={prof} onChange={e => setProf(e.target.value)} style={{ ...inputStyle, width:100 } as any}>
        {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <button onClick={() => onAdd(shId, prof)} style={{ ...btnDark, fontFamily:"inherit" } as any}>+</button>
    </div>
  );
}
