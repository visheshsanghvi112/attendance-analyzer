'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Clock, AlertTriangle, LogOut, CheckCircle2, 
  XCircle, Calendar, Info, Sun, Moon, Monitor
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export default function RulesPage() {
  const [theme, setTheme] = useState<Theme>('light');
  
  // Settings (should match main page defaults)
  const lateMarkTime = '11:00 AM';
  const earlyLeaveTime = '7:00 PM';
  const minFullDayHours = 7;
  const lateMarksPerHalfDay = 3;

  useEffect(() => {
    const saved = localStorage.getItem('attendance-theme') as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('attendance-theme', theme);
  }, [theme]);

  const fullDayScenarios = [
    { id: 1, inTime: '10:00 AM', outTime: '7:00 PM', hours: '9h', late: false, early: false, notes: 'Perfect attendance' },
    { id: 2, inTime: '10:00 AM', outTime: '7:30 PM', hours: '9h', late: false, early: false, notes: 'Stayed late = still 9h (no OT counted)' },
    { id: 3, inTime: '10:00 AM', outTime: '8:00 PM', hours: '9h', late: false, early: false, notes: 'Max 9h counted (capped at 7 PM)' },
    { id: 4, inTime: '9:30 AM', outTime: '7:00 PM', hours: '9h', late: false, early: false, notes: 'Came early (still 9h max)' },
    { id: 5, inTime: '10:30 AM', outTime: '7:00 PM', hours: '8.5h', late: false, early: false, notes: 'Slightly late but OK (before 11 AM)' },
    { id: 6, inTime: '10:45 AM', outTime: '7:00 PM', hours: '8.25h', late: false, early: false, notes: 'Still under 11 AM threshold' },
    { id: 7, inTime: '11:00 AM', outTime: '7:00 PM', hours: '8h', late: false, early: false, notes: 'Exactly at 11 AM = ON TIME' },
    { id: 8, inTime: '10:00 AM', outTime: '6:45 PM', hours: '8.75h', late: false, early: true, notes: 'Left 15 min early' },
    { id: 9, inTime: '10:00 AM', outTime: '6:30 PM', hours: '8.5h', late: false, early: true, notes: 'Left 30 min early' },
    { id: 10, inTime: '10:00 AM', outTime: '6:00 PM', hours: '8h', late: false, early: true, notes: 'Left 1 hour early' },
    { id: 11, inTime: '10:00 AM', outTime: '5:30 PM', hours: '7.5h', late: false, early: true, notes: 'Left 1.5 hours early' },
    { id: 12, inTime: '10:00 AM', outTime: '5:00 PM', hours: '7h', late: false, early: true, notes: 'Left 2 hours early (borderline)' },
    { id: 13, inTime: '11:15 AM', outTime: '7:00 PM', hours: '7.75h', late: true, early: false, notes: 'Came 15 min late = LATE MARK' },
    { id: 14, inTime: '11:30 AM', outTime: '7:00 PM', hours: '7.5h', late: true, early: false, notes: 'Came 30 min late = LATE MARK' },
    { id: 15, inTime: '11:30 AM', outTime: '7:30 PM', hours: '7.5h', late: true, early: false, notes: '⚠️ LATE! Staying till 7:30 doesn\'t help!' },
    { id: 16, inTime: '12:00 PM', outTime: '8:00 PM', hours: '7h', late: true, early: false, notes: '⚠️ LATE! Even staying till 8 PM = still late' },
    { id: 17, inTime: '11:30 AM', outTime: '6:30 PM', hours: '7h', late: true, early: true, notes: 'Both late & early leave' },
    { id: 18, inTime: '10:30 AM', outTime: '6:00 PM', hours: '7.5h', late: false, early: true, notes: 'Left early but 7+ hours = Full Day' },
  ];

  const halfDayScenarios = [
    { id: 21, inTime: '10:00 AM', outTime: '4:30 PM', hours: '6.5h', late: false, early: true, notes: 'Left 2.5 hours early' },
    { id: 22, inTime: '10:00 AM', outTime: '4:00 PM', hours: '6h', late: false, early: true, notes: 'Left 3 hours early' },
    { id: 23, inTime: '10:00 AM', outTime: '3:30 PM', hours: '5.5h', late: false, early: true, notes: 'Left 3.5 hours early' },
    { id: 24, inTime: '10:00 AM', outTime: '3:00 PM', hours: '5h', late: false, early: true, notes: 'Left 4 hours early' },
    { id: 25, inTime: '10:00 AM', outTime: '2:00 PM', hours: '4h', late: false, early: true, notes: 'Left 5 hours early' },
    { id: 26, inTime: '10:00 AM', outTime: '1:00 PM', hours: '3h', late: false, early: true, notes: 'Only morning half' },
    { id: 27, inTime: '11:30 AM', outTime: '5:00 PM', hours: '5.5h', late: true, early: true, notes: 'Late + early out = Half Day + Late Mark' },
    { id: 28, inTime: '12:00 PM', outTime: '5:00 PM', hours: '5h', late: true, early: true, notes: 'Late + early out' },
    { id: 29, inTime: '12:00 PM', outTime: '6:00 PM', hours: '6h', late: true, early: true, notes: 'Came at noon = Half Day + Late' },
    { id: 30, inTime: '1:00 PM', outTime: '7:00 PM', hours: '6h', late: true, early: false, notes: 'Afternoon only = Half Day + Late' },
    { id: 31, inTime: '2:00 PM', outTime: '7:00 PM', hours: '5h', late: true, early: false, notes: 'Very late = Half Day + Late' },
    { id: 32, inTime: '2:00 PM', outTime: '8:00 PM', hours: '5h', late: true, early: false, notes: '⚠️ Stayed till 8 PM = still only 5h (capped at 7 PM)' },
    { id: 33, inTime: '3:00 PM', outTime: '9:00 PM', hours: '4h', late: true, early: false, notes: '⚠️ Even 9 PM = only 4h counted (3 PM to 7 PM)' },
    { id: 34, inTime: '11:30 AM', outTime: '6:00 PM', hours: '6.5h', late: true, early: true, notes: 'Late + early = Half Day' },
  ];

  return (
    <div className="app-container">
      <div className="app-wrapper">
        {/* Header */}
        <header className="app-header">
          <div className="theme-toggle">
            <button 
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              title="Light Mode"
            >
              <Sun size={16} />
            </button>
            <button 
              className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
              onClick={() => setTheme('system')}
              title="System"
            >
              <Monitor size={16} />
            </button>
            <button 
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              title="Dark Mode"
            >
              <Moon size={16} />
            </button>
          </div>
          <div className="logo-section">
            <div className="logo-icon">
              <Info size={28} />
            </div>
            <div className="logo-text">
              <h1>Attendance Rules Reference</h1>
              <p>Complete guide for attendance verification</p>
            </div>
          </div>
        </header>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="back-link"
        >
          <Link href="/" className="back-button">
            <ArrowLeft size={18} />
            Back to Analyzer
          </Link>
        </motion.div>

        {/* Current Settings */}
        <motion.section 
          className="rules-settings"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="section-title">
            <Clock size={20} />
            Current Threshold Settings
          </h2>
          <div className="settings-grid">
            <div className="setting-card">
              <div className="setting-icon late">
                <AlertTriangle size={24} />
              </div>
              <div className="setting-info">
                <span className="setting-label">Late Mark After</span>
                <span className="setting-value">{lateMarkTime}</span>
              </div>
            </div>
            <div className="setting-card">
              <div className="setting-icon early">
                <LogOut size={24} />
              </div>
              <div className="setting-info">
                <span className="setting-label">Early Leave Before</span>
                <span className="setting-value">{earlyLeaveTime}</span>
              </div>
            </div>
            <div className="setting-card">
              <div className="setting-icon hours">
                <Clock size={24} />
              </div>
              <div className="setting-info">
                <span className="setting-label">Min Hours for Full Day</span>
                <span className="setting-value">{minFullDayHours} hours</span>
              </div>
            </div>
            <div className="setting-card">
              <div className="setting-icon late">
                <AlertTriangle size={24} />
              </div>
              <div className="setting-info">
                <span className="setting-label">Grace Days Before Cut</span>
                <span className="setting-value">{lateMarksPerHalfDay} days → {lateMarksPerHalfDay + 1}th = cut</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Quick Summary */}
        <motion.section 
          className="rules-summary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="section-title">
            <Info size={20} />
            Quick Summary
          </h2>
          <div className="summary-grid">
            <div className="summary-card full">
              <CheckCircle2 size={32} />
              <h3>Full Day</h3>
              <p>Worked <strong>≥ 7 hours</strong></p>
              <span className="badge success">Max 9h (10 AM - 7 PM)</span>
            </div>
            <div className="summary-card half">
              <Calendar size={32} />
              <h3>Half Day</h3>
              <p>Worked <strong>&lt; 7 hours</strong></p>
              <span className="badge warning">Based on hours only</span>
            </div>
            <div className="summary-card late">
              <AlertTriangle size={32} />
              <h3>Late Mark</h3>
              <p>Arrived <strong>after 11:00 AM</strong></p>
              <span className="badge info">Staying late won't help!</span>
            </div>
            <div className="summary-card early">
              <LogOut size={32} />
              <h3>Early Leave</h3>
              <p>Left <strong>before 7:00 PM</strong></p>
              <span className="badge info">Tracked separately</span>
            </div>
            <div className="summary-card absent">
              <XCircle size={32} />
              <h3>Absent</h3>
              <p>Worked <strong>0 hours</strong></p>
              <span className="badge error">No attendance</span>
            </div>
          </div>
          <div className="no-overtime-notice">
            <strong>⚠️ NO OVERTIME:</strong> Hours are capped at 7:00 PM. Staying till 7:30 PM, 8 PM, or later = still counts as 7:00 PM only.
          </div>
          <div className="late-penalty-notice">
            <strong>⚠️ LATE MARK PENALTY:</strong> {lateMarksPerHalfDay} grace days → {lateMarksPerHalfDay + 1}th late = 1 Half Day CUT!
            <br/>
            <span style={{ fontSize: '13px', marginTop: '8px', display: 'block' }}>
              • 1, 2, 3 late = Grace (no cut)<br/>
              • <strong>4th late = 1 half day CUT</strong><br/>
              • 5, 6, 7 late = Grace again<br/>
              • <strong>8th late = 1 more half day CUT</strong> (total: 2)<br/>
              • 9, 10, 11 late = Grace again<br/>
              • <strong>12th late = 1 more half day CUT</strong> (total: 3)
            </span>
          </div>
        </motion.section>

        {/* Key Understanding */}
        <motion.section 
          className="key-understanding"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="key-box">
            <h3>🔑 Key Understanding</h3>
            <ul>
              <li><strong>HALF/FULL DAY</strong> → Determined by <em>HOURS WORKED</em> (7 hour threshold)</li>
              <li><strong>LATE MARK</strong> → Arriving after 11:00 AM = <em>LATE</em> (staying late doesn't help!)</li>
              <li><strong>LATE PENALTY</strong> → 3 grace days, then <em>4th LATE = 1 HALF DAY CUT</em></li>
              <li><strong>EARLY LEAVE</strong> → Leaving before 7:00 PM (tracked separately)</li>
              <li><strong>NO OVERTIME</strong> → Hours are capped at 7:00 PM (max 9 hours/day)</li>
            </ul>
            <div className="key-examples">
              <p>✅ Late 1, 2, 3 = Grace, <strong>NO cut</strong></p>
              <p>⚠️ <strong>Late 4 = 1 Half Day CUT</strong></p>
              <p>✅ Late 5, 6, 7 = Grace again</p>
              <p>⚠️ <strong>Late 8 = 1 more Half Day CUT</strong> (total: 2)</p>
              <p>✅ Late 9, 10, 11 = Grace again</p>
              <p>⚠️ <strong>Late 12 = 1 more Half Day CUT</strong> (total: 3)</p>
            </div>
          </div>
        </motion.section>

        {/* Full Day Scenarios */}
        <motion.section 
          className="scenarios-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="section-title success">
            <CheckCircle2 size={20} />
            Full Day Scenarios (7+ hours worked)
          </h2>
          <div className="table-wrapper">
            <table className="scenarios-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>In Time</th>
                  <th>Out Time</th>
                  <th>Hours</th>
                  <th>Late Mark</th>
                  <th>Early Leave</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {fullDayScenarios.map((s) => (
                  <tr key={s.id}>
                    <td className="num">{s.id}</td>
                    <td className="time">{s.inTime}</td>
                    <td className="time">{s.outTime}</td>
                    <td className="hours">{s.hours}</td>
                    <td className="mark">{s.late ? <span className="badge-sm warning">⚠️ Yes</span> : <span className="badge-sm muted">❌ No</span>}</td>
                    <td className="mark">{s.early ? <span className="badge-sm warning">⚠️ Yes</span> : <span className="badge-sm muted">❌ No</span>}</td>
                    <td className="status">
                      <span className="status-badge full">✅ Full Day</span>
                      {s.late && <span className="extra-badge late">+ Late</span>}
                      {s.early && <span className="extra-badge early">+ Early</span>}
                    </td>
                    <td className="notes">{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Half Day Scenarios */}
        <motion.section 
          className="scenarios-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="section-title warning">
            <Calendar size={20} />
            Half Day Scenarios (&lt; 7 hours worked)
          </h2>
          <div className="table-wrapper">
            <table className="scenarios-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>In Time</th>
                  <th>Out Time</th>
                  <th>Hours</th>
                  <th>Late Mark</th>
                  <th>Early Leave</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {halfDayScenarios.map((s) => (
                  <tr key={s.id}>
                    <td className="num">{s.id}</td>
                    <td className="time">{s.inTime}</td>
                    <td className="time">{s.outTime}</td>
                    <td className="hours warning">{s.hours}</td>
                    <td className="mark">{s.late ? <span className="badge-sm warning">⚠️ Yes</span> : <span className="badge-sm muted">❌ No</span>}</td>
                    <td className="mark">{s.early ? <span className="badge-sm warning">⚠️ Yes</span> : <span className="badge-sm muted">❌ No</span>}</td>
                    <td className="status">
                      <span className="status-badge half">🔶 Half Day</span>
                      {s.late && <span className="extra-badge late">+ Late</span>}
                      {s.early && <span className="extra-badge early">+ Early</span>}
                    </td>
                    <td className="notes">{s.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Other Scenarios */}
        <motion.section 
          className="scenarios-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="section-title">
            <Info size={20} />
            Other Scenarios
          </h2>
          <div className="table-wrapper">
            <table className="scenarios-table compact">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>In Time</th>
                  <th>Out Time</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Absent</td>
                  <td className="time muted">—</td>
                  <td className="time muted">—</td>
                  <td className="hours">0h</td>
                  <td><span className="status-badge absent">🔴 Absent</span></td>
                  <td>No attendance recorded</td>
                </tr>
                <tr>
                  <td>Forgot Punch</td>
                  <td className="time muted">No punch</td>
                  <td className="time muted">No punch</td>
                  <td className="hours">0h</td>
                  <td><span className="status-badge absent">🔴 Absent</span></td>
                  <td>System shows as absent</td>
                </tr>
                <tr>
                  <td>Sunday (Rest)</td>
                  <td className="time muted">—</td>
                  <td className="time muted">—</td>
                  <td className="hours">0h</td>
                  <td><span className="status-badge rest">📅 Rest Day</span></td>
                  <td>Not counted as absent</td>
                </tr>
                <tr>
                  <td>Sunday (Worked)</td>
                  <td className="time">10:00 AM</td>
                  <td className="time">5:00 PM</td>
                  <td className="hours">7h</td>
                  <td><span className="status-badge rest">📅 Rest Day (OT)</span></td>
                  <td>Working on rest day</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="rules-footer">
          <p>These rules are configurable from the main Attendance Analyzer page.</p>
          <Link href="/" className="back-button primary">
            <ArrowLeft size={18} />
            Go to Analyzer
          </Link>
        </footer>
      </div>
    </div>
  );
}

