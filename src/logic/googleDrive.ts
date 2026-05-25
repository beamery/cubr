const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export class GoogleDriveService {
    private accessToken: string | null = null;
    private clientId: string;

    constructor(clientId: string) {
        this.clientId = clientId;
    }

    async authenticate(): Promise<string> {
        return new Promise((resolve, reject) => {
            // @ts-ignore
            const client = google.accounts.oauth2.initTokenClient({
                client_id: this.clientId,
                scope: SCOPES,
                callback: (response: any) => {
                    if (response.error) {
                        reject(response);
                    }
                    this.accessToken = response.access_token;
                    resolve(response.access_token);
                },
            });
            client.requestAccessToken();
        });
    }

    async findOrCreateFile(filename: string): Promise<string> {
        if (!this.accessToken) throw new Error('Not authenticated');

        // Search for file
        const searchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and trashed=false`,
            {
                headers: { Authorization: `Bearer ${this.accessToken}` }
            }
        );
        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0) {
            return searchData.files[0].id;
        }

        // Create file
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: filename,
                mimeType: 'text/csv'
            })
        });
        const createData = await createRes.json();
        return createData.id;
    }

    async readFile(fileId: string): Promise<string> {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });
        return await res.text();
    }

    async writeFile(fileId: string, content: string): Promise<void> {
        await fetch(`https://www.upload.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'text/csv'
            },
            body: content
        });
    }
}
