import { create } from "zustand"

export interface UploadedAsset {
  id: string
  name: string
  url: string
  type: "image" | "logo"
  width: number
  height: number
  fileSize: number
  uploadedAt: string
}

interface UploadStore {
  assets: UploadedAsset[]
  isUploading: boolean

  addAsset: (asset: UploadedAsset) => void
  removeAsset: (id: string) => void
  setUploading: (uploading: boolean) => void
  clearAssets: () => void
}

export const useUploadStore = create<UploadStore>((set) => ({
  assets: [],
  isUploading: false,

  addAsset: (asset) =>
    set((state) => ({ assets: [...state.assets, asset] })),

  removeAsset: (id) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    })),

  setUploading: (uploading) => set({ isUploading: uploading }),
  clearAssets: () => set({ assets: [] }),
}))
