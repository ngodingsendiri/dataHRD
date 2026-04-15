import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, UserCheck, UserMinus, Briefcase } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pns: 0,
    pppk: 0,
    honorer: 0
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'shared/data/employees'), (snapshot) => {
      let pns = 0;
      let pppk = 0;
      let honorer = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'PNS') pns++;
        else if (data.status === 'PPPK') pppk++;
        else if (data.status === 'Honorer') honorer++;
      });

      setStats({
        total: snapshot.docs.length,
        pns,
        pppk,
        honorer
      });
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
    { name: 'Total Pegawai', value: stats.total, icon: Users, color: 'bg-blue-50 text-blue-600 ring-blue-100' },
    { name: 'PNS', value: stats.pns, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
    { name: 'PPPK', value: stats.pppk, icon: Briefcase, color: 'bg-indigo-50 text-indigo-600 ring-indigo-100' },
    { name: 'Honorer', value: stats.honorer, icon: UserMinus, color: 'bg-amber-50 text-amber-600 ring-amber-100' },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500 font-medium">Ringkasan data kepegawaian terkini secara real-time.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden rounded-[32px] border border-slate-200/60 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/50 group">
            <div className="p-8">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`rounded-2xl p-4 transition-all group-hover:scale-110 ${item.color.replace('ring-1 ring-inset', '')} shadow-sm`}>
                    <item.icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-6 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-black text-slate-400 uppercase tracking-widest truncate">{item.name}</dt>
                    <dd>
                      <div className="text-4xl font-black tracking-tighter text-slate-900 mt-2">{item.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
