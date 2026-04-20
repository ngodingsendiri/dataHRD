import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppSettings } from '../types';
import { Save, Loader2, ShieldCheck, Image as ImageIcon, Upload, X } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    sekdaNama: '',
    sekdaNip: '',
    bupatiNama: '',
    kopLine1: '',
    kopLine2: '',
    kopLine3: '',
    kopLine4: '',
    logoBase64: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, 'shared/data/settings/app');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as AppSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit check
      setMessage({ type: 'error', text: 'Ukuran logo tidak boleh lebih dari 1MB' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSettings(prev => ({ ...prev, logoBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setSettings(prev => ({ ...prev, logoBase64: '' }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, 'shared/data/settings/app'), settings);
      setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-12 antialiased">
      <div className="border-b border-slate-100 pb-8">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Pengaturan Aplikasi</h1>
        <p className="mt-1 text-sm text-slate-500">Konfigurasi identitas pejabat daerah untuk sistem laporan dan dokumen.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">Identitas Pejabat Utama</h2>
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          
          <div className="p-8 space-y-10">
            {/* Sekda Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-slate-100" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] whitespace-nowrap">Sekretaris Daerah</span>
                <div className="h-[1px] flex-1 bg-slate-100" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nama Lengkap</label>
                  <input
                    type="text"
                    className="block w-full px-4 py-2 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                    value={settings.sekdaNama}
                    onChange={(e) => setSettings({ ...settings, sekdaNama: e.target.value })}
                    placeholder="Masukkan nama lengkap..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">NIP Pegawai</label>
                  <input
                    type="text"
                    className="block w-full px-4 py-2 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono"
                    value={settings.sekdaNip}
                    onChange={(e) => setSettings({ ...settings, sekdaNip: e.target.value })}
                    placeholder="19xxxxxxxxxxxxxx"
                  />
                </div>
              </div>
            </div>

            {/* Bupati Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-slate-100" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] whitespace-nowrap">Kepala Daerah</span>
                <div className="h-[1px] flex-1 bg-slate-100" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nama Bupati</label>
                  <input
                    type="text"
                    className="block w-full px-4 py-2 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                    value={settings.bupatiNama}
                    onChange={(e) => setSettings({ ...settings, bupatiNama: e.target.value })}
                    placeholder="Masukkan nama bupati..."
                  />
                </div>
              </div>
            </div>

            {/* Print & KOP Section */}
            <div className="space-y-6 pt-6">
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-slate-100" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] whitespace-nowrap">Konfigurasi KOP & Cetak Dokumen</span>
                <div className="h-[1px] flex-1 bg-slate-100" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Kop Text Inputs */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Baris KOP 1 (Opsional)</label>
                    <input
                      type="text"
                      className="block w-full px-4 py-2 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-center"
                      value={settings.kopLine1 || ''}
                      onChange={(e) => setSettings({ ...settings, kopLine1: e.target.value })}
                      placeholder="PEMERINTAH KOTA BANDUNG"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Baris KOP 2 (Opsional)</label>
                    <input
                      type="text"
                      className="block w-full px-4 py-2 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-center text-lg"
                      value={settings.kopLine2 || ''}
                      onChange={(e) => setSettings({ ...settings, kopLine2: e.target.value })}
                      placeholder="DINAS KESEHATAN"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Baris KOP 3 (Opsional)</label>
                    <input
                      type="text"
                      className="block w-full px-4 py-2 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-center"
                      value={settings.kopLine3 || ''}
                      onChange={(e) => setSettings({ ...settings, kopLine3: e.target.value })}
                      placeholder="Jalan Sukajadi No. 123"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Baris KOP 4 (Opsional)</label>
                    <input
                      type="text"
                      className="block w-full px-4 py-2 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-center"
                      value={settings.kopLine4 || ''}
                      onChange={(e) => setSettings({ ...settings, kopLine4: e.target.value })}
                      placeholder="Telp (022) 123456 Kode Pos 40162"
                    />
                  </div>
                </div>

                {/* Logo Upload Box */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Logo Instansi</label>
                  <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden relative group h-[275px] flex flex-col items-center justify-center p-6 border-dashed">
                    {settings.logoBase64 ? (
                      <>
                        <img 
                          src={settings.logoBase64} 
                          alt="Logo Instansi" 
                          className="max-h-full max-w-full object-contain drop-shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute top-4 right-4 p-2 bg-white text-red-600 rounded drop-shadow hover:bg-slate-100 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-slate-400 flex flex-col items-center">
                        <ImageIcon className="w-10 h-10 mb-3 text-slate-300" />
                        <span className="text-sm font-semibold text-slate-500">Pilih Logo Berkas</span>
                        <span className="text-xs mt-1">PNG, JPG, SVG max 1MB</span>
                      </div>
                    )}
                    
                    {!settings.logoBase64 && (
                      <label className="absolute inset-0 cursor-pointer flex items-center justify-center">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <div className="h-8">
              {message && (
                <div className={`text-[11px] font-bold flex items-center gap-2 ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                  <div className={`w-1 h-1 rounded-full ${message.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`} />
                  {message.text}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-8 py-2.5 text-[12px] font-bold text-white bg-slate-900 rounded hover:bg-slate-800 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-2" />
              )}
              Simpan Konfigurasi
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
