export interface FamilyMember {
  name: string;
  relation: 'Istri' | 'Suami' | 'Anak';
  birthDate?: string;
  marriageDate?: string;
  occupation?: string;
  description?: string;
}

export interface Employee {
  id?: string;
  nik: string;
  nama: string;
  nip: string;
  jk: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string;
  jalanDusun: string;
  rt: string;
  rw: string;
  desaKelurahan: string;
  kecamatan: string;
  kabupaten: string;
  kelasJabatan: string;
  bebanKerja: string;
  tmtKerja: string;
  masaKerja: string;
  pensiun: string;
  tmtGolonganRuang: string;
  pangkat: string;
  gol: string;
  pangkatGolongan: string;
  tanggalBerkalaTerakhir: string;
  gajiPokok: string;
  besaranGajiKotor: string;
  jabatan: string;
  bidang: string;
  status: 'PNS' | 'PPPK' | 'Honorer' | 'Lainnya';
  nomorKarpeg: string;
  pendidikan: string;
  jurusan: string;
  diklatJenjang: string;
  tahunDiklat: string;
  statusKawin: string;
  agama: string;
  nomorHp: string;
  sisaCutiN: string;
  sisaCutiN1: string;
  sisaCutiN2: string;
  atasanLangsung: string;
  nipAtasanLangsung: string;
  pejabatWewenang: string;
  nipPejabatWewenang: string;
  skTerakhir: string;
  jumlahTertanggung: number;
  dataKeluarga: FamilyMember[];
  createdAt?: number;
  updatedAt?: number;
}
