import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee } from '../types';
import { Modal } from '../components/Modal';
import { EmployeeForm } from '../components/EmployeeForm';
import { Plus, Search, Edit2, Trash2, Download, Upload, FileSpreadsheet, Sparkles, Loader2, Check, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { handleFirestoreError, OperationType } from '../lib/error';
import { extractEmployeeData, extractEmployeeDataFromText, mapExcelColumnsWithAI } from '../services/geminiService';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [error, setError] = useState<Error | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // AI Smart Scan States
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiExtractedData, setAiExtractedData] = useState<Partial<Employee> | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'shared/data/employees'), (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          // MAPPING SATU ARAH: Membaca data lama E-Office ke format baku SIMPEG
          // SIMPEG adalah Master Data, jadi struktur SIMPEG yang menjadi Source of Truth
          nama: d.nama || d.name || '',
          pangkatGolongan: d.pangkatGolongan || d.pangkatGol || '',
          nik: d.nik || '',
          nip: d.nip || '',
          status: d.status || '',
          jabatan: d.jabatan || '',
          bidang: d.bidang || '',
        };
      }) as Employee[];
      setEmployees(data);
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
    } catch (err) {
      try {
        handleFirestoreError(err, editingEmployee?.id ? OperationType.UPDATE : OperationType.CREATE, 'shared/data/employees');
      } catch (e) {
        if (e instanceof Error) setError(e);
      }
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setEmployeeToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await deleteDoc(doc(db, 'shared/data/employees', employeeToDelete));
      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `shared/data/employees/${employeeToDelete}`);
      } catch (e) {
        if (e instanceof Error) setError(e);
      }
    }
  };

  const handleAIScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAIProcessing(true);
    try {
      const isExcel = file.type.includes('spreadsheet') || 
                      file.type.includes('excel') || 
                      file.name.endsWith('.xlsx') || 
                      file.name.endsWith('.xls');

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          if (isExcel) {
            const data = event.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            // Send first 20 rows to AI to avoid token limits but give enough context
            const textData = JSON.stringify(json.slice(0, 20), null, 2);
            const extracted = await extractEmployeeDataFromText(textData);
            setAiExtractedData(extracted);
            setIsAIModalOpen(true);
          } else {
            const base64 = (event.target?.result as string).split(',')[1];
            const extracted = await extractEmployeeData(base64, file.type);
            setAiExtractedData(extracted);
            setIsAIModalOpen(true);
          }
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Gagal mengekstrak data'));
        } finally {
          setIsAIProcessing(false);
        }
      };

      if (isExcel) {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('AI Scan Error:', err);
      setError(err instanceof Error ? err : new Error('Gagal memproses file dengan AI'));
      setIsAIProcessing(false);
    }
    // Reset input
    if (aiFileInputRef.current) aiFileInputRef.current.value = '';
  };

  const handleConfirmAIUpdate = async () => {
    if (!aiExtractedData) return;

    try {
      // Sanitize status to match enum in rules
      let status = aiExtractedData.status || 'Lainnya';
      if (!['PNS', 'PPPK', 'Honorer', 'Lainnya'].includes(status)) {
        status = 'Lainnya';
      }

      const sanitizedData = {
        ...aiExtractedData,
        status: status as Employee['status'],
        updatedAt: Date.now()
      };

      // Check if employee already exists by NIK
      let existingId = '';
      if (aiExtractedData.nik) {
        const q = query(collection(db, 'shared/data/employees'), where('nik', '==', aiExtractedData.nik));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) existingId = snapshot.docs[0].id;
      }

      if (existingId) {
        // Update existing
        await updateDoc(doc(db, 'shared/data/employees', existingId), sanitizedData);
      } else {
        // Add new
        await addDoc(collection(db, 'shared/data/employees'), {
          ...sanitizedData,
          createdAt: Date.now(),
          dataKeluarga: []
        });
      }

      setIsAIModalOpen(false);
      setAiExtractedData(null);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, 'shared/data/employees');
      } catch (e) {
        if (e instanceof Error) setError(e);
      }
    }
  };

  const handleExport = () => {
    const exportData = employees.map(({ id, dataKeluarga, createdAt, updatedAt, ...rest }) => ({
      "N I P": rest.nip,
      "N I K": rest.nik,
      "Nama": rest.nama,
      "JK": rest.jk,
      "Tempat Lahir": rest.tempatLahir,
      "Tanggal Lahir": rest.tanggalLahir,
      "Jalan/Dusun": rest.jalanDusun,
      "RT": rest.rt,
      "RW": rest.rw,
      "Desa/Kelurahan": rest.desaKelurahan,
      "Kecamatan": rest.kecamatan,
      "Kabupaten": rest.kabupaten,
      "kelas jabatan": rest.kelasJabatan,
      "beban kerja": rest.bebanKerja,
      "TMT Kerja": rest.tmtKerja,
      "Masa Kerja": rest.masaKerja,
      "Pensiun": rest.pensiun,
      "TMT Golongan Ruang": rest.tmtGolonganRuang,
      "Pangkat": rest.pangkat,
      "Gol": rest.gol,
      "Tanggal Berkala Terakhir": rest.tanggalBerkalaTerakhir,
      "Gaji Pokok": rest.gajiPokok,
      "Besaran Gaji Kotor": rest.besaranGajiKotor,
      "Jabatan": rest.jabatan,
      "Bidang": rest.bidang,
      "Status": rest.status,
      "Nomor Karpeg": rest.nomorKarpeg,
      "Pendidikan": rest.pendidikan,
      "Jurusan": rest.jurusan,
      "Diklat Jenjang": rest.diklatJenjang,
      "Tahun Diklat": rest.tahunDiklat,
      "Status Kawin": rest.statusKawin,
      "Agama": rest.agama,
      "Nomo HP": rest.nomorHp,
      "Sisa Cuti Tahunan N": rest.sisaCutiN,
      "Sisa Cuti Tahunan N1": rest.sisaCutiN1,
      "Sisa Cuti Tahunan N2": rest.sisaCutiN2,
      "Atasan Langsung": rest.atasanLangsung,
      "NIP Atasan Langsung": rest.nipAtasanLangsung,
      "Pejabat Wewenang": rest.pejabatWewenang,
      "NIP Pejabat Wewenang": rest.nipPejabatWewenang,
      "SK Terakhir Yang Dimiliki": rest.skTerakhir,
      "Jumlah Tertanggung": rest.jumlahTertanggung
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pegawai");
    XLSX.writeFile(wb, "Data_Pegawai_Full.xlsx");
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "N I P", "N I K", "Nama", "JK", "Tempat Lahir", "Tanggal Lahir", 
      "Jalan/Dusun", "RT", "RW", "Desa/Kelurahan", "Kecamatan", "Kabupaten",
      "kelas jabatan", "beban kerja", "TMT Kerja", "Masa Kerja", "Pensiun",
      "TMT Golongan Ruang", "Pangkat", "Gol", "Tanggal Berkala Terakhir",
      "Gaji Pokok", "Besaran Gaji Kotor", "Jabatan", "Bidang", "Status",
      "Nomor Karpeg", "Pendidikan", "Jurusan", "Diklat Jenjang", "Tahun Diklat",
      "Status Kawin", "Agama", "Nomo HP", "Sisa Cuti Tahunan N", "Sisa Cuti Tahunan N1",
      "Sisa Cuti Tahunan N2", "Atasan Langsung", "NIP Atasan Langsung",
      "Pejabat Wewenang", "NIP Pejabat Wewenang", "SK Terakhir Yang Dimiliki",
      "Nama Istri/Suami", "Tanggal Lahir Pasangan", "Perkawinan Pasangan", "Pekerjaan Pasangan", "Keterangan Pasangan",
      "Nama Anak 1", "Tanggal Lahir Anak 1", "Perkawinan Anak 1", "Pekerjaan Anak 1", "Keterangan Anak 1",
      "Nama Anak 2", "Tanggal Lahir Anak 2", "Perkawinan Anak 2", "Pekerjaan Anak 2", "Keterangan Anak 2",
      "Nama Anak 3", "Tanggal Lahir Anak 3", "Perkawinan Anak 3", "Pekerjaan Anak 3", "Keterangan Anak 3",
      "Nama Anak 4", "Tanggal Lahir Anak 4", "Perkawinan Anak 4", "Pekerjaan Anak 4", "Keterangan Anak 4",
      "Nama Anak 5", "Tanggal Lahir Anak 5", "Perkawinan Anak 5", "Pekerjaan Anak 5", "Keterangan Anak 5",
      "Jumlah Tertanggung"
    ];

    const exampleData = [
      [
        "198301112001121002", "3509191101830005", "Regar Jeane Dealen Nangka, S.STP., M.Si.", "L", "Bondowoso", "11 Januari 1983",
        "Perum Muktisari Blok BF No. 6", "004", "003", "Tegal Besar", "Kaliwates", "Jember",
        "10", "Tinggi", "02 Januari 2026", "24 Tahun 4 Bulan", "2041-01-11",
        "01/10/2025", "Pembina Tk. I", "IV.b", "01/10/2025",
        "4.672.800", "7.236.979", "Kepala Dinas", "Sekretariat", "PNS",
        "L.066441", "S2", "Ilmu Pemerintahan", "PIM II", "2020",
        "Kawin", "Islam", "081252748226", "12", "0", "0",
        "Akhmad Helmi Luqman", "197001011990011001", "Muhammad Fawait", "197501011995011001", "SK Bupati No. 123",
        "Nama Pasangan", "1985-01-01", "2010-01-01", "Wiraswasta", "Aktif",
        "Anak Pertama", "2012-05-10", "-", "Sekolah", "Tertanggung",
        "Anak Kedua", "2017-08-20", "-", "Belum Sekolah", "Tertanggung",
        "", "", "", "", "",
        "", "", "", "", "",
        "", "", "", "", "",
        "2"
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_dataHRD");
    XLSX.writeFile(wb, "Template_Import_dataHRD_Full.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        let successCount = 0;

        if (rows.length === 0) throw new Error("File Excel kosong.");

        // Find header row and create mapping
        let headerIdx = -1;
        let colMap: Record<string, number> = {};
        
        // Search first 10 rows for headers
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const row = rows[i];
          if (row.some(c => {
            const s = String(c || '').toUpperCase();
            return s === 'NIP' || s === 'NIK' || s === 'NAMA LENGKAP' || s === 'N I P';
          })) {
            headerIdx = i;
            row.forEach((cell, idx) => {
              if (cell) colMap[String(cell).trim().toUpperCase()] = idx;
            });
            break;
          }
        }

        // Helper to get value by possible header names
        const getVal = (row: any[], names: string[]) => {
          for (const name of names) {
            const idx = colMap[name.toUpperCase()];
            if (idx !== undefined) return row[idx];
          }
          return undefined;
        };

        // Helper to convert Excel date number to string
        const excelDateToJSDate = (serial: any) => {
          if (typeof serial !== 'number') return String(serial || '').trim();
          if (serial < 10000) return String(serial).trim(); // Not a serial date
          const utc_days  = Math.floor(serial - 25569);
          const utc_value = utc_days * 86400;
          const date_info = new Date(utc_value * 1000);
          return date_info.toISOString().split('T')[0];
        };

        // If we found headers, we can use direct mapping
        if (headerIdx !== -1) {
          const dataRows = rows.slice(headerIdx + 1);
          setImportProgress({ current: 0, total: dataRows.length });

          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            setImportProgress({ current: i + 1, total: dataRows.length });
            
            if (!row || row.length < 2) continue;

            const nama = String(getVal(row, ['Nama Lengkap', 'Nama', 'NAMA']) || '').trim();
            const nik = String(getVal(row, ['NIK', 'N I K']) || '').trim();
            const nip = String(getVal(row, ['NIP', 'N I P']) || '').trim();

            if (!nama && !nik && !nip) continue;
            if (nama.toLowerCase().includes('nama lengkap')) continue;

            // Family Data Parsing
            const dataKeluarga: any[] = [];
            const spouseName = getVal(row, ['Nama Istri/Suami', 'Nama Pasangan']);
            if (spouseName && String(spouseName).trim()) {
              const jk = String(getVal(row, ['JK', 'Jenis Kelamin']) || '').toUpperCase();
              dataKeluarga.push({
                name: String(spouseName).trim(),
                relation: jk.includes('L') ? 'Istri' : 'Suami',
                birthDate: excelDateToJSDate(getVal(row, ['Tgl Lahir Pasangan', 'Tanggal Lahir Pasangan'])),
                marriageDate: excelDateToJSDate(getVal(row, ['Tgl Nikah', 'Tanggal Nikah'])),
                occupation: String(getVal(row, ['Pekerjaan Pasangan']) || '').trim(),
                description: String(getVal(row, ['Keterangan Pasangan']) || '').trim()
              });
            }

            // Children
            for (let c = 1; c <= 5; c++) {
              const cName = getVal(row, [`Nama Anak ${c}`]);
              if (cName && String(cName).trim()) {
                dataKeluarga.push({
                  name: String(cName).trim(),
                  relation: 'Anak',
                  birthDate: excelDateToJSDate(getVal(row, [`Tgl Lahir Anak ${c}`])),
                  marriageDate: excelDateToJSDate(getVal(row, [`Tgl Nikah Anak ${c}`])),
                  occupation: String(getVal(row, [`Pekerjaan Anak ${c}`]) || '').trim(),
                  description: String(getVal(row, [`Keterangan Anak ${c}`]) || '').trim()
                });
              }
            }

            let rawStatus = String(getVal(row, ['Status']) || 'Lainnya').toUpperCase();
            let status: Employee['status'] = 'Lainnya';
            if (rawStatus.includes('PNS') || rawStatus === 'CPNS') status = 'PNS';
            else if (rawStatus.includes('PPPK')) status = 'PPPK';
            else if (rawStatus.includes('HONORER')) status = 'Honorer';

            const employeeData: Partial<Employee> = {
              nip, nik, nama, 
              jk: String(getVal(row, ['JK', 'Jenis Kelamin']) || '').trim().toUpperCase().startsWith('L') ? 'L' : 'P',
              tempatLahir: String(getVal(row, ['Tempat Lahir']) || '').trim(),
              tanggalLahir: excelDateToJSDate(getVal(row, ['Tanggal Lahir', 'Tgl Lahir'])),
              jalanDusun: String(getVal(row, ['Jalan/Dusun', 'Alamat']) || '').trim(),
              rt: String(getVal(row, ['RT']) || '').trim(),
              rw: String(getVal(row, ['RW']) || '').trim(),
              desaKelurahan: String(getVal(row, ['Desa/Kelurahan']) || '').trim(),
              kecamatan: String(getVal(row, ['Kecamatan']) || '').trim(),
              kabupaten: String(getVal(row, ['Kabupaten']) || '').trim(),
              kelasJabatan: String(getVal(row, ['Kelas Jabatan']) || '').trim(),
              bebanKerja: String(getVal(row, ['Beban Kerja']) || '').trim(),
              tmtKerja: excelDateToJSDate(getVal(row, ['TMT Kerja'])),
              masaKerja: String(getVal(row, ['Masa Kerja']) || '').trim(),
              pensiun: excelDateToJSDate(getVal(row, ['Pensiun'])),
              tmtGolonganRuang: excelDateToJSDate(getVal(row, ['TMT Golongan Ruang'])),
              pangkat: String(getVal(row, ['Pangkat']) || '').trim(),
              gol: String(getVal(row, ['Gol']) || '').trim(),
              pangkatGolongan: `${getVal(row, ['Pangkat']) || ''} / ${getVal(row, ['Gol']) || ''}`.trim(),
              tanggalBerkalaTerakhir: excelDateToJSDate(getVal(row, ['Tanggal Berkala Terakhir'])),
              gajiPokok: String(getVal(row, ['Gaji Pokok']) || '').trim(),
              besaranGajiKotor: String(getVal(row, ['Besaran Gaji Kotor']) || '').trim(),
              jabatan: String(getVal(row, ['Jabatan']) || '').trim(),
              bidang: String(getVal(row, ['Bidang', 'Unit Kerja']) || '').trim(),
              status,
              nomorKarpeg: String(getVal(row, ['Nomor Karpeg']) || '').trim(),
              pendidikan: String(getVal(row, ['Pendidikan']) || '').trim(),
              jurusan: String(getVal(row, ['Jurusan']) || '').trim(),
              diklatJenjang: String(getVal(row, ['Diklat Jenjang']) || '').trim(),
              tahunDiklat: String(getVal(row, ['Tahun Diklat']) || '').trim(),
              statusKawin: String(getVal(row, ['Status Kawin']) || '').trim(),
              agama: String(getVal(row, ['Agama']) || '').trim(),
              nomorHp: String(getVal(row, ['Nomor HP', 'No HP']) || '').trim(),
              sisaCutiN: String(getVal(row, ['Sisa Cuti N']) || '').trim(),
              sisaCutiN1: String(getVal(row, ['Sisa Cuti N-1']) || '').trim(),
              sisaCutiN2: String(getVal(row, ['Sisa Cuti N-2']) || '').trim(),
              atasanLangsung: String(getVal(row, ['Atasan Langsung']) || '').trim(),
              nipAtasanLangsung: String(getVal(row, ['NIP Atasan Langsung']) || '').trim(),
              pejabatWewenang: String(getVal(row, ['Pejabat Wewenang']) || '').trim(),
              nipPejabatWewenang: String(getVal(row, ['NIP Pejabat Wewenang']) || '').trim(),
              skTerakhir: String(getVal(row, ['SK Terakhir']) || '').trim(),
              jumlahTertanggung: Number(getVal(row, ['Jumlah Tertanggung']) || 0),
              dataKeluarga,
            };

            try {
              await addDoc(collection(db, 'shared/data/employees'), {
                ...employeeData,
                createdAt: Date.now(),
                updatedAt: Date.now()
              });
              successCount++;
            } catch (err) {
              console.error("Error importing row:", err);
            }
          }
        } else {
          // AI SEMI-AUTO MAPPING (Fallback if no standard headers found)
          const rawHeaders = rows[0].map(h => String(h || '').trim());
          const validHeaders = rawHeaders.filter(h => h !== '');
          
          if (validHeaders.length === 0) throw new Error("File Excel tidak memiliki header yang valid.");
          
          const mapping = await mapExcelColumnsWithAI(validHeaders);
          if (!mapping || Object.keys(mapping).length === 0) {
            throw new Error("AI tidak dapat mengenali kolom di file Excel Anda.");
          }
          
          const dataRows = rows.slice(1);
          setImportProgress({ current: 0, total: dataRows.length });
          
          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            setImportProgress({ current: i + 1, total: dataRows.length });
            if (!row || row.length === 0) continue;

            const employeeData: any = {
              dataKeluarga: [],
              createdAt: Date.now(),
              updatedAt: Date.now()
            };

            rawHeaders.forEach((header, idx) => {
              const field = mapping[header];
              if (field && row[idx] !== undefined) {
                employeeData[field] = excelDateToJSDate(row[idx]);
              }
            });

            if (employeeData.nama || employeeData.nik || employeeData.nip) {
              try {
                await addDoc(collection(db, 'shared/data/employees'), employeeData);
                successCount++;
              } catch (err) {
                console.error("Error importing row with AI mapping:", err);
              }
            }
          }
        }
        
        alert(`Import selesai! Berhasil mengimpor ${successCount} data pegawai.`);
      } catch (err) {
        console.error("Import error:", err);
        alert("Gagal mengimport data. Pastikan format file benar.");
      } finally {
        setIsImporting(false);
        setImportProgress({ current: 0, total: 0 });
        e.target.value = ''; // Reset input
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    const nama = (emp.nama || '').toLowerCase();
    const nip = (emp.nip || '').toLowerCase();
    const nik = (emp.nik || '').toLowerCase();
    
    return nama.includes(searchLower) || nip.includes(searchLower) || nik.includes(searchLower);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Master Data Pegawai</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola data seluruh pegawai.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleDownloadTemplate}
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
            Download Template
          </button>
          
          <label className={`cursor-pointer inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-xl shadow-sm transition-all border
            ${isAIProcessing ? 'bg-slate-50 text-slate-400 border-slate-100' : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50'}`}>
            {isAIProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
            )}
            AI Smart Scan
            <input 
              type="file" 
              accept="image/*, .pdf, .xlsx, .xls" 
              className="hidden" 
              onChange={handleAIScan} 
              disabled={isAIProcessing}
              ref={aiFileInputRef}
            />
          </label>

          <label className="cursor-pointer inline-flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all">
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
          </label>
          <button 
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </button>
          <button 
            onClick={() => { setEditingEmployee(undefined); setIsModalOpen(true); }}
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-xl hover:bg-slate-800 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pegawai
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 sm:text-sm transition-all"
              placeholder="Cari berdasarkan Nama, NIP, atau NIK..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Tampilkan:</span>
            <select 
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value={10}>10 Baris</option>
              <option value={25}>25 Baris</option>
              <option value={50}>50 Baris</option>
              <option value={100}>100 Baris</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest w-10">No.</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Aksi</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Pegawai</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identitas</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jabatan & Unit</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pangkat / Pend.</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {filteredEmployees.slice(0, rowsPerPage).map((emp, index) => (
                <tr key={emp.id} className="group hover:bg-indigo-50/30 transition-all duration-150">
                  <td className="px-3 py-2.5 whitespace-nowrap text-[11px] font-semibold text-slate-400">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-0.5">
                      <button 
                        onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md border border-transparent hover:border-indigo-100 transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          alert(`Arsip data ${emp.nama}`);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-600 hover:bg-white rounded-md border border-transparent hover:border-amber-100 transition-all"
                        title="Arsip"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(emp.id!)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded-md border border-transparent hover:border-red-100 transition-all"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-[10px] border border-indigo-100/50 shrink-0">
                        {emp.nama ? emp.nama.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors leading-none">{emp.nama || '-'}</div>
                        <div className="text-[10px] font-medium text-slate-400 mt-1 tracking-tight">NIP: {emp.nip || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-[12px] text-slate-600 font-bold tracking-tight">{emp.nik || '-'}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] px-1 py-0 rounded-sm font-black uppercase border ${emp.jk === 'L' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-pink-50 text-pink-600 border-pink-100'}`}>
                        {emp.jk === 'L' ? 'Laki-laki' : emp.jk === 'P' ? 'Perempuan' : '-'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{emp.nomorHp || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-[12px] text-slate-800 font-bold max-w-[180px] truncate" title={emp.jabatan}>{emp.jabatan || '-'}</div>
                    <div className="text-[10px] text-indigo-500 mt-0.5 font-bold uppercase tracking-tighter">{emp.bidang || '-'}</div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-[12px] text-slate-700 font-bold">{emp.pangkatGolongan || '-'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 italic font-medium">{emp.pendidikan || '-'}</div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`px-2 py-0.5 inline-flex text-[9px] font-black uppercase tracking-tighter rounded border
                      ${emp.status === 'PNS' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        emp.status === 'PPPK' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 
                        emp.status === 'Honorer' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-slate-50 text-slate-700 border-slate-100'}`}>
                      {emp.status || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
                        <Search className="w-6 h-6 text-slate-300" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">Tidak ada data ditemukan</h3>
                      <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian Anda.</p>
                    </div>
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

      {/* AI Preview Modal */}
      <Modal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        title="Konfirmasi Hasil Scan AI"
      >
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-indigo-900">AI Berhasil Mengekstrak Data</h4>
              <p className="text-xs text-indigo-700 mt-1">
                Silakan tinjau data di bawah ini sebelum memperbarui database. Jika NIK sudah ada, data akan diperbarui secara otomatis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {aiExtractedData && Object.entries(aiExtractedData).map(([key, value]) => {
              if (key === 'dataKeluarga' || key === 'createdAt' || key === 'updatedAt' || !value) return null;
              return (
                <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <div className="text-sm font-medium text-slate-900">{String(value)}</div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsAIModalOpen(false)}
              className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmAIUpdate}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center"
            >
              <Check className="w-4 h-4 mr-2" />
              Konfirmasi & Simpan
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Progress Modal */}
      <Modal
        isOpen={isImporting}
        onClose={() => {}}
        title="Sedang Mengimport Data..."
      >
        <div className="py-8 flex flex-col items-center justify-center space-y-6">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
            <div 
              className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-indigo-600">
                {Math.round((importProgress.current / importProgress.total) * 100) || 0}%
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-slate-600 font-medium">Memproses baris ke-{importProgress.current} dari {importProgress.total}</p>
            <p className="text-slate-400 text-xs mt-1 italic">Mohon tunggu sebentar, jangan tutup halaman ini...</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus"
      >
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-red-900">Hapus Data Pegawai?</h4>
              <p className="text-xs text-red-700 mt-1">
                Tindakan ini tidak dapat dibatalkan. Semua data terkait pegawai ini akan dihapus secara permanen dari sistem.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center justify-center"
            >
              Ya, Hapus Data
            </button>
          </div>
        </div>
      </Modal>

      {/* Error Toast / Alert */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <div className="text-sm font-medium">{error.message}</div>
            <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
