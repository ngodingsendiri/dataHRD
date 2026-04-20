import { GoogleGenAI, Type } from "@google/genai";
import { Employee } from "../types";

let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!aiClient) {
    // We use optional chaining and a fallback to avoid "process is not defined" errors in browser environments built without the env var
    const apiKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : '';
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. AI features might fail.");
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
  }
  return aiClient;
};

export const extractEmployeeDataFromText = async (textData: string): Promise<Partial<Employee>> => {
  const prompt = `
    Extract employee information from the provided text data (this is data parsed from an Excel/CSV file that didn't match the template).
    Map the extracted data to the following JSON structure. 
    If a field is not found, leave it as an empty string or null.
    For 'jk', use 'L' for Male and 'P' for Female.
    For 'status', use one of: 'PNS', 'PPPK', 'Honorer', 'Lainnya'.
    For dates, use YYYY-MM-DD format if possible.

    Data to extract from:
    ${textData}
  `;

  const response = await getAiClient().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nik: { type: Type.STRING },
          nama: { type: Type.STRING },
          nip: { type: Type.STRING },
          jk: { type: Type.STRING, enum: ["L", "P"] },
          tempatLahir: { type: Type.STRING },
          tanggalLahir: { type: Type.STRING },
          jalanDusun: { type: Type.STRING },
          rt: { type: Type.STRING },
          rw: { type: Type.STRING },
          desaKelurahan: { type: Type.STRING },
          kecamatan: { type: Type.STRING },
          kabupaten: { type: Type.STRING },
          jabatan: { type: Type.STRING },
          bidang: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["PNS", "PPPK", "Honorer", "Lainnya"] },
          nomorHp: { type: Type.STRING },
          agama: { type: Type.STRING },
          pendidikan: { type: Type.STRING },
          jurusan: { type: Type.STRING },
        },
      },
    },
  });

  try {
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error parsing AI response:", error);
    throw new Error("Gagal mengekstrak data dari teks.");
  }
};

export const extractEmployeeData = async (fileData: string, mimeType: string): Promise<Partial<Employee>> => {
  const prompt = `
    Extract employee information from the provided file (it could be an image of a KTP, an SK document, or an Excel/table screenshot).
    Map the extracted data to the following JSON structure. 
    If a field is not found, leave it as an empty string or null.
    For 'jk', use 'L' for Male and 'P' for Female.
    For 'status', use one of: 'PNS', 'PPPK', 'Honorer', 'Lainnya'.
    For dates, use YYYY-MM-DD format if possible.
  `;

  const response = await getAiClient().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: fileData,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nik: { type: Type.STRING },
          nama: { type: Type.STRING },
          nip: { type: Type.STRING },
          jk: { type: Type.STRING, enum: ["L", "P"] },
          tempatLahir: { type: Type.STRING },
          tanggalLahir: { type: Type.STRING },
          jalanDusun: { type: Type.STRING },
          rt: { type: Type.STRING },
          rw: { type: Type.STRING },
          desaKelurahan: { type: Type.STRING },
          kecamatan: { type: Type.STRING },
          kabupaten: { type: Type.STRING },
          jabatan: { type: Type.STRING },
          bidang: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["PNS", "PPPK", "Honorer", "Lainnya"] },
          nomorHp: { type: Type.STRING },
          agama: { type: Type.STRING },
          pendidikan: { type: Type.STRING },
          jurusan: { type: Type.STRING },
        },
      },
    },
  });

  try {
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error parsing AI response:", error);
    throw new Error("Gagal mengekstrak data dari file.");
  }
};

export const mapExcelColumnsWithAI = async (headers: string[]): Promise<Record<string, string>> => {
  const prompt = `
    I have an Excel file with the following column headers: [${headers.join(", ")}].
    I need to map these headers to the following internal field names for an employee management system:
    - nik (Nomor Induk Kependudukan / Identity Number - usually 16 digits)
    - nama (Full Name / Nama Lengkap)
    - nip (Nomor Induk Pegawai / Employee ID - usually 18 digits)
    - jk (Jenis Kelamin / Gender / L/P)
    - tempatLahir (Place of Birth)
    - tanggalLahir (Date of Birth)
    - jabatan (Position / Job Title)
    - bidang (Department / Division / Unit Kerja)
    - status (Employment Status: PNS, PPPK, Honorer)
    - nomorHp (Phone Number / No HP)
    - pendidikan (Education / Jenjang Pendidikan)
    - agama (Religion)
    - alamatLengkap (Full Address / Alamat)

    CRITICAL INSTRUCTIONS:
    1. Be extremely careful with NIK and NIP. They are different.
    2. "Nama" or "Nama Lengkap" must map to "nama".
    3. If a header is "No" or "No.", DO NOT map it to anything.
    4. Return ONLY a JSON object where the keys are the EXACT Excel headers from the list above and the values are the corresponding internal field names.
    5. If you are unsure, do not map that header.
  `;

  const response = await getAiClient().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error parsing AI mapping response:", error);
    return {};
  }
};
