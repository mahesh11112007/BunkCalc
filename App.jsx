import React, { useState, useEffect, useMemo, useCallback } from "react";
import { dbService, localStorageDb } from "./dbService.js";

// ==========================================
// DEFAULT ACADEMIC CALENDAR & CONFIGURATION
// ==========================================
const DEFAULT_CALENDAR = {
    institution: {
        name: "Standard Academic Institution",
        campus: "University Campus",
        academic_year: "2026-2027",
        program: "B.Tech II, III & IV Year"
    },
    academic_calendar: {
        semester_1: {
            commencement_of_class_work: "2026-07-06",
            events: [
                { activity: "First Spell of Instructions", start: "2026-07-06", end: "2026-08-29", duration: "8 Weeks" },
                { activity: "First Mid Examinations", start: "2026-08-31", end: "2026-09-05", duration: "1 Week" },
                { activity: "Second Spell of Instructions", start: "2026-09-07", end: "2026-10-31", duration: "8 Weeks" },
                { activity: "Submission of Mid-I Marks", date: "2026-09-12" },
                { activity: "Parent-Teacher Meeting", date: "2026-09-19" },
                { activity: "Second Mid Examinations", start: "2026-11-02", end: "2026-11-07", duration: "1 Week" },
                { activity: "Preparations & Practical Examinations", start: "2026-11-09", end: "2026-11-14", duration: "1 Week" },
                { activity: "Submission of Mid-II Marks", date: "2026-11-21" },
                { activity: "End Semester & Supplementary Examinations", start: "2026-11-16", end: "2026-12-05", duration: "3 Weeks" }
            ]
        },
        semester_2: {
            commencement_of_class_work: "2026-12-07",
            events: [
                { activity: "First Spell of Instructions", start: "2026-12-07", end: "2027-01-30", duration: "8 Weeks" },
                { activity: "First Mid Examinations", start: "2027-02-01", end: "2027-02-06", duration: "1 Week" },
                { activity: "Second Spell of Instructions", start: "2027-02-08", end: "2027-04-03", duration: "8 Weeks" },
                { activity: "Submission of Mid-I Marks", date: "2027-02-13" },
                { activity: "Parent-Teacher Meeting", date: "2027-02-20" },
                { activity: "Second Mid Examinations", start: "2027-04-05", end: "2027-04-10", duration: "1 Week" },
                { activity: "Preparations & Practical Examinations", start: "2027-04-12", end: "2027-04-17", duration: "1 Week" },
                { activity: "Submission of Mid-II Marks", date: "2027-04-17" },
                { activity: "End Semester & Supplementary Examinations", start: "2027-04-19", end: "2027-05-08", duration: "3 Weeks" },
                { activity: "Summer Vacation", start: "2027-05-10", end: "2027-07-03", duration: "8 Weeks" },
                { activity: "Commencement of AY 2027-2028", date: "2027-07-05" }
            ]
        }
    },
    holidays: [
        { date: "2026-01-01", name: "New Year Day" },
        { date: "2026-01-14", name: "Bhogi" },
        { date: "2026-01-15", name: "Sankranti/Pongal" },
        { date: "2026-01-16", name: "Kanuma" },
        { date: "2026-01-26", name: "Republic Day" },
        { date: "2026-03-03", name: "Holi" },
        { date: "2026-03-19", name: "Ugadi" },
        { date: "2026-03-21", name: "Eid-ul-Fitr (Ramzan)" },
        { date: "2026-03-27", name: "Sri Rama Navami" },
        { date: "2026-04-03", name: "Good Friday" },
        { date: "2026-04-14", name: "Dr. B.R. Ambedkar's Birthday" },
        { date: "2026-05-27", name: "Eid-ul-Adha (Bakrid)" },
        { date: "2026-06-26", name: "Moharam" },
        { date: "2026-08-10", name: "Bonalu" },
        { date: "2026-08-15", name: "Independence Day" },
        { date: "2026-08-26", name: "Eid Milad-un-Nabi" },
        { date: "2026-09-04", name: "Sri Krishna Ashtami" },
        { date: "2026-09-14", name: "Vinayaka Chavithi" },
        { date: "2026-10-02", name: "Mahatma Gandhi Jayanti" },
        { date: "2026-10-20", name: "Vijaya Dasami" },
        { date: "2026-12-25", name: "Christmas" }
    ],
    sunday_holidays: [
        { date: "2026-02-15", name: "Maha Shivaratri" },
        { date: "2026-04-05", name: "Babu Jagjivan Ram's Birthday" },
        { date: "2026-10-18", name: "Saddula Bathukamma" },
        { date: "2026-11-08", name: "Deepavali" }
    ]
};

const CONDONE_FLOOR = 65;
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Helper Utilities
function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function addDays(dateStr, n) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function dowIndexMon0(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const js = d.getDay();
    return js === 0 ? 6 : js - 1;
}
function isSunday(dateStr) {
    return new Date(dateStr + "T00:00:00").getDay() === 0;
}
function fmtLong(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[d.getDay()] + ", " + d.getDate() + " " + MONTH_NAMES[d.getMonth()] + " " + d.getFullYear();
}
function rangeDates(start, end) {
    const out = [];
    let cur = start;
    let guard = 0;
    while (cur <= end && guard < 2000) {
        out.push(cur);
        cur = addDays(cur, 1);
        guard++;
    }
    return out;
}

// Term Data Generator (Merges Official + Custom Bandh Holidays)
function buildTermData(calendar, customHolidays = []) {
    const holidayMap = {};
    (calendar.holidays || []).forEach(h => { holidayMap[h.date] = h.name; });
    (calendar.sunday_holidays || []).forEach(h => { holidayMap[h.date] = h.name; });
    (customHolidays || []).forEach(h => { holidayMap[h.date] = h.name; });

    function spellRanges(sem) {
        if (!sem) return { spells: [], other: [] };
        const spells = [];
        const other = [];
        (sem.events || []).forEach(ev => {
            if (!ev.start || !ev.end) return;
            if (/Spell of Instructions/i.test(ev.activity)) {
                spells.push({ start: ev.start, end: ev.end, label: ev.activity });
            } else if (/Examinations|Practical/i.test(ev.activity)) {
                other.push({ start: ev.start, end: ev.end, label: ev.activity });
            }
        });
        return { spells, other };
    }

    function buildTerm(key, label, sem) {
        const { spells, other } = spellRanges(sem);
        const workingDays = [];
        const dayMeta = {};
        spells.forEach(sp => {
            rangeDates(sp.start, sp.end).forEach(d => {
                if (isSunday(d)) { dayMeta[d] = { type: "sunday" }; return; }
                if (holidayMap[d]) { dayMeta[d] = { type: "holiday", name: holidayMap[d] }; return; }
                workingDays.push(d);
                dayMeta[d] = { type: "working" };
            });
        });
        other.forEach(ev => {
            rangeDates(ev.start, ev.end).forEach(d => {
                if (!dayMeta[d]) dayMeta[d] = { type: "exam", label: ev.label };
            });
        });
        workingDays.sort();
        const first = spells[0] ? spells[0].start : null;
        const last = spells.length ? spells[spells.length - 1].end : null;
        return { key, label, workingDays, dayMeta, rangeStart: first, rangeEnd: last };
    }

    const sem1 = buildTerm("sem1", "Semester 1", calendar.academic_calendar?.semester_1);
    const sem2 = buildTerm("sem2", "Semester 2", calendar.academic_calendar?.semester_2);
    const fullMeta = { ...sem1.dayMeta, ...sem2.dayMeta };
    const full = {
        key: "full",
        label: "Full Year",
        workingDays: [...sem1.workingDays, ...sem2.workingDays].sort(),
        dayMeta: fullMeta,
        rangeStart: sem1.rangeStart || sem2.rangeStart,
        rangeEnd: sem2.rangeEnd || sem1.rangeEnd
    };

    return { sem1, sem2, full };
}

// Bunk & Catch-up Computation Engine
function computeStats(term, attendance, today, targetThreshold = 75) {
    const past = term.workingDays.filter(d => d <= today);
    const future = term.workingDays.filter(d => d > today);
    let attended = 0, absent = 0, medical = 0, pending = 0;

    past.forEach(d => {
        const mark = attendance[d];
        if (mark === "P") attended++;
        else if (mark === "M") { attended++; medical++; } // Medical / OD counts as attended/excused
        else if (mark === "A") absent++;
        else pending++;
    });

    const markedPast = attended + absent;
    const currentPercent = markedPast > 0 ? (attended / markedPast) * 100 : null;

    const totalTerm = term.workingDays.length;
    const remaining = future.length;
    const requiredTotal = Math.ceil((targetThreshold / 100) * totalTerm);

    let minFutureAttend = requiredTotal - attended;
    if (minFutureAttend < 0) minFutureAttend = 0;
    let maxFutureAbsences = remaining - minFutureAttend;
    const impossible = minFutureAttend > remaining;
    if (maxFutureAbsences < 0) maxFutureAbsences = 0;

    const bestPossiblePercent = totalTerm > 0 ? ((attended + remaining) / totalTerm) * 100 : null;

    // Recovery Calculator: Consecutive classes needed right now to reach targetThreshold %
    let catchUpNeeded = 0;
    if (markedPast > 0 && currentPercent < targetThreshold) {
        const targetRatio = targetThreshold / 100;
        const numerator = targetRatio * markedPast - attended;
        const denominator = 1 - targetRatio;
        catchUpNeeded = Math.ceil(numerator / denominator);
    }

    return {
        totalTerm, pastCount: past.length, futureCount: remaining,
        attended, absent, medical, pending, markedPast, currentPercent,
        requiredTotal, minFutureAttend, maxFutureAbsences, impossible,
        bestPossiblePercent, catchUpNeeded
    };
}

function statusForPercent(p, target = 75) {
    if (p === null) return { label: "NO DATA", color: "var(--ink)" };
    if (p >= target) return { label: "SAFE", color: "var(--green)" };
    if (p >= CONDONE_FLOOR) return { label: "CONDONATION ZONE", color: "var(--amber)" };
    return { label: "DETAINED RISK", color: "var(--red)" };
}

const AI_PROMPT_TEMPLATE = `You are an Academic Calendar Extractor AI. Attached is the image/PDF of my college's Academic Calendar and Holiday List. Please analyze it and output ONLY a single valid JSON object following this EXACT schema, with NO conversational text, NO markdown code block wrappers:

{
  "institution": {
    "name": "My College Name",
    "campus": "Campus Address / City",
    "academic_year": "2026-2027",
    "program": "B.Tech"
  },
  "academic_calendar": {
    "semester_1": {
      "commencement_of_class_work": "YYYY-MM-DD",
      "events": [
        { "activity": "First Spell of Instructions", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": "8 Weeks" },
        { "activity": "First Mid Examinations", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": "1 Week" },
        { "activity": "Second Spell of Instructions", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": "8 Weeks" },
        { "activity": "Second Mid Examinations", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": "1 Week" },
        { "activity": "End Semester Examinations", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": "3 Weeks" }
      ]
    },
    "semester_2": {
      "commencement_of_class_work": "YYYY-MM-DD",
      "events": [
        { "activity": "First Spell of Instructions", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": "8 Weeks" },
        { "activity": "First Mid Examinations", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": "1 Week" },
        { "activity": "Second Spell of Instructions", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": "8 Weeks" },
        { "activity": "Second Mid Examinations", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": "1 Week" },
        { "activity": "End Semester Examinations", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": "3 Weeks" }
      ]
    }
  },
  "holidays": [
    { "date": "YYYY-MM-DD", "name": "Holiday Name" }
  ],
  "sunday_holidays": []
}`;

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
    // Authentication State
    const [currentUser, setCurrentUser] = useState(null);
    const [authMode, setAuthMode] = useState("login"); // 'login', 'signup'
    const [loginRoll, setLoginRoll] = useState("");
    const [loginPin, setLoginPin] = useState("");
    const [signupForm, setSignupForm] = useState({ name: "", rollNo: "", pin: "", program: "B.Tech CSE", collegeName: "", target: 75 });
    const [authError, setAuthError] = useState("");

    // PWA Install Prompt & AI Copy State
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    function handleInstallClick() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === "accepted") {
                    setDeferredPrompt(null);
                }
            });
        }
    }

    // Attendance App State (for logged-in user)
    const [calendar, setCalendar] = useState(DEFAULT_CALENDAR);
    const [attendance, setAttendance] = useState({});
    const [customHolidays, setCustomHolidays] = useState([
        { date: "2026-07-24", name: "" }
    ]);
    const [targetThreshold, setTargetThreshold] = useState(75);
    const [termKey, setTermKey] = useState("sem1");
    const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard', 'calendar', 'schedule'
    const [showSettings, setShowSettings] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const [jsonDraft, setJsonDraft] = useState("");
    const [jsonError, setJsonError] = useState("");

    // Settings Modal Tabs & Simple Form State
    const [settingsTab, setSettingsTab] = useState("simple"); // 'simple', 'ai'
    const [simpleCalForm, setSimpleCalForm] = useState({
        collegeName: "",
        sem1Start: "2026-07-06",
        sem1End: "2026-11-20",
        mid1Start: "2026-08-31",
        mid1End: "2026-09-05",
        mid2Start: "2026-11-02",
        mid2End: "2026-11-07"
    });

    // Profile Edit Form State
    const [editProfileForm, setEditProfileForm] = useState({ name: "", email: "", collegeName: "", program: "", newPin: "" });
    const [editProfileMsg, setEditProfileMsg] = useState("");

    // Custom Holiday & Mid-Sem Modal State
    const [showAddHoliday, setShowAddHoliday] = useState(false);
    const [newHolidayForm, setNewHolidayForm] = useState({ date: todayStr(), reason: "" });
    const [showMidSemModal, setShowMidSemModal] = useState(false);
    const [midSemAttendedCount, setMidSemAttendedCount] = useState("");

    // Admin Portal State
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
    const [adminPasswordInput, setAdminPasswordInput] = useState("");
    const [adminAuthError, setAdminAuthError] = useState("");
    const [adminUsers, setAdminUsers] = useState([]);
    const [adminDataSource, setAdminDataSource] = useState('unknown'); // 'cloud' | 'local' | 'no_db'
    const [adminSearch, setAdminSearch] = useState("");
    const [adminFilter, setAdminFilter] = useState("all");
    const [selectedAdminUser, setSelectedAdminUser] = useState(null);
    const [isAdminLoading, setIsAdminLoading] = useState(false);

    const today = todayStr();

    // Listen for secret /Mahesh route in URL path or hash
    useEffect(() => {
        const checkAdminRoute = () => {
            const path = window.location.pathname.toLowerCase();
            const hash = window.location.hash.toLowerCase();
            if (path.includes('mahesh') || hash.includes('mahesh')) {
                setShowAdminAuthModal(true);
            }
        };
        checkAdminRoute();
        window.addEventListener("popstate", checkAdminRoute);
        window.addEventListener("hashchange", checkAdminRoute);
        return () => {
            window.removeEventListener("popstate", checkAdminRoute);
            window.removeEventListener("hashchange", checkAdminRoute);
        };
    }, []);

    function handleAdminLogin(e) {
        e.preventDefault();
        setAdminAuthError("");
        if (adminPasswordInput === "121212") {
            setShowAdminAuthModal(false);
            setAdminPasswordInput("");
            openAdminPortal();
        } else {
            setAdminAuthError("❌ Incorrect Admin Password! Access Denied.");
        }
    }

    async function openAdminPortal() {
        setIsAdminLoading(true);
        setShowAdminModal(true);
        const result = await dbService.getAllUsers();
        setAdminUsers(result.users || []);
        setAdminDataSource(result.source || 'local');
        setIsAdminLoading(false);
    }

    function exportEmailsCSV() {
        const emailList = adminUsers.filter(u => u.email).map(u => `"${u.name || ''}","${u.roll_no || ''}","${u.email || ''}","${u.college_name || ''}"`).join('\n');
        if (!emailList) {
            alert("No student email addresses found to export.");
            return;
        }
        const csvContent = "Name,RollNo,Email,College\n" + emailList;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "student_emails_ai_notes.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Filtered Admin Users
    const filteredAdminUsers = useMemo(() => {
        const q = adminSearch.trim().toLowerCase();
        return adminUsers.filter(u => {
            const matchQuery = !q || 
                (u.name && u.name.toLowerCase().includes(q)) ||
                (u.roll_no && u.roll_no.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q)) ||
                (u.college_name && u.college_name.toLowerCase().includes(q)) ||
                (u.program && u.program.toLowerCase().includes(q));

            if (!matchQuery) return false;

            const att = typeof u.attendance_json === 'string' ? JSON.parse(u.attendance_json || '{}') : (u.attendance_json || {});
            const pastDates = Object.keys(att).filter(d => att[d] === 'P' || att[d] === 'A' || att[d] === 'M');
            let attended = 0;
            pastDates.forEach(d => { if (att[d] === 'P' || att[d] === 'M') attended++; });
            const pct = pastDates.length > 0 ? (attended / pastDates.length) * 100 : null;

            if (adminFilter === 'safe') return pct !== null && pct >= (u.target_threshold || 75);
            if (adminFilter === 'condonation') return pct !== null && pct >= 65 && pct < (u.target_threshold || 75);
            if (adminFilter === 'detained') return pct !== null && pct < 65;
            return true;
        });
    }, [adminUsers, adminSearch, adminFilter]);

    // Data Loaded Guard to prevent state overwrite on refresh
    const [isLoaded, setIsLoaded] = useState(false);

    // Load Initial Session
    useEffect(() => {
        const savedUser = localStorageDb.get("attendance_ledger_current_user_v2");
        if (savedUser) {
            setCurrentUser(savedUser);
            loadUserData(savedUser.rollNo);
        } else {
            setIsLoaded(true);
        }
    }, []);

    // Load User Specific Attendance Data
    async function loadUserData(rollNo) {
        setIsLoaded(false);
        const data = await dbService.getUserData(rollNo);
        if (data) {
            if (data.calendar) setCalendar(data.calendar);
            if (data.attendance) setAttendance(data.attendance);
            if (data.customHolidays) setCustomHolidays(data.customHolidays);
            if (data.targetThreshold) setTargetThreshold(data.targetThreshold);
        }
        setIsLoaded(true);
    }

    // Save User Specific Attendance Data
    function persistUserData() {
        if (!currentUser || !isLoaded) return;
        dbService.saveUserData(currentUser.rollNo, {
            profile: currentUser,
            calendar,
            attendance,
            customHolidays,
            targetThreshold
        });
    }

    useEffect(() => {
        if (currentUser && isLoaded) {
            persistUserData();
        }
    }, [calendar, attendance, customHolidays, targetThreshold, currentUser, isLoaded]);

    function addCustomHoliday(dateStr, reason) {
        if (!dateStr || !reason) return;
        setCustomHolidays(prev => {
            const filtered = prev.filter(h => h.date !== dateStr);
            return [...filtered, { date: dateStr, name: reason }];
        });
        setAttendance(prev => {
            const next = { ...prev };
            delete next[dateStr];
            return next;
        });
        setShowAddHoliday(false);
    }

    function removeCustomHoliday(dateStr) {
        setCustomHolidays(prev => prev.filter(h => h.date !== dateStr));
    }

    // Auth Handlers
    async function handleLogin(e) {
        e.preventDefault();
        setAuthError("");
        const roll = loginRoll.trim().toUpperCase();
        if (!roll || !loginPin) {
            setAuthError("Please enter Roll Number and PIN.");
            return;
        }
        const res = await dbService.login(roll, loginPin);
        if (!res.success) {
            setAuthError(res.error || "Invalid Roll Number or PIN.");
            return;
        }
        setCurrentUser(res.user);
        loadUserData(res.user.rollNo);
    }

    async function handleSignUp(e) {
        e.preventDefault();
        setAuthError("");
        const roll = signupForm.rollNo.trim().toUpperCase();
        if (!signupForm.name || !roll || !signupForm.pin) {
            setAuthError("Please fill out all required fields.");
            return;
        }

        const newUser = {
            name: signupForm.name,
            email: signupForm.email || "",
            rollNo: roll,
            pin: signupForm.pin,
            program: signupForm.program,
            collegeName: signupForm.collegeName || "My Academic Institution",
            targetThreshold: Number(signupForm.target) || 75
        };

        const res = await dbService.signup(newUser);
        if (!res.success) {
            setAuthError(res.error || "Sign up failed.");
            return;
        }

        const userCalendar = signupForm.collegeName ? {
            ...DEFAULT_CALENDAR,
            institution: { ...DEFAULT_CALENDAR.institution, name: signupForm.collegeName }
        } : DEFAULT_CALENDAR;

        setCurrentUser(res.user);
        setCalendar(userCalendar);
        setAttendance({});
        setTargetThreshold(res.user.targetThreshold);
        setIsLoaded(true);
    }

    function handleLogout() {
        setCurrentUser(null);
        localStorageDb.set("attendance_ledger_current_user_v2", null);
    }

    // Calculated Terms & Stats
    const terms = useMemo(() => buildTermData(calendar, customHolidays), [calendar, customHolidays]);
    const term = terms[termKey];
    const stats = useMemo(() => computeStats(term, attendance, today, targetThreshold), [term, attendance, today, targetThreshold]);
    const status = statusForPercent(stats.currentPercent, targetThreshold);

    const todayInfo = term.dayMeta[today];
    const todayIsWorking = todayInfo && todayInfo.type === "working";
    const todayMark = attendance[today];

    // Interactive Bunk Simulator State
    const [simBunks, setSimBunks] = useState(0);

    const simResult = useMemo(() => {
        if (simBunks <= 0 || !stats.markedPast) return null;
        const simAttended = stats.attended;
        const simTotal = stats.markedPast + Number(simBunks);
        const simPct = (simAttended / simTotal) * 100;
        const simStatus = statusForPercent(simPct, targetThreshold);
        return { simPct, simStatus };
    }, [simBunks, stats, targetThreshold]);

    // Attendance Mark Handlers (P -> A -> M -> Clear)
    const mark = useCallback((dateStr, value) => {
        setAttendance(prev => {
            const next = { ...prev };
            if (next[dateStr] === value) delete next[dateStr];
            else next[dateStr] = value;
            return next;
        });
    }, []);

    const cycleMark = useCallback((dateStr) => {
        setAttendance(prev => {
            const cur = prev[dateStr];
            const next = { ...prev };
            if (!cur) next[dateStr] = "P";
            else if (cur === "P") next[dateStr] = "A";
            else if (cur === "A") next[dateStr] = "M";
            else delete next[dateStr];
            return next;
        });
    }, []);

    function batchMarkPastPresent() {
        const pastPending = term.workingDays.filter(d => d <= today && !attendance[d]);
        if (pastPending.length === 0) {
            alert("No pending unlogged past days to mark!");
            return;
        }
        if (window.confirm(`Mark all ${pastPending.length} pending past working days as Present?`)) {
            setAttendance(prev => {
                const next = { ...prev };
                pastPending.forEach(d => { next[d] = "P"; });
                return next;
            });
        }
    }

    function handleApplyMidSemBaseline(e) {
        e.preventDefault();
        const pastDays = term.workingDays.filter(d => d <= today);
        const totalPast = pastDays.length;
        const attendedNum = Number(midSemAttendedCount);

        if (isNaN(attendedNum) || attendedNum < 0) {
            alert("Please enter a valid number of attended classes.");
            return;
        }
        if (attendedNum > totalPast) {
            alert(`Attended classes cannot exceed total past working days (${totalPast}).`);
            return;
        }

        setAttendance(prev => {
            const next = { ...prev };
            for (let i = 0; i < attendedNum; i++) {
                next[pastDays[i]] = "P";
            }
            for (let i = attendedNum; i < totalPast; i++) {
                next[pastDays[i]] = "A";
            }
            return next;
        });

        setShowMidSemModal(false);
        alert(`✅ Baseline set! Marked ${attendedNum} days Present and ${totalPast - attendedNum} days Absent out of ${totalPast} past working days.`);
    }

    // Calendar Month Navigation
    const [calMonth, setCalMonth] = useState(() => {
        const d = new Date(today + "T00:00:00");
        return { y: d.getFullYear(), m: d.getMonth() };
    });

    useEffect(() => {
        if (term.rangeStart) {
            const d = new Date(term.rangeStart + "T00:00:00");
            setCalMonth({ y: d.getFullYear(), m: d.getMonth() });
        }
    }, [termKey]);

    function shiftMonth(delta) {
        setCalMonth(prev => {
            let m = prev.m + delta, y = prev.y;
            if (m < 0) { m = 11; y -= 1; }
            if (m > 11) { m = 0; y += 1; }
            return { y, m };
        });
    }

    // Month Cell Builder
    const monthCells = useMemo(() => {
        const first = new Date(calMonth.y, calMonth.m, 1);
        const startOffset = dowIndexMon0(first.getFullYear() + "-" + String(first.getMonth() + 1).padStart(2, "0") + "-" + String(first.getDate()).padStart(2, "0"));
        const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < startOffset; i++) cells.push(null);
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = calMonth.y + "-" + String(calMonth.m + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
            cells.push(dateStr);
        }
        return cells;
    }, [calMonth]);

    function handleApplySimpleCalendar(e) {
        e.preventDefault();
        const generated = {
            institution: {
                name: simpleCalForm.collegeName || currentUser?.collegeName || "My Academic Institution",
                campus: "Main Campus",
                academic_year: "2026-2027",
                program: currentUser?.program || "B.Tech Program"
            },
            academic_calendar: {
                semester_1: {
                    commencement_of_class_work: simpleCalForm.sem1Start,
                    events: [
                        { activity: "First Spell of Instructions", start: simpleCalForm.sem1Start, end: simpleCalForm.mid1Start, duration: "Instruction" },
                        { activity: "First Mid Examinations", start: simpleCalForm.mid1Start, end: simpleCalForm.mid1End, duration: "1 Week" },
                        { activity: "Second Spell of Instructions", start: simpleCalForm.mid1End, end: simpleCalForm.mid2Start, duration: "Instruction" },
                        { activity: "Second Mid Examinations", start: simpleCalForm.mid2Start, end: simpleCalForm.mid2End, duration: "1 Week" },
                        { activity: "End Semester Examinations", start: simpleCalForm.mid2End, end: simpleCalForm.sem1End, duration: "Finals" }
                    ]
                },
                semester_2: DEFAULT_CALENDAR.academic_calendar.semester_2
            },
            holidays: DEFAULT_CALENDAR.holidays,
            sunday_holidays: DEFAULT_CALENDAR.sunday_holidays
        };

        setCalendar(generated);
        setShowSettings(false);
        alert(`✅ Academic calendar updated for ${generated.institution.name}!`);
    }

    // Populate Edit Profile Form when Settings opens
    useEffect(() => {
        if (showSettings && currentUser) {
            setEditProfileForm({
                name: currentUser.name || "",
                email: currentUser.email || "",
                collegeName: currentUser.collegeName || calendar.institution?.name || "",
                program: currentUser.program || "",
                newPin: ""
            });
            setEditProfileMsg("");
        }
    }, [showSettings, currentUser, calendar]);

    async function handleUpdateProfile(e) {
        e.preventDefault();
        setEditProfileMsg("");
        if (!currentUser) return;

        const payload = {
            name: editProfileForm.name,
            email: editProfileForm.email,
            collegeName: editProfileForm.collegeName,
            program: editProfileForm.program,
            pin: editProfileForm.newPin || '' // Empty string = keep old pin (COALESCE handles this)
        };

        const res = await dbService.updateProfile(currentUser.rollNo, payload);
        if (res.success) {
            setCurrentUser(res.user);
            if (editProfileForm.collegeName) {
                setCalendar(prev => ({
                    ...prev,
                    institution: { ...prev.institution, name: editProfileForm.collegeName }
                }));
            }
            setEditProfileMsg("✅ Profile & Security PIN updated successfully!");
            setTimeout(() => setEditProfileMsg(""), 3000);
        } else {
            setEditProfileMsg("❌ Update failed: " + (res.error || "Unknown error"));
        }
    }

    // JSON Calendar Import
    function applyJson() {
        try {
            const parsed = JSON.parse(jsonDraft);
            if (!parsed.academic_calendar) throw new Error("Missing academic_calendar key");
            setCalendar(parsed);
            setJsonError("");
            setShowSettings(false);
            setShowAiModal(false);
        } catch (e) {
            setJsonError("Couldn't read that JSON: " + e.message);
        }
    }

    function resetAll() {
        if (window.confirm("Are you sure you want to clear all logged attendance marks?")) {
            setAttendance({});
        }
    }

    // ==========================================
    // RENDER ADMIN AUTH SCREEN IF ON /Mahesh ROUTE
    // ==========================================
    const isAdminRoute = window.location.pathname.toLowerCase().includes('mahesh') || window.location.hash.toLowerCase().includes('mahesh');
    if (isAdminRoute && !showAdminModal) {
        return (
            <div className="reg-root login-container">
                <style>{styles}</style>
                <div className="auth-box card">
                    <div className="auth-header">
                        <h1 className="reg-title">Admin Portal</h1>
                        <p className="reg-sub">Master Admin Access — Restricted</p>
                    </div>
                    <div style={{ textAlign: "center", fontSize: 40, margin: "10px 0" }}>👑</div>

                    {adminAuthError && (
                        <div style={{ color: "var(--red)", fontWeight: "bold", margin: "8px 0 12px", fontSize: 13, textAlign: "center" }}>
                            {adminAuthError}
                        </div>
                    )}

                    <form onSubmit={handleAdminLogin} className="auth-form">
                        <label>
                            <span>Master Admin Password</span>
                            <input
                                type="password"
                                placeholder="Enter Admin Password..."
                                value={adminPasswordInput}
                                onChange={e => setAdminPasswordInput(e.target.value)}
                                autoFocus
                                required
                            />
                        </label>
                        <button type="submit" className="btn primary-btn" style={{ marginTop: 8, width: "100%" }}>
                            🔓 Unlock Master Admin Console
                        </button>
                    </form>
                    <p className="note" style={{ textAlign: "center", marginTop: 14 }}>
                        <a href="/" style={{ color: "var(--rule-blue)" }}>← Back to Student App</a>
                    </p>
                </div>
            </div>
        );
    }

    // If admin is authenticated and on the /Mahesh route, show the admin portal fullscreen
    if (isAdminRoute && showAdminModal) {
        return (
            <div className="reg-root">
                <style>{styles}</style>
                <div style={{ padding: "16px 20px", maxWidth: 960, margin: "0 auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px double var(--ink)", paddingBottom: 12, marginBottom: 20 }}>
                        <div>
                            <h1 className="reg-title" style={{ margin: 0 }}>👑 Master Admin Console</h1>
                            <p className="reg-sub" style={{ margin: "2px 0 0 0" }}>Student Registry & Attendance Intelligence Dashboard</p>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn primary-btn" style={{ fontSize: 11, background: "var(--green)", borderColor: "var(--ink)" }} onClick={exportEmailsCSV}>
                                📥 Export Emails (CSV)
                            </button>
                            <a href="/" className="btn" style={{ fontSize: 11 }}>← Exit Admin</a>
                        </div>
                    </div>

                    {isAdminLoading ? (
                        <div className="stat-line" style={{ padding: 40, textAlign: "center", fontSize: 16 }}>
                            ⏳ Loading registered user database...
                        </div>
                    ) : (
                        <>
                            {/* Data Source Banner */}
                            {adminDataSource === 'cloud' ? (
                                <div style={{ background: "rgba(47,107,79,0.15)", border: "2px solid var(--green)", padding: "8px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                    <span style={{ fontSize: 18 }}>☁️</span>
                                    <span><b style={{ color: "var(--green)" }}>Cloud Database Active</b> — Showing ALL users from ALL browsers &amp; devices (Neon PostgreSQL)</span>
                                </div>
                            ) : adminDataSource === 'local' ? (
                                <div style={{ background: "rgba(166,51,43,0.1)", border: "2px solid var(--red)", padding: "8px 14px", marginBottom: 14, fontSize: 13 }}>
                                    <span style={{ fontSize: 18 }}>⚠️</span>
                                    <b style={{ color: "var(--red)" }}> Local Storage Only</b> — Showing ONLY users from <b>this browser</b>. Users from Brave, Chrome, or other browsers are <b>NOT visible</b> here.
                                    <div style={{ marginTop: 4, opacity: 0.8 }}>
                                        💡 <b>Fix:</b> Deploy this app on Vercel with a <code>DATABASE_URL</code> (Neon PostgreSQL) to see ALL cross-browser users in real-time.
                                    </div>
                                </div>
                            ) : null}

                            {/* Metrics */}

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
                                <div style={{ background: "rgba(255,255,255,0.7)", border: "2px solid var(--ink)", padding: "12px 16px" }}>
                                    <span style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase" }}>Total Registered</span>
                                    <div style={{ fontFamily: "'Special Elite', monospace", fontSize: 28, fontWeight: "bold" }}>{adminUsers.length}</div>
                                </div>
                                <div style={{ background: "rgba(59,86,128,0.12)", border: "2px solid var(--rule-blue)", padding: "12px 16px" }}>
                                    <span style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase" }}>Emails Captured</span>
                                    <div style={{ fontFamily: "'Special Elite', monospace", fontSize: 28, fontWeight: "bold", color: "var(--rule-blue)" }}>
                                        {adminUsers.filter(u => u.email).length}
                                    </div>
                                </div>
                                <div style={{ background: "rgba(47,107,79,0.12)", border: "2px solid var(--green)", padding: "12px 16px" }}>
                                    <span style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase" }}>Shown in Table</span>
                                    <div style={{ fontFamily: "'Special Elite', monospace", fontSize: 28, fontWeight: "bold", color: "var(--green)" }}>
                                        {filteredAdminUsers.length}
                                    </div>
                                </div>
                            </div>

                            {/* Search & Filter */}
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
                                <input
                                    type="text"
                                    placeholder="🔍 Search Name, Roll No, Email, College, Branch..."
                                    value={adminSearch}
                                    onChange={e => setAdminSearch(e.target.value)}
                                    style={{ flex: 1, minWidth: 280, padding: "8px 12px", border: "2px solid var(--ink)", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13 }}
                                />
                                <div className="tabs" style={{ gap: 4 }}>
                                    <button className={`tab ${adminFilter === 'all' ? 'active' : ''}`} style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setAdminFilter('all')}>All ({adminUsers.length})</button>
                                    <button className={`tab ${adminFilter === 'safe' ? 'active' : ''}`} style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setAdminFilter('safe')}>Safe (75%+)</button>
                                    <button className={`tab ${adminFilter === 'condonation' ? 'active' : ''}`} style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setAdminFilter('condonation')}>Condonation</button>
                                    <button className={`tab ${adminFilter === 'detained' ? 'active' : ''}`} style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setAdminFilter('detained')}>Detained (&lt;65%)</button>
                                </div>
                            </div>

                            {/* Table */}
                            <div style={{ overflowX: "auto", border: "2px solid var(--ink)" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                                    <thead>
                                        <tr style={{ background: "var(--ink)", color: "var(--paper)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                                            <th style={{ padding: "10px 12px" }}>Student &amp; Roll No</th>
                                            <th style={{ padding: "10px 12px" }}>Email Address</th>
                                            <th style={{ padding: "10px 12px" }}>College &amp; Branch</th>
                                            <th style={{ padding: "10px 12px" }}>Attendance</th>
                                            <th style={{ padding: "10px 12px" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAdminUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ padding: 20, textAlign: "center" }} className="note">
                                                    No student records match your search.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAdminUsers.map((u, i) => {
                                                const att = typeof u.attendance_json === 'string' ? JSON.parse(u.attendance_json || '{}') : (u.attendance_json || {});
                                                const pastDates = Object.keys(att).filter(d => att[d] === 'P' || att[d] === 'A' || att[d] === 'M');
                                                let attended = 0;
                                                pastDates.forEach(d => { if (att[d] === 'P' || att[d] === 'M') attended++; });
                                                const pct = pastDates.length > 0 ? (attended / pastDates.length) * 100 : null;
                                                const st = statusForPercent(pct, u.target_threshold || 75);
                                                return (
                                                    <tr key={i} style={{ borderBottom: "1px solid rgba(34,40,58,0.2)", background: i % 2 === 0 ? "rgba(255,255,255,0.4)" : "transparent" }}>
                                                        <td style={{ padding: "9px 12px" }}>
                                                            <b>{u.name}</b>
                                                            <span style={{ display: "block", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, opacity: 0.7 }}>{u.roll_no}</span>
                                                        </td>
                                                        <td style={{ padding: "9px 12px" }}>
                                                            {u.email ? <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>📧 {u.email}</span> : <span style={{ opacity: 0.5 }}>—</span>}
                                                        </td>
                                                        <td style={{ padding: "9px 12px" }}>
                                                            <div>{u.college_name || "—"}</div>
                                                            <span style={{ fontSize: 11, opacity: 0.7 }}>{u.program || "B.Tech"}</span>
                                                        </td>
                                                        <td style={{ padding: "9px 12px" }}>
                                                            {pct !== null ? (
                                                                <span style={{ color: st.color, fontWeight: "bold", fontFamily: "'IBM Plex Mono', monospace" }}>
                                                                    {pct.toFixed(1)}% <small style={{ fontSize: 10 }}>({attended}/{pastDates.length})</small>
                                                                </span>
                                                            ) : (
                                                                <span style={{ opacity: 0.5 }}>No logs</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: "9px 12px" }}>
                                                            <button className="btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setSelectedAdminUser(u)}>
                                                                🔍 Inspect
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Selected User Inspector Panel */}
                    {selectedAdminUser && (
                        <div style={{ marginTop: 24, border: "2px solid var(--ink)", padding: 16, background: "rgba(255,255,255,0.6)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <b style={{ fontFamily: "'Special Elite', monospace", fontSize: 15 }}>🔍 Student Inspection — {selectedAdminUser.name}</b>
                                <button className="btn" style={{ fontSize: 11 }} onClick={() => setSelectedAdminUser(null)}>✕ Close</button>
                            </div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }}>
                                <div><b>Roll No:</b> {selectedAdminUser.roll_no}</div>
                                <div><b>Email:</b> {selectedAdminUser.email || "Not provided"}</div>
                                <div><b>College:</b> {selectedAdminUser.college_name || "—"}</div>
                                <div><b>Branch:</b> {selectedAdminUser.program || "B.Tech"}</div>
                                <div><b>Target:</b> {selectedAdminUser.target_threshold || 75}%</div>
                                <div><b>Registered:</b> {selectedAdminUser.created_at ? new Date(selectedAdminUser.created_at).toLocaleDateString() : "N/A"}</div>
                            </div>
                            {(() => {
                                const att = typeof selectedAdminUser.attendance_json === 'string' ? JSON.parse(selectedAdminUser.attendance_json || '{}') : (selectedAdminUser.attendance_json || {});
                                const dates = Object.keys(att).sort();
                                let p = 0, a = 0, m = 0;
                                dates.forEach(d => { if (att[d] === 'P') p++; else if (att[d] === 'A') a++; else if (att[d] === 'M') m++; });
                                return (
                                    <div style={{ marginTop: 10, display: "flex", gap: 16 }}>
                                        <span className="stat-line" style={{ background: "rgba(47,107,79,0.1)" }}>✅ Present: <b>{p}</b></span>
                                        <span className="stat-line" style={{ background: "rgba(166,51,43,0.1)" }}>❌ Absent: <b>{a}</b></span>
                                        <span className="stat-line" style={{ background: "rgba(59,86,128,0.1)" }}>🏥 Medical/OD: <b>{m}</b></span>
                                        <span className="stat-line">📅 Total Logged: <b>{dates.length}</b></span>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER LOGIN / SIGNUP SCREEN IF NOT LOGGED IN
    // ==========================================
    if (!currentUser) {
        return (
            <div className="reg-root login-container">
                <style>{styles}</style>
                <div className="auth-box card">
                    <div className="auth-header">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 4 }}>
                            {/* BunkCalc SVG Logo */}
                            <svg width="52" height="52" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 12 }}>
                                <rect width="512" height="512" rx="112" fill="#22283a"/>
                                <rect x="72" y="140" width="368" height="300" rx="22" fill="#e6dfc4"/>
                                <rect x="72" y="140" width="368" height="86" rx="22" fill="#3b5680"/>
                                <rect x="72" y="196" width="368" height="30" fill="#3b5680"/>
                                <rect x="166" y="96" width="30" height="84" rx="15" fill="#4a5568"/>
                                <rect x="316" y="96" width="30" height="84" rx="15" fill="#4a5568"/>
                                <circle cx="181" cy="140" r="9" fill="#aac4e8" opacity="0.6"/>
                                <circle cx="331" cy="140" r="9" fill="#aac4e8" opacity="0.6"/>
                                <text x="256" y="185" fontFamily="Georgia, serif" fontSize="52" fontWeight="bold" fill="white" textAnchor="middle" opacity="0.9">BC</text>
                                <path d="M152 310 L220 386 L362 232" stroke="#2f6b4f" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M152 310 L220 386 L362 232" stroke="#4aad7a" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <h1 className="reg-title" style={{ margin: 0 }}>BunkCalc</h1>
                        </div>
                        <p className="reg-sub">Know Your Bunks, Plan Your Leaves · Academic Attendance Tracker</p>
                    </div>

                    <div className="auth-tabs">
                        <button className={`tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => { setAuthMode('login'); setAuthError(''); }}>Login</button>
                        <button className={`tab ${authMode === 'signup' ? 'active' : ''}`} onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Sign Up</button>
                    </div>

                    {authError && <div className="stat-line alert-box">{authError}</div>}

                    {authMode === 'login' ? (
                        <form onSubmit={handleLogin} className="auth-form">
                            <label>
                                <span>Roll Number</span>
                                <input type="text" placeholder="e.g. 22H51A0501" value={loginRoll} onChange={e => setLoginRoll(e.target.value)} required />
                            </label>
                            <label>
                                <span>Security PIN</span>
                                <input type="password" placeholder="••••" value={loginPin} onChange={e => setLoginPin(e.target.value)} required />
                            </label>
                            <button type="submit" className="btn primary-btn">Open My Ledger</button>
                        </form>
                    ) : (
                        <form onSubmit={handleSignUp} className="auth-form">
                            <label>
                                <span>Full Name</span>
                                <input type="text" placeholder="e.g. Akshay Kumar" value={signupForm.name} onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} required />
                            </label>
                            <label>
                                <span>Email Address</span>
                                <input type="email" placeholder="e.g. student@college.edu" value={signupForm.email || ''} onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} required />
                            </label>
                            <label>
                                <span>College / Institution Name</span>
                                <input type="text" placeholder="e.g. JNTUH" value={signupForm.collegeName} onChange={e => setSignupForm({ ...signupForm, collegeName: e.target.value })} />
                            </label>
                            <label>
                                <span>Roll Number</span>
                                <input type="text" placeholder="e.g. 26HXXAXXXX" value={signupForm.rollNo} onChange={e => setSignupForm({ ...signupForm, rollNo: e.target.value })} required />
                            </label>
                            <label>
                                <span>Security PIN (4 digits)</span>
                                <input type="password" placeholder="1234" value={signupForm.pin} onChange={e => setSignupForm({ ...signupForm, pin: e.target.value })} required />
                            </label>
                            <label>
                                <span>Program / Branch</span>
                                <input type="text" placeholder="e.g. B.Tech CSE" value={signupForm.program} onChange={e => setSignupForm({ ...signupForm, program: e.target.value })} />
                            </label>
                            <button type="submit" className="btn primary-btn">Create Account</button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER MAIN APPLICATION INTERFACE
    // ==========================================
    return (
        <div className="reg-root">
            <style>{styles}</style>

            {/* Header Bar */}
            <div className="reg-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* BunkCalc SVG Logo */}
                    <svg width="36" height="36" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 8, flexShrink: 0 }}>
                        <rect width="512" height="512" rx="112" fill="#22283a"/>
                        <rect x="72" y="140" width="368" height="300" rx="22" fill="#e6dfc4"/>
                        <rect x="72" y="140" width="368" height="86" rx="22" fill="#3b5680"/>
                        <rect x="72" y="196" width="368" height="30" fill="#3b5680"/>
                        <rect x="166" y="96" width="30" height="84" rx="15" fill="#4a5568"/>
                        <rect x="316" y="96" width="30" height="84" rx="15" fill="#4a5568"/>
                        <circle cx="181" cy="140" r="9" fill="#aac4e8" opacity="0.6"/>
                        <circle cx="331" cy="140" r="9" fill="#aac4e8" opacity="0.6"/>
                        <text x="256" y="185" fontFamily="Georgia, serif" fontSize="52" fontWeight="bold" fill="white" textAnchor="middle" opacity="0.9">BC</text>
                        <path d="M152 310 L220 386 L362 232" stroke="#2f6b4f" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M152 310 L220 386 L362 232" stroke="#4aad7a" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                        <h1 className="reg-title">BunkCalc</h1>
                        <div className="reg-sub">
                            {calendar.institution?.name} · {currentUser?.program || calendar.institution?.program}
                            {calendar.institution?.academic_year ? " · AY " + calendar.institution.academic_year : ""}
                        </div>
                    </div>
                </div>

                {/* Profile & Gear Menu & PWA Install Button */}
                <div className="user-profile-badge">
                    <button className="btn" style={{ fontSize: 11, padding: "5px 10px", borderColor: "var(--rule-blue)", background: "rgba(59,86,128,0.15)" }} onClick={() => { setJsonDraft(JSON.stringify(calendar, null, 2)); setShowAiModal(true); }}>
                        🤖 AI Calendar Setup
                    </button>
                    {deferredPrompt && (
                        <button className="btn primary-btn install-pwa-btn" onClick={handleInstallClick} title="Install App to your device">
                            📲 Install App
                        </button>
                    )}
                    <div className="user-info">
                        <b className="user-name">{currentUser?.name}</b>
                        <span className="user-roll">{currentUser?.rollNo}</span>
                    </div>
                    <button
                        className="gear-btn-modern"
                        onClick={() => setShowSettings(true)}
                        title="Account & App Settings"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        Settings
                    </button>
                </div>
            </div>

            {/* Primary View Navigation */}
            <div className="nav-row">
                <div className="main-tabs">
                    <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>📊 Dashboard & Bunk Math</button>
                    <button className={`tab ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>📅 Attendance Ledger</button>
                    <button className={`tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>📜 Academic Schedule</button>
                </div>

                {/* Term Switcher */}
                <div className="tabs term-tabs">
                    {["sem1", "sem2", "full"].map(k => (
                        <button key={k} className={"tab" + (termKey === k ? " active" : "")} onClick={() => setTermKey(k)}>
                            {terms[k].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ================= TAB 1: DASHBOARD & BUNK CALCULATOR ================= */}
            {activeTab === 'dashboard' && (
                <>
                    {/* Main Rubber Stamp Summary Card */}
                    <div className="card">
                        <div className="stamp-row">
                            <div className="stamp" style={{ color: status.color }}>
                                <div className="pct">{stats.currentPercent === null ? "—" : Math.round(stats.currentPercent) + "%"}</div>
                                <div className="lbl">{status.label}</div>
                            </div>
                            <div className="stamp-details">
                                <div className="stat-line">Attended: <b>{stats.attended}</b> / {stats.markedPast} logged days</div>
                                <div className="stat-line">Working days this term: <b>{stats.totalTerm}</b> ({stats.pastCount} past, {stats.futureCount} remaining)</div>
                                {stats.pending > 0 && (
                                    <div className="stat-line warning-text">{stats.pending} past day{stats.pending > 1 ? "s" : ""} pending — mark them in the calendar tab.</div>
                                )}

                                {/* Target Slider */}
                                <div className="target-slider-box">
                                    <span className="stat-line">Target Threshold: <b>{targetThreshold}%</b></span>
                                    <input
                                        type="range" min="50" max="90" step="5"
                                        value={targetThreshold}
                                        onChange={e => setTargetThreshold(Number(e.target.value))}
                                    />
                                </div>

                                <div style={{ marginTop: 10 }}>
                                    <button className="btn" style={{ fontSize: 11, padding: "4px 10px", borderColor: "var(--amber)", color: "var(--amber)" }} onClick={() => { setMidSemAttendedCount(String(stats.attended)); setShowMidSemModal(true); }}>
                                        🚀 Starting Mid-Semester? Set Past Attendance Baseline
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bunk & Catch-up Calculators Card */}
                    <div className="card">
                        <div className="section-title">Bunk & Recovery Calculator</div>

                        {stats.futureCount === 0 ? (
                            <div className="stat-line">This term's instructional days are all in the past — nothing left to project.</div>
                        ) : stats.impossible ? (
                            <div className="stat-line danger-text">
                                🚨 <b>Detention Warning:</b> Even attending all {stats.futureCount} remaining classes, your maximum possible attendance is <b>{stats.bestPossiblePercent.toFixed(1)}%</b> — below target {targetThreshold}%. Contact your academic advisor immediately for condonation options.
                            </div>
                        ) : (
                            <div className="calculator-box">
                                {/* Safe Bunk Allowance */}
                                <div className="calc-item safe-box">
                                    <div className="calc-num">{stats.maxFutureAbsences}</div>
                                    <div className="calc-desc">
                                        <b>Safe Bunk Days</b>
                                        <span>You can miss up to <b>{stats.maxFutureAbsences}</b> class days out of {stats.futureCount} remaining and stay at <b>{targetThreshold}%+</b>.</span>
                                    </div>
                                </div>

                                {/* Catch-up / Recovery Needed */}
                                {stats.catchUpNeeded > 0 && (
                                    <div className="calc-item recovery-box">
                                        <div className="calc-num">{stats.catchUpNeeded}</div>
                                        <div className="calc-desc">
                                            <b>Consecutive Classes Needed</b>
                                            <span>You are currently below {targetThreshold}%. Attend the next <b>{stats.catchUpNeeded}</b> consecutive working days to recover your target percentage.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="note">Assumes one attendance mark per working day and calculates thresholds based on current institutional rules.</div>
                    </div>

                    {/* Interactive Bunk Simulator & What-If Tool */}
                    <div className="card">
                        <div className="section-title">🔮 What-If Bunk Simulator</div>
                        <p className="note" style={{ marginTop: 0 }}>Simulate taking upcoming leaves without changing your official records to see how it affects your target threshold.</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
                            <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
                                Simulate Bunking Next <b>{simBunks}</b> Class Days:
                                <input
                                    type="range" min="0" max="15" step="1"
                                    value={simBunks}
                                    onChange={e => setSimBunks(Number(e.target.value))}
                                    style={{ display: "block", marginTop: 6, width: 220, accentColor: "var(--amber)" }}
                                />
                            </label>
                            {simResult ? (
                                <div style={{ background: "rgba(255,255,255,0.7)", border: "2px solid var(--ink)", padding: "8px 14px" }}>
                                    <span className="stat-line">Simulated Attendance: <b style={{ color: simResult.simStatus.color }}>{simResult.simPct.toFixed(1)}%</b> ({simResult.simStatus.label})</span>
                                </div>
                            ) : (
                                <span className="note">Drag the slider to test taking leave!</span>
                            )}
                        </div>
                    </div>

                    {/* Quick Mark Today Widget */}
                    <div className="card">
                        <div className="section-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <div className="section-title" style={{ border: "none", margin: 0 }}>Today's Class Ledger — {fmtLong(today)}</div>
                            <button className="btn primary-btn" onClick={() => setShowAddHoliday(true)}>+ Declare Unplanned Holiday</button>
                        </div>

                        {todayIsWorking ? (
                            <div className="today-row" style={{ marginTop: 10 }}>
                                <span>Mark attendance for today:</span>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <button className={"btn present" + (todayMark === "P" ? " active" : "")} onClick={() => mark(today, "P")}>Present</button>
                                    <button className={"btn absent" + (todayMark === "A" ? " active" : "")} onClick={() => mark(today, "A")}>Absent</button>
                                    <button className={"btn medical" + (todayMark === "M" ? " active" : "")} onClick={() => mark(today, "M")} style={{ borderColor: "var(--rule-blue)", color: todayMark === "M" ? "#fff" : "var(--rule-blue)", background: todayMark === "M" ? "var(--rule-blue)" : "transparent" }}>
                                        🏥 Medical / OD
                                    </button>
                                    <button className="btn" onClick={() => addCustomHoliday(today, "Unplanned Holiday / College Closure")} style={{ borderColor: "var(--amber)", color: "var(--amber)" }}>
                                        🎉 Mark Today as Holiday
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="today-row" style={{ marginTop: 10 }}>
                                <div className="stat-line">
                                    {todayInfo && todayInfo.type === "holiday" ? "🎉 No class today — " + todayInfo.name :
                                        todayInfo && todayInfo.type === "sunday" ? "🌴 No class today — Sunday" :
                                            todayInfo && todayInfo.type === "exam" ? "📝 Examination Period — " + todayInfo.label :
                                                "No regular class scheduled today."}
                                </div>
                                {todayInfo && todayInfo.type === "holiday" && customHolidays.some(h => h.date === today) && (
                                    <button className="btn danger-btn" onClick={() => removeCustomHoliday(today)}>Remove Today's Holiday Mark</button>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ================= TAB 2: INTERACTIVE CALENDAR LEDGER ================= */}
            {activeTab === 'calendar' && (
                <div className="card">
                    <div className="cal-nav" style={{ flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <button className="nav-arrow" onClick={() => shiftMonth(-1)}>‹ Previous</button>
                            <div className="section-title" style={{ border: "none", margin: 0 }}>{MONTH_NAMES[calMonth.m]} {calMonth.y}</div>
                            <button className="nav-arrow" onClick={() => shiftMonth(1)}>Next ›</button>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="btn primary-btn" style={{ fontSize: 11 }} onClick={batchMarkPastPresent}>
                                ⚡ Fast Log: Mark All Past Days Present
                            </button>
                            <button className="btn" style={{ fontSize: 11, borderColor: "var(--amber)", color: "var(--amber)" }} onClick={() => { setMidSemAttendedCount(String(stats.attended)); setShowMidSemModal(true); }}>
                                🚀 Set Mid-Sem Baseline
                            </button>
                        </div>
                    </div>

                    <div className="cal-grid">
                        {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
                        {monthCells.map((dateStr, i) => {
                            if (!dateStr) return <div key={"blank" + i} />;
                            const meta = term.dayMeta[dateStr] || { type: "none" };
                            const dayNum = parseInt(dateStr.slice(-2), 10);
                            let cls = "cal-cell";
                            let title = dateStr;
                            if (meta.type === "working") {
                                cls += " working";
                                if (dateStr > today) { cls += " future"; title += " · upcoming"; }
                                else {
                                    const m = attendance[dateStr];
                                    if (m === "P") { cls += " present"; title += " · Present"; }
                                    else if (m === "A") { cls += " absent"; title += " · Absent"; }
                                    else if (m === "M") { cls += " medical"; title += " · Medical / Official Duty"; }
                                    else { cls += " pending"; title += " · tap to mark"; }
                                }
                            } else if (meta.type === "holiday") { cls += " holiday"; title += " · " + meta.name; }
                            else if (meta.type === "sunday") { cls += " sunday"; title += " · Sunday"; }
                            else if (meta.type === "exam") { cls += " exam"; title += " · " + meta.label; }

                            const clickable = meta.type === "working" && dateStr <= today;
                            return (
                                <div
                                    key={dateStr}
                                    className={cls}
                                    title={title}
                                    onClick={clickable ? () => cycleMark(dateStr) : undefined}
                                >
                                    {dayNum}
                                </div>
                            );
                        })}
                    </div>

                    <div className="legend">
                        <span><i className="swatch" style={{ background: "var(--green)" }} /> Present</span>
                        <span><i className="swatch" style={{ background: "var(--red)" }} /> Absent</span>
                        <span><i className="swatch" style={{ background: "var(--rule-blue)" }} /> Medical / OD</span>
                        <span><i className="swatch" style={{ background: "rgba(168,121,31,0.4)" }} /> Not logged</span>
                        <span><i className="swatch" style={{ background: "rgba(59,86,128,0.4)" }} /> Holiday</span>
                        <span><i className="swatch" style={{ background: "rgba(34,40,58,0.2)" }} /> Exam period</span>
                    </div>

                    <div style={{ marginTop: 18 }}>
                        <button className="btn reset-btn" onClick={resetAll}>Reset All Logged Attendance Marks</button>
                    </div>
                </div>
            )}

            {/* ================= TAB 3: ACADEMIC SCHEDULE ================= */}
            {activeTab === 'schedule' && (
                <div className="card">
                    <div className="section-title">Academic Schedule & Calendar Ledger</div>

                    <div className="schedule-section">
                        <h3 style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 4 }}>Semester 1 Instructional Spells & Exams</h3>
                        <div className="timeline-container" style={{ marginTop: 10 }}>
                            {(calendar.academic_calendar?.semester_1?.events || []).map((ev, idx) => {
                                const isRange = ev.start && ev.end;
                                const isActive = isRange && today >= ev.start && today <= ev.end;
                                const isPast = isRange ? today > ev.end : (ev.date && today > ev.date);
                                const isExam = /Mid|Examinations|Practical/i.test(ev.activity);
                                const isSpell = /Spell of Instructions/i.test(ev.activity);
                                let borderCls = isSpell ? "spell-card" : isExam ? "exam-card" : "other-card";

                                return (
                                    <div key={idx} className={`timeline-card ${borderCls} ${isActive ? "active-now" : ""}`}>
                                        <div className="timeline-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                                            <div className="timeline-title" style={{ fontSize: 14 }}>
                                                {isExam ? "📝 " : isSpell ? "📘 " : "🗓️ "}
                                                <b>{ev.activity}</b>
                                            </div>
                                            {isActive && <span className="badge active-badge" style={{ background: "var(--green)", color: "#fff", padding: "2px 8px", fontSize: 10, borderRadius: 3, fontWeight: "bold" }}>🟢 CURRENT ACTIVE SPELL</span>}
                                            {isPast && <span className="badge past-badge" style={{ background: "rgba(34,40,58,0.2)", padding: "2px 8px", fontSize: 10, borderRadius: 3 }}>COMPLETED</span>}
                                            {!isActive && !isPast && <span className="badge future-badge" style={{ background: "rgba(168,121,31,0.2)", color: "var(--amber)", padding: "2px 8px", fontSize: 10, borderRadius: 3, fontWeight: "bold" }}>UPCOMING</span>}
                                        </div>

                                        <div className="timeline-meta" style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                                            <span className="date-pill" style={{ fontFamily: "'IBM Plex Mono', monospace", background: "rgba(34,40,58,0.08)", padding: "3px 8px", fontSize: 12, border: "1px solid rgba(34,40,58,0.2)" }}>
                                                📅 {isRange ? `${ev.start} ➔ ${ev.end}` : ev.date}
                                            </span>
                                            {ev.duration && <span className="duration-pill" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, opacity: 0.85 }}>⌛ {ev.duration}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="schedule-section" style={{ marginTop: 24 }}>
                        <h3 style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 4 }}>Semester 2 Instructional Spells & Exams</h3>
                        <div className="timeline-container" style={{ marginTop: 10 }}>
                            {(calendar.academic_calendar?.semester_2?.events || []).map((ev, idx) => {
                                const isRange = ev.start && ev.end;
                                const isActive = isRange && today >= ev.start && today <= ev.end;
                                const isPast = isRange ? today > ev.end : (ev.date && today > ev.date);
                                const isExam = /Mid|Examinations|Practical/i.test(ev.activity);
                                const isSpell = /Spell of Instructions/i.test(ev.activity);
                                let borderCls = isSpell ? "spell-card" : isExam ? "exam-card" : "other-card";

                                return (
                                    <div key={idx} className={`timeline-card ${borderCls} ${isActive ? "active-now" : ""}`}>
                                        <div className="timeline-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                                            <div className="timeline-title" style={{ fontSize: 14 }}>
                                                {isExam ? "📝 " : isSpell ? "📘 " : "🗓️ "}
                                                <b>{ev.activity}</b>
                                            </div>
                                            {isActive && <span className="badge active-badge" style={{ background: "var(--green)", color: "#fff", padding: "2px 8px", fontSize: 10, borderRadius: 3, fontWeight: "bold" }}>🟢 CURRENT ACTIVE SPELL</span>}
                                            {isPast && <span className="badge past-badge" style={{ background: "rgba(34,40,58,0.2)", padding: "2px 8px", fontSize: 10, borderRadius: 3 }}>COMPLETED</span>}
                                            {!isActive && !isPast && <span className="badge future-badge" style={{ background: "rgba(168,121,31,0.2)", color: "var(--amber)", padding: "2px 8px", fontSize: 10, borderRadius: 3, fontWeight: "bold" }}>UPCOMING</span>}
                                        </div>

                                        <div className="timeline-meta" style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                                            <span className="date-pill" style={{ fontFamily: "'IBM Plex Mono', monospace", background: "rgba(34,40,58,0.08)", padding: "3px 8px", fontSize: 12, border: "1px solid rgba(34,40,58,0.2)" }}>
                                                📅 {isRange ? `${ev.start} ➔ ${ev.end}` : ev.date}
                                            </span>
                                            {ev.duration && <span className="duration-pill" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, opacity: 0.85 }}>⌛ {ev.duration}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="schedule-section" style={{ marginTop: 24 }}>
                        <h3 style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 4 }}>Declared Unplanned Holidays</h3>
                        {customHolidays.length === 0 ? (
                            <div className="stat-line" style={{ marginTop: 8 }}>No custom unplanned holidays added yet.</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                                {customHolidays.map((h, i) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(168,121,31,0.15)", padding: "8px 14px", border: "1px solid rgba(168,121,31,0.5)" }}>
                                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}><b>{h.date}</b> — {h.name}</span>
                                        <button className="btn danger-btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => removeCustomHoliday(h.date)}>Delete</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="schedule-section" style={{ marginTop: 24 }}>
                        <h3 style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 4 }}>Recognized Institutional Holidays</h3>
                        <div className="holiday-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10, marginTop: 12 }}>
                            {(calendar.holidays || []).map((h, i) => (
                                <div key={i} className="holiday-card" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid var(--ink)", padding: "10px 12px", borderLeft: "4px solid var(--rule-blue)" }}>
                                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--rule-red)", fontWeight: "bold" }}>{h.date}</div>
                                    <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{h.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL: ADD CUSTOM HOLIDAY ================= */}
            {showAddHoliday && (
                <div className="overlay" onClick={() => setShowAddHoliday(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="section-title">Declare Unplanned Holiday</div>
                        <p className="note">Add unexpected college closures, rain holidays, or emergency closures. They will automatically be excluded from required working days.</p>
                        <form onSubmit={(e) => { e.preventDefault(); addCustomHoliday(newHolidayForm.date, newHolidayForm.reason); }} className="auth-form">
                            <label>
                                <span>Date</span>
                                <input type="date" value={newHolidayForm.date} onChange={e => setNewHolidayForm({ ...newHolidayForm, date: e.target.value })} required />
                            </label>
                            <label>
                                <span>Reason / Occasion</span>
                                <input type="text" placeholder="e.g. NSUI Bandh / Rain Holiday" value={newHolidayForm.reason} onChange={e => setNewHolidayForm({ ...newHolidayForm, reason: e.target.value })} required />
                            </label>
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                <button type="submit" className="btn primary-btn">Declare Holiday</button>
                                <button type="button" className="btn" onClick={() => setShowAddHoliday(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL: MID-SEMESTER BASELINE SETUP ================= */}
            {showMidSemModal && (
                <div className="overlay" onClick={() => setShowMidSemModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="section-title">🚀 Mid-Semester Attendance Baseline</div>
                        <p className="note">Starting to use the app in the middle of the semester? Enter how many classes you have attended so far up to today ({stats.pastCount} total past working days held).</p>
                        <form onSubmit={handleApplyMidSemBaseline} className="auth-form" style={{ marginTop: 14 }}>
                            <label>
                                <span>Total Past Working Days Held So Far</span>
                                <input type="text" value={stats.pastCount} disabled style={{ opacity: 0.7 }} />
                            </label>
                            <label>
                                <span>Classes Attended So Far</span>
                                <input
                                    type="number"
                                    min="0"
                                    max={stats.pastCount}
                                    placeholder={`e.g. 12 out of ${stats.pastCount}`}
                                    value={midSemAttendedCount}
                                    onChange={e => setMidSemAttendedCount(e.target.value)}
                                    required
                                />
                            </label>
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                <button type="submit" className="btn primary-btn">Apply Baseline</button>
                                <button type="button" className="btn" onClick={() => setShowMidSemModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL 1: AI CALENDAR IMPORT ================= */}
            {showAiModal && (
                <div className="overlay" onClick={() => setShowAiModal(false)}>
                    <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                        <div className="section-title">🤖 AI Academic Calendar Importer</div>
                        <p className="note">Extract your official college academic calendar from any photo or PDF notice board in 10 seconds using AI!</p>

                        <div className="ai-guide-box" style={{ background: "rgba(59,86,128,0.1)", border: "2px stroke var(--rule-blue)", padding: 14, margin: "12px 0" }}>
                            <div style={{ fontFamily: "'Special Elite', monospace", fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>
                                Instructions:
                            </div>
                            <ol style={{ margin: "6px 0 10px 0", paddingLeft: 20, fontSize: 12, lineHeight: 1.6 }}>
                                <li>Take a photo or screenshot of your college's official <b>Academic Calendar PDF/Notice</b>.</li>
                                <li>Click below to copy the <b>AI Extraction Prompt</b>.</li>
                                <li>Open <b>ChatGPT, Gemini, or Claude</b>, attach the photo, and paste the prompt.</li>
                                <li>Copy the generated JSON output and paste it below!</li>
                            </ol>

                            <button
                                className="btn primary-btn"
                                onClick={() => {
                                    navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
                                    setCopiedPrompt(true);
                                    setTimeout(() => setCopiedPrompt(false), 3000);
                                }}
                            >
                                {copiedPrompt ? "✅ AI Prompt Copied to Clipboard!" : "📋 Copy AI Prompt for ChatGPT / Gemini"}
                            </button>
                        </div>

                        <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: "bold" }}>
                            Paste Calendar JSON below:
                        </label>
                        <textarea
                            style={{ marginTop: 6, height: 140 }}
                            placeholder="Paste JSON generated by AI here..."
                            value={jsonDraft}
                            onChange={e => setJsonDraft(e.target.value)}
                        />
                        {jsonError && <div className="stat-line danger-text" style={{ marginTop: 6 }}>{jsonError}</div>}

                        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                            <button className="btn primary-btn" onClick={applyJson}>Save & Load Calendar</button>
                            <button className="btn" onClick={() => setShowAiModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL 2: ACCOUNT & PROFILE SETTINGS ================= */}
            {showSettings && (
                <div className="overlay" onClick={() => setShowSettings(false)}>
                    <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                        <div className="section-title">⚙ Account & Profile Settings</div>

                        {editProfileMsg && (
                            <div className="stat-line alert-box" style={{ marginBottom: 12 }}>
                                {editProfileMsg}
                            </div>
                        )}

                        <form onSubmit={handleUpdateProfile} className="auth-form">
                            <label>
                                <span>Full Name</span>
                                <input
                                    type="text"
                                    value={editProfileForm.name}
                                    onChange={e => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                                    required
                                />
                            </label>

                            <label>
                                <span>Email Address</span>
                                <input
                                    type="email"
                                    placeholder="e.g. student@college.edu"
                                    value={editProfileForm.email}
                                    onChange={e => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                                    required
                                />
                            </label>

                            <label>
                                <span>College / Institution Name</span>
                                <input
                                    type="text"
                                    value={editProfileForm.collegeName}
                                    onChange={e => setEditProfileForm({ ...editProfileForm, collegeName: e.target.value })}
                                />
                            </label>

                            <label>
                                <span>Program / Branch</span>
                                <input
                                    type="text"
                                    value={editProfileForm.program}
                                    onChange={e => setEditProfileForm({ ...editProfileForm, program: e.target.value })}
                                />
                            </label>

                            <label>
                                <span>Update Security PIN / Password</span>
                                <input
                                    type="password"
                                    placeholder="Leave blank to keep current PIN"
                                    value={editProfileForm.newPin}
                                    onChange={e => setEditProfileForm({ ...editProfileForm, newPin: e.target.value })}
                                />
                            </label>

                            <button type="submit" className="btn primary-btn" style={{ marginTop: 6 }}>
                                💾 Save Profile Changes & Password
                            </button>
                        </form>

                        <div className="auth-form" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--ink)" }}>
                            <label>
                                <span>Target Attendance Goal Threshold</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                                    <input
                                        type="range" min="50" max="90" step="5"
                                        value={targetThreshold}
                                        onChange={e => setTargetThreshold(Number(e.target.value))}
                                        style={{ flex: 1, accentColor: "var(--ink)" }}
                                    />
                                    <b style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16 }}>{targetThreshold}%</b>
                                </div>
                            </label>

                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--ink)" }}>
                                <span style={{ fontSize: 13, fontWeight: "bold" }}>Data Reset</span>
                                <p className="note" style={{ margin: "4px 0 10px 0" }}>Clear all logged attendance marks and custom holiday entries.</p>
                                <button className="btn reset-btn" onClick={() => { resetAll(); setShowSettings(false); }}>
                                    Reset All Logged Attendance Marks
                                </button>
                            </div>
                        </div>

                        {/* Account Details & Logout Action */}
                        {/* Account Details & Logout Action */}
                        <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px dashed var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                            <div>
                                <b style={{ fontSize: 14 }}>{currentUser?.name}</b>
                                <span style={{ display: "block", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, opacity: 0.7 }}>Roll No: {currentUser?.rollNo}</span>
                                {currentUser?.email && <span style={{ display: "block", fontSize: 11, opacity: 0.85, marginTop: 2 }}>📧 {currentUser.email}</span>}
                            </div>
                            <button className="btn danger-btn" onClick={() => { setShowSettings(false); handleLogout(); }}>
                                🚪 Logout of Account
                            </button>
                        </div>

                        <div style={{ marginTop: 16, textAlign: "right" }}>
                            <button className="btn" onClick={() => setShowSettings(false)}>Close Settings</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL: SECRET ADMIN LOGIN (/Mahesh) ================= */}
            {showAdminAuthModal && (
                <div className="overlay" onClick={() => setShowAdminAuthModal(false)}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="section-title">👑 Admin Access Verification</div>
                        <p className="note" style={{ marginBottom: 12 }}>Enter Master Password to access the Master Admin Console.</p>

                        {adminAuthError && (
                            <div className="stat-line alert-box danger-text" style={{ marginBottom: 12, color: "var(--red)", fontWeight: "bold" }}>
                                {adminAuthError}
                            </div>
                        )}

                        <form onSubmit={handleAdminLogin} className="auth-form">
                            <label>
                                <span>Master Admin Password</span>
                                <input 
                                    type="password" 
                                    placeholder="Enter Admin Password..." 
                                    value={adminPasswordInput} 
                                    onChange={e => setAdminPasswordInput(e.target.value)} 
                                    autoFocus 
                                    required 
                                />
                            </label>

                            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                                <button type="submit" className="btn primary-btn">Unlock Admin Portal</button>
                                <button type="button" className="btn" onClick={() => { setShowAdminAuthModal(false); setAdminPasswordInput(""); }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL 3: MASTER ADMIN PORTAL ================= */}
            {showAdminModal && (
                <div className="overlay" onClick={() => setShowAdminModal(false)}>
                    <div className="modal" style={{ maxWidth: 880, width: "95%" }} onClick={e => e.stopPropagation()}>
                        <div className="section-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid var(--ink)", paddingBottom: 8, marginBottom: 12 }}>
                            <div className="section-title" style={{ border: "none", margin: 0 }}>👑 Master Admin Console — Student Registry</div>
                            <button className="btn primary-btn" style={{ fontSize: 11, background: "var(--green)", borderColor: "var(--ink)" }} onClick={exportEmailsCSV}>
                                📥 Export All Emails (CSV)
                            </button>
                        </div>

                        {isAdminLoading ? (
                            <div className="stat-line" style={{ padding: 20, textAlign: "center" }}>Loading registered user database...</div>
                        ) : (
                            <>
                                {/* Admin Metrics Cards */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
                                    <div style={{ background: "rgba(255,255,255,0.7)", border: "1px solid var(--ink)", padding: "10px 14px" }}>
                                        <span style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase" }}>Total Registered</span>
                                        <div style={{ fontFamily: "'Special Elite', monospace", fontSize: 22, fontWeight: "bold" }}>{adminUsers.length}</div>
                                    </div>
                                    <div style={{ background: "rgba(59,86,128,0.12)", border: "1px solid var(--rule-blue)", padding: "10px 14px" }}>
                                        <span style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase" }}>Emails Captured</span>
                                        <div style={{ fontFamily: "'Special Elite', monospace", fontSize: 22, fontWeight: "bold", color: "var(--rule-blue)" }}>
                                            {adminUsers.filter(u => u.email).length}
                                        </div>
                                    </div>
                                    <div style={{ background: "rgba(47,107,79,0.12)", border: "1px solid var(--green)", padding: "10px 14px" }}>
                                        <span style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase" }}>Matching Search</span>
                                        <div style={{ fontFamily: "'Special Elite', monospace", fontSize: 22, fontWeight: "bold", color: "var(--green)" }}>
                                            {filteredAdminUsers.length}
                                        </div>
                                    </div>
                                </div>

                                {/* Search Bar & Filter Controls */}
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
                                    <input 
                                        type="text" 
                                        placeholder="🔍 Search Roll No, Student Name, Email, College, Branch..." 
                                        value={adminSearch} 
                                        onChange={e => setAdminSearch(e.target.value)} 
                                        style={{ flex: 1, minWidth: 260, padding: "7px 12px", border: "2px solid var(--ink)", fontFamily: "'IBM Plex Sans', sans-serif" }}
                                    />
                                    <div className="tabs" style={{ gap: 4 }}>
                                        <button className={`tab ${adminFilter === 'all' ? 'active' : ''}`} style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => setAdminFilter('all')}>All ({adminUsers.length})</button>
                                        <button className={`tab ${adminFilter === 'safe' ? 'active' : ''}`} style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => setAdminFilter('safe')}>Safe (75%+)</button>
                                        <button className={`tab ${adminFilter === 'condonation' ? 'active' : ''}`} style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => setAdminFilter('condonation')}>Condonation</button>
                                        <button className={`tab ${adminFilter === 'detained' ? 'active' : ''}`} style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => setAdminFilter('detained')}>Detained (&lt;65%)</button>
                                    </div>
                                </div>

                                {/* User Registry Table */}
                                <div style={{ overflowX: "auto", border: "2px solid var(--ink)", maxHeight: 380 }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                                        <thead>
                                            <tr style={{ background: "var(--ink)", color: "var(--paper)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
                                                <th style={{ padding: "8px 10px" }}>Student &amp; Roll No</th>
                                                <th style={{ padding: "8px 10px" }}>Email Address</th>
                                                <th style={{ padding: "8px 10px" }}>College &amp; Branch</th>
                                                <th style={{ padding: "8px 10px" }}>Attendance</th>
                                                <th style={{ padding: "8px 10px" }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAdminUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: 16, textAlign: "center" }} className="note">
                                                        No student records match your search filter.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredAdminUsers.map((u, i) => {
                                                    const att = typeof u.attendance_json === 'string' ? JSON.parse(u.attendance_json || '{}') : (u.attendance_json || {});
                                                    const pastDates = Object.keys(att).filter(d => att[d] === 'P' || att[d] === 'A' || att[d] === 'M');
                                                    let attended = 0;
                                                    pastDates.forEach(d => { if (att[d] === 'P' || att[d] === 'M') attended++; });
                                                    const pct = pastDates.length > 0 ? (attended / pastDates.length) * 100 : null;
                                                    const st = statusForPercent(pct, u.target_threshold || 75);

                                                    return (
                                                        <tr key={i} style={{ borderBottom: "1px solid rgba(34,40,58,0.2)", background: i % 2 === 0 ? "rgba(255,255,255,0.4)" : "transparent" }}>
                                                            <td style={{ padding: "8px 10px" }}>
                                                                <b>{u.name}</b>
                                                                <span style={{ display: "block", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, opacity: 0.7 }}>{u.roll_no}</span>
                                                            </td>
                                                            <td style={{ padding: "8px 10px" }}>
                                                                {u.email ? <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>📧 {u.email}</span> : <span style={{ opacity: 0.5 }}>Not set</span>}
                                                            </td>
                                                            <td style={{ padding: "8px 10px" }}>
                                                                <div>{u.college_name || "Standard College"}</div>
                                                                <span style={{ fontSize: 11, opacity: 0.7 }}>{u.program || "B.Tech"}</span>
                                                            </td>
                                                            <td style={{ padding: "8px 10px" }}>
                                                                {pct !== null ? (
                                                                    <span style={{ color: st.color, fontWeight: "bold", fontFamily: "'IBM Plex Mono', monospace" }}>
                                                                        {pct.toFixed(1)}% <small style={{ fontSize: 10 }}>({attended}/{pastDates.length})</small>
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ opacity: 0.5 }}>No logs</span>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: "8px 10px" }}>
                                                                <button className="btn" style={{ padding: "3px 8px", fontSize: 10 }} onClick={() => setSelectedAdminUser(u)}>
                                                                    🔍 Inspect Ledger
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        <div style={{ marginTop: 16, textAlign: "right" }}>
                            <button className="btn" onClick={() => setShowAdminModal(false)}>Close Admin Portal</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= SUB-MODAL: ADMIN USER LEDGER INSPECTOR ================= */}
            {selectedAdminUser && (
                <div className="overlay" onClick={() => setSelectedAdminUser(null)}>
                    <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                        <div className="section-title">🔍 Student Inspection — {selectedAdminUser.name}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, marginBottom: 12 }}>
                            <div><b>Roll Number:</b> {selectedAdminUser.roll_no}</div>
                            <div><b>Email Address:</b> {selectedAdminUser.email || "Not provided"}</div>
                            <div><b>College:</b> {selectedAdminUser.college_name || "Standard Institution"}</div>
                            <div><b>Branch / Program:</b> {selectedAdminUser.program || "B.Tech"}</div>
                            <div><b>Target Threshold:</b> {selectedAdminUser.target_threshold || 75}%</div>
                            <div><b>Account Created:</b> {selectedAdminUser.created_at ? new Date(selectedAdminUser.created_at).toLocaleString() : "N/A"}</div>
                        </div>

                        <div className="section-title" style={{ fontSize: 13, marginTop: 14 }}>Logged Attendance Ledger Summary</div>
                        {(() => {
                            const att = typeof selectedAdminUser.attendance_json === 'string' ? JSON.parse(selectedAdminUser.attendance_json || '{}') : (selectedAdminUser.attendance_json || {});
                            const dates = Object.keys(att).sort();
                            let p = 0, a = 0, m = 0;
                            dates.forEach(d => { if (att[d] === 'P') p++; else if (att[d] === 'A') a++; else if (att[d] === 'M') m++; });
                            return (
                                <div>
                                    <div className="stat-line">Attended Present: <b>{p}</b> days</div>
                                    <div className="stat-line">Absences Marked: <b>{a}</b> days</div>
                                    <div className="stat-line">Medical / OD Marked: <b>{m}</b> days</div>
                                    <div className="stat-line">Total Logged Days: <b>{dates.length}</b> days</div>
                                </div>
                            );
                        })()}

                        <div style={{ marginTop: 16, textAlign: "right" }}>
                            <button className="btn primary-btn" onClick={() => setSelectedAdminUser(null)}>Close Inspector</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// STYLES: VINTAGE LEDGER NOTEBOOK DESIGN
// ==========================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

  :root {
    --paper: #e6dfc4;
    --paper-dark: #dcd3af;
    --rule-red: #b23a2e;
    --rule-blue: #3b5680;
    --ink: #22283a;
    --green: #2f6b4f;
    --amber: #a8791f;
    --red: #a6332b;
  }

  .reg-root {
    background: var(--paper);
    background-image:
      repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(178,58,46,0.35) 28px),
      linear-gradient(90deg, transparent 54px, var(--rule-blue) 55px, var(--rule-blue) 56px, transparent 57px);
    min-height: 100vh;
    font-family: 'IBM Plex Sans', sans-serif;
    color: var(--ink);
    padding: 20px 20px 48px 68px;
    box-sizing: border-box;
  }

  @media (max-width: 480px) {
    .reg-root { padding-left: 48px; padding-right: 12px; }
  }

  .reg-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 18px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .reg-title {
    font-family: 'Special Elite', monospace;
    font-size: 28px;
    letter-spacing: 1px;
    margin: 0;
  }

  .reg-sub {
    font-size: 13px;
    opacity: 0.8;
    margin-top: 4px;
  }

  .user-profile-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,252,240,0.8);
    border: 2px solid var(--ink);
    padding: 6px 12px;
    border-radius: 4px;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    text-align: right;
  }

  .gear-btn-modern {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: bold;
    color: var(--ink);
    background: rgba(255,255,255,0.7);
    border: 2px solid var(--ink);
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    box-shadow: 1px 1px 0px var(--ink);
  }
  .gear-btn-modern:hover {
    background: var(--ink);
    color: var(--paper);
    transform: translateY(-1px);
    box-shadow: 2px 2px 0px var(--ink);
  }

  .user-name { font-size: 13px; }
  .user-roll { font-family: 'IBM Plex Mono', monospace; font-size: 11px; opacity: 0.7; }

  .nav-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .main-tabs, .tabs { display: flex; gap: 6px; flex-wrap: wrap; }

  .tab {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.5px;
    padding: 7px 12px;
    border: 2px solid var(--ink);
    background: transparent;
    cursor: pointer;
    text-transform: uppercase;
    font-weight: 500;
  }

  .tab.active {
    background: var(--ink);
    color: var(--paper);
  }

  .card {
    background: rgba(255,252,240,0.75);
    border: 1px solid rgba(34,40,58,0.4);
    padding: 18px;
    margin-bottom: 18px;
    box-shadow: 2px 2px 0px rgba(34,40,58,0.15);
  }

  .stamp-row {
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
  }

  .stamp {
    width: 124px;
    height: 124px;
    border-radius: 50%;
    border: 4px double currentColor;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transform: rotate(-8deg);
    font-family: 'Special Elite', monospace;
    flex-shrink: 0;
  }

  .stamp .pct { font-size: 28px; line-height: 1; font-weight: bold; }
  .stamp .lbl { font-size: 11px; letter-spacing: 0.5px; text-align: center; padding: 0 8px; margin-top: 4px; }

  .stat-line { font-size: 14px; margin: 4px 0; }
  .stat-line b { font-family: 'IBM Plex Mono', monospace; }

  .target-slider-box {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .target-slider-box input[type="range"] {
    accent-color: var(--ink);
    cursor: pointer;
  }

  .section-title {
    font-family: 'Special Elite', monospace;
    font-size: 15px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 12px 0;
    border-bottom: 2px solid var(--ink);
    padding-bottom: 6px;
  }

  .calculator-box {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
    margin-top: 10px;
  }

  .calc-item {
    border: 2px solid var(--ink);
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(255,255,255,0.4);
  }

  .safe-box { border-color: var(--green); }
  .recovery-box { border-color: var(--amber); }

  .calc-num {
    font-family: 'Special Elite', monospace;
    font-size: 34px;
    font-weight: bold;
    line-height: 1;
  }

  .calc-desc { display: flex; flex-direction: column; font-size: 13px; }
  .calc-desc b { font-family: 'IBM Plex Mono', monospace; font-size: 14px; }

  .btn {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    padding: 8px 14px;
    border: 2px solid var(--ink);
    background: transparent;
    cursor: pointer;
    text-transform: uppercase;
    font-weight: 600;
  }

  .btn.primary-btn { background: var(--ink); color: var(--paper); }
  .btn.present.active { background: var(--green); color: #fff; border-color: var(--green); }
  .btn.absent.active { background: var(--red); color: #fff; border-color: var(--red); }
  .btn.danger-btn { border-color: var(--red); color: var(--red); }

  .today-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  /* Calendar Styling */
  .cal-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .nav-arrow {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: bold;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .cal-dow {
    font-size: 11px;
    text-align: center;
    opacity: 0.7;
    font-family: 'IBM Plex Mono', monospace;
    font-weight: bold;
  }

  .cal-cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-family: 'IBM Plex Mono', monospace;
    border-radius: 3px;
    border: 1px solid transparent;
    cursor: default;
    position: relative;
    font-weight: 500;
  }

  .cal-cell.working { border-color: rgba(34,40,58,0.4); cursor: pointer; }
  .cal-cell.present { background: var(--green); color: #fff; }
  .cal-cell.absent { background: var(--red); color: #fff; }
  .cal-cell.medical { background: var(--rule-blue); color: #fff; }
  .cal-cell.pending { background: rgba(168,121,31,0.22); }
  .cal-cell.holiday { background: rgba(59,86,128,0.18); opacity: 0.75; }
  .cal-cell.sunday { opacity: 0.4; }
  .cal-cell.exam { background: repeating-linear-gradient(45deg, rgba(34,40,58,0.08), rgba(34,40,58,0.08) 4px, transparent 4px, transparent 8px); }
  .cal-cell.future { opacity: 0.55; }

  .timeline-container { display: flex; flex-direction: column; gap: 10px; }
  .timeline-card {
    background: rgba(255,255,255,0.7);
    border: 1px solid var(--ink);
    padding: 12px 14px;
    box-shadow: 2px 2px 0px rgba(34,40,58,0.1);
  }
  .timeline-card.spell-card { border-left: 6px solid var(--rule-blue); }
  .timeline-card.exam-card { border-left: 6px solid var(--rule-red); }
  .timeline-card.other-card { border-left: 6px solid var(--amber); }
  .timeline-card.active-now {
    border: 2px solid var(--green);
    border-left: 6px solid var(--green);
    background: rgba(47,107,79,0.08);
    box-shadow: 3px 3px 0px var(--green);
  }

  .legend {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 12px;
    margin-top: 14px;
    opacity: 0.9;
  }

  .legend span { display: inline-flex; align-items: center; gap: 5px; }
  .swatch { width: 12px; height: 12px; border-radius: 2px; display: inline-block; }

  /* Auth Screens Styling */
  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .auth-box {
    max-width: 420px;
    width: 100%;
    border: 2px solid var(--ink);
    padding: 24px;
  }

  .auth-header { text-align: center; margin-bottom: 18px; }
  .auth-tabs { display: flex; gap: 8px; margin-bottom: 18px; }
  .auth-tabs .tab { flex: 1; text-align: center; }

  .auth-form label {
    display: flex;
    flex-direction: column;
    font-size: 12px;
    font-family: 'IBM Plex Mono', monospace;
    margin-bottom: 12px;
  }

  .auth-form input, textarea {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    padding: 8px 10px;
    border: 2px solid var(--ink);
    background: rgba(255,255,255,0.7);
    margin-top: 4px;
    box-sizing: border-box;
  }

  textarea { width: 100%; height: 180px; }

  .auth-footer { margin-top: 18px; text-align: center; }
  .guest-btn { width: 100%; }

  .warning-text { color: var(--amber); }
  .danger-text { color: var(--red); }
  .alert-box {
    background: rgba(166,51,43,0.15);
    border: 1px solid var(--red);
    padding: 8px 12px;
    font-size: 12px;
    margin-bottom: 12px;
  }

  .schedule-section h3 {
    font-family: 'Special Elite', monospace;
    font-size: 14px;
    margin-bottom: 6px;
  }

  .schedule-section ul { padding-left: 18px; margin: 0; font-size: 13px; }
  .holiday-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .holiday-tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    background: rgba(59,86,128,0.15);
    border: 1px solid rgba(59,86,128,0.4);
    padding: 3px 8px;
  }

  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex;
    align-items: center; justify-content: center; padding: 16px; z-index: 50;
  }
  .modal {
    background: var(--paper); border: 2px solid var(--ink); padding: 20px;
    max-width: 500px; width: 100%; max-height: 85vh; overflow: auto;
  }
  .note { font-size: 12px; opacity: 0.8; line-height: 1.5; margin-top: 6px; }
`;
