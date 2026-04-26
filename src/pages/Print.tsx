import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee, AppSettings } from '../types';
import { Printer, Settings, Users, FileText, ChevronDown } from 'lucide-react';

type PrintType = 'absen_global' | 'absen_bidang' | 'tanda_terima' | 'surat_cuti' | 'anjab' | 'model_dk' | 'duk' | 'bezetting' | 'usulan_kgb' | 'usulan_kp';
type SortAction = 'default_kelas' | 'abjad';

export default function Print() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Print Configuration States
  const [printType, setPrintType] = useState<PrintType>('absen_global');
  const [customTitle, setCustomTitle] = useState('DAFTAR HADIR / ABSENSI');
  const [customSubtitle, setCustomSubtitle] = useState('KEGIATAN: .......................................');
  const [selectedBidang, setSelectedBidang] = useState<string>('Semua');
  const [sortOption, setSortOption] = useState<SortAction>('default_kelas');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Settings
        const settingsDoc = await getDoc(doc(db, 'shared/data/settings/app'));
        let currentSettings: AppSettings | null = null;
        if (settingsDoc.exists()) {
          currentSettings = settingsDoc.data() as AppSettings;
          setSettings(currentSettings);
        }

        // Fetch Employees
        const empSnapshot = await getDocs(collection(db, 'shared/data/employees'));
        let empData = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        
        // Apply Kamus Jabatan Overrides dynamically
        if (currentSettings?.jabatanKamusCsv) {
          const kamusMap = new Map<string, {kelas: string, beban: string}>();
          const rows = currentSettings.jabatanKamusCsv.split('\n');
          for (let i = 1; i < rows.length; i++) {
            const kamusRow = rows[i];
            if (!kamusRow || kamusRow.trim() === '') continue;
            const cols = kamusRow.split(/;|\t/);
            if (cols.length >= 4) {
              kamusMap.set(cols[1].trim().toLowerCase(), { 
                kelas: cols[2].trim(), 
                beban: cols[3].trim() 
              });
            }
          }
          
          empData = empData.map(emp => {
            if (emp.jabatan && kamusMap.has(emp.jabatan.trim().toLowerCase())) {
              const match = kamusMap.get(emp.jabatan.trim().toLowerCase())!;
              return { ...emp, kelasJabatan: match.kelas, bebanKerja: match.beban };
            }
            return emp;
          });
        }

        setEmployees(empData);
      } catch (err) {
        console.error("Error fetching data for print:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const getUniqueBidang = () => {
    const bidangSet = new Set(employees.map(e => e.bidang || 'Tidak Ada Bidang'));
    return Array.from(bidangSet).sort();
  };

  const filteredEmployees = employees.filter(emp => {
    if (printType === 'absen_bidang' && selectedBidang !== 'Semua') {
      return (emp.bidang || 'Tidak Ada Bidang') === selectedBidang;
    }
    return true;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortOption === 'abjad') {
      return (a.nama || '').localeCompare(b.nama || '');
    } else {
      // Status
      const statusOrder: Record<string, number> = {
        'PNS': 1,
        'CPNS': 2,
        'PPPK': 3,
        'PPPKPW': 4,
        'Lainnya': 5
      };
      
      const statusA = statusOrder[a.status || ''] || 99;
      const statusB = statusOrder[b.status || ''] || 99;
      
      if (statusA !== statusB) {
        return statusA - statusB;
      }

      // Kelas Jabatan (DESC)
      const kelasA = parseInt(a.kelasJabatan || '0', 10);
      const kelasB = parseInt(b.kelasJabatan || '0', 10);
      if (kelasB !== kelasA) {
        return kelasB - kelasA;
      }
      
      // Fallback
      return (a.nama || '').localeCompare(b.nama || '');
    }
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64 font-medium text-slate-500 text-sm">Menginisialisasi data formulir cetak...</div>;
  }

  const toProperCase = (str: string) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
  };

  // Find employee with "kepala dinas" or "kadis" in their jabatan
  const kadisEmp = employees.find(e => /(kepala\s+dinas|kadis)/i.test((e.jabatan || '')));
  const kadisTitle = settings?.kopLine2 ? `Kepala ${toProperCase(settings.kopLine2)}` : 'Kepala Dinas Komunikasi Dan Informatika';
  const ttdName = kadisEmp?.nama || '...........................................';
  const ttdPangkat = kadisEmp?.pangkatGolongan || 'Pangkat Golongan ..........................';
  const ttdNip = kadisEmp?.nip || '........................................';

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 sm:p-0 sm:py-8 pb-12 antialiased">
      {/* Control Panel (Hidden on Print) */}
      <div className="print-hidden space-y-4 md:space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4 md:pb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Pusat Pencetakan Dokumen</h1>
            <p className="mt-1 text-sm text-slate-500">Konfigurasi spesifikasi dan pratinjau tabel sebelum melakukan pencetakan dokumen administratif.</p>
          </div>
          <button 
            onClick={() => {
              try {
                window.print();
              } catch (e) {
                alert("Perintah otomatis terblokir oleh browser. Silakan tekan Ctrl+P atau Cmd+P untuk mencetak secara manual.");
              }
            }}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
            title="Klik untuk cetak atau tekan Ctrl+P"
          >
            <Printer className="w-4 h-4" />
            Cetak Dokumen Sekarang
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <p>Bila tombol cetak tidak berfungsi di mode pratinjau ini, silakan tekan <strong>Ctrl+P</strong> (Windows) atau <strong>Cmd+P</strong> (Mac) langsung pada keyboard Anda.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 bg-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200">
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Klasifikasi Dokumen</label>
            <select 
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer"
              value={printType}
              onChange={(e) => {
                const type = e.target.value as PrintType;
                setPrintType(type);
                if (type === 'absen_global') setCustomTitle('DAFTAR HADIR / ABSENSI PEGAWAI');
                if (type === 'absen_bidang') setCustomTitle(`DAFTAR HADIR UNIT KERJA ${selectedBidang === 'Semua' ? '...' : selectedBidang.toUpperCase()}`);
                if (type === 'tanda_terima') setCustomTitle('DAFTAR TANDA TERIMA ......................');
                if (type === 'surat_cuti') setCustomTitle('SURAT IZIN CUTI PEGAWAI');
                if (type === 'anjab') setCustomTitle('DOKUMEN ANALISIS JABATAN (ANJAB)');
                if (type === 'model_dk') setCustomTitle('DAFTAR KELUARGA (MODEL DK)');
                if (type === 'duk') setCustomTitle('DAFTAR URUT KEPANGKATAN (DUK)');
                if (type === 'bezetting') setCustomTitle('DAFTAR SUSUNAN BEZETTING PEGAWAI');
                if (type === 'usulan_kgb') setCustomTitle('USULAN KENAIKAN GAJI BERKALA (KGB)');
                if (type === 'usulan_kp') setCustomTitle('USULAN KENAIKAN PANGKAT (KP)');
              }}
            >
              <option value="absen_global">Daftar Hadir Global (Keseluruhan)</option>
              <option value="absen_bidang">Daftar Hadir Per Unit Kerja</option>
              <option value="tanda_terima">Dokumen Tanda Terima</option>
              <option value="surat_cuti">Surat Cuti (Segera Hadir)</option>
              <option value="anjab">Cetak ANJAB (Segera Hadir)</option>
              <option value="model_dk">Cetak Model DK (Segera Hadir)</option>
              <option value="duk">Daftar Urut Kepangkatan - DUK (Segera Hadir)</option>
              <option value="bezetting">Susunan Formasi Bezetting (Segera Hadir)</option>
              <option value="usulan_kgb">Usulan KGB (Segera Hadir)</option>
              <option value="usulan_kp">Usulan KP (Segera Hadir)</option>
            </select>
          </div>

          {printType === 'absen_bidang' && (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filter Unit Kerja</label>
              <select 
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer"
                value={selectedBidang}
                onChange={(e) => {
                  setSelectedBidang(e.target.value);
                  setCustomTitle(`DAFTAR HADIR UNIT KERJA ${e.target.value.toUpperCase()}`);
                }}
              >
                <option value="Semua">Semua / Pilih Filter...</option>
                {getUniqueBidang().map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-2">
             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Metode Pengurutan</label>
             <select 
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortAction)}
            >
              <option value="default_kelas">Hierarki (Kelas Jabatan, Status)</option>
              <option value="abjad">Alfabetis (A-Z)</option>
            </select>
          </div>

          <div className={`space-y-2 ${printType === 'absen_bidang' ? 'md:col-span-1 lg:col-span-2' : 'md:col-span-2 lg:col-span-3'}`}>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Judul Utama Dokumen</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </div>
          
          <div className="space-y-2 md:col-span-4 lg:col-span-5">
             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Informasi Tambahan / Keterangan Dokumen</label>
             <input 
              type="text" 
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
              value={customSubtitle}
              onChange={(e) => setCustomSubtitle(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-slate-100 p-4 sm:p-8 rounded-xl border border-slate-200 overflow-x-auto print:p-0 print:bg-transparent print:border-none print:shadow-none print:-mx-4 print:overflow-visible flex flex-col items-center">
        <div className="text-center mb-6 text-xs sm:text-sm font-bold text-slate-400 tracking-widest uppercase print:hidden w-full">
          — Mode Pratinjau Cetak —
        </div>
        
        {/* Actual Print Paper Container */}
        <div 
          ref={printRef}
          className="bg-white shadow-2xl print-container text-[12pt] w-[210mm] max-w-none shrink-0 p-[15mm] print:max-w-full print:w-full print:p-0 mx-auto"
          style={{
            minHeight: '297mm',
            fontFamily: 'Arial, Helvetica, sans-serif'
          }}
        >
          {/* KOP SURAT */}
          <div className="flex items-center border-b-[3px] border-black pb-2 mb-1" style={{ lineHeight: '1.2' }}>
            <div className="flex-shrink-0 w-24 h-24 flex items-center justify-center">
              {settings?.logoBase64 ? (
                <img src={settings.logoBase64} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-center text-gray-400 print-hidden">Logo<br/>(Kosong)</div>
              )}
            </div>
            <div className="flex-1 text-center pr-24 flex flex-col justify-center">
               {settings?.kopLine1 && <div className="text-[14pt] font-bold tracking-widest uppercase">{settings.kopLine1}</div>}
               {settings?.kopLine2 && <div className="text-[16pt] font-bold tracking-widest uppercase">{settings.kopLine2}</div>}
               {settings?.kopLine3 && <div className="text-[10pt] mt-0.5">{settings.kopLine3}</div>}
               {settings?.kopLine4 && <div className="text-[10pt]">{settings.kopLine4}</div>}
            </div>
          </div>
          <div className="border-b border-black mb-6"></div>

          {/* DOCUMENT HEADER */}
          <div className="text-center mb-6 space-y-1">
            <h2 className="text-[12pt] font-bold uppercase">{customTitle}</h2>
            {customSubtitle && <p className="text-[12pt] font-bold">{customSubtitle}</p>}
          </div>

          {/* MAIN DOCUMENT BODY */}
          {printType === 'absen_global' || printType === 'absen_bidang' || printType === 'tanda_terima' ? (
            <table className="w-full border-collapse mb-10 text-[12pt] leading-tight">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 w-10 text-center font-bold align-middle">NO</th>
                  <th className="border border-black px-2 py-1 text-center font-bold align-middle">NAMA PEGAWAI</th>
                  <th className="border border-black px-2 py-1 w-10 text-center font-bold align-middle">JK</th>
                  <th className="border border-black px-2 py-1 w-44 text-center font-bold align-middle">NIP</th>
                  <th className="border border-black px-2 py-1 w-40 font-bold text-center align-middle">{printType === 'tanda_terima' ? 'TANDA TERIMA' : 'TANDA TANGAN'}</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.map((emp, idx) => (
                  <tr key={emp.id || idx} className="h-8">
                    <td className="border border-black px-2 py-1 text-center align-middle">{idx + 1}</td>
                    <td className="border border-black px-3 py-1 align-middle">
                      <div className="text-[11pt] leading-none">{emp.nama}</div>
                    </td>
                    <td className="border border-black px-1 py-1 text-center align-middle text-[11pt]">{emp.jk || '-'}</td>
                    <td className="border border-black px-2 py-1 align-middle text-center">
                      <div className="text-[11pt] leading-none">{emp.nip || '-'}</div>
                    </td>
                    <td className="border border-black px-2 py-1 align-middle">
                      {/* Odd rows left aligned, Even rows indented slightly space for TTD */}
                      <div className={`text-[11pt] font-semibold ${idx % 2 === 0 ? 'text-left pl-1' : 'text-left pl-10'}`}>
                        {idx + 1}.
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedEmployees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-black px-4 py-6 text-center italic text-gray-500 text-[12pt]">
                      Tidak ada data pegawai yang sesuai untuk dicetak.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center border-2 border-dashed border-slate-300 rounded-xl mb-10 print-hidden">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-500">Modul Cetak Belum Tersedia</h3>
              <p className="text-slate-400 max-w-md mx-auto mt-2">
                Modul untuk mencetak <strong>{customTitle}</strong> saat ini sedang dalam tahap pengembangan (WIP) dan belum dapat digunakan.
              </p>
            </div>
          )}

          {/* SIGNATURE SECTION */}
          <div className="flex justify-end mt-12 pr-8 page-break-inside-avoid">
            <div className="text-left min-w-[200px] max-w-[350px]">
              <p className="text-[12pt] mb-1">
                Jember, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-[12pt] mb-20 leading-snug">
                {kadisTitle}
              </p>
              
              <p className="text-[12pt] font-bold underline whitespace-nowrap">{ttdName}</p>
              <p className="text-[12pt] whitespace-nowrap">{ttdPangkat}</p>
              <p className="text-[12pt] mt-0.5 whitespace-nowrap">
                NIP. {ttdNip}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        @media print {
          body {
            background-color: white !important;
          }
          .print-hidden {
            display: none !important;
          }
          .page-break-inside-avoid {
             page-break-inside: avoid;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}} />
    </div>
  );
}
