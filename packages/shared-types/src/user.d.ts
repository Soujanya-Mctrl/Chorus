export interface User {
    id: string;
    githubId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    email?: string;
    skillProfile?: SkillProfile;
    createdAt: Date;
    updatedAt: Date;
}
export interface SkillProfile {
    userId: string;
    skillVector: SkillVector;
    experienceLevel: ExperienceLevel;
    topLanguages: Array<{
        language: string;
        proficiency: number;
    }>;
    topFrameworks: Array<{
        framework: string;
        proficiency: number;
    }>;
    contributionStats: {
        totalCommits: number;
        totalPRs: number;
        totalReviews: number;
        repositories: number;
    };
    generatedAt: Date;
}
export interface SkillVector {
    dimensions: Record<string, number>;
    magnitude: number;
}
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
//# sourceMappingURL=user.d.ts.map