import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee, AppSettings } from '../types';
import { Printer, Settings, Users, FileText, ChevronDown } from 'lucide-react';

type PrintType = 'absen_global' | 'absen_bidang' | 'tanda_terima';

export default function Print() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Print Configuration States
  const [printType, setPrintType] = useState<PrintType>('absen_global');
  const [customTitle, setCustomTitle] = useState('DAFTAR HADIR / ABSENSI');
  const [customSubtitle, setCustomSubtitle] = useState('KEGIATAN: .......................................');
  const [selectedBidang, setSelectedBidang] = useState<string>('Semua');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Settings
        const settingsDoc = await getDoc(doc(db, 'shared/data/settings/app'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as AppSettings);
        }

        // Fetch Employees
        const empSnapshot = await getDocs(collection(db, 'shared/data/employees'));
        const empData = empSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        // Sort by PangkatGolongan implicitly or by Name
        empData.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
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

  if (loading) {
    return <div className="flex justify-center items-center h-64">Memuat data cetak...</div>;
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
    <div className="max-w-7xl mx-auto space-y-8 pb-12 antialiased">
      {/* Control Panel (Hidden on Print) */}
      <div className="print-hidden space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Pusat Cetak Dokumen</h1>
            <p className="mt-1 text-sm text-slate-500">Sesuaikan konteks tabel dan pratinjau sebelum mencetak dokumen absensi atau daftar tanda terima.</p>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jenis Dokumen</label>
            <select 
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer"
              value={printType}
              onChange={(e) => {
                const type = e.target.value as PrintType;
                setPrintType(type);
                if (type === 'absen_global') setCustomTitle('DAFTAR HADIR / ABSENSI PEGAWAI');
                if (type === 'absen_bidang') setCustomTitle(`DAFTAR HADIR BIDANG ${selectedBidang === 'Semua' ? '...' : selectedBidang.toUpperCase()}`);
                if (type === 'tanda_terima') setCustomTitle('DAFTAR TANDA TERIMA ......................');
              }}
            >
              <option value="absen_global">Absensi Global (Semua Pegawai)</option>
              <option value="absen_bidang">Absensi Per-Bidang / Unit Kerja</option>
              <option value="tanda_terima">Lembar Tanda Terima</option>
            </select>
          </div>

          {printType === 'absen_bidang' && (
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pilih Bidang</label>
              <select 
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all cursor-pointer"
                value={selectedBidang}
                onChange={(e) => {
                  setSelectedBidang(e.target.value);
                  setCustomTitle(`DAFTAR HADIR BIDANG ${e.target.value.toUpperCase()}`);
                }}
              >
                <option value="Semua">Semua / Pilih Filter...</option>
                {getUniqueBidang().map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Judul / Konteks Dokumen (Bisa Diedit)</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </div>
          
          <div className="space-y-2 md:col-span-4">
             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sub-judul / Keterangan (Opsional)</label>
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
      <div className="bg-slate-100 p-8 rounded-xl border border-slate-200 overflow-x-auto print:p-0 print:bg-transparent print:border-none print:shadow-none print:-mx-4 print:overflow-visible">
        <div className="text-center mb-6 text-sm font-bold text-slate-400 tracking-widest uppercase print:hidden">
          — Area Pratinjau Cetak —
        </div>
        
        {/* Actual Print Paper Container */}
        <div 
          ref={printRef}
          className="bg-white mx-auto shadow-2xl print-container text-[12pt]"
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '10mm',
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
            <h2 className="text-[12pt] font-bold uppercase underline underline-offset-4">{customTitle}</h2>
            {customSubtitle && <p className="text-[12pt] font-bold">{customSubtitle}</p>}
          </div>

          {/* MAIN TABLE */}
          <table className="w-full border-collapse mb-10 text-[12pt] leading-tight">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-2 w-10 text-center font-bold align-middle">NO</th>
                <th className="border border-black px-2 py-2 text-center font-bold align-middle">NAMA PEGAWAI / NIP</th>
                <th className="border border-black px-2 py-2 w-12 text-center font-bold align-middle">L/P</th>
                <th className="border border-black px-2 py-2 text-center font-bold w-48 align-middle">JABATAN / GOLONGAN</th>
                <th className="border border-black px-2 py-2 w-40 font-bold text-center align-middle">{printType === 'tanda_terima' ? 'TANDA TERIMA' : 'TANDA TANGAN'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, idx) => (
                <tr key={emp.id || idx}>
                  <td className="border border-black px-2 py-2 text-center align-top">{idx + 1}</td>
                  <td className="border border-black px-3 py-2 align-top">
                    <div className="font-bold text-[12pt]">{emp.nama}</div>
                    <div className="text-[12pt] mt-1">NIP. {emp.nip || '-'}</div>
                  </td>
                  <td className="border border-black px-2 py-2 text-center align-top text-[12pt]">{emp.jk || '-'}</td>
                  <td className="border border-black px-3 py-2 align-top">
                    <div className="text-[12pt]">{emp.jabatan || '-'}</div>
                    <div className="text-[12pt] mt-1">{emp.pangkatGolongan || ''}</div>
                  </td>
                  <td className="border border-black px-3 py-2 align-top relative">
                    {/* Odd rows left aligned, Even rows right aligned signature line */}
                    <div className={`text-[12pt] ${idx % 2 === 0 ? 'text-left' : 'text-center pl-8 whitespace-nowrap'}`}>
                      {idx + 1}. .....................
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={5} className="border border-black px-4 py-6 text-center italic text-gray-500 text-[12pt]">
                    Tidak ada data pegawai yang sesuai untuk dicetak.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

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
          margin: 10mm;
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
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `}} />
    </div>
  );
}
