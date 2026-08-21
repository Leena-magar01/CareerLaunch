import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Clock, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle,
  Plus, Edit2, Flame, ChevronLeft, ChevronRight, ShieldCheck,
  Building2, MapPin, Check, X, RefreshCw
} from 'lucide-react';

interface AttendanceTrackerProps {
  studentId?: string; // If viewing as mentor/company/TNP
  readOnly?: boolean;
}

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({
  studentId,
  readOnly = false
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 21));

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecordToEdit, setSelectedRecordToEdit] = useState<any>(null);

  // Add Past Attendance Form
  const [logDate, setLogDate] = useState('2026-08-20');
  const [logStatus, setLogStatus] = useState('PRESENT');
  const [logCheckIn, setLogCheckIn] = useState('09:00 AM');
  const [logCheckOut, setLogCheckOut] = useState('05:00 PM');
  const [logWorkingMode, setLogWorkingMode] = useState('OFFICE');
  const [logRemarks, setLogRemarks] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);

  // Edit Time Form
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Live action loading
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const url = studentId ? `/attendance/student/${studentId}` : '/attendance/me';
      const res = await api.get(url);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [studentId]);

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await api.post('/attendance/check-in', {
        workingMode: 'OFFICE',
        remarks: 'Live web portal check-in'
      });
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Checked in successfully!');
        fetchAttendance();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await api.post('/attendance/check-out', {});
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Checked out successfully!');
        fetchAttendance();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePastAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingLog(true);
      setErrorMsg('');
      const payload: any = {
        date: logDate,
        status: logStatus,
        checkIn: logCheckIn,
        checkOut: logCheckOut,
        workingMode: logWorkingMode,
        remarks: logRemarks
      };
      if (studentId) payload.studentId = studentId;

      const res = await api.post('/attendance/log', payload);
      if (res.data.success) {
        setSuccessMsg(`Attendance for ${logDate} recorded successfully!`);
        setShowAddModal(false);
        fetchAttendance();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to record attendance');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleSaveEditTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordToEdit?.id) return;
    try {
      setSubmittingEdit(true);
      setErrorMsg('');
      const res = await api.put(`/attendance/${selectedRecordToEdit.id}`, {
        checkIn: editCheckIn,
        checkOut: editCheckOut
      });
      if (res.data.success) {
        setSuccessMsg('Attendance time updated successfully!');
        setShowEditModal(false);
        fetchAttendance();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to update time');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const openEditForRecord = (record: any) => {
    setSelectedRecordToEdit(record);
    setEditCheckIn(record.checkIn || '09:00 AM');
    setEditCheckOut(record.checkOut || '05:00 PM');
    setShowEditModal(true);
  };

  // Calendar
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const records = data?.records || [];
  const stats = data?.stats || { present: 0, absent: 0, leave: 0, percentage: 0, streak: 0 };
  const todayRecord = data?.todayRecord;
  const activeInternship = data?.activeInternship;

  const recordMap = new Map<string, any>();
  for (const r of records) {
    recordMap.set(r.date, r);
  }

  const todayStr = '2026-08-21';
  const displayDateStr = 'Friday, 21 August 2026';

  if (loading) {
    return (
      <div className="glass-card p-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#66A3BF]" />
        <p className="text-xs text-slate-500">Loading attendance tracker...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Attendance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeInternship?.title || 'Front End Developer Internship'} &bull; {activeInternship?.startDate || '01 Jul 2026'}
          </p>
        </div>

        {!readOnly && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs !rounded-xl flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Past Attendance</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3 bg-[#4F8A68]/10 border border-[#4F8A68]/30 text-[#4F8A68] text-xs rounded-xl flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-[#C95A5A]/10 border border-[#C95A5A]/30 text-[#C95A5A] text-xs rounded-xl flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Live Check-In Banner */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="text-xs text-slate-500 font-medium block">
              {displayDateStr}
            </span>

            <div className="flex items-center space-x-3">
              <span className="text-2xl">⏰</span>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {todayRecord?.isCurrentlyWorking
                    ? 'Currently Working'
                    : todayRecord?.checkOut
                    ? 'Work Day Completed'
                    : todayRecord?.status === 'PRESENT'
                    ? 'Present'
                    : 'Not Checked In Yet'}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-8 text-xs pt-1">
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Check-in</span>
                <span className="text-[#4F8A68] font-bold text-sm">
                  {todayRecord?.checkIn || '--'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Check-out</span>
                <span className="text-slate-700 font-bold text-sm">
                  {todayRecord?.checkOut || '--'}
                </span>
              </div>
              {todayRecord?.workingMode && (
                <div>
                  <span className="text-slate-400 text-[11px] block font-medium">Mode</span>
                  <span className="text-[#66A3BF] font-bold text-sm">
                    {todayRecord.workingMode}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!readOnly && (
            <div className="flex items-center space-x-3">
              {todayRecord?.isCurrentlyWorking ? (
                <button
                  disabled={actionLoading}
                  onClick={handleCheckOut}
                  className="btn-danger !rounded-xl text-xs flex items-center space-x-2"
                >
                  <span className="text-base">🔴</span>
                  <span>{actionLoading ? 'Processing...' : 'Check Out'}</span>
                </button>
              ) : (
                <button
                  disabled={actionLoading}
                  onClick={handleCheckIn}
                  className="px-6 py-2.5 rounded-xl bg-[#4F8A68] hover:bg-[#3e7356] text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
                >
                  <span className="text-base">🟢</span>
                  <span>{actionLoading ? 'Checking in...' : 'Check In'}</span>
                </button>
              )}

              <button
                onClick={() => openEditForRecord(todayRecord || { id: '', checkIn: '06:17 AM', checkOut: '' })}
                className="btn-secondary !rounded-xl text-xs flex items-center space-x-1.5"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#C9963E]" />
                <span>Edit Time</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5 Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {/* Present */}
        <div className="bg-[#4F8A68]/5 border border-[#4F8A68]/20 rounded-2xl p-4 text-center space-y-1">
          <span className="text-2xl font-black text-[#4F8A68] block">{stats.present}</span>
          <span className="text-xs text-[#4F8A68]/80 font-semibold">Present</span>
        </div>

        {/* Absent */}
        <div className="bg-[#C95A5A]/5 border border-[#C95A5A]/20 rounded-2xl p-4 text-center space-y-1">
          <span className="text-2xl font-black text-[#C95A5A] block">{stats.absent}</span>
          <span className="text-xs text-[#C95A5A]/80 font-semibold">Absent</span>
        </div>

        {/* Leave */}
        <div className="bg-[#C9963E]/5 border border-[#C9963E]/20 rounded-2xl p-4 text-center space-y-1">
          <span className="text-2xl font-black text-[#C9963E] block">{stats.leave}</span>
          <span className="text-xs text-[#C9963E]/80 font-semibold">Leave</span>
        </div>

        {/* Percentage */}
        <div className="bg-[#66A3BF]/5 border border-[#66A3BF]/20 rounded-2xl p-4 text-center space-y-1">
          <span className="text-2xl font-black text-[#4874A0] block">{stats.percentage}%</span>
          <span className="text-xs text-[#4874A0]/80 font-semibold">Percentage</span>
        </div>

        {/* Streak */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-center space-x-1">
            <span className="text-2xl font-black text-orange-600">{stats.streak} days</span>
          </div>
          <span className="text-xs text-orange-600/80 font-semibold flex items-center justify-center space-x-1">
            <span>🔥 Streak</span>
          </span>
        </div>
      </div>

      {/* Calendar + Recent History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Calendar (7 cols) */}
        <div className="lg:col-span-7 glass-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-extrabold text-base text-slate-900">
              {monthNames[month]} {year}
            </h3>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-2 text-xs">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 rounded-xl"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const formattedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const rec = recordMap.get(formattedDateStr);
              const isToday = formattedDateStr === todayStr;

              let cellStyle = 'bg-slate-50 text-slate-400 border border-slate-100';
              if (rec?.status === 'PRESENT') {
                cellStyle = 'bg-[#4F8A68] text-white font-bold border border-[#4F8A68]';
              } else if (rec?.status === 'ABSENT') {
                cellStyle = 'bg-[#C95A5A] text-white font-bold border border-[#C95A5A]';
              } else if (rec?.status === 'LEAVE') {
                cellStyle = 'bg-[#C9963E] text-white font-bold border border-[#C9963E]';
              } else if (rec?.status === 'HALF_DAY') {
                cellStyle = 'bg-[#66A3BF] text-white font-bold border border-[#66A3BF]';
              }

              if (isToday) {
                cellStyle += ' ring-2 ring-[#66A3BF] ring-offset-2 ring-offset-white';
              }

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`h-10 rounded-xl flex items-center justify-center transition-all ${cellStyle}`}
                  title={rec ? `${formattedDateStr}: ${rec.status} (${rec.checkIn || ''} - ${rec.checkOut || ''})` : formattedDateStr}
                >
                  <span>{dayNum}</span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-5 pt-3 border-t border-slate-200 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-md bg-[#4F8A68] block"></span>
              <span className="text-slate-600">Present</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-md bg-[#C95A5A] block"></span>
              <span className="text-slate-600">Absent</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-md bg-[#C9963E] block"></span>
              <span className="text-slate-600">Leave</span>
            </div>
          </div>
        </div>

        {/* Recent History (5 cols) */}
        <div className="lg:col-span-5 glass-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 mb-3">Recent History</h3>

            {records.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                No attendance logs recorded yet. Check in or click "+ Add Past Attendance".
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {records.slice(0, 10).map((r: any) => {
                  const dObj = new Date(r.date);
                  const displayItemDate = `${dObj.getDate()} ${monthNames[dObj.getMonth()]?.slice(0, 3)} ${dObj.getFullYear()}`;

                  return (
                    <div
                      key={r.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">{displayItemDate}</span>
                        <span className="text-[11px] text-slate-500 block">
                          In: {r.checkIn || '09:00 AM'}
                          {r.source === 'SELF_ADDED' && ' \u2022 (self-added)'}
                          {r.workingMode && ` \u2022 ${r.workingMode}`}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          r.status === 'PRESENT'
                            ? 'bg-[#4F8A68]/10 text-[#4F8A68] border border-[#4F8A68]/20'
                            : r.status === 'ABSENT'
                            ? 'bg-[#C95A5A]/10 text-[#C95A5A] border border-[#C95A5A]/20'
                            : 'bg-[#C9963E]/10 text-[#C9963E] border border-[#C9963E]/20'
                        }`}>
                          {r.status === 'PRESENT' ? 'Present' : r.status === 'ABSENT' ? 'Absent' : 'Leave'}
                        </span>

                        {!readOnly && (
                          <button
                            onClick={() => openEditForRecord(r)}
                            className="p-1 text-slate-400 hover:text-[#66A3BF]"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: ADD PAST ATTENDANCE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add Past Attendance</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSavePastAttendance} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="input-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Status</label>
                  <select
                    value={logStatus}
                    onChange={(e) => setLogStatus(e.target.value)}
                    className="input-base"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LEAVE">Leave</option>
                    <option value="HALF_DAY">Half Day</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Working Mode</label>
                  <select
                    value={logWorkingMode}
                    onChange={(e) => setLogWorkingMode(e.target.value)}
                    className="input-base"
                  >
                    <option value="OFFICE">Office</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
              </div>

              {logStatus === 'PRESENT' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Check-in Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 09:00 AM"
                      value={logCheckIn}
                      onChange={(e) => setLogCheckIn(e.target.value)}
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Check-out Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 05:00 PM"
                      value={logCheckOut}
                      onChange={(e) => setLogCheckOut(e.target.value)}
                      className="input-base"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Regular internship shift"
                  value={logRemarks}
                  onChange={(e) => setLogRemarks(e.target.value)}
                  className="input-base"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="btn-primary text-xs"
                >
                  {submittingLog ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TIME */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Edit Check-in / Out Time</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveEditTime} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Check-in Time</label>
                <input
                  type="text"
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  placeholder="e.g. 06:17 AM"
                  className="input-base"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Check-out Time</label>
                <input
                  type="text"
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  placeholder="e.g. 05:30 PM"
                  className="input-base"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="btn-primary text-xs"
                >
                  {submittingEdit ? 'Saving...' : 'Update Time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
