import { StorageProvider } from './StorageProvider';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class LocalDiskProvider implements StorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'public', 'uploads');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Ensure directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<{ url: string; key: string }> {
    const ext = path.extname(originalName) || this.getExtensionFromMime(mimeType);
    const key = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(this.uploadDir, key);

    await fs.promises.writeFile(filePath, fileBuffer);

    return {
      url: this.getUrl(key),
      key
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/uploads/${key}`;
  }

  private getExtensionFromMime(mime: string): string {
    switch (mime) {
      case 'image/jpeg': return '.jpg';
      case 'image/png': return '.png';
      case 'image/webp': return '.webp';
      case 'image/gif': return '.gif';
      case 'video/mp4': return '.mp4';
      default: return '';
    }
  }
}
