import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee } from '../types';
import { Modal } from '../components/Modal';
import { EmployeeForm } from '../components/EmployeeForm';
import { Plus, Search, Edit2, Trash2, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { handleFirestoreError, OperationType } from '../lib/error';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'shared/data/employees'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      setEmployees(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'shared/data/employees');
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (data: Employee) => {
    try {
      if (editingEmployee?.id) {
        await updateDoc(doc(db, 'shared/data/employees', editingEmployee.id), {
          ...data,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'shared/data/employees'), {
          ...data,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      setIsModalOpen(false);
      setEditingEmployee(undefined);
    } catch (error) {
      handleFirestoreError(error, editingEmployee?.id ? OperationType.UPDATE : OperationType.CREATE, 'shared/data/employees');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      try {
        await deleteDoc(doc(db, 'shared/data/employees', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `shared/data/employees/${id}`);
      }
    }
  };

  const handleExport = () => {
    const exportData = employees.map(({ id, dataKeluarga, createdAt, updatedAt, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pegawai");
    XLSX.writeFile(wb, "Data_Pegawai.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      for (const item of data) {
        try {
          await addDoc(collection(db, 'shared/data/employees'), {
            ...item,
            dataKeluarga: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'shared/data/employees');
        }
      }
      alert("Import selesai!");
    };
    reader.readAsBinaryString(file);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.nik.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Data Pegawai</h1>
          <p className="mt-1 text-sm text-gray-500">Kelola data seluruh pegawai.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
          </label>
          <button 
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </button>
          <button 
            onClick={() => { setEditingEmployee(undefined); setIsModalOpen(true); }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pegawai
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Cari berdasarkan Nama, NIP, atau NIK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama / NIP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jabatan / Bidang</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{emp.nama}</div>
                    <div className="text-sm text-gray-500">{emp.nip || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{emp.jabatan || '-'}</div>
                    <div className="text-sm text-gray-500">{emp.bidang || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${emp.status === 'PNS' ? 'bg-green-100 text-green-800' : 
                        emp.status === 'PPPK' ? 'bg-purple-100 text-purple-800' : 
                        'bg-orange-100 text-orange-800'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(emp.id!)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Tidak ada data pegawai ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingEmployee ? "Edit Data Pegawai" : "Tambah Pegawai Baru"}
      >
        <EmployeeForm 
          initialData={editingEmployee} 
          onSubmit={handleSave} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </Modal>
    </div>
  );
}
