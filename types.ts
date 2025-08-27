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
