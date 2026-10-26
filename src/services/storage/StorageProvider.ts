export interface StorageProvider {
  /**
   * Uploads a file buffer and returns the public URL and key.
   */
  upload(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<{ url: string; key: string }>;

  /**
   * Deletes a file by its storage key.
   */
  delete(key: string): Promise<void>;

  /**
   * Gets the public URL for a given storage key.
   */
  getUrl(key: string): string;
}
