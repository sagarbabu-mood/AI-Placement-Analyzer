
import { GoogleGenAI, Type } from "@google/genai";
import { StudentProfile, PlacementInfo, ProcessedStudentProfile } from "../types";

const placementInfoSchema = {
    type: Type.OBJECT,
    properties: {
        placedRole: { type: Type.STRING, description: "The specific job title. Should be 'Not Placed' if no suitable role is found." },
        placedCompany: { type: Type.STRING, description: "The name of the company. Should be 'Not Placed' if no role is found." },
        estimatedSalary: { type: Type.STRING, description: "The researched salary range in LPA (e.g., '8-10 LPA'). Should be 'N/A' if not placed." },
        salaryJustification: { type: Type.STRING, description: "A brief justification for the salary research, considering company tier, location, role, and college reputation. E.g., 'Tier-1 tech company in a major metro for a Tier-1 college grad'. Should be 'N/A' if not placed." },
        salaryConfidence: { type: Type.STRING, description: "Confidence in the research ('High', 'Medium', 'Low') based on available data. Should be 'N/A' if not placed." },
    },
    required: ["placedRole", "placedCompany", "estimatedSalary", "salaryJustification", "salaryConfidence"],
};

const batchSchema = {
    type: Type.ARRAY,
    items: placementInfoSchema
};


export const analyzeStudentPlacementsBatch = async (
    students: StudentProfile[], 
    apiKey: string, 
    collegeName?: string
): Promise<PlacementInfo[]> => {
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
            location: s.location ?? 'N/A',
            industry: s.industry ?? 'N/A',
            education: s.education_school_1 ?? 'N/A',
            graduation_date: s.education_date_1 ?? 'N/A',
            experiences: experiences,
        };
    }), null, 2);

    const collegeContext = collegeName 
        ? `The students are from: ${collegeName}. Consider the college's reputation (e.g., Tier-1, Tier-2, Tier-3) as a key factor in your analysis.`
        : `The college name was not provided. Analyze based on the student's individual profile.`;

    const prompt = `
        You are an expert recruitment analyst specializing in tech and graduate placements in India. Your task is to perform a deep-dive analysis on the following student profiles.
        ${collegeContext}
        Analyze the following array of student profiles. For each student, identify their first full-time post-graduation job.
        
        IMPORTANT RULES for PLACEMENT IDENTIFICATION:
        1.  IGNORE internships, freelance work, contract roles, or trainee positions. Focus ONLY on the first permanent, full-time role after their graduation date.
        2.  If no suitable full-time role is found, set placedRole and placedCompany to 'Not Placed' and all salary-related fields to 'N/A'.

        IMPORTANT RULES for SALARY RESEARCH (DEEP DIVE):
        3.  For each placed student, research and provide a likely salary range in Lakhs Per Annum (LPA).
        4.  Your research MUST be based on a combination of factors: the company's reputation and tier (e.g., top product-based, service-based, startup), the job location (e.g., Bangalore and Hyderabad pay more than smaller cities), the specific job role, and the reputation of their college if provided.
        5.  Provide a brief justification for your salary research, explaining the factors you considered (e.g., 'Tier-1 tech company in a major metro for a Tier-1 college graduate').
        6.  State your confidence level ('High', 'Medium', 'Low') in the salary research. Confidence is 'High' for well-known companies in major cities, and 'Low' for obscure companies or missing location data.

        OUTPUT FORMAT:
        7.  Return the output as a JSON array that strictly matches the provided schema. The array must have the same number of objects as the input array of students, in the same order.
        
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
            return students.map(() => ({ placedRole: 'Error', placedCompany: 'AI Response Error', estimatedSalary: 'Error', salaryJustification: 'N/A', salaryConfidence: 'N/A' }));
        }
        
        const placements = JSON.parse(jsonText);

        // Ensure the output is an array of the correct length
        if (Array.isArray(placements) && placements.length === students.length) {
            return placements;
        } else {
            console.error("AI response mismatch:", placements);
            // Return an array of errors if the structure is wrong
            return students.map(() => ({ placedRole: 'Error', placedCompany: 'AI Format Error', estimatedSalary: 'Error', salaryJustification: 'N/A', salaryConfidence: 'N/A' }));
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Throw the error so the UI can catch it.
        throw error;
    }
};

export const parseSalaryToLPA = (salary: string): number | null => {
    if (!salary || typeof salary !== 'string' || salary.toLowerCase().trim() === 'n/a') {
        return null;
    }

    // This regex extracts all floating-point or integer numbers from the string.
    const numbers = salary.match(/\d+\.?\d*/g);

    if (!numbers) {
        return null; // No numbers found in the string.
    }

    // Convert found string numbers to actual numbers.
    const parsedNumbers = numbers.map(parseFloat);

    if (parsedNumbers.length === 0) {
        return null;
    }
    
    if (parsedNumbers.length === 1) {
        return parsedNumbers[0]; // A single salary number was found.
    }
    
    // If multiple numbers are found (e.g., in a range "8-10 LPA"),
    // we take the first two and calculate their average.
    if (parsedNumbers.length >= 2) {
        return (parsedNumbers[0] + parsedNumbers[1]) / 2;
    }

    return null; // Should not be reached, but good for safety.
};


export const calculatePlacementStats = (data: ProcessedStudentProfile[]) => {
    const placedStudents = data.filter(p => 
        p.placedCompany && 
        p.placedCompany.toLowerCase().trim() !== 'not placed' && 
        p.placedCompany.toLowerCase().trim() !== 'n/a'
    );
    const totalStudents = data.length;
    const totalPlaced = placedStudents.length;
    const placementRate = totalStudents > 0 ? ((totalPlaced / totalStudents) * 100).toFixed(1) : '0.0';

    const companyDetails = placedStudents.reduce((acc, student) => {
        const company = student.placedCompany?.trim();
        if (company) {
            if (!acc[company]) {
                acc[company] = { hires: 0, salaries: [] };
            }
            acc[company].hires++;
            const lpa = parseSalaryToLPA(student.estimatedSalary);
            if (lpa !== null) {
                acc[company].salaries.push(lpa);
            }
        }
        return acc;
    }, {} as Record<string, { hires: number; salaries: number[] }>);

    const allRecruiters = Object.entries(companyDetails)
        .map(([company, details]) => {
            let salaryDisplay = 'N/A';
            if (details.salaries.length > 0) {
                if (details.hires <= 5) {
                    salaryDisplay = details.salaries.join(', ') + ' LPA';
                } else {
                    const avgSalary = details.salaries.reduce((sum, s) => sum + s, 0) / details.salaries.length;
                    salaryDisplay = `Avg. ${avgSalary.toFixed(1)} LPA`;
                }
            }
            return [company, details.hires, salaryDisplay] as [string, number, string];
        })
        .sort((a, b) => b[1] - a[1]);

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

    const recruitersTable = stats.allRecruiters.map(([company, hires, salary]) => `| ${company} | ${hires} | ${salary} |`).join('\n');
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
        (Provide a brief introductory sentence. The 'Salary Offered' column shows individual salaries for companies hiring 5 or fewer students, and the average salary for companies hiring more than 5.)
        
        **All Recruiting Companies:**
        | Company | Number of Hires | Salary Offered (LPA) |
        |---|---|---|
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
