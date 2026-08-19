export type NotificationEventType =
  | 'REGISTRATION'
  | 'VERIFICATION'
  | 'ELIGIBILITY'
  | 'APPLICATION'
  | 'SHORTLIST'
  | 'SELECTION'
  | 'OFFER'
  | 'TNP_APPROVAL'
  | 'MENTOR_ASSIGNMENT'
  | 'WEEKLY_REPORT'
  | 'FEEDBACK'
  | 'ISSUE'
  | 'EVALUATION'
  | 'COMPLETION'
  | 'CERTIFICATE'
  | 'PPO';

export interface NotificationTemplateParams {
  userName?: string;
  roleName?: string;
  companyName?: string;
  internshipTitle?: string;
  status?: string;
  reason?: string;
  mentorName?: string;
  weekNumber?: number;
  score?: number;
  grade?: string;
  certificateId?: string;
  ctc?: number;
  issueTitle?: string;
}

export interface NotificationTemplateOutput {
  title: string;
  message: string;
}

export const renderNotificationTemplate = (
  type: NotificationEventType,
  params: NotificationTemplateParams = {}
): NotificationTemplateOutput => {
  switch (type) {
    case 'REGISTRATION':
      return {
        title: '🎉 Welcome to CareerLaunch Platform',
        message: `Welcome ${params.userName || 'User'}! Your institutional account is active. Complete your profile and verification documents to get started.`
      };

    case 'VERIFICATION':
      return {
        title: `Profile Verification: ${params.status || 'UPDATED'}`,
        message: params.status === 'VERIFIED'
          ? 'Your academic profile and identity documents have been approved by the T&P Cell.'
          : `T&P verification update: ${params.reason || 'Please review your verification tab for remarks.'}`
      };

    case 'ELIGIBILITY':
      return {
        title: 'Vacancy Eligibility Update',
        message: `You match the criteria for ${params.internshipTitle || 'a new internship vacancy'} at ${params.companyName || 'Campus Partner'}.`
      };

    case 'APPLICATION':
      return {
        title: 'Application Submitted',
        message: `Your application for "${params.internshipTitle || 'Internship'}" at ${params.companyName || 'Company'} was received.`
      };

    case 'SHORTLIST':
      return {
        title: '🎯 You have been Shortlisted!',
        message: `Congratulations! ${params.companyName || 'Company'} shortlisted your profile for the ${params.internshipTitle || 'Internship'} position.`
      };

    case 'SELECTION':
      return {
        title: '🌟 Candidate Selected for Offer',
        message: `Great news! You have been selected for the ${params.internshipTitle || 'Internship'} position at ${params.companyName || 'Company'}.`
      };

    case 'OFFER':
      return {
        title: '📄 Internship Offer Received',
        message: `${params.companyName || 'Company'} has extended an official internship offer for ${params.internshipTitle || 'the role'}.`
      };

    case 'TNP_APPROVAL':
      return {
        title: '🏛️ T&P Institutional Approval',
        message: `The T&P Cell has approved your internship record for ${params.companyName || 'Company'}.`
      };

    case 'MENTOR_ASSIGNMENT':
      return {
        title: '👨‍🏫 Faculty Mentor Assigned',
        message: `${params.mentorName || 'A faculty mentor'} has been assigned to supervise your internship progress.`
      };

    case 'WEEKLY_REPORT':
      return {
        title: `Weekly Progress Report (Week ${params.weekNumber || 1})`,
        message: params.status === 'APPROVED'
          ? `Your Week ${params.weekNumber || 1} progress report was approved by your faculty mentor.`
          : `Week ${params.weekNumber || 1} report submitted for faculty review.`
      };

    case 'FEEDBACK':
      return {
        title: '💬 Performance Feedback Received',
        message: `Employer supervisor at ${params.companyName || 'Company'} provided progress feedback on your deliverables.`
      };

    case 'ISSUE':
      return {
        title: `Issue Alert: ${params.issueTitle || 'Internship Support'}`,
        message: `Issue status updated to ${params.status || 'IN_PROGRESS'}.`
      };

    case 'EVALUATION':
      return {
        title: '📊 Performance Evaluation Submitted',
        message: `A structured performance evaluation rubric was recorded with an overall score of ${params.score || '9.0'}/10.0.`
      };

    case 'COMPLETION':
      return {
        title: '🎓 Internship Completion Approved',
        message: `Congratulations! Your internship completion at ${params.companyName || 'Company'} has been formally verified and approved by T&P.`
      };

    case 'CERTIFICATE':
      return {
        title: '📜 Verifiable Certificate Issued',
        message: `Your verifiable institutional internship completion certificate is ready. Certificate ID: ${params.certificateId || 'CERT-2026'}.`
      };

    case 'PPO':
      return {
        title: '🚀 Pre-Placement Offer (PPO) Update',
        message: `${params.companyName || 'Company'} PPO status: ${params.status || 'OFFERED'} (${params.roleName || 'Full-time'} @ ₹${params.ctc || 12} LPA).`
      };

    default:
      return {
        title: 'System Notification',
        message: params.reason || 'You have a new update in your CareerLaunch dashboard.'
      };
  }
};
