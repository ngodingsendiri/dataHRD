export interface FamilyMember {
  name: string;
  relation: 'Istri' | 'Suami' | 'Anak';
  birthDate?: string;
  occupation?: string;
}

export interface Employee {
  id?: string;
  nik: string;
  nama: string;
  nip: string;
  pangkatGolongan: string;
  jabatan: string;
  bidang: string;
  status: 'PNS' | 'PPPK' | 'Honorer' | 'Lainnya';
  tmtKerja: string;
  masaKerja: string;
  pendidikan: string;
  agama: string;
  alamatLengkap: string;
  nomorHp: string;
  dataKeluarga: FamilyMember[];
  atasanLangsung: string;
  pejabatWewenang: string;
  createdAt?: number;
  updatedAt?: number;
}
