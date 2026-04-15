// ── Security Service ────────────────────────────
import type { SecurityReport } from '@chorus/shared-types';
import { SecurityReportModel } from '../../db/models/SecurityReport.model';
import { scanSecurityQueue } from '../../queue/scanSecurity.queue';

export class SecurityService {
  async getReport(repoId: string): Promise<SecurityReport | null> {
    const report = await SecurityReportModel.findOne({ repoId });
    return report ? (report.toObject() as unknown as SecurityReport) : null;
  }

  async triggerScan(repoId: string, repoUrl: string, branch: string): Promise<string> {
    const job = await scanSecurityQueue.add('scan-security', { repoId, repoUrl, branch });
    return job.id!;
  }
}
