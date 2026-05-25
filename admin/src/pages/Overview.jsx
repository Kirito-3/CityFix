import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../providers/SocketProvider';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Activity, AlertTriangle, CheckCircle2, Clock, 
  TrendingUp, Layers, PieChart as PieIcon, Radio, ListPlus
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#ef4444'];

const Overview = () => {
  const { setNotifications } = useOutletContext();
  const { socket, connected } = useSocket();
  
  // Dashboard Metrics
  const [stats, setStats] = useState({
    users: { total: 0, citizens: 0, authorities: 0 },
    complaints: { total: 0, reported: 0, underReview: 0, resolved: 0 },
    categories: []
  });
  
  const [loading, setLoading] = useState(true);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [trendsData, setTrendsData] = useState([]);

  // Fetch initial REST metrics
  const fetchStats = async () => {
    try {
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data.data);

      const complaintsRes = await api.get('/complaints?limit=6');
      setRecentComplaints(complaintsRes.data.data.complaints);

      // Generate standard monthly trends placeholder data based on actual totals
      const total = statsRes.data.data.complaints.total;
      const resolved = statsRes.data.data.complaints.resolved;
      setTrendsData([
        { name: 'Jan', Filed: Math.max(0, Math.round(total * 0.4)), Resolved: Math.max(0, Math.round(resolved * 0.3)) },
        { name: 'Feb', Filed: Math.max(0, Math.round(total * 0.6)), Resolved: Math.max(0, Math.round(resolved * 0.5)) },
        { name: 'Mar', Filed: Math.max(0, Math.round(total * 0.8)), Resolved: Math.max(0, Math.round(resolved * 0.7)) },
        { name: 'Apr', Filed: total, Resolved: resolved },
      ]);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Listen to WebSocket broadcasts
  useEffect(() => {
    if (!socket) return;

    // Handle real-time incoming complaints
    const handleNewComplaint = (data) => {
      console.log('Realtime socket event: new_complaint', data);
      
      // Update statistics counters locally in-memory
      setStats(prev => ({
        ...prev,
        complaints: {
          ...prev.complaints,
          total: prev.complaints.total + 1,
          reported: prev.complaints.reported + 1
        }
      }));

      // Prepend to recent list
      const mockNewItem = {
        _id: data.complaintId,
        title: data.title,
        category: data.category,
        priority: data.priority,
        status: 'Submitted',
        createdAt: new Date().toISOString()
      };
      setRecentComplaints(prev => [mockNewItem, ...prev.slice(0, 5)]);

      // Push custom reactive notification to layout alerts drawer
      setNotifications(prev => [
        {
          id: Date.now(),
          title: 'New Complaint Filed!',
          message: `"${data.title}" registered in category ${data.category}.`,
          time: 'Just now'
        },
        ...prev
      ]);
    };

    // Handle real-time status shifts
    const handleStatusUpdated = (data) => {
      console.log('Realtime socket event: complaint_status_updated', data);
      
      // Fetch fresh stats to rebuild Recharts automatically
      fetchStats();

      // Update locally in recentComplaints list if exists
      setRecentComplaints(prev => 
        prev.map(c => c._id === data.complaintId ? { ...c, status: data.newStatus } : c)
      );

      // Add alert
      setNotifications(prev => [
        {
          id: Date.now(),
          title: 'Status Updated Live',
          message: `Complaint transitioned to status ${data.newStatus}.`,
          time: 'Just now'
        },
        ...prev
      ]);
    };

    socket.on('new_complaint', handleNewComplaint);
    socket.on('complaint_status_updated', handleStatusUpdated);

    return () => {
      socket.off('new_complaint', handleNewComplaint);
      socket.off('complaint_status_updated', handleStatusUpdated);
    };
  }, [socket, setNotifications]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-md bg-[#161d30] skeleton-loading relative overflow-hidden" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#161d30] skeleton-loading relative overflow-hidden" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="col-span-2 h-80 rounded-2xl bg-[#161d30] skeleton-loading relative overflow-hidden" />
          <div className="h-80 rounded-2xl bg-[#161d30] skeleton-loading relative overflow-hidden" />
        </div>
      </div>
    );
  }

  // Pre-calculate status distribution for BarChart - all 6 statuses
  const statusDistributionData = [
    { name: 'Submitted', count: stats.complaints.reported || 0 },
    { name: 'Under Review', count: stats.complaints.underReview || 0 },
    { name: 'Assigned', count: stats.complaints.assigned || 0 },
    { name: 'In Progress', count: stats.complaints.inProgress || 0 },
    { name: 'Resolved', count: stats.complaints.resolved || 0 },
    { name: 'Rejected', count: stats.complaints.rejected || 0 },
  ];

  // Pie chart category lists
  const pieCategoryData = stats.categories.map((c) => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    value: c.count
  }));

  const cardStats = [
    { 
      name: 'Total Complaints', 
      value: stats.complaints.total, 
      icon: Activity, 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-500/10 border-indigo-500/20' 
    },
    { 
      name: 'Resolved Issues', 
      value: stats.complaints.resolved || 0, 
      icon: CheckCircle2, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10 border-emerald-500/20' 
    },
    { 
      name: 'Under Review', 
      value: stats.complaints.underReview || 0, 
      icon: Clock, 
      color: 'text-violet-500', 
      bg: 'bg-violet-500/10 border-violet-500/20' 
    },
    { 
      name: 'Active/Submitted', 
      value: stats.complaints.reported || 0, 
      icon: AlertTriangle, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10 border-amber-500/20' 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Overview Dashboard</h1>
          <p className="text-sm text-gray-400">Live operational oversight and citizen reports statistics.</p>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#0f1526] border border-[#1e2b47] px-4 py-2">
          <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-gray-300">
            {connected ? 'Live Sync Operations Channel Active' : 'Connecting WebSocket...'}
          </span>
        </div>
      </div>

      {/* Overview Stat Counters Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cardStats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="rounded-2xl bg-[#111726] border border-[#1e2b47] p-6 shadow-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-400">{item.name}</p>
                <div className={`rounded-xl p-2.5 ${item.bg} border`}>
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold text-white font-outfit">{item.value}</h3>
                <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider block mt-1">Operational count</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recharts Analytics Charts Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Trend AreaChart Widget */}
        <div className="col-span-1 rounded-2xl bg-[#111726] border border-[#1e2b47] p-5 shadow-xl lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white font-outfit">Complaint Trends & Resolutions</h3>
          </div>
          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="filedColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="resolvedColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" style={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="Filed" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#filedColor)" />
                <Area type="monotone" dataKey="Resolved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#resolvedColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category PieChart Widget */}
        <div className="rounded-2xl bg-[#111726] border border-[#1e2b47] p-5 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white font-outfit">Category distribution</h3>
          </div>
          <div className="h-72 w-full flex-1 flex flex-col justify-center items-center">
            {pieCategoryData.length === 0 ? (
              <p className="text-xs text-gray-500 py-20">No category statistics available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieCategoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Grid: Status BarChart & Realtime Alert Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Status Distribution Bar Chart */}
        <div className="rounded-2xl bg-[#111726] border border-[#1e2b47] p-5 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white font-outfit">Status Distribution</h3>
          </div>
          <div className="h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" style={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]}>
                  {statusDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.name === 'Resolved' ? '#10b981' :
                      entry.name === 'Under Review' ? '#8b5cf6' :
                      entry.name === 'In Progress' ? '#f59e0b' :
                      entry.name === 'Rejected' ? '#ef4444' :
                      entry.name === 'Assigned' ? '#ec4899' :
                      '#6366f1'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live complaints feed */}
        <div className="col-span-1 rounded-2xl bg-[#111726] border border-[#1e2b47] p-5 shadow-xl lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ListPlus className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white font-outfit">Realtime Complaint Feed</h3>
            </div>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
              Live updates active
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[260px] pr-1">
            {recentComplaints.length === 0 ? (
              <p className="text-center text-xs text-gray-500 py-16">No complaints registered in the system yet.</p>
            ) : (
              recentComplaints.map((item) => (
                <div 
                  key={item._id} 
                  className="flex items-center justify-between rounded-xl bg-[#0d1324] border border-[#1d273d] p-3.5 hover:border-indigo-500/20 transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate pr-4">{item.title}</p>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <span className="rounded-md bg-[#161f36] px-2 py-0.5 text-[9px] font-semibold text-gray-400 tracking-wide uppercase">
                        {item.category}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase ${
                        item.priority === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase ${
                      item.status === 'Resolved' ? 'status-pill-resolved' :
                      item.status === 'Under Review' ? 'status-pill-under-review' :
                      item.status === 'In Progress' ? 'status-pill-in-progress' :
                      'status-pill-submitted'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-[9px] text-gray-500 font-medium">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Overview;
