
import { GoogleGenAI, Type } from "@google/genai";
import { StudentProfile, PlacementInfo, ProcessedStudentProfile } from "../types";

const placementInfoSchema = {
    type: Type.OBJECT,
    properties: {
        placedRole: { type: Type.STRING, description: "The specific job title. Should be 'Not Placed' if no suitable role is found." },
        placedCompany: { type: Type.STRING, description: "The name of the company. Should be 'Not Placed' if no role is found." },
        estimatedSalary: { type: Type.STRING, description: "A realistic salary range in LPA (e.g., '8-10 LPA'). Should be 'N/A' if not placed." },
    },
    required: ["placedRole", "placedCompany", "estimatedSalary"],
};

const batchSchema = {
    type: Type.ARRAY,
    items: placementInfoSchema
};


export const analyzeStudentPlacementsBatch = async (students: StudentProfile[], apiKey: string): Promise<PlacementInfo[]> => {
    if (!apiKey) {
        throw new Error("API Key is missing. Please set it in the settings.");
    }
    const ai = new GoogleGenAI({ apiKey });

    // Stringify student data for the prompt
    const studentDataString = JSON.stringify(students.map(s => {
        // Create a concise profile for the prompt
        const experiences = [];
        for (let i = 0; i < 5; i++) { // Check for up to 5 experiences
            if (s[`experience_title_${i}`]) {
                experiences.push({
                    title: s[`experience_title_${i}`] ?? 'N/A',
                    company: s[`experience_company_${i}`] ?? 'N/A',
                    description: s[`experience_description_${i}`]?.substring(0, 150) ?? 'N/A',
                    from: s[`experience_from_${i}`] ?? 'N/A',
                    to: s[`experience_to_${i}`] ?? 'N/A',
                });
            }
        }
        return {
            name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(),
            headline: s.headline ?? 'N/A',
            education: s.education_school_1 ?? 'N/A',
            graduation_date: s.education_date_1 ?? 'N/A',
            experiences: experiences,
        };
    }), null, 2);

    const prompt = `
        Analyze the following array of student profiles. For each student, identify their first full-time post-graduation job.
        
        IMPORTANT RULES:
        1.  IGNORE internships, freelance work, contract roles, or trainee positions. Focus ONLY on the first permanent, full-time role after their graduation date.
        2.  If no suitable full-time role is found, set placedRole and placedCompany to 'Not Placed' and estimatedSalary to 'N/A'.
        3.  Provide a realistic salary estimate in Lakhs Per Annum (LPA) for the identified role.
        4.  Return the output as a JSON array that strictly matches the provided schema. The array must have the same number of objects as the input array of students, in the same order.
        
        Student Data:
        ${studentDataString}
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: batchSchema,
            },
        });
        
        const jsonText = response?.text?.trim();
        if (!jsonText) {
            console.error("AI response was empty or invalid.");
            return students.map(() => ({ placedRole: 'Error', placedCompany: 'AI Response Error', estimatedSalary: 'Error' }));
        }
        
        const placements = JSON.parse(jsonText);

        // Ensure the output is an array of the correct length
        if (Array.isArray(placements) && placements.length === students.length) {
            return placements;
        } else {
            console.error("AI response mismatch:", placements);
            // Return an array of errors if the structure is wrong
            return students.map(() => ({ placedRole: 'Error', placedCompany: 'AI Format Error', estimatedSalary: 'Error' }));
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Throw the error so the UI can catch it.
        throw error;
    }
};

export const parseSalaryToLPA = (salary: string): number | null => {
    if (!salary || typeof salary !== 'string') return null;

    const cleanedSalary = salary.toLowerCase().replace(/lpa|lakhs|per annum/g, '').trim();
    
    // Case 1: Range (e.g., "8-10", "12 - 15")
    const rangeMatch = cleanedSalary.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (rangeMatch) {
        const lower = parseFloat(rangeMatch[1]);
        const upper = parseFloat(rangeMatch[2]);
        return (lower + upper) / 2; // Return the average of the range
    }

    // Case 2: Single number (e.g., "15", "5.5")
    const singleMatch = cleanedSalary.match(/^(\d+\.?\d*)$/);
    if (singleMatch) {
        return parseFloat(singleMatch[1]);
    }

    return null; // Return null if parsing fails
};


export const calculatePlacementStats = (data: ProcessedStudentProfile[]) => {
    const placedStudents = data.filter(p => p.placedCompany && p.placedCompany.toLowerCase() !== 'not placed');
    const totalStudents = data.length;
    const totalPlaced = placedStudents.length;
    const placementRate = totalStudents > 0 ? ((totalPlaced / totalStudents) * 100).toFixed(1) : '0.0';

    const companyCounts = placedStudents.reduce((acc, student) => {
        const company = student.placedCompany?.trim();
        if (company) {
             acc[company] = (acc[company] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const allRecruiters = Object.entries(companyCounts).sort(([, a], [, b]) => b - a);
    const uniqueCompaniesCount = allRecruiters.length;

    const salaryBrackets = {
        'Below 3 LPA': 0,
        '3-5 LPA': 0,
        '5-8 LPA': 0,
        '8-12 LPA': 0,
        '12-18 LPA': 0,
        '18-25 LPA': 0,
        '25+ LPA': 0,
        'Not Disclosed': 0,
    };

    placedStudents.forEach(student => {
        const lpa = parseSalaryToLPA(student.estimatedSalary);
        if (lpa === null) {
            salaryBrackets['Not Disclosed']++;
        } else if (lpa < 3) {
            salaryBrackets['Below 3 LPA']++;
        } else if (lpa <= 5) {
            salaryBrackets['3-5 LPA']++;
        } else if (lpa <= 8) {
            salaryBrackets['5-8 LPA']++;
        } else if (lpa <= 12) {
            salaryBrackets['8-12 LPA']++;
        } else if (lpa <= 18) {
            salaryBrackets['12-18 LPA']++;
        } else if (lpa <= 25) {
            salaryBrackets['18-25 LPA']++;
        } else {
            salaryBrackets['25+ LPA']++;
        }
    });

    return {
        totalStudents,
        totalPlaced,
        placementRate,
        uniqueCompaniesCount,
        allRecruiters,
        salaryBrackets,
    };
};


export const generateCollegeReport = async (data: ProcessedStudentProfile[], apiKey: string): Promise<string> => {
    if (!apiKey) {
        throw new Error("API Key is missing. Please set it in the settings.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const stats = calculatePlacementStats(data);

    const recruitersTable = stats.allRecruiters.map(([company, hires]) => `| ${company} | ${hires} |`).join('\n');
    const salaryTable = Object.entries(stats.salaryBrackets).map(([bracket, count]) => `| ${bracket} | ${count} |`).join('\n');

    const prompt = `
        You are a professional placement report analyst. Based on the provided statistics, generate a comprehensive and well-structured college placement report in Markdown format.
        
        The report should be formal, insightful, and suitable for stakeholders like college management and potential students.
        
        Follow this structure precisely:
        
        # Placement Report: Executive Summary
        (Provide a brief, insightful paragraph summarizing the key takeaways from the placement season.)
        
        ## Key Placement Statistics
        (Present the following stats clearly. You can use a list or a table.)
        - Total Students Analyzed: ${stats.totalStudents}
        - Total Students Placed: ${stats.totalPlaced}
        - Placement Rate: ${stats.placementRate}%
        - Number of Companies Recruiting: ${stats.uniqueCompaniesCount}
        
        ## Recruiter Participation
        (Provide a brief introductory sentence, then present the full list of companies and the number of students they hired in a markdown table. Ensure the table is sorted with the company that hired the most at the top.)
        
        **All Recruiting Companies:**
        | Company | Number of Hires |
        |---|---|
        ${recruitersTable}
        
        ## Salary Insights
        (Provide a brief introductory sentence, then present the salary distribution in a markdown table.)
        
        **Salary Distribution:**
        | Salary Bracket (LPA) | Number of Students |
        |---|---|
        ${salaryTable}
        
        ## Concluding Remarks
        (Write a concluding paragraph summarizing the overall success of the placements and any potential areas for future focus.)
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        if (!response?.text) {
            throw new Error("Received an empty report from the AI service. This might be due to a network issue or content filter.");
        }
        return response.text;
    } catch (error) {
        console.error("Error generating college report:", error);
        throw error;
    }
};
