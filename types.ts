export interface StudentProfile {
    first_name: string;
    last_name: string;
    email?: string;
    location?: string;
    industry?: string;
    headline?: string;
    company?: string;
    linkedin_url?: string;
    resume?: string;
    education_school_1?: string;
    education_date_1?: string;
    notes?: string;
    [key: string]: string | undefined; // For dynamic experience fields like experience_title_0, etc.
}

export interface PlacementInfo {
    placedRole: string;
    placedCompany: string;
    estimatedSalary: string;
}

export type ProcessedStudentProfile = StudentProfile & PlacementInfo;

export interface CandidateList {
    _id: string;
    name: string;
    status: string;
    "Created Date": string;
    "Modified Date": string;
    account: string;
    "Created By": string;
}

export interface DailyAccessToken {
    token: string;
    user_id: string;
}

export interface CandidatePosition {
    company: string;
    title: string;
    from: string;
    to: string;
    description: string | null;
}

export interface CandidateSchool {
    name: string;
    degree: string;
    from: number;
    to: number;
}

export interface CandidateProfileSource {
    linkedin_profile: string;
    title: string;
    first_name: string;
    last_name: string;
    positions: CandidatePosition[];
    schools: CandidateSchool[];
    location: string;
    picture?: string;
}

export interface CandidateHit {
    _id: string;
    _source: CandidateProfileSource;
}

export interface CandidateSearchResult {
    hits: {
        total: {
            value: number;
        };
        hits: CandidateHit[];
    };
}
