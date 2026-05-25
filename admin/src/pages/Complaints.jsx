import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from '../providers/SocketProvider';
import { 
  Search, Filter, ChevronLeft, ChevronRight, X, User, MapPin, 
  Calendar, AlertCircle, Edit, CheckCircle, Trash2, ArrowUpDown
} from 'lucide-react';

const CATEGORIES = ['all', 'pothole', 'waste', 'water', 'streetlight', 'traffic', 'other'];
const PRIORITIES = ['all', 'low', 'medium', 'high'];
const STATUSES = ['all', 'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];

const Complaints = () => {
  const { socket } = useSocket();

  // Complaints State
  const [complaints, setComplaints] = useState([]);
  const [authorities, setAuthorities] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Sorting State
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTimeline, setModalTimeline] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Moderation Actions State
  const [targetAuthority, setTargetAuthority] = useState('');
  const [targetStatus, setTargetStatus] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Fetch paginated complaints list
  const fetchComplaints = async () => {
    setLoading(true);
    try {
      let url = `/complaints?page=${currentPage}&limit=8`;
      if (selectedCategory !== 'all') url += `&category=${selectedCategory}`;
      if (selectedPriority !== 'all') url += `&priority=${selectedPriority}`;
      if (selectedStatus !== 'all') url += `&status=${selectedStatus}`;

      const res = await api.get(url);
      let list = res.data.data.complaints;

      // Local search filtering support
      if (search.trim()) {
        const query = search.toLowerCase();
        list = list.filter(c => 
          c.title.toLowerCase().includes(query) || 
          c.description.toLowerCase().includes(query) ||
          c.address?.toLowerCase().includes(query)
        );
      }

      // Local sorting
      list.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (sortField === 'createdAt') {
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
        }
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      setComplaints(list);
      setTotalCount(res.data.data.pagination.totalCount);
      setTotalPages(res.data.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load complaints directory:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch authorities list
  const fetchAuthorities = async () => {
    try {
      const res = await api.get('/admin/authorities');
      setAuthorities(res.data.data);
    } catch (err) {
      console.error('Failed to load department authorities directory:', err);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [currentPage, selectedCategory, selectedPriority, selectedStatus, sortField, sortOrder]);

  // Handle live searches debounced or triggered on enter
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchComplaints();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    fetchAuthorities();
  }, []);

  // Listen to Socket events for live changes
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdated = () => {
      fetchComplaints();
    };

    socket.on('complaint_status_updated', handleStatusUpdated);
    return () => {
      socket.off('complaint_status_updated', handleStatusUpdated);
    };
  }, [socket]);

  // Load individual complaint details & timeline logs
  const handleOpenDetails = async (complaint) => {
    setSelectedComplaint(complaint);
    setModalLoading(true);
    setActiveImageIndex(0);
    setActionError(null);
    setActionSuccess(null);
    setTargetAuthority(complaint.assignedAuthority?._id || '');
    setTargetStatus(complaint.status || '');
    setAdminRemarks('');
    
    try {
      const res = await api.get(`/complaints/${complaint._id}`);
      setModalTimeline(res.data.data.timeline);
    } catch (err) {
      console.error('Failed to load status logs timeline:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Assign department authority
  const handleAssignAuthority = async () => {
    if (!targetAuthority) {
      setActionError('Please select a department authority officer to assign.');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.patch(`/admin/complaints/${selectedComplaint._id}/assign`, {
        authorityId: targetAuthority
      });
      setActionSuccess('Authority successfully assigned to complaint.');
      
      // Refresh modal timeline & parent list
      const detailsRes = await api.get(`/complaints/${selectedComplaint._id}`);
      setModalTimeline(detailsRes.data.data.timeline);
      fetchComplaints();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Assignment failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Status Moderation action
  const handleUpdateStatus = async () => {
    if (!targetStatus) {
      setActionError('Please specify a status transition.');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.patch(`/complaints/${selectedComplaint._id}/status`, {
        status: targetStatus,
        remarks: adminRemarks
      });
      setActionSuccess('Status updated and logged successfully.');
      
      // Refresh modal timeline & parent list
      const detailsRes = await api.get(`/complaints/${selectedComplaint._id}`);
      setModalTimeline(detailsRes.data.data.timeline);
      fetchComplaints();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Updating status failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Operation Desk</h1>
        <p className="text-sm text-gray-400">Review reported issues, coordinate department officers, and manage resolutions timeline.</p>
      </div>

      {/* Filters & Search Header */}
      <div className="rounded-2xl bg-[#111726] border border-[#1e2b47] p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          
          {/* Text Search input */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, desc..."
              className="w-full rounded-xl bg-[#0d1324] border border-[#1e2b47] py-2.5 pl-10 pr-4 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl bg-[#0d1324] border border-[#1e2b47] py-2.5 px-3.5 text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold capitalize"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full rounded-xl bg-[#0d1324] border border-[#1e2b47] py-2.5 px-3.5 text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold capitalize"
            >
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{p === 'all' ? 'All Priorities' : `${p} Priority`}</option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl bg-[#0d1324] border border-[#1e2b47] py-2.5 px-3.5 text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold capitalize"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Grid complaints table */}
      <div className="rounded-2xl bg-[#111726] border border-[#1e2b47] shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-24 text-center">
            <AlertCircle className="h-10 w-10 text-gray-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-400">No matching reports found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1d273d] bg-[#0c1221] text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('title')}>
                    Complaint Title <ArrowUpDown className="h-3 w-3 inline ml-1.5 text-gray-500" />
                  </th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('priority')}>
                    Priority <ArrowUpDown className="h-3 w-3 inline ml-1.5 text-gray-500" />
                  </th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort('createdAt')}>
                    Filed Date <ArrowUpDown className="h-3 w-3 inline ml-1.5 text-gray-500" />
                  </th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1d273d]">
                {complaints.map((item) => (
                  <tr key={item._id} className="text-xs hover:bg-[#161f36] transition-colors duration-150">
                    <td className="py-4 px-6 font-bold text-white max-w-[200px] truncate">{item.title}</td>
                    <td className="py-4 px-6">
                      <span className="rounded-md bg-[#1d2842] px-2 py-0.5 font-semibold text-indigo-300 uppercase text-[9px] tracking-wider">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`rounded-md px-2 py-0.5 font-semibold uppercase text-[9px] tracking-wider ${
                        item.priority === 'high' ? 'bg-rose-500/10 text-rose-400' :
                        item.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`rounded-full px-2.5 py-0.5 font-semibold uppercase text-[9px] tracking-wide ${
                        item.status === 'Resolved' ? 'status-pill-resolved' :
                        item.status === 'Under Review' ? 'status-pill-under-review' :
                        item.status === 'In Progress' ? 'status-pill-in-progress' :
                        item.status === 'Assigned' ? 'status-pill-assigned' :
                        item.status === 'Rejected' ? 'status-pill-rejected' :
                        'status-pill-submitted'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => handleOpenDetails(item)}
                        className="rounded-xl bg-indigo-600/15 border border-indigo-500/25 px-3 py-1.5 text-[11px] font-bold text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all duration-200"
                      >
                        Audit Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        <div className="flex items-center justify-between border-t border-[#1d273d] px-6 py-4 bg-[#0d1221]">
          <span className="text-xs text-gray-400 font-medium">
            Showing Page <span className="font-bold text-white">{currentPage}</span> of <span className="font-bold text-white">{totalPages}</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-xl bg-[#111726] border border-[#1e2b47] p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-xl bg-[#111726] border border-[#1e2b47] p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Complaint Audit Details Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-hidden">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedComplaint(null)} />
          
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0b101f] border border-[#1e2b47] shadow-2xl p-6 md:p-8 animate-in zoom-in duration-200 text-gray-200">
            
            {/* Modal Close */}
            <button 
              onClick={() => setSelectedComplaint(null)}
              className="absolute right-6 top-6 rounded-xl p-2 text-gray-400 hover:bg-[#1a233a] hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header info */}
            <div className="mb-6 pr-10">
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-400 border border-indigo-500/20 uppercase tracking-widest block w-fit mb-2">
                Audit Registry
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-white font-outfit">{selectedComplaint.title}</h2>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                Filed on {new Date(selectedComplaint.createdAt).toLocaleString()} by <span className="font-semibold text-white">{selectedComplaint.citizen?.name || 'Citizen'}</span>
              </p>
            </div>

            {/* Grid Layout: Detail & Media column, Moderation controls column */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              
              {/* Left Column: Details & Images */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Description</h4>
                  <p className="rounded-2xl bg-[#0d1324] border border-[#1e2b47] p-4 text-xs leading-relaxed text-gray-300">
                    {selectedComplaint.description}
                  </p>
                </div>

                {/* Images Carousel */}
                {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 mb-2.5 uppercase tracking-wider">Attachments</h4>
                    <div className="relative rounded-2xl bg-[#0d1324] border border-[#1e2b47] p-2 overflow-hidden flex flex-col items-center">
                      <img 
                        src={selectedComplaint.images[activeImageIndex]} 
                        alt="Filing Attachment" 
                        className="h-48 max-w-full rounded-xl object-cover"
                      />
                      {selectedComplaint.images.length > 1 && (
                        <div className="flex gap-1.5 mt-3 justify-center">
                          {selectedComplaint.images.map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveImageIndex(i)}
                              className={`h-2.5 w-2.5 rounded-full transition-all ${
                                i === activeImageIndex ? 'bg-indigo-500 w-5' : 'bg-gray-700 hover:bg-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Coordinates & Location Info */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Location Preview</h4>
                  <div className="rounded-2xl bg-[#0d1324] border border-[#1e2b47] p-4 space-y-2.5">
                    <p className="text-xs text-gray-300 flex items-start gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                      <span>{selectedComplaint.address || 'Address coordinates logged'}</span>
                    </p>
                    {selectedComplaint.location?.coordinates && (
                      <div className="flex items-center gap-3 pt-2.5 border-t border-[#1e2b47]/50 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                        <span>Lng: {selectedComplaint.location.coordinates[0]?.toFixed(5)}</span>
                        <span>Lat: {selectedComplaint.location.coordinates[1]?.toFixed(5)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit statuslogs timeline */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 mb-3.5 uppercase tracking-wider">Status History Timeline</h4>
                  <div className="relative pl-5 border-l border-[#1e2b47]/80 space-y-4">
                    {modalLoading ? (
                      <p className="text-xs text-gray-500">Loading timeline...</p>
                    ) : modalTimeline.length === 0 ? (
                      <p className="text-xs text-gray-500">No status updates logged yet.</p>
                    ) : (
                      modalTimeline.map((log) => (
                        <div key={log._id} className="relative">
                          <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-[#0b101f]"></span>
                          <div className="rounded-xl bg-[#0d1324]/50 border border-[#1e2b47]/40 p-2.5">
                            <div className="flex items-center justify-between gap-4 text-[10px]">
                              <span className="font-bold text-white font-outfit uppercase">
                                Moved to {log.newStatus}
                              </span>
                              <span className="text-gray-500">
                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">{log.remarks}</p>
                            <span className="text-[9px] text-indigo-400 block mt-1.5">Logged by {log.changedBy?.name || 'System'} ({log.changedBy?.role || 'Service'})</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Moderation Actions Panel */}
              <div className="rounded-3xl bg-[#0d1324] border border-[#1e2b47] p-5 shadow-inner h-fit space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white font-outfit">Moderation Desk Panel</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Approve, reject, or assign department officers to remediate the report.</p>
                </div>

                {/* Status Banners */}
                {actionError && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-rose-300 text-xs">
                    <AlertCircle className="h-4.5 w-4.5 text-rose-400" />
                    <span>{actionError}</span>
                  </div>
                )}
                {actionSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-emerald-300 text-xs">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {/* Assignment Controls */}
                <div className="space-y-3 pt-3 border-t border-[#1e2b47]/50">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Assign Department Officer</label>
                  <div className="flex gap-2">
                    <select
                      value={targetAuthority}
                      onChange={(e) => setTargetAuthority(e.target.value)}
                      className="flex-1 rounded-xl bg-[#090d19] border border-[#1e2b47] py-2.5 px-3 text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold"
                    >
                      <option value="">Select Department Officer...</option>
                      {authorities.map(auth => (
                        <option key={auth._id} value={auth._id}>{auth.name} - {auth.phone || 'No phone'}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignAuthority}
                      disabled={actionLoading}
                      className="rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50 transition-all whitespace-nowrap"
                    >
                      Assign
                    </button>
                  </div>
                </div>

                {/* Status Transitions Controls */}
                <div className="space-y-4 pt-5 border-t border-[#1e2b47]/50">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Update Life Status</label>
                    <select
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value)}
                      className="w-full rounded-xl bg-[#090d19] border border-[#1e2b47] py-2.5 px-3 text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold capitalize"
                    >
                      <option value="">Select status transition...</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Audit Remarks</label>
                    <textarea
                      value={adminRemarks}
                      onChange={(e) => setAdminRemarks(e.target.value)}
                      placeholder="Add administrative comments, details, or rejection reasons here..."
                      rows={3}
                      className="w-full rounded-xl bg-[#090d19] border border-[#1e2b47] p-3 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>

                  <button
                    onClick={handleUpdateStatus}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50 transition-all"
                  >
                    Commit Status Shift
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Complaints;
