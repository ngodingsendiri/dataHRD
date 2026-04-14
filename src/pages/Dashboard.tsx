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
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'shared/data/employees');
    });

    return () => unsubscribe();
  }, []);

  const statCards = [
    { name: 'Total Pegawai', value: stats.total, icon: Users, color: 'bg-blue-500' },
    { name: 'PNS', value: stats.pns, icon: UserCheck, color: 'bg-green-500' },
    { name: 'PPPK', value: stats.pppk, icon: Briefcase, color: 'bg-purple-500' },
    { name: 'Honorer', value: stats.honorer, icon: UserMinus, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Ringkasan data kepegawaian.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`rounded-md p-3 ${item.color}`}>
                    <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd>
                      <div className="text-2xl font-semibold text-gray-900">{item.value}</div>
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
