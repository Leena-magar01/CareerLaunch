import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  console.log("Starting rich seed...");
  await prisma.auditLog.deleteMany(); await prisma.notification.deleteMany();
  await prisma.pPO.deleteMany(); await prisma.completion.deleteMany();
  await prisma.evaluation.deleteMany(); await prisma.issue.deleteMany();
  await prisma.progressReport.deleteMany(); await prisma.mentorAssignment.deleteMany();
  await prisma.verification.deleteMany(); await prisma.offer.deleteMany();
  await prisma.application.deleteMany(); await prisma.internship.deleteMany();
  await prisma.project.deleteMany(); await prisma.certification.deleteMany();
  await prisma.studentSkill.deleteMany(); await prisma.experience.deleteMany();
  await prisma.studentProfile.deleteMany(); await prisma.companyProfile.deleteMany();
  await prisma.mentorProfile.deleteMany(); await prisma.document.deleteMany();
  await prisma.user.deleteMany();
  const pass = await bcrypt.hash("password123", 10);
  // TNP
  const tnpUser = await prisma.user.create({data:{email:"tnp@college.edu",passwordHash:pass,role:"TNP",status:"ACTIVE"}});
  // Mentors
  const mu1 = await prisma.user.create({data:{email:"mentor@college.edu",passwordHash:pass,role:"MENTOR",status:"ACTIVE"}});
  const m1 = await prisma.mentorProfile.create({data:{userId:mu1.id,fullName:"Dr. Rajesh Verma",department:"CSE",designation:"Associate Professor",maxCapacity:15}});
  const mu2 = await prisma.user.create({data:{email:"mentor2@college.edu",passwordHash:pass,role:"MENTOR",status:"ACTIVE"}});
  await prisma.mentorProfile.create({data:{userId:mu2.id,fullName:"Prof. Anita Desai",department:"IT",designation:"Assistant Professor",maxCapacity:12}});
  // Companies
  const cu1 = await prisma.user.create({data:{email:"recruiter@techcorp.com",passwordHash:pass,role:"COMPANY",status:"ACTIVE"}});
  const co1 = await prisma.companyProfile.create({data:{userId:cu1.id,name:"TechCorp Solutions",website:"https://techcorp.example.com",industry:"Information Technology",description:"Leading enterprise software solutions provider.",location:"Pune",contactName:"Neha Gupta",contactEmail:"recruiter@techcorp.com",verificationStatus:"VERIFIED"}});
  const cu2 = await prisma.user.create({data:{email:"careers@innovatelabs.io",passwordHash:pass,role:"COMPANY",status:"ACTIVE"}});
  const co2 = await prisma.companyProfile.create({data:{userId:cu2.id,name:"Innovate Labs",website:"https://innovatelabs.example.io",industry:"AI & Cloud Infrastructure",description:"Cutting-edge AI research lab.",location:"Bangalore",contactName:"Sanjay Kapoor",contactEmail:"careers@innovatelabs.io",verificationStatus:"VERIFIED"}});
  const cu3 = await prisma.user.create({data:{email:"hr@finbridge.in",passwordHash:pass,role:"COMPANY",status:"ACTIVE"}});
  const co3 = await prisma.companyProfile.create({data:{userId:cu3.id,name:"FinBridge Capital",website:"https://finbridge.example.in",industry:"FinTech",description:"Next-gen payments infrastructure.",location:"Mumbai",contactName:"Ritu Sharma",contactEmail:"hr@finbridge.in",verificationStatus:"VERIFIED"}});
  // Students
  const su1 = await prisma.user.create({data:{email:"student@college.edu",passwordHash:pass,role:"STUDENT",status:"ACTIVE"}});
  const s1 = await prisma.studentProfile.create({data:{userId:su1.id,studentCode:"STU-2026-001",fullName:"Rahul Sharma",department:"CSE",passingYear:2026,cgpa:8.85,backlogs:0,bio:"Full-stack engineer with Java, React, PostgreSQL background.",phone:"+91-9876543210",linkedinUrl:"https://linkedin.com/in/rahulsharma",githubUrl:"https://github.com/rahulsharma",preferredDomains:JSON.stringify(["Backend","Cloud"]),preferredMode:"HYBRID",profileStatus:"VERIFIED"}});
  await prisma.studentSkill.createMany({data:[{studentId:s1.id,skillName:"Java",proficiency:"ADVANCED"},{studentId:s1.id,skillName:"SQL",proficiency:"ADVANCED"},{studentId:s1.id,skillName:"React",proficiency:"INTERMEDIATE"},{studentId:s1.id,skillName:"Spring Boot",proficiency:"INTERMEDIATE"},{studentId:s1.id,skillName:"Docker",proficiency:"BEGINNER"}]});
  await prisma.project.create({data:{studentId:s1.id,title:"E-Commerce Microservices Backend",description:"Scalable REST APIs with Spring Boot, PostgreSQL, Docker. Handles 10k req/s.",technologies:"Java, Spring Boot, PostgreSQL, Docker",projectUrl:"https://github.com/rahulsharma/ecommerce-api"}});
  await prisma.certification.create({data:{studentId:s1.id,name:"Oracle Certified Associate Java SE",issuer:"Oracle",issueDate:"2025-06-15"}});
  await prisma.experience.create({data:{studentId:s1.id,company:"StartupXYZ",role:"Freelance Backend Dev",description:"Built REST APIs and integrated payment gateway.",startDate:"2025-01-01",endDate:"2025-05-31",isCurrent:false}});
  const su2 = await prisma.user.create({data:{email:"priya@college.edu",passwordHash:pass,role:"STUDENT",status:"ACTIVE"}});
  const s2 = await prisma.studentProfile.create({data:{userId:su2.id,studentCode:"STU-2026-002",fullName:"Priya Patel",department:"IT",passingYear:2026,cgpa:8.2,backlogs:0,bio:"Frontend developer focused on React and TypeScript.",linkedinUrl:"https://linkedin.com/in/priyapatel",githubUrl:"https://github.com/priyapatel",preferredDomains:JSON.stringify(["Frontend","UI/UX"]),preferredMode:"REMOTE",profileStatus:"VERIFIED"}});
  await prisma.studentSkill.createMany({data:[{studentId:s2.id,skillName:"React",proficiency:"ADVANCED"},{studentId:s2.id,skillName:"TypeScript",proficiency:"INTERMEDIATE"},{studentId:s2.id,skillName:"Figma",proficiency:"ADVANCED"},{studentId:s2.id,skillName:"SQL",proficiency:"INTERMEDIATE"}]});
  await prisma.project.create({data:{studentId:s2.id,title:"GradTrack Portfolio Builder",description:"React SPA for student portfolios. 500+ users.",technologies:"React, TypeScript, Tailwind, Firebase",projectUrl:"https://github.com/priyapatel/gradtrack"}});
  const su3 = await prisma.user.create({data:{email:"arjun@college.edu",passwordHash:pass,role:"STUDENT",status:"ACTIVE"}});
  const s3 = await prisma.studentProfile.create({data:{userId:su3.id,studentCode:"STU-2026-003",fullName:"Arjun Mehta",department:"CSE",passingYear:2026,cgpa:9.1,backlogs:0,bio:"ML researcher with NLP transformer publications.",linkedinUrl:"https://linkedin.com/in/arjunmehta",githubUrl:"https://github.com/arjunmehta",preferredDomains:JSON.stringify(["AI/ML","Data Science"]),preferredMode:"REMOTE",profileStatus:"VERIFIED"}});
  await prisma.studentSkill.createMany({data:[{studentId:s3.id,skillName:"Python",proficiency:"ADVANCED"},{studentId:s3.id,skillName:"Machine Learning",proficiency:"ADVANCED"},{studentId:s3.id,skillName:"SQL",proficiency:"ADVANCED"},{studentId:s3.id,skillName:"TensorFlow",proficiency:"INTERMEDIATE"}]});
  await prisma.project.create({data:{studentId:s3.id,title:"SentimentAI - Real-time Twitter Sentiment",description:"BERT NLP model. 94.2% accuracy. FastAPI serving.",technologies:"Python, PyTorch, BERT, FastAPI, Redis",projectUrl:"https://github.com/arjunmehta/sentiment-ai"}});
  const su4 = await prisma.user.create({data:{email:"sneha@college.edu",passwordHash:pass,role:"STUDENT",status:"ACTIVE"}});
  const s4 = await prisma.studentProfile.create({data:{userId:su4.id,studentCode:"STU-2026-004",fullName:"Sneha Kulkarni",department:"ECE",passingYear:2026,cgpa:7.8,backlogs:0,bio:"Embedded systems and IoT engineer.",profileStatus:"SUBMITTED"}});
  await prisma.studentSkill.createMany({data:[{studentId:s4.id,skillName:"C++",proficiency:"ADVANCED"},{studentId:s4.id,skillName:"Python",proficiency:"INTERMEDIATE"}]});
  await prisma.verification.create({data:{entityType:"PROFILE",entityId:s4.id,status:"PENDING"}});
  const su5 = await prisma.user.create({data:{email:"dev@college.edu",passwordHash:pass,role:"STUDENT",status:"ACTIVE"}});
  const s5 = await prisma.studentProfile.create({data:{userId:su5.id,studentCode:"STU-2026-005",fullName:"Dev Nair",department:"ME",passingYear:2027,cgpa:7.2,backlogs:1,bio:"Mechanical engineer exploring Python scripting.",profileStatus:"DRAFT"}});
  // Internships
  const i1 = await prisma.internship.create({data:{companyId:co1.id,title:"Software Development Engineer Intern",description:"Build scalable REST APIs for 2M+ users.",durationMonths:6,mode:"HYBRID",location:"Pune / Remote",stipend:25000,vacancies:3,deadline:"2026-10-31",startDate:"2026-12-01",status:"OPEN",minCgpa:7.5,maxBacklogs:0,allowedBranches:JSON.stringify(["CSE","IT","ECE"]),passingYears:JSON.stringify([2026,2027]),requiredSkills:JSON.stringify(["Java","SQL","Spring Boot"]),requiredExperience:0,responsibilities:"Design APIs, write unit tests, participate in code reviews.",requirements:"OOP fundamentals, SQL proficiency, Spring Boot preferred."}});
  const i2 = await prisma.internship.create({data:{companyId:co2.id,title:"AI & Data Science Intern",description:"Develop ML models and data pipelines for real-time analytics.",durationMonths:3,mode:"REMOTE",location:"Remote",stipend:30000,vacancies:2,deadline:"2026-11-15",startDate:"2026-12-15",status:"OPEN",minCgpa:8.0,maxBacklogs:0,allowedBranches:JSON.stringify(["CSE","IT"]),passingYears:JSON.stringify([2026]),requiredSkills:JSON.stringify(["Python","Machine Learning","SQL"]),requiredExperience:0,responsibilities:"Build/fine-tune ML models, create data pipelines.",requirements:"Proficiency in Python + TensorFlow or PyTorch."}});
  const i3 = await prisma.internship.create({data:{companyId:co3.id,title:"FinTech Backend Engineering Intern",description:"Build payment microservices and fraud detection systems.",durationMonths:4,mode:"HYBRID",location:"Mumbai",stipend:28000,vacancies:2,deadline:"2026-09-30",startDate:"2026-11-01",status:"OPEN",minCgpa:7.0,maxBacklogs:0,allowedBranches:JSON.stringify(["CSE","IT","ECE"]),passingYears:JSON.stringify([2026,2027]),requiredSkills:JSON.stringify(["Java","SQL","Docker"]),requiredExperience:0,responsibilities:"Payment APIs, integration tests, fraud detection rules.",requirements:"Java or Python. Interest in fintech."}});
  // Applications
  const a1 = await prisma.application.create({data:{internshipId:i1.id,studentId:s1.id,status:"SELECTED",eligibilityScore:100,aiMatchScore:94,matchExplanation:"94% Match: Advanced Java & SQL with microservices project directly matching SDE role."}});
  const a2 = await prisma.application.create({data:{internshipId:i2.id,studentId:s2.id,status:"SELECTED",eligibilityScore:100,aiMatchScore:87,matchExplanation:"87% Match: Strong React/TypeScript skills aligned with AI product frontend."}});
  const a3 = await prisma.application.create({data:{internshipId:i2.id,studentId:s3.id,status:"SHORTLISTED",eligibilityScore:100,aiMatchScore:98,matchExplanation:"98% Match: Advanced Python & ML, BERT NLP research perfectly maps to AI role."}});
  const a4 = await prisma.application.create({data:{internshipId:i3.id,studentId:s1.id,status:"APPLIED",eligibilityScore:100,aiMatchScore:82,matchExplanation:"82% Match: Java+Docker match FinTech stack. E-commerce project shows production API experience."}});
  // Offers
  const o1 = await prisma.offer.create({data:{applicationId:a1.id,role:"SDE Intern",startDate:"2026-12-01",endDate:"2027-05-31",stipend:25000,location:"Pune (Hybrid)",terms:"6-month. PPO consideration based on performance.",studentResponse:"ACCEPTED",status:"APPROVED",verificationCode:"OFFER-TECHCORP-2026-9981",acceptanceDeadline:"2026-09-30"}});
  const o2 = await prisma.offer.create({data:{applicationId:a2.id,role:"AI Product Frontend Intern",startDate:"2026-12-15",endDate:"2027-03-14",stipend:30000,location:"Remote",terms:"3-month remote. Flexible hours.",studentResponse:"ACCEPTED",status:"APPROVED",verificationCode:"OFFER-INNOVATE-2026-4421",acceptanceDeadline:"2026-10-15"}});
  await prisma.verification.create({data:{entityType:"OFFER",entityId:o1.id,verifierId:tnpUser.id,status:"APPROVED",reason:"Verified by T&P."}});
  await prisma.verification.create({data:{entityType:"OFFER",entityId:o2.id,verifierId:tnpUser.id,status:"APPROVED",reason:"Company confirmed."}});
  // Mentor Assignments
  await prisma.mentorAssignment.create({data:{studentId:s1.id,internshipId:i1.id,mentorId:m1.id,assignedBy:tnpUser.id,status:"ACTIVE",acceptedAt:new Date()}});
  await prisma.mentorAssignment.create({data:{studentId:s2.id,internshipId:i2.id,mentorId:m1.id,assignedBy:tnpUser.id,status:"ASSIGNED"}});
  // Progress Reports
  await prisma.progressReport.create({data:{internshipId:i1.id,studentId:s1.id,mentorId:m1.id,weekNumber:1,tasks:"Onboarding, environment setup, user authentication REST API.",learning:"OAuth2 and JWT refresh architecture.",challenges:"CORS issues between React and Spring Boot.",hours:40,status:"APPROVED",feedback:"Excellent start! Well-documented code."}});
  await prisma.progressReport.create({data:{internshipId:i1.id,studentId:s1.id,mentorId:m1.id,weekNumber:2,tasks:"DB indexing strategies, query optimization: 35% latency reduction.",learning:"PostgreSQL EXPLAIN ANALYZE for profiling.",challenges:"Connection pool config for high-concurrency.",hours:42,status:"APPROVED",feedback:"Exceptional performance on DB optimization. Saved infra cost."}});
  await prisma.progressReport.create({data:{internshipId:i1.id,studentId:s1.id,mentorId:m1.id,weekNumber:3,tasks:"Redis caching layer for product catalog. 60% faster API responses on cache-hit.",learning:"Redis sorted sets and hash patterns.",challenges:"Cache invalidation for frequently updated inventory.",hours:44,status:"SUBMITTED"}});
  await prisma.progressReport.create({data:{internshipId:i2.id,studentId:s2.id,mentorId:m1.id,weekNumber:1,tasks:"React dev setup. Built interactive data visualization components.",learning:"Recharts with real-time WebSocket data feeds.",challenges:"Large data volumes blocking UI thread. Used Web Workers.",hours:38,status:"SUBMITTED"}});
  // Issue
  await prisma.issue.create({data:{internshipId:i1.id,studentId:s1.id,mentorId:m1.id,raisedBy:m1.id,priority:"HIGH",severity:"NEEDS_ATTENTION",title:"Week 3 deliverable scope creep — timeline at risk",description:"Student has taken additional caching requirements beyond sprint scope. Risk of incomplete delivery.",status:"OPEN"}});
  // Evaluations
  await prisma.evaluation.create({data:{internshipId:i1.id,studentId:s1.id,evaluatorId:m1.id,evaluatorRole:"MENTOR",technicalScore:9.5,problemSolvingScore:9.0,communicationScore:8.5,professionalismScore:9.5,teamworkScore:9.0,disciplineScore:9.5,taskCompletionScore:9.0,overallScore:9.2,comments:"Outstanding student. High technical depth, proactive, excellent collaborator.",feedbackSummary:"Top performer. Strongly recommend PPO."}});
  await prisma.evaluation.create({data:{internshipId:i1.id,studentId:s1.id,evaluatorId:cu1.id,evaluatorRole:"COMPANY",technicalScore:9.0,problemSolvingScore:9.5,communicationScore:9.0,professionalismScore:9.0,teamworkScore:9.5,disciplineScore:9.0,taskCompletionScore:9.5,overallScore:9.2,comments:"Rahul delivered production-grade code. DB optimization saved $3k/month infra.",feedbackSummary:"Excellent intern. Extending PPO."}});
  // Completion
  const comp1 = await prisma.completion.create({data:{internshipId:i1.id,studentId:s1.id,verificationCode:"CERT-2026-RAHUL-TECHCORP",certificateId:"CERT-2026-001",recommendedBy:"COMPANY",recommendationRemarks:"All deliverables completed ahead of schedule.",finalScore:9.2,grade:"A+",verifiedBy:tnpUser.id,verifiedAt:new Date(),completionDate:new Date("2026-08-01"),status:"APPROVED"}});
  await prisma.verification.create({data:{entityType:"COMPLETION",entityId:comp1.id,verifierId:tnpUser.id,status:"APPROVED",reason:"Certificate verified. Records match."}});
  // PPO
  await prisma.pPO.create({data:{internshipId:i1.id,studentId:s1.id,companyId:co1.id,status:"ACCEPTED",role:"Software Development Engineer I",offeredCtc:14.5,offerDate:"2026-08-15",joiningDate:"2026-11-15",location:"Pune",terms:"Full-time. Annual CTC Rs.14.5 LPA with ESOP vesting.",isVerified:true,verifiedBy:tnpUser.id,verifiedAt:new Date(),verificationRemarks:"Recorded in institutional placement registry.",studentResponseDate:new Date("2026-08-16"),studentRemarks:"Excited to join full-time!"}});
  // Notifications
  await prisma.notification.createMany({data:[
    {userId:su1.id,type:"PPO",isRead:false,title:"PPO Accepted — TechCorp Solutions",message:"Your Pre-Placement Offer of Rs.14.5 LPA from TechCorp Solutions has been accepted and recorded."},
    {userId:su1.id,type:"CERTIFICATE",isRead:false,title:"Completion Certificate Issued",message:"Your internship completion certificate CERT-2026-001 is verified and available."},
    {userId:su1.id,type:"FEEDBACK",isRead:true,title:"Mentor Feedback on Week 2 Report",message:"Dr. Rajesh Verma: Exceptional performance on the DB optimization sprint."},
    {userId:mu1.id,type:"WEEKLY_REPORT",isRead:false,title:"2 Reports Pending Your Review",message:"Rahul Sharma (Week 3) and Priya Patel (Week 1) await mentor review."},
    {userId:mu1.id,type:"MENTOR_ASSIGNMENT",isRead:false,title:"New Mentee Assignment — Priya Patel",message:"T&P assigned Priya Patel (STU-2026-002, IT) for her Innovate Labs internship."},
    {userId:cu1.id,type:"APPLICATION",isRead:false,title:"New Application Received",message:"Rahul Sharma applied to FinTech Backend Intern at FinBridge Capital."},
    {userId:tnpUser.id,type:"VERIFICATION",isRead:false,title:"Student Profile Pending Verification",message:"Sneha Kulkarni (STU-2026-004, ECE) submitted her profile for T&P verification."},
    {userId:su2.id,type:"OFFER",isRead:false,title:"Offer Approved — Innovate Labs",message:"Your offer from Innovate Labs is T&P approved. Internship begins Dec 15, 2026."},
    {userId:su3.id,type:"SHORTLIST",isRead:false,title:"Shortlisted by Innovate Labs!",message:"You are shortlisted for AI & Data Science Intern. Top candidate at 98% match."},
  ]});
  console.log("Rich seed complete!");
  console.log("  student@college.edu / priya@college.edu / arjun@college.edu / sneha@college.edu / dev@college.edu");
  console.log("  recruiter@techcorp.com / careers@innovatelabs.io / hr@finbridge.in");
  console.log("  tnp@college.edu / mentor@college.edu / mentor2@college.edu");
  console.log("  Password: password123");
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(async()=>{await prisma.$disconnect();});
