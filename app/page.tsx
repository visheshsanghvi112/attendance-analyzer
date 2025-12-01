'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  BarChart3, Upload, Download, Search, FileSpreadsheet, Users, CheckCircle2,
  XCircle, Clock, Percent, Eye, X, Calendar, MapPin, AlertTriangle, ChevronDown, LogOut, Info
} from 'lucide-react';

// ========================================
// TYPES
// ========================================

interface DailyRecord {
  date: string;
  dayName: string;
  hours: number;
  hoursFormatted: string;
  firstIn: string;
  lastOut: string;
  location: string;
  isPresent: boolean;
  isAbsent: boolean;
  isRestDay: boolean;
  isHalfDay: boolean;
  isLate: boolean;
  isEarlyLeave: boolean;
}

interface EmployeeStats {
  name: string;
  memberCode: string;
  fullDays: number;
  halfDays: number;
  lateMarks: number;
  earlyLeaves: number;
  absentDays: number;
  totalHours: number;
  avgDailyHours: number;
  status: string;
  workingDays: number;
  presentDays: number;
  dailyRecords: DailyRecord[];
  totalFromFile: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

type Theme = 'light' | 'dark' | 'system';
type FileFormat = 'monthly_grid' | 'monthly_daily' | 'raw_entries' | 'unknown';

// ========================================
// UTILITIES
// ========================================

function parseDuration(s: string): number {
  if (!s || s.toString().trim() === '-' || s.toString().trim() === '') return 0;
  try {
    const parts = s.toString().split(' ');
    let h = 0, m = 0;
    for (const p of parts) {
      if (p.includes('h')) h = parseInt(p.replace('h', ''), 10) || 0;
      else if (p.includes('m')) m = parseInt(p.replace('m', ''), 10) || 0;
    }
    return h + m / 60;
  } catch { return 0; }
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || timeStr.trim() === '-' || timeStr.trim() === '') return -1;
  try {
    const match = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!match) return -1;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[4];
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
  } catch { return -1; }
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatHoursToHM(h: number): string {
  if (h === 0) return '-';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
}

function getInitials(name: string): string {
  return name.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function detectFormat(data: string[][]): FileFormat {
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const str = row.join(',').toLowerCase();
    
    // Format 1: Monthly Grid (NAME, MEMBER CODE, TYPE, Nov 01, Nov 02...)
    if (str.includes('monthly timesheet')) return 'monthly_grid';
    if (row[0]?.toUpperCase() === 'NAME' && row[1]?.toUpperCase()?.includes('MEMBER') && row[2]?.toUpperCase() === 'TYPE') return 'monthly_grid';
    
    // Format 2: Monthly Daily (Day, Date, Full Name, ... First In, Last Out)
    if (row.includes('Day') && row.includes('Date') && row.includes('Full Name') && row.includes('First In')) return 'monthly_daily';
    if (row[0] === 'Day' && row[1] === 'Date' && row[2] === 'Full Name') return 'monthly_daily';
    
    // Format 3: Raw Entries (Date, Full Name, EntryType, Time...)
    if (row.includes('Full Name') && row.includes('EntryType')) return 'raw_entries';
    if (row.includes('Date') && row.includes('Time') && row.includes('EntryType')) return 'raw_entries';
  }
  return 'unknown';
}

// ========================================
// COMPONENTS
// ========================================

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`toast ${t.type}`}
          >
            <span className="toast-icon">
              {t.type === 'success' && <CheckCircle2 size={18} />}
              {t.type === 'error' && <XCircle size={18} />}
              {t.type === 'warning' && <AlertTriangle size={18} />}
              {t.type === 'info' && <Clock size={18} />}
            </span>
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-message">{t.message}</div>
            </div>
            <button className="toast-close" onClick={() => onRemove(t.id)}><X size={16} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function EmployeeModal({ employee, onClose, onExport, lateTime, earlyLeaveTime, minHours }: { 
  employee: EmployeeStats; 
  onClose: () => void;
  onExport: (e: EmployeeStats) => void;
  lateTime: string;
  earlyLeaveTime: string;
  minHours: string;
}) {
  const lateRecords = employee.dailyRecords.filter(d => d.isLate);
  const earlyLeaveRecords = employee.dailyRecords.filter(d => d.isEarlyLeave && !d.isHalfDay);
  const halfRecords = employee.dailyRecords.filter(d => d.isHalfDay);
  const absentRecords = employee.dailyRecords.filter(d => d.isAbsent);

  return (
    <motion.div 
      className="modal-overlay" 
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="modal-header">
          <div className="modal-title-section">
            <div className="modal-avatar">{getInitials(employee.name)}</div>
            <div>
              <h2 className="modal-title">{employee.name}</h2>
              <p className="modal-subtitle">{employee.memberCode} · {employee.totalFromFile || formatHoursToHM(employee.totalHours)} total</p>
            </div>
          </div>
          <div className="modal-actions">
            <button className="modal-export-btn" onClick={() => onExport(employee)}>
              <Download size={16} /> Export
            </button>
            <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-stats">
          <div className="modal-stat success"><span className="modal-stat-value">{employee.presentDays}</span><span className="modal-stat-label">Present</span></div>
          <div className="modal-stat warning"><span className="modal-stat-value">{employee.lateMarks}</span><span className="modal-stat-label">Late</span></div>
          <div className="modal-stat info"><span className="modal-stat-value">{employee.halfDays}</span><span className="modal-stat-label">Half Days</span></div>
          <div className="modal-stat danger"><span className="modal-stat-value">{employee.absentDays}</span><span className="modal-stat-label">Absent</span></div>
        </div>

        <div className="modal-body">
          {/* Detailed Daily Log */}
          <div className="modal-section">
            <h3 className="modal-section-title"><Calendar size={16} /> Daily Attendance Log</h3>
            <div className="daily-log">
              <div className="daily-log-header">
                <span>Date</span>
                <span>Day</span>
                <span>In</span>
                <span>Out</span>
                <span>Hours</span>
                <span>Status</span>
              </div>
              {employee.dailyRecords.map((day, idx) => (
                <motion.div 
                  key={idx} 
                  className={`daily-log-row ${day.isRestDay ? 'rest' : ''} ${day.isAbsent ? 'absent' : ''} ${day.isHalfDay ? 'half' : ''} ${day.isLate && !day.isHalfDay ? 'late' : ''}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.015 }}
                >
                  <span className="log-date">{day.date.replace('November ', 'Nov ').replace('December ', 'Dec ')}</span>
                  <span className="log-day">{day.dayName.slice(0, 3)}</span>
                  <span className={`log-time ${day.isLate ? 'late-time' : ''}`}>
                    {day.isRestDay ? '-' : day.firstIn || '-'}
                    {day.isLate && <AlertTriangle size={11} className="late-icon" />}
                  </span>
                  <span className={`log-time ${day.isEarlyLeave ? 'early-time' : ''}`}>
                    {day.isRestDay ? '-' : day.lastOut || '-'}
                    {day.isEarlyLeave && <LogOut size={11} className="early-icon" />}
                  </span>
                  <span className="log-hours">{day.hoursFormatted}</span>
                  <span className={`log-status ${day.isRestDay ? 'status-rest' : day.isAbsent ? 'status-absent' : day.isHalfDay ? 'status-half' : day.isLate ? 'status-late' : 'status-present'}`}>
                    {day.isRestDay ? 'Rest' : day.isAbsent ? 'Absent' : day.isHalfDay ? 'Half Day' : day.isLate ? 'Late' : 'Present'}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Late Arrivals */}
          {lateRecords.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title warning-title"><AlertTriangle size={16} /> Late Arrivals ({lateRecords.length}) — After {lateTime}</h3>
              <div className="issue-list">
                {lateRecords.map((d, i) => (
                  <div key={i} className="issue-item late">
                    <span className="issue-date">{d.date}</span>
                    <span className="issue-time">In: {d.firstIn}</span>
                    {d.location && <span className="issue-location"><MapPin size={12} /> {d.location}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Half Days */}
          {halfRecords.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title info-title"><Clock size={16} /> Half Days ({halfRecords.length}) — Left before {earlyLeaveTime} or worked &lt;{minHours}h</h3>
              <div className="issue-list">
                {halfRecords.map((d, i) => (
                  <div key={i} className="issue-item half">
                    <span className="issue-date">{d.date}</span>
                    <span className="issue-time">In: {d.firstIn || '-'} → Out: {d.lastOut || '-'}</span>
                    <span className="issue-hours">{d.hoursFormatted} worked</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Absent Days */}
          {absentRecords.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title danger-title"><XCircle size={16} /> Absent Days ({absentRecords.length})</h3>
              <div className="tag-list">
                {absentRecords.map((d, i) => (
                  <span key={i} className="tag danger">{d.date} ({d.dayName})</span>
                ))}
              </div>
            </div>
          )}

          {/* Early Leaves (but still full day) */}
          {earlyLeaveRecords.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title"><LogOut size={16} /> Left Early ({earlyLeaveRecords.length}) — But worked full day</h3>
              <div className="tag-list">
                {earlyLeaveRecords.map((d, i) => (
                  <span key={i} className="tag neutral">
                    {d.date} · Out: {d.lastOut} · {d.hoursFormatted}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========================================
// MAIN
// ========================================

export default function Home() {
  // File upload - single file with auto-format detection
  const [summaryFile, setSummaryFile] = useState<File | null>(null);
  const [isDragOverSummary, setIsDragOverSummary] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<EmployeeStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof EmployeeStats; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setTheme] = useState<Theme>('light');
  const [detectedFormat, setDetectedFormat] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeStats | null>(null);
  const [monthPeriod, setMonthPeriod] = useState('');
  
  // Settings - Core business rules
  const [lateMarkTime, setLateMarkTime] = useState('11:00');      // Late mark if arrive after 11:00 AM
  const [earlyLeaveTime, setEarlyLeaveTime] = useState('19:00');  // Early leave mark if leave before 7:00 PM
  const [minFullDayHours, setMinFullDayHours] = useState('7');    // Half day if worked less than 7 hours
  const [lateMarksPerHalfDay, setLateMarksPerHalfDay] = useState('3'); // 3 late marks = 1 half day deduction

  // Theme
  useEffect(() => {
    const saved = localStorage.getItem('attendance-theme') as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const h = (e: MediaQueryListEvent) => root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      mq.addEventListener('change', h);
      return () => mq.removeEventListener('change', h);
    }
    root.setAttribute('data-theme', theme);
    localStorage.setItem('attendance-theme', theme);
  }, [theme]);

  // Toast
  const addToast = useCallback((type: Toast['type'], title: string, message: string) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // Parse Raw Time Entries
  const parseRawEntries = useCallback((data: Record<string, string>[]) => {
    const lateMinutes = parseTimeToMinutes(lateMarkTime);
    const earlyMinutes = parseTimeToMinutes(earlyLeaveTime);
    const minHours = parseFloat(minFullDayHours);
    
    // Group by employee
    const empMap = new Map<string, Map<string, { firstIn: string; lastOut: string; hours: number; location: string; day: string; firstInMins: number; lastOutMins: number }>>();
    
    for (const row of data) {
      const name = row['Full Name']?.trim();
      const memberCode = row['Member Code']?.trim() || '';
      const date = row['Date'];
      const time = row['Time'];
      const entryType = row['EntryType'];
      const duration = row['Duration'];
      const location = row['Clock In Location'] || '';
      
      if (!name || !date) continue;
      
      const key = `${name}|${memberCode}`;
      if (!empMap.has(key)) empMap.set(key, new Map());
      
      const dayMap = empMap.get(key)!;
      if (!dayMap.has(date)) {
        const d = new Date(date);
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()] || '';
        dayMap.set(date, { firstIn: '', lastOut: '', hours: 0, location: '', day: dayName, firstInMins: 9999, lastOutMins: 0 });
      }
      
      const dayData = dayMap.get(date)!;
      const timeMins = parseTimeToMinutes(time);
      
      if (entryType === 'In') {
        if (timeMins !== -1 && timeMins < dayData.firstInMins) {
          dayData.firstIn = time;
          dayData.firstInMins = timeMins;
          dayData.location = location;
        }
        const hrs = parseDuration(duration);
        if (hrs > dayData.hours) dayData.hours = hrs;
      } else if (entryType === 'Out') {
        if (timeMins !== -1 && timeMins > dayData.lastOutMins) {
          dayData.lastOut = time;
          dayData.lastOutMins = timeMins;
        }
      }
    }
    
    // Build stats
    const stats: EmployeeStats[] = [];
    
    const empEntries = Array.from(empMap.entries());
    for (const entry of empEntries) {
      const key = entry[0];
      const dayMap = entry[1];
      const [name, memberCode] = key.split('|');
      const emp: EmployeeStats = {
        name, memberCode,
        fullDays: 0, halfDays: 0, lateMarks: 0, earlyLeaves: 0, absentDays: 0,
        totalHours: 0, avgDailyHours: 0, status: 'Active',
        workingDays: 0, presentDays: 0, dailyRecords: [], totalFromFile: ''
      };
      
      const dayEntries = Array.from(dayMap.entries());
      const sortedDates = dayEntries.sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
      
      for (const dayEntry of sortedDates) {
        const date = dayEntry[0];
        const dayData = dayEntry[1];
        const isSunday = dayData.day === 'Sunday';
        const isRestDay = isSunday;
        const isPresent = dayData.hours > 0 || dayData.firstIn !== '';
        const isAbsent = !isRestDay && !isPresent;
        
        // Late Mark = Arrived after late mark time (e.g., 10:45 AM)
        // Note: Being late doesn't make it a half day - only hours worked matters
        const isLate = isPresent && dayData.firstInMins !== 9999 && dayData.firstInMins > lateMinutes && !isRestDay;
        
        // Early Leave = Left before expected time (e.g., before 6 PM)
        // This is just for tracking, doesn't automatically mean half day
        const isEarlyLeave = isPresent && dayData.lastOutMins > 0 && dayData.lastOutMins < earlyMinutes && !isRestDay;
        
        // Half Day = Worked less than minimum hours required for full day
        // Examples: Left at 4 PM = ~6 hours = Half Day, Left at 6 PM = ~8 hours = Full Day
        const isHalfDay = isPresent && !isRestDay && dayData.hours > 0 && dayData.hours < minHours;
        
        emp.dailyRecords.push({
          date, dayName: dayData.day,
          hours: dayData.hours, hoursFormatted: formatHoursToHM(dayData.hours),
          firstIn: dayData.firstIn, lastOut: dayData.lastOut,
          location: dayData.location,
          isPresent, isAbsent, isRestDay, isHalfDay, isLate, isEarlyLeave
        });
        
        if (!isRestDay) emp.workingDays++;
        if (isAbsent) emp.absentDays++;
        if (isPresent) {
          emp.presentDays++;
          emp.totalHours += dayData.hours;
          if (isHalfDay) emp.halfDays++; else emp.fullDays++;
          if (isLate) emp.lateMarks++;
          if (isEarlyLeave && !isHalfDay) emp.earlyLeaves++;
        }
      }
      
      if (emp.presentDays > 0) emp.avgDailyHours = emp.totalHours / emp.presentDays;
      if (emp.presentDays === 0) emp.status = 'No Attendance';
      emp.totalFromFile = formatHoursToHM(emp.totalHours);
      stats.push(emp);
    }
    
    return stats;
  }, [lateMarkTime, earlyLeaveTime, minFullDayHours]);

  // Parse Monthly Timesheet
  const parseMonthly = useCallback((rawData: string[][]) => {
    const minHours = parseFloat(minFullDayHours);
    
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      if (rawData[i]?.[0]?.toLowerCase() === 'month' && rawData[i][1]) {
        setMonthPeriod(rawData[i][1]); break;
      }
    }
    
    let headerIdx = -1, dayNamesIdx = -1;
    for (let i = 0; i < Math.min(15, rawData.length); i++) {
      if (rawData[i]?.[0]?.toUpperCase() === 'NAME') {
        headerIdx = i; dayNamesIdx = i - 1; break;
      }
    }
    
    if (headerIdx === -1) { addToast('error', 'Error', 'Header not found'); return []; }
    
    const header = rawData[headerIdx];
    const dayNames = rawData[dayNamesIdx] || [];
    
    const dateCols: { idx: number; date: string; day: string }[] = [];
    let totalsIdx = -1;
    
    for (let i = 3; i < header.length; i++) {
      const v = header[i]?.toString() || '';
      if (v.toUpperCase() === 'TOTALS') { totalsIdx = i; break; }
      if (/November|December|January|October|September/i.test(v)) {
        dateCols.push({ idx: i, date: v, day: dayNames[i]?.toString() || '' });
      }
    }
    
    const stats: EmployeeStats[] = [];
    let curr: EmployeeStats | null = null;
    
    for (let i = headerIdx + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length < 3) continue;
      
      const name = row[0]?.toString().trim();
      const code = row[1]?.toString().trim();
      const type = row[2]?.toString().trim();
      
      if (!name && !code && ['Total Hours', 'Payroll', 'Regular'].includes(type)) break;
      if (!name && !code && !type) continue;
      
      if (name && type?.toLowerCase().includes('payroll')) {
        if (curr?.name) {
          if (curr.presentDays > 0) curr.avgDailyHours = curr.totalHours / curr.presentDays;
          if (curr.presentDays === 0) curr.status = 'No Attendance';
          stats.push(curr);
        }
        
        curr = {
          name, memberCode: code || '',
          fullDays: 0, halfDays: 0, lateMarks: 0, earlyLeaves: 0, absentDays: 0,
          totalHours: 0, avgDailyHours: 0, status: 'Active',
          workingDays: 0, presentDays: 0, dailyRecords: [],
          totalFromFile: totalsIdx > 0 ? row[totalsIdx]?.toString() || '' : ''
        };
        
        for (const col of dateCols) {
          const hStr = row[col.idx]?.toString() || '';
          const day = col.day?.toLowerCase() || '';
          const isSunday = day === 'sun' || day === 'sunday';
          const isRest = isSunday || hStr === '';
          const hrs = parseDuration(hStr);
          const isAbsent = !isRest && (hStr === '-' || hrs === 0);
          const isPresent = !isRest && !isAbsent && hrs > 0;
          const isHalf = isPresent && hrs > 0 && hrs < minHours;
          
          curr.dailyRecords.push({
            date: col.date, dayName: col.day || (isSunday ? 'Sun' : ''),
            hours: Math.min(hrs, 24), hoursFormatted: hStr || (isRest ? 'REST' : '-'),
            firstIn: '', lastOut: '', location: '',
            isPresent, isAbsent, isRestDay: isRest, isHalfDay: isHalf, isLate: false, isEarlyLeave: false
          });
          
          if (!isRest) curr.workingDays++;
          if (isAbsent) curr.absentDays++;
          else if (isPresent) {
            curr.presentDays++;
            curr.totalHours += Math.min(hrs, 24);
            if (isHalf) curr.halfDays++; else curr.fullDays++;
          }
        }
      }
    }
    
    if (curr?.name) {
      if (curr.presentDays > 0) curr.avgDailyHours = curr.totalHours / curr.presentDays;
      if (curr.presentDays === 0) curr.status = 'No Attendance';
      stats.push(curr);
    }
    
    return stats;
  }, [minFullDayHours, addToast]);

  // Parse Monthly Daily format (Day, Date, Full Name, ... First In, Last Out)
  const parseMonthlyDaily = useCallback((rawData: string[][]) => {
    const lateMinutes = parseTimeToMinutes(lateMarkTime);
    const earlyMinutes = parseTimeToMinutes(earlyLeaveTime);
    const minHours = parseFloat(minFullDayHours);
    const graceLateDays = parseInt(lateMarksPerHalfDay) || 3;
    const cycleLength = graceLateDays + 1;
    
    // Find header row
    let headerIdx = -1;
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      if (rawData[i]?.[0] === 'Day' && rawData[i]?.[1] === 'Date') {
        headerIdx = i; break;
      }
    }
    if (headerIdx === -1) { addToast('error', 'Error', 'Header not found'); return []; }
    
    const header = rawData[headerIdx];
    const nameIdx = header.indexOf('Full Name');
    const codeIdx = header.indexOf('Member Code');
    const dateIdx = header.indexOf('Date');
    const dayIdx = header.indexOf('Day');
    const workedIdx = header.indexOf('Worked Hours');
    const firstInIdx = header.indexOf('First In');
    const lastOutIdx = header.indexOf('Last Out');
    
    if (nameIdx === -1) { addToast('error', 'Error', 'Full Name column not found'); return []; }
    
    // Group by employee
    const empMap = new Map<string, { 
      code: string; 
      days: Map<string, { date: string; day: string; hours: number; firstIn: string; lastOut: string; isLate: boolean; isEarly: boolean }> 
    }>();
    
    for (let i = headerIdx + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length < 3) continue;
      
      const name = row[nameIdx]?.toString().trim();
      const code = row[codeIdx]?.toString().trim() || '';
      const date = row[dateIdx]?.toString().trim() || '';
      const day = row[dayIdx]?.toString().trim() || '';
      const workedStr = row[workedIdx]?.toString().trim() || '';
      const firstIn = row[firstInIdx]?.toString().trim() || '';
      const lastOut = row[lastOutIdx]?.toString().trim() || '';
      
      if (!name || !date) continue;
      
      if (!empMap.has(name)) empMap.set(name, { code, days: new Map() });
      
      const hours = parseDuration(workedStr);
      const firstInMins = parseTimeToMinutes(firstIn);
      const lastOutMins = parseTimeToMinutes(lastOut);
      const isLate = firstInMins > 0 && firstInMins > lateMinutes;
      const isEarly = lastOutMins > 0 && lastOutMins < earlyMinutes;
      
      empMap.get(name)!.days.set(date, { date, day, hours, firstIn, lastOut, isLate, isEarly });
    }
    
    // Build stats
    const stats: EmployeeStats[] = [];
    
    const empEntries = Array.from(empMap.entries());
    for (const entry of empEntries) {
      const name = entry[0];
      const { code, days } = entry[1];
      
      const emp: EmployeeStats = {
        name, memberCode: code,
        fullDays: 0, halfDays: 0, lateMarks: 0, earlyLeaves: 0, absentDays: 0,
        totalHours: 0, avgDailyHours: 0, status: 'Active',
        workingDays: 0, presentDays: 0, dailyRecords: [], totalFromFile: ''
      };
      
      const dayEntries = Array.from(days.entries());
      const sortedDays = dayEntries.sort((a, b) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        return dateA.getTime() - dateB.getTime();
      });
      
      for (const dayEntry of sortedDays) {
        const dayData = dayEntry[1];
        const isSunday = dayData.day?.toLowerCase() === 'sunday';
        const isRest: boolean = isSunday;
        const isAbsent: boolean = !isRest && dayData.hours === 0 && !dayData.firstIn;
        const isPresent: boolean = !isRest && (dayData.hours > 0 || !!dayData.firstIn);
        const isHalfDay: boolean = isPresent && dayData.hours > 0 && dayData.hours < minHours;
        
        emp.dailyRecords.push({
          date: dayData.date, dayName: dayData.day,
          hours: dayData.hours, hoursFormatted: formatHoursToHM(dayData.hours),
          firstIn: dayData.firstIn, lastOut: dayData.lastOut, location: '',
          isPresent, isAbsent, isRestDay: isRest, isHalfDay,
          isLate: dayData.isLate, isEarlyLeave: dayData.isEarly
        });
        
        if (!isRest) emp.workingDays++;
        if (isAbsent) emp.absentDays++;
        if (isPresent) {
          emp.presentDays++;
          emp.totalHours += dayData.hours;
          if (isHalfDay) emp.halfDays++; else emp.fullDays++;
          if (dayData.isLate) emp.lateMarks++;
          if (dayData.isEarly && !isHalfDay) emp.earlyLeaves++;
        }
      }
      
      // Apply late penalty: floor(lateMarks / 4) = half days cut
      const halfDaysFromLate = Math.floor(emp.lateMarks / cycleLength);
      emp.halfDays += halfDaysFromLate;
      emp.fullDays = Math.max(0, emp.fullDays - halfDaysFromLate);
      
      if (emp.presentDays > 0) emp.avgDailyHours = emp.totalHours / emp.presentDays;
      if (emp.presentDays === 0) emp.status = 'No Attendance';
      emp.totalFromFile = formatHoursToHM(emp.totalHours);
      stats.push(emp);
    }
    
    return stats;
  }, [lateMarkTime, earlyLeaveTime, minFullDayHours, lateMarksPerHalfDay, addToast]);

  // Read file to raw data
  const readFileToData = useCallback(async (file: File): Promise<string[][]> => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      const text = await file.text();
      return Papa.parse<string[]>(text, { header: false, skipEmptyLines: false }).data;
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      let sheet = wb.SheetNames[0];
      for (const n of wb.SheetNames) {
        if (n.toLowerCase().includes('timesheet') || n.toLowerCase().includes('raw')) { sheet = n; break; }
      }
      return XLSX.utils.sheet_to_json<string[]>(wb.Sheets[sheet], { header: 1, defval: '' });
    }
    return [];
  }, []);

  // Extract late marks from Raw Entries file
  const extractLateMarks = useCallback((rawData: Record<string, string>[]): Map<string, number> => {
    const lateMinutes = parseTimeToMinutes(lateMarkTime);
    const lateCountMap = new Map<string, number>();
    const processedDays = new Map<string, Set<string>>();

    for (const row of rawData) {
      const name = row['Full Name']?.trim();
      const date = row['Date'];
      const time = row['Time'];
      const entryType = row['EntryType'];

      if (!name || !date || entryType !== 'In') continue;

      // Track each day only once per employee
      const key = `${name}|${date}`;
      if (!processedDays.has(name)) processedDays.set(name, new Set());
      if (processedDays.get(name)!.has(date)) continue;

      const timeMins = parseTimeToMinutes(time);
      if (timeMins > lateMinutes) {
        lateCountMap.set(name, (lateCountMap.get(name) || 0) + 1);
      }
      processedDays.get(name)!.add(date);
    }
    return lateCountMap;
  }, [lateMarkTime]);

  // Combined analysis - handles all file formats
  const processFiles = useCallback(async () => {
    if (!summaryFile) {
      addToast('warning', 'Missing file', 'Please upload a timesheet file');
      return;
    }
    
    setIsLoading(true);
    try {
      // Parse the main file
      const mainData = await readFileToData(summaryFile);
      const format = detectFormat(mainData);
      
      let stats: EmployeeStats[] = [];
      
      if (format === 'monthly_daily') {
        // Format: Day, Date, Full Name, ... First In, Last Out
        // This format has BOTH hours AND clock times - process directly
        stats = parseMonthlyDaily(mainData);
        setDetectedFormat('Monthly Raw Timesheet');
        addToast('info', 'Format detected', 'Monthly Raw Timesheet with First In/Last Out');
        
      } else if (format === 'monthly_grid') {
        // Format: NAME, MEMBER CODE, TYPE, Nov 01, Nov 02...
        // This format has only hours (no First In/Last Out for late mark detection)
        stats = parseMonthly(mainData);
        setDetectedFormat('Monthly Timesheet Grid');
        addToast('info', 'Grid format', 'Late marks cannot be detected without First In times');
        
      } else if (format === 'raw_entries') {
        // Format: Date, Full Name, EntryType, Time...
        // Parse raw entries directly
        const headers = mainData[0];
        const dataRows = mainData.slice(1).map(row => {
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => { obj[h] = row[i]?.toString() || ''; });
          return obj;
        });
        stats = parseRawEntries(dataRows);
        setDetectedFormat('Raw Time Entries');
        
      } else {
        addToast('error', 'Unknown format', 'Could not detect file format. Check the file structure.');
        setIsLoading(false);
        return;
      }

      setResults(stats);
      
      if (stats.length > 0) {
        const graceLateDays = parseInt(lateMarksPerHalfDay) || 3;
        const cycleLen = graceLateDays + 1;
        const totalLateDeductions = stats.reduce((s, e) => s + Math.floor(e.lateMarks / cycleLen), 0);
        addToast('success', 'Analysis complete', 
          `${stats.length} employees${totalLateDeductions > 0 ? `, ${totalLateDeductions} half-day cuts from late marks` : ''}`
        );
      } else {
        addToast('warning', 'No data', 'No employees found in the file');
      }
    } catch (e) {
      console.error(e);
      addToast('error', 'Error', 'Failed to parse file. Check console for details.');
    } finally { 
      setIsLoading(false); 
    }
  }, [summaryFile, readFileToData, parseMonthly, parseMonthlyDaily, parseRawEntries, lateMarksPerHalfDay, addToast]);

  // Auto-process when file changes
  useEffect(() => {
    if (summaryFile) processFiles();
  }, [summaryFile, lateMarkTime, minFullDayHours, lateMarksPerHalfDay]);

  // File handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOverSummary(false);
    const f = e.dataTransfer.files[0];
    if (f && ['csv', 'xlsx', 'xls'].includes(f.name.split('.').pop()?.toLowerCase() || '')) {
      setSummaryFile(f);
    } else addToast('error', 'Invalid file', 'Please upload CSV or Excel file');
  }, [addToast]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && ['csv', 'xlsx', 'xls'].includes(f.name.split('.').pop()?.toLowerCase() || '')) {
      setSummaryFile(f);
    } else addToast('error', 'Invalid file', 'Please upload CSV or Excel file');
  }, [addToast]);

  const clearFile = useCallback(() => {
    setSummaryFile(null); setResults([]); setDetectedFormat(''); setMonthPeriod('');
    addToast('info', 'Cleared', 'Ready for new file');
  }, [addToast]);

  const handleSettings = useCallback(() => { if (summaryFile) processFiles(); }, [summaryFile, processFiles]);
  const handleSort = useCallback((k: keyof EmployeeStats) => {
    setSortConfig(p => ({ key: k, direction: p.key === k && p.direction === 'asc' ? 'desc' : 'asc' }));
  }, []);

  // Computed
  const displayed = useMemo(() => {
    let f = results;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = results.filter(r => r.name.toLowerCase().includes(q) || r.memberCode.toLowerCase().includes(q));
    }
    return [...f].sort((a, b) => {
      const av = a[sortConfig.key], bv = b[sortConfig.key];
      if (typeof av === 'string' && typeof bv === 'string')
        return sortConfig.direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortConfig.direction === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [results, searchQuery, sortConfig]);

  const stats = useMemo(() => ({
    employees: results.length,
    fullDays: results.reduce((s, r) => s + r.fullDays, 0),
    halfDays: results.reduce((s, r) => s + r.halfDays, 0),
    lateMarks: results.reduce((s, r) => s + r.lateMarks, 0),
    absent: results.reduce((s, r) => s + r.absentDays, 0),
    hours: results.reduce((s, r) => s + r.totalHours, 0),
    avgAtt: results.length > 0 ? (results.reduce((s, r) => s + (r.presentDays / Math.max(r.workingDays, 1)), 0) / results.length * 100).toFixed(0) : '0'
  }), [results]);

  // Export
  const exportSummary = useCallback(() => {
    if (!results.length) { addToast('warning', 'No data', 'Nothing to export'); return; }
    const csv = [
      ['Name', 'Code', 'Present', 'Full Days', 'Half Days', 'Late', 'Absent', 'Total Hours', 'Avg/Day'],
      ...results.map(r => [r.name, r.memberCode, r.presentDays, r.fullDays, r.halfDays, r.lateMarks, r.absentDays, r.totalHours.toFixed(1), r.avgDailyHours.toFixed(1)])
    ].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `attendance_summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    addToast('success', 'Exported', 'Summary downloaded');
  }, [results, addToast]);

  const exportEmployee = useCallback((emp: EmployeeStats) => {
    const csv = [
      ['Date', 'Day', 'Clock In', 'Clock Out', 'Hours', 'Status'],
      ...emp.dailyRecords.map(d => [d.date, d.dayName, d.firstIn || '-', d.lastOut || '-', d.hoursFormatted, d.isRestDay ? 'Rest' : d.isAbsent ? 'Absent' : d.isHalfDay ? 'Half Day' : d.isLate ? 'Late' : 'Present']),
      [], ['Summary'], ['Total Hours', emp.totalFromFile], ['Present', emp.presentDays], ['Full Days', emp.fullDays], ['Half Days', emp.halfDays], ['Late Marks', emp.lateMarks], ['Absent', emp.absentDays]
    ].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${emp.name.replace(/\s+/g, '_')}_attendance.csv`;
    a.click();
    addToast('success', 'Exported', `${emp.name}'s report downloaded`);
  }, [addToast]);

  const earlyLeaveDisplay = minutesToTime(parseTimeToMinutes(earlyLeaveTime));

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AnimatePresence>
        {selectedEmployee && (
          <EmployeeModal 
            employee={selectedEmployee} 
            onClose={() => setSelectedEmployee(null)} 
            onExport={exportEmployee}
            lateTime={lateMarkTime}
            earlyLeaveTime={earlyLeaveDisplay}
            minHours={minFullDayHours}
          />
        )}
      </AnimatePresence>
      
      <div className="container">
        <motion.header 
          className="header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-left">
            <div className="theme-toggle">
              <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>☀</button>
              <button className={`theme-btn ${theme === 'system' ? 'active' : ''}`} onClick={() => setTheme('system')}>◐</button>
              <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>☾</button>
            </div>
          </div>
          <div className="header-center">
            <div className="logo">
              <div className="logo-icon"><BarChart3 size={24} /></div>
              <div>
                <h1 className="title">Attendance Analyzer</h1>
                <p className="subtitle">Enterprise-grade timesheet analytics</p>
              </div>
            </div>
          </div>
          <div style={{ width: '120px' }} />
        </motion.header>

        {/* Single Smart Upload Zone */}
        <motion.div
          className={`upload-zone large ${isDragOverSummary ? 'drag-over' : ''} ${summaryFile ? 'has-file' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragOverSummary(true); }}
          onDragLeave={() => setIsDragOverSummary(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <input id="file-input" type="file" accept=".csv,.xlsx,.xls" onChange={handleInput} style={{ display: 'none' }} />
          {summaryFile ? (
            <>
              <div className="upload-icon-wrapper success"><CheckCircle2 size={32} /></div>
              <h2 className="upload-title">{summaryFile.name}</h2>
              <p className="upload-subtitle">{(summaryFile.size / 1024).toFixed(1)} KB</p>
            </>
          ) : (
            <>
              <div className="upload-icon-wrapper"><FileSpreadsheet size={32} /></div>
              <h2 className="upload-title">{isDragOverSummary ? 'Drop your file here' : 'Upload Timesheet'}</h2>
              <p className="upload-subtitle">Monthly Raw Timesheet, Monthly Timesheet Grid, or Raw Time Entries</p>
              <p className="upload-formats">CSV, XLSX, XLS • Auto-format detection</p>
            </>
          )}
        </motion.div>

        <AnimatePresence>
          {summaryFile && (
            <motion.div 
              className="file-info"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="file-icon-wrapper"><CheckCircle2 size={20} /></div>
              <div className="file-details">
                <div className="file-name">{summaryFile.name}</div>
                <div className="file-meta">
                  {detectedFormat && <span className="file-format">{detectedFormat}</span>}
                  {monthPeriod && <><span className="file-meta-divider" /><span className="file-period">{monthPeriod}</span></>}
                </div>
              </div>
              <button className="clear-btn" onClick={clearFile}>Clear</button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className="settings-panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="setting-group">
            <label className="setting-label"><AlertTriangle size={14} /> Late Mark After</label>
            <input type="time" className="setting-input" value={lateMarkTime} onChange={e => setLateMarkTime(e.target.value)} onBlur={handleSettings} />
          </div>
          <div className="setting-group">
            <label className="setting-label"><LogOut size={14} /> Early Leave Before</label>
            <input type="time" className="setting-input" value={earlyLeaveTime} onChange={e => setEarlyLeaveTime(e.target.value)} onBlur={handleSettings} />
          </div>
          <div className="setting-group">
            <label className="setting-label"><Clock size={14} /> Min Hours for Full Day</label>
            <input type="number" step="0.5" min="1" max="12" className="setting-input" value={minFullDayHours} onChange={e => setMinFullDayHours(e.target.value)} onBlur={handleSettings} />
          </div>
          <div className="setting-group">
            <label className="setting-label"><AlertTriangle size={14} /> Grace Days Before Cut</label>
            <input type="number" step="1" min="1" max="10" className="setting-input" value={lateMarksPerHalfDay} onChange={e => setLateMarksPerHalfDay(e.target.value)} onBlur={handleSettings} />
          </div>
          <div className="setting-group">
            <Link href="/rules" className="rules-link">
              <Info size={14} />
              View Rules Reference
            </Link>
          </div>
        </motion.div>

        {isLoading && (
          <div className="loading">
            <motion.div 
              className="spinner"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            />
            <p className="loading-text">Analyzing...</p>
          </div>
        )}

        {results.length > 0 && !isLoading && (
          <motion.section 
            className="results-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="results-header">
              <div className="results-title-group">
                <h2>Analysis Results</h2>
                <p className="results-meta">{results.length} employees · Click for details</p>
              </div>
              <button className="export-btn" onClick={exportSummary}><Download size={16} /> Export</button>
            </div>

            <div className="stats-grid">
              {[
                { key: 'employees', icon: Users, value: stats.employees, label: 'Employees', color: 'info' },
                { key: 'full', icon: CheckCircle2, value: stats.fullDays, label: 'Full Days', color: 'success' },
                { key: 'half', icon: Clock, value: stats.halfDays, label: 'Half Days', color: 'info' },
                { key: 'late', icon: AlertTriangle, value: stats.lateMarks, label: 'Late Marks', color: 'warning' },
                { key: 'absent', icon: XCircle, value: stats.absent, label: 'Absent', color: 'danger' },
                { key: 'att', icon: Percent, value: `${stats.avgAtt}%`, label: 'Attendance', color: 'success' },
              ].map((s, i) => (
                <motion.div 
                  key={s.key}
                  className={`stat-card ${s.color}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <div className="stat-header"><div className="stat-icon"><s.icon size={18} /></div></div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </motion.div>
              ))}
            </div>

            <div className="table-container">
              <div className="table-header">
                <div className="search-wrapper">
                  <Search size={16} className="search-icon" />
                  <input type="text" className="search-input" placeholder="Search employees..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="table-info">{displayed.length} of {results.length}</div>
              </div>
              
              {displayed.length === 0 ? (
                <div className="empty-state"><div className="empty-icon"><Search size={32} /></div><div className="empty-title">No results</div></div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort('name')}>Employee {sortConfig.key === 'name' && <ChevronDown size={14} className={`sort-icon ${sortConfig.direction}`} />}</th>
                        <th onClick={() => handleSort('memberCode')}>Code</th>
                        <th onClick={() => handleSort('presentDays')}>Present</th>
                        <th onClick={() => handleSort('fullDays')}>Full</th>
                        <th onClick={() => handleSort('halfDays')}>Half</th>
                        <th onClick={() => handleSort('lateMarks')}>Late</th>
                        <th onClick={() => handleSort('absentDays')}>Absent</th>
                        <th onClick={() => handleSort('totalHours')}>Hours</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map((emp, i) => (
                        <motion.tr 
                          key={i} 
                          className="clickable-row" 
                          onClick={() => setSelectedEmployee(emp)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                        >
                          <td>
                            <div className="employee-cell">
                              <div className="avatar">{getInitials(emp.name)}</div>
                              <span className="employee-name">{emp.name}</span>
                            </div>
                          </td>
                          <td><span className="badge neutral">{emp.memberCode || '-'}</span></td>
                          <td><span className="badge success">{emp.presentDays}</span></td>
                          <td><span className="badge success">{emp.fullDays}</span></td>
                          <td><span className={`badge ${emp.halfDays > 0 ? 'info' : 'neutral'}`}>{emp.halfDays}</span></td>
                          <td><span className={`badge ${emp.lateMarks > 3 ? 'danger' : emp.lateMarks > 0 ? 'warning' : 'neutral'}`}>{emp.lateMarks}</span></td>
                          <td><span className={`badge ${emp.absentDays > 3 ? 'danger' : emp.absentDays > 0 ? 'warning' : 'neutral'}`}>{emp.absentDays}</span></td>
                          <td>{emp.totalFromFile || formatHoursToHM(emp.totalHours)}</td>
                          <td><button className="view-btn" onClick={e => { e.stopPropagation(); setSelectedEmployee(emp); }}><Eye size={14} /> View</button></td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {!isLoading && !summaryFile && (
          <motion.div 
            className="empty-state" 
            style={{ marginTop: '48px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="empty-icon"><Upload size={32} /></div>
            <div className="empty-title">No file uploaded</div>
            <div className="empty-subtitle">Upload timesheet to begin</div>
          </motion.div>
        )}
      </div>
    </>
  );
}
