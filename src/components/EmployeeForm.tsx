import { useForm, useFieldArray } from 'react-hook-form';
import { Employee } from '../types';
import { Plus, Trash2 } from 'lucide-react';

interface EmployeeFormProps {
  initialData?: Employee;
  onSubmit: (data: Employee) => void;
  onCancel: () => void;
}

export function EmployeeForm({ initialData, onSubmit, onCancel }: EmployeeFormProps) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<Employee>({
    defaultValues: initialData || {
      nik: '', nama: '', nip: '', pangkatGolongan: '', jabatan: '', bidang: '',
      status: 'PNS', tmtKerja: '', masaKerja: '', pendidikan: '', agama: '',
      alamatLengkap: '', nomorHp: '', dataKeluarga: [], atasanLangsung: '', pejabatWewenang: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "dataKeluarga"
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <label className="text-sm font-medium">NIK</label>
          <input {...register('nik', { required: true })} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Nama Lengkap</label>
          <input {...register('nama', { required: true })} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">NIP</label>
          <input {...register('nip')} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Status Pegawai</label>
          <select {...register('status')} className="w-full p-2 border rounded-md">
            <option value="PNS">PNS</option>
            <option value="PPPK">PPPK</option>
            <option value="Honorer">Honorer</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Pangkat/Golongan</label>
          <input {...register('pangkatGolongan')} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Jabatan</label>
          <input {...register('jabatan')} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Bidang</label>
          <input {...register('bidang')} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">TMT Kerja</label>
          <input type="date" {...register('tmtKerja')} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Masa Kerja</label>
          <input {...register('masaKerja')} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Pendidikan Terakhir</label>
          <input {...register('pendidikan')} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Agama</label>
          <input {...register('agama')} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Nomor HP</label>
          <input {...register('nomorHp')} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">Alamat Lengkap</label>
          <textarea {...register('alamatLengkap')} className="w-full p-2 border rounded-md" rows={3} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Atasan Langsung</label>
          <input {...register('atasanLangsung')} className="w-full p-2 border rounded-md" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Pejabat Wewenang</label>
          <input {...register('pejabatWewenang')} className="w-full p-2 border rounded-md" />
        </div>
      </div>

      {/* Family Data */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Data Keluarga</h3>
          <button
            type="button"
            onClick={() => append({ name: '', relation: 'Istri', birthDate: '', occupation: '' })}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" /> Tambah Anggota
          </button>
        </div>
        
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-start p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-2 gap-4 flex-1">
                <input
                  {...register(`dataKeluarga.${index}.name` as const, { required: true })}
                  placeholder="Nama"
                  className="p-2 border rounded-md"
                />
                <select
                  {...register(`dataKeluarga.${index}.relation` as const)}
                  className="p-2 border rounded-md"
                >
                  <option value="Istri">Istri</option>
                  <option value="Suami">Suami</option>
                  <option value="Anak">Anak</option>
                </select>
                <input
                  type="date"
                  {...register(`dataKeluarga.${index}.birthDate` as const)}
                  className="p-2 border rounded-md"
                />
                <input
                  {...register(`dataKeluarga.${index}.occupation` as const)}
                  placeholder="Pekerjaan"
                  className="p-2 border rounded-md"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Simpan
        </button>
      </div>
    </form>
  );
}
