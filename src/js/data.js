// ============================================================
//  VkTori – Static Dummy Data
// ============================================================

const DATA = {
  clients: [
    { id: 'C001', name: 'Sarah Mitchell', email: 'sarah.m@email.com', phone: '+1 (415) 555-0101', cases: 3, status: 'active', joined: 'Jan 12, 2025', avatar: 'SM', type: 'Individual' },
    { id: 'C002', name: 'James Hartwell', email: 'j.hartwell@corp.com', phone: '+1 (310) 555-0234', cases: 1, status: 'active', joined: 'Feb 03, 2025', avatar: 'JH', type: 'Corporate' },
    { id: 'C003', name: 'Emily Carter', email: 'emily.carter@mail.com', phone: '+1 (628) 555-0178', cases: 2, status: 'pending', joined: 'Mar 15, 2025', avatar: 'EC', type: 'Individual' },
    { id: 'C004', name: 'Robert Chen', email: 'rchen@techventures.com', phone: '+1 (408) 555-0312', cases: 4, status: 'active', joined: 'Nov 20, 2024', avatar: 'RC', type: 'Corporate' },
    { id: 'C005', name: 'Diana Torres', email: 'diana.t@personal.com', phone: '+1 (213) 555-0456', cases: 1, status: 'inactive', joined: 'Sep 05, 2024', avatar: 'DT', type: 'Individual' },
    { id: 'C006', name: 'Marcus Williams', email: 'm.williams@email.com', phone: '+1 (510) 555-0789', cases: 2, status: 'active', joined: 'Dec 10, 2024', avatar: 'MW', type: 'Individual' },
  ],
  cases: [
    { id: 'CASE-2045', title: 'Smith vs. Jones Industrial', client: 'Robert Chen', lawyer: 'Alex Parker', type: 'Civil Litigation', status: 'active', filed: 'Jan 15, 2025', nextHearing: 'Apr 20, 2025', priority: 'high' },
    { id: 'CASE-2044', title: 'Hartwell Contract Dispute', client: 'James Hartwell', lawyer: 'Sarah Lee', type: 'Contract', status: 'active', filed: 'Jan 28, 2025', nextHearing: 'Apr 18, 2025', priority: 'medium' },
    { id: 'CASE-2043', title: 'Mitchell Custody Appeal', client: 'Sarah Mitchell', lawyer: 'Alex Parker', type: 'Family Law', status: 'pending', filed: 'Feb 02, 2025', nextHearing: 'May 05, 2025', priority: 'high' },
    { id: 'CASE-2042', title: 'Carter vs. Landlord', client: 'Emily Carter', lawyer: 'John Mills', type: 'Real Estate', status: 'closed', filed: 'Oct 10, 2024', nextHearing: '—', priority: 'low' },
    { id: 'CASE-2041', title: 'Chen IP Protection', client: 'Robert Chen', lawyer: 'Sarah Lee', type: 'Intellectual Property', status: 'active', filed: 'Nov 22, 2024', nextHearing: 'Apr 25, 2025', priority: 'high' },
    { id: 'CASE-2040', title: 'Torres Employment Claim', client: 'Diana Torres', lawyer: 'John Mills', type: 'Employment', status: 'pending', filed: 'Dec 12, 2024', nextHearing: 'Apr 30, 2025', priority: 'medium' },
  ],
  lawyers: [
    { id: 'L001', name: 'Alex Parker', email: 'a.parker@victoriatulsidaslaw.com', specialty: 'Civil Litigation', cases: 12, status: 'active', avatar: 'AP' },
    { id: 'L002', name: 'Sarah Lee', email: 's.lee@victoriatulsidaslaw.com', specialty: 'Corporate Law', cases: 8, status: 'active', avatar: 'SL' },
    { id: 'L003', name: 'John Mills', email: 'j.mills@victoriatulsidaslaw.com', specialty: 'Family Law', cases: 6, status: 'active', avatar: 'JM' },
  ],
  documents: [
    { id: 'D001', name: 'Complaint Filing – CASE-2045.pdf', case: 'CASE-2045', type: 'pdf', size: '1.2 MB', uploaded: 'Jan 16, 2025', uploadedBy: 'Alex Parker' },
    { id: 'D002', name: 'Evidence Exhibit A.pdf', case: 'CASE-2045', type: 'pdf', size: '3.8 MB', uploaded: 'Feb 01, 2025', uploadedBy: 'Alex Parker' },
    { id: 'D003', name: 'Client Agreement – Hartwell.docx', case: 'CASE-2044', type: 'doc', size: '0.5 MB', uploaded: 'Jan 29, 2025', uploadedBy: 'Sarah Lee' },
    { id: 'D004', name: 'Court Order – Mitchell.pdf', case: 'CASE-2043', type: 'pdf', size: '0.8 MB', uploaded: 'Feb 05, 2025', uploadedBy: 'Alex Parker' },
    { id: 'D005', name: 'IP Registration Certificate.pdf', case: 'CASE-2041', type: 'pdf', size: '2.1 MB', uploaded: 'Nov 25, 2024', uploadedBy: 'Sarah Lee' },
    { id: 'D006', name: 'Employment Contract.docx', case: 'CASE-2040', type: 'doc', size: '0.3 MB', uploaded: 'Dec 14, 2024', uploadedBy: 'John Mills' },
    { id: 'D007', name: 'Property Photo Evidence.jpg', case: 'CASE-2042', type: 'img', size: '4.5 MB', uploaded: 'Oct 15, 2024', uploadedBy: 'John Mills' },
  ],
  invoices: [
    { id: 'INV-0045', client: 'Robert Chen', case: 'CASE-2045', amount: '$4,200.00', due: 'Apr 30, 2025', status: 'pending', issued: 'Apr 01, 2025', desc: 'Legal consultation & court filing fees' },
    { id: 'INV-0044', client: 'James Hartwell', case: 'CASE-2044', amount: '$2,800.00', due: 'Apr 15, 2025', status: 'paid', issued: 'Mar 20, 2025', desc: 'Contract review & mediation services' },
    { id: 'INV-0043', client: 'Sarah Mitchell', case: 'CASE-2043', amount: '$3,500.00', due: 'May 10, 2025', status: 'pending', issued: 'Apr 05, 2025', desc: 'Custody hearing preparation' },
    { id: 'INV-0042', client: 'Emily Carter', case: 'CASE-2042', amount: '$1,200.00', due: 'Mar 01, 2025', status: 'paid', issued: 'Feb 15, 2025', desc: 'Real estate dispute resolution' },
    { id: 'INV-0041', client: 'Robert Chen', case: 'CASE-2041', amount: '$5,800.00', due: 'Mar 30, 2025', status: 'overdue', issued: 'Mar 01, 2025', desc: 'IP protection filing & patent research' },
  ],
  messages: [
    { id: 'M001', from: 'James Hartwell', avatar: 'JH', time: '10:24 AM', preview: 'Are we still on for the meeting tomorrow?', unread: 2, active: true },
    { id: 'M002', from: 'Sarah Mitchell', avatar: 'SM', time: '9:15 AM', preview: 'I reviewed the documents you sent...', unread: 0, active: false },
    { id: 'M003', from: 'Emily Carter', avatar: 'EC', time: 'Yesterday', preview: 'Thank you for the update on my case.', unread: 1, active: false },
  ],
  emails: [
    { id: 'E001', from: 'Court of CA', subject: 'Hearing Rescheduled – CASE-2045', preview: 'Please note that the hearing scheduled for April 18 has been...', time: '9:42 AM', read: false, body: 'Dear Counsel,\n\nPlease be advised that the hearing in the matter of Smith vs. Jones Industrial, Case No. 2045, originally scheduled for April 18, 2025 at 9:00 AM has been rescheduled to April 20, 2025 at 10:30 AM in Courtroom 4B.\n\nPlease confirm receipt of this notice.\n\nRegards,\nCourt Administrator\nSuperior Court of California' },
    { id: 'E002', from: 'James Hartwell', subject: 'RE: Contract Review Documents', preview: 'Thank you for sending those over. I\'ve reviewed...', time: '8:30 AM', read: false, body: 'Hi,\n\nThank you for sending the contract review documents over so promptly. I\'ve reviewed the initial draft and have a few questions about Section 4.2 regarding liability clauses.\n\nCan we schedule a call this week to discuss?\n\nBest,\nJames' },
    { id: 'E003', from: 'DocuSign System', subject: 'Document Signed – Emily Carter', preview: 'Emily Carter has signed the Retainer Agreement.', time: 'Apr 8', read: true, body: 'The following document has been signed by all parties:\n\nDocument: Retainer Agreement\nSigned by: Emily Carter\nDate: April 8, 2025 at 3:45 PM\n\nYou can access the signed document in your VkTori Documents section.' },
    { id: 'E004', from: 'Alex Parker', subject: 'CASE-2043 Update Needed', preview: 'Hi, I need the latest evidence file for...', time: 'Apr 7', read: true, body: 'Hi,\n\nI need the latest evidence file for the Mitchell Custody case before our prep meeting on Friday. Could you pull the Exhibit B documents from the case folder?\n\nThanks,\nAlex' },
  ],
  calendarEvents: [
    { day: 14, title: 'Hartwell Hearing', type: 'blue', time: '9:00 AM' },
    { day: 18, title: 'Chen IP Review', type: 'green', time: '2:00 PM' },
    { day: 20, title: 'Smith vs Jones', type: 'amber', time: '10:30 AM' },
    { day: 20, title: 'Deadline: INV-0041', type: 'red', time: '' },
    { day: 25, title: 'Mitchell Appeal', type: 'blue', time: '11:00 AM' },
    { day: 30, title: 'Torres Hearing', type: 'green', time: '1:00 PM' },
  ],
  aiMessages: [
    { role: 'ai', text: 'Hello! I\'m VyNius, your intelligent legal assistant. I can help you with matter summaries, document drafting, legal research, and deadline tracking. How can I assist you today?' },
  ],
  stats: {
    admin: { totalParties: 124, activeCases: 38, upcomingDeadlines: 7, monthlyRevenue: '$42,800' },
    lawyer: { myParties: 9, myCases: 12, pendingTasks: 4, hoursLogged: '147h' },
    client: { activeCases: 2, nextHearing: 'Apr 20, 2025', documentsReady: 3, invoicePending: 1 }
  }
};
