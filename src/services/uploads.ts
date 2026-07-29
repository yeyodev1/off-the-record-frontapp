import APIBase from './httpBase'

class UploadService extends APIBase {
  async uploadImage(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
      reader.readAsDataURL(file)
    })

    const response = await this.post<{ data: { url: string } }>('/uploads/cloudinary', { file: dataUrl, name: file.name })
    return response.data.data.url
  }
}

export const uploadService = new UploadService()
