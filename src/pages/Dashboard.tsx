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
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan data kepegawaian terkini.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`rounded-xl p-3 ring-1 ring-inset ${item.color}`}>
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">{item.name}</dt>
                    <dd>
                      <div className="text-3xl font-bold tracking-tight text-slate-900 mt-1">{item.value}</div>
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
