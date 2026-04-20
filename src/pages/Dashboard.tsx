import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, UserCheck, UserMinus, Briefcase, PieChart as PieChartIcon } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pns: 0,
    cpns: 0,
    pppk: 0,
    pppkpw: 0
  });
  const [bidangStats, setBidangStats] = useState<{ name: string; value: number }[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'shared/data/employees'), (snapshot) => {
      let pns = 0;
      let cpns = 0;
      let pppk = 0;
      let pppkpw = 0;
      const bidangMap: Record<string, number> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'PNS') pns++;
        else if (data.status === 'CPNS') cpns++;
        else if (data.status === 'PPPK') pppk++;
        else if (data.status === 'PPPKPW') pppkpw++;

        const bidang = data.bidang || 'Lainnya';
        bidangMap[bidang] = (bidangMap[bidang] || 0) + 1;
      });

      setStats({
        total: snapshot.docs.length,
        pns,
        cpns,
        pppk,
        pppkpw
      });

      const bidangData = Object.entries(bidangMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      setBidangStats(bidangData);
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, 'shared/data/employees');
      } catch (e) {
        if (e instanceof Error) setError(e);
      }
    });

    return () => unsubscribe();
  }, []);

  if (error) {
    throw error;
  }

  const statCards = [
    { name: 'Total Pegawai', value: stats.total, icon: Users },
    { name: 'Status PNS', value: stats.pns, icon: UserCheck },
    { name: 'Pegawai PPPK', value: stats.pppk, icon: Briefcase },
    { name: 'Unit Kerja', value: bidangStats.length, icon: PieChartIcon },
  ];

  const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];

  return (
    <div className="space-y-10 max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard Kepegawaian</h1>
          <p className="text-sm text-slate-500 mt-1">Ringkasan data pegawai dan distribusi unit kerja secara real-time.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-9 px-4 bg-slate-900 text-white rounded text-[12px] font-semibold flex items-center justify-center cursor-default shadow-sm transition-all hover:bg-slate-800">
            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Basic Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {statCards.map((item) => (
          <div key={item.name} className="bg-white border border-slate-100 p-6 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-3 mb-3 text-slate-400">
              <item.icon className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{item.name}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
              {item.value || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Bidang Distribution Table-like List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Distribusi Pegawai Per Bidang</h2>
          </div>
          <div className="bg-white border border-slate-100 rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-[13px]">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-500 uppercase text-[10px] tracking-wider">
              <div className="col-span-1">No</div>
              <div className="col-span-8">Nama Bidang / Unit Kerja</div>
              <div className="col-span-3 text-right">Jumlah Staf</div>
            </div>
            <div className="divide-y divide-slate-50">
              {bidangStats.map((bidang, index) => (
                <div key={bidang.name} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group items-center">
                  <div className="col-span-1 text-slate-300 font-mono text-[11px]">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="col-span-8 font-medium text-slate-700 group-hover:text-slate-900 truncate">
                    {bidang.name}
                  </div>
                  <div className="col-span-3 text-right font-bold text-slate-900 tabular-nums text-sm">
                    {bidang.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-slate-50/50 flex justify-between items-center text-[11px] text-slate-400 font-medium">
              <span>Menampilkan {bidangStats.length} Unit Kerja</span>
              <span>Terakhir diperbarui hari ini</span>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="space-y-4">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Visualisasi Persentase</h2>
          <div className="bg-white border border-slate-100 rounded-lg p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bidangStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {bidangStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '12px', color: '#1e293b' }}
                    itemStyle={{ padding: '0px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6 space-y-2 border-t border-slate-50 pt-6">
              {bidangStats.slice(0, 3).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-500 font-medium truncate max-w-[150px]">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 tabular-nums">{item.value}</span>
                </div>
              ))}
              <div className="text-[10px] text-center text-slate-400 italic pt-2">
                *Hanya menampilkan unit kerja utama
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
