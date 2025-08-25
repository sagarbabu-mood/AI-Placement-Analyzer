import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { StudentProfile, PlacementInfo } from "../types";

const singleStudentSchema = {
    type: Type.OBJECT,
    properties: {
        placedRole: {
            type: Type.STRING,
            description: "The job title of the first full-time role after graduation. Should be 'N/A' if not found.",
        },
        placedCompany: {
            type: Type.STRING,
            description: "The company name of the first full-time role after graduation. Should be 'N/A' if not found.",
        },
        estimatedSalary: {
            type: Type.STRING,
            description: "Estimated annual salary in INR (e.g., '₹8,00,000 - ₹10,00,000 LPA'). This is MANDATORY if a job is found.",
        },
    },
    required: ["placedRole", "placedCompany", "estimatedSalary"],
};

const batchSchema = {
    type: Type.ARRAY,
    items: singleStudentSchema,
};


export const analyzeStudentPlacementsBatch = async (students: StudentProfile[], apiKey: string): Promise<PlacementInfo[]> => {
    if (!apiKey) {
        console.error("API Key is missing for analyzeStudentPlacementsBatch call.");
        return students.map(() => ({
            placedRole: "Error",
            placedCompany: "Missing API Key",
            estimatedSalary: "Error",
        }));
    }
    
    const ai = new GoogleGenAI({ apiKey });

    const studentsForPrompt = students.map(s => {
        const profile: {[key: string]: any} = {
            first_name: s.first_name,
            last_name: s.last_name,
            headline: s.headline,
            education_date_1: s.education_date_1,
        };
        Object.keys(s).forEach(key => {
            if (key.startsWith('experience_')) {
                profile[key] = s[key];
            }
        });
        return profile;
    });

    const prompt = `
        You are an expert HR and recruitment analyst. Your task is to analyze a list of student profiles and determine their first professional, full-time job after graduation for each one.

        Here is the list of students in JSON format:
        ${JSON.stringify(studentsForPrompt, null, 2)}

        For each student, analyze their 'experience' fields (e.g., experience_title_0, experience_company_0, experience_from_0). Identify the first job where the start date ('experience_from_n') is after or during their graduation year ('education_date_1').

        CRITICAL INSTRUCTIONS FOR EACH STUDENT:
        - You MUST IGNORE any roles that are clearly internships (e.g., title contains 'Intern', 'Trainee').
        - You MUST IGNORE roles that are part of college activities or student organizations (e.g., 'Club President', 'Microsoft Learn Student Ambassador').
        - You MUST IGNORE freelance roles or apprenticeships.
        - Focus only on finding the first corporate, full-time position.
        - The start date format is MM-YYYY. Compare this to the graduation year. A job starting in 01-YYYY is post-graduation.

        Based on your analysis, you MUST return a JSON array where each object corresponds to a student in the input array, in the same order. Each object must follow the specified schema.

        - If no suitable post-graduation, full-time role is found for a student, return an object with "N/A" for all three fields for that student.
        - If you identify a 'placedRole' and 'placedCompany', you MUST provide a realistic 'estimatedSalary' in INR for an entry-level position in India. DO NOT return "N/A" for salary if a job is found.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: batchSchema,
                temperature: 0.1,
            },
        });

        const jsonString = response.text.trim();
        const results = JSON.parse(jsonString) as PlacementInfo[];
        
        if (results.length !== students.length) {
            throw new Error(`API returned ${results.length} results for a batch of ${students.length}.`);
        }
        
        return results.map(r => ({
            placedRole: r.placedRole || "N/A",
            placedCompany: r.placedCompany || "N/A",
            estimatedSalary: r.estimatedSalary || "N/A",
        }));

    } catch (error: any) {
        console.error("Gemini API call failed:", error);
        const errorResult: PlacementInfo = {
            placedRole: "API Error",
            placedCompany: "API Error",
            estimatedSalary: "API Error",
        };
        if (error.message && (error.message.includes('API key not valid') || error.status === 400)) {
             errorResult.placedCompany = "Invalid API Key";
        }
        return students.map(() => errorResult);
    }
};
