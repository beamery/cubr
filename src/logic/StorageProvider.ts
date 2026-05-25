import type { SolveRecord, PenaltyType } from '../types_new';
import { GoogleDriveService } from './googleDrive';
import { parseSafeDate } from './dateUtils';

export class StorageProvider {
    private driveService: GoogleDriveService | null = null;
    private fileId: string | null = null;

    constructor(clientId?: string) {
        if (clientId) {
            this.driveService = new GoogleDriveService(clientId);
        }
    }

    async connectCloud(): Promise<void> {
        if (!this.driveService) return;
        await this.driveService.authenticate();
        this.fileId = await this.driveService.findOrCreateFile('Cubr_Main_3x3.csv');
    }

    async loadSolves(): Promise<SolveRecord[]> {
        // Load from LocalStorage first
        const local = localStorage.getItem('cubr_solves');
        let solves: SolveRecord[] = local ? JSON.parse(local) : [];
        
        // Ensure dates are actual Date objects
        solves = solves.map(s => ({ ...s, date: parseSafeDate(s.date) }));

        if (this.driveService && this.fileId) {
            const remoteContent = await this.driveService.readFile(this.fileId);
            const remoteSolves = this.parseCsv(remoteContent);
            
            // Merge logic: unique by timestamp (ID)
            const merged = this.mergeSolves(solves, remoteSolves);
            this.saveLocal(merged);
            return merged;
        }

        return solves;
    }

    async saveSolve(solve: SolveRecord): Promise<void> {
        const current = await this.loadSolves();
        const updated = [...current, solve];
        this.saveLocal(updated);

        if (this.driveService && this.fileId) {
            const csv = this.formatCsv(updated);
            await this.driveService.writeFile(this.fileId, csv);
        }
    }

    private saveLocal(solves: SolveRecord[]) {
        localStorage.setItem('cubr_solves', JSON.stringify(solves));
    }

    private mergeSolves(local: SolveRecord[], remote: SolveRecord[]): SolveRecord[] {
        const map = new Map<string, SolveRecord>();
        local.forEach(s => map.set(s.id, s));
        remote.forEach(s => map.set(s.id, s));
        return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    private parseCsv(content: string): SolveRecord[] {
        const lines = content.split('\n');
        const results: SolveRecord[] = [];
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',');
            if (parts.length < 5) continue;
            const timeMs = parseFloat(parts[0]) * 1000;
            const penalty = parts[1] as PenaltyType;
            const dateStr = parts[parts.length - 1];
            const scramble = parts[parts.length - 2];
            const date = parseSafeDate(dateStr);
            results.push({ id: date.getTime().toString(), timeMs, penalty, scramble, date });
        }
        return results;
    }

    private formatCsv(solves: SolveRecord[]): string {
        let csv = "Time,Penalty,Comment,Scramble,Date\n";
        solves.forEach(s => {
            csv += `${(s.timeMs / 1000).toFixed(3)},${s.penalty},${s.comment || ''},${s.scramble},${s.date.toISOString()}\n`;
        });
        return csv;
    }
}
