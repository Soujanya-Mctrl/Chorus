export interface SecurityReport {
    id: string;
    repoId: string;
    vulnerabilities: Vulnerability[];
    secretFindings: SecretFinding[];
    licenseInfo: LicenseInfo[];
    overallRiskScore: number;
    generatedAt: Date;
}
export interface Vulnerability {
    id: string;
    cve?: CVE;
    packageName: string;
    packageVersion: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    fixAvailable: boolean;
    fixVersion?: string;
    references: string[];
}
export interface CVE {
    id: string;
    cvssScore: number;
    publishedAt: Date;
}
export interface SecretFinding {
    id: string;
    ruleId: string;
    filePath: string;
    line: number;
    description: string;
    severity: 'warning' | 'error';
    redactedMatch: string;
}
export interface LicenseInfo {
    packageName: string;
    license: string;
    isCompatible: boolean;
    riskLevel: 'none' | 'low' | 'medium' | 'high';
}
//# sourceMappingURL=security.d.ts.map