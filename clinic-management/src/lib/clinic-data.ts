export const dashboardOverview = [
  {
    label: "Users",
    value: "122",
    note: "Accounts mapped to patient or doctor records",
  },
  {
    label: "Patients",
    value: "86",
    note: "Each patient linked 1:1 with a user",
  },
  {
    label: "Doctors",
    value: "36",
    note: "Each doctor linked 1:1 with a user",
  },
  {
    label: "Appointments Today",
    value: "24",
    note: "Every appointment links one patient and one doctor",
  },
] as const;

export const relationshipCards = [
  {
    title: "User to Patient",
    ratio: "1 : 1",
    description: "Each patient profile is backed by exactly one user account.",
  },
  {
    title: "User to Doctor",
    ratio: "1 : 1",
    description: "Each doctor profile is backed by exactly one user account.",
  },
  {
    title: "Patient to Appointments",
    ratio: "1 : M",
    description: "A patient can create many appointments over time.",
  },
  {
    title: "Doctor to Appointments",
    ratio: "1 : M",
    description: "A doctor can serve many appointments across multiple sessions.",
  },
  {
    title: "Appointment to Prescription",
    ratio: "1 : 1",
    description: "Each appointment produces one prescription record.",
  },
  {
    title: "Appointment to Billing",
    ratio: "1 : 1",
    description: "Each appointment produces one billing record.",
  },
] as const;

export const userRows = [
  {
    user: "Dr. Meera Sethi",
    email: "meera.sethi@iqram.health",
    role: "Doctor",
    linkedRecord: "DOC-104",
    department: "Cardiology",
    status: "Active",
  },
  {
    user: "Aanya Patel",
    email: "aanya.patel@iqram.health",
    role: "Patient",
    linkedRecord: "PAT-228",
    department: "General Medicine",
    status: "Upcoming visit",
  },
  {
    user: "Dr. Kavya Rao",
    email: "kavya.rao@iqram.health",
    role: "Doctor",
    linkedRecord: "DOC-118",
    department: "Pediatrics",
    status: "On shift",
  },
  {
    user: "Kabir Sharma",
    email: "kabir.sharma@iqram.health",
    role: "Patient",
    linkedRecord: "PAT-241",
    department: "Orthopedics",
    status: "Billing pending",
  },
] as const;

export const patientRows = [
  {
    id: "PAT-228",
    name: "Aanya Patel",
    primaryDoctor: "Dr. Meera Sethi",
    appointments: 6,
    billingStatus: "Current",
  },
  {
    id: "PAT-241",
    name: "Kabir Sharma",
    primaryDoctor: "Dr. Kavya Rao",
    appointments: 3,
    billingStatus: "Pending",
  },
  {
    id: "PAT-255",
    name: "Riya Nair",
    primaryDoctor: "Dr. Arjun Malhotra",
    appointments: 9,
    billingStatus: "Current",
  },
] as const;

export const doctorRows = [
  {
    id: "DOC-104",
    name: "Dr. Meera Sethi",
    specialty: "Cardiology",
    appointments: 18,
    load: "18 active",
    status: "Available",
  },
  {
    id: "DOC-118",
    name: "Dr. Kavya Rao",
    specialty: "Pediatrics",
    appointments: 14,
    load: "14 active",
    status: "In clinic",
  },
  {
    id: "DOC-131",
    name: "Dr. Arjun Malhotra",
    specialty: "Orthopedics",
    appointments: 11,
    load: "11 active",
    status: "Surgery block",
  },
] as const;

export const appointmentRows = [
  {
    id: "APT-6001",
    slot: "09 Apr 2026, 10:30 AM",
    patient: "Aanya Patel",
    doctor: "Dr. Meera Sethi",
    prescription: "PR-9001",
    billing: "INV-7001",
  },
  {
    id: "APT-6002",
    slot: "09 Apr 2026, 11:45 AM",
    patient: "Kabir Sharma",
    doctor: "Dr. Kavya Rao",
    prescription: "PR-9002",
    billing: "INV-7002",
  },
  {
    id: "APT-6003",
    slot: "09 Apr 2026, 01:15 PM",
    patient: "Riya Nair",
    doctor: "Dr. Arjun Malhotra",
    prescription: "PR-9003",
    billing: "INV-7003",
  },
] as const;

export const prescriptionRows = [
  {
    id: "PR-9001",
    patient: "Aanya Patel",
    doctor: "Dr. Meera Sethi",
    medicines: "Atorvastatin 10mg, ECG follow-up in 2 weeks.",
    status: "Issued",
  },
  {
    id: "PR-9002",
    patient: "Kabir Sharma",
    doctor: "Dr. Kavya Rao",
    medicines: "Calcium supplement, mobility exercise plan.",
    status: "Ready",
  },
  {
    id: "PR-9003",
    patient: "Riya Nair",
    doctor: "Dr. Arjun Malhotra",
    medicines: "Pain management kit, MRI review after 5 days.",
    status: "Issued",
  },
] as const;

export const billingRows = [
  {
    id: "INV-7001",
    appointmentId: "APT-6001",
    patient: "Aanya Patel",
    amount: "$140.00",
    status: "Paid",
  },
  {
    id: "INV-7002",
    appointmentId: "APT-6002",
    patient: "Kabir Sharma",
    amount: "$95.00",
    status: "Pending",
  },
  {
    id: "INV-7003",
    appointmentId: "APT-6003",
    patient: "Riya Nair",
    amount: "$210.00",
    status: "Processing",
  },
] as const;

export const dashboardHighlights = [
  {
    title: "Appointments generating outputs",
    value: "24 / 24",
    description: "All appointments have connected billing records and clinical notes are ready for prescription issue.",
  },
  {
    title: "Pending billing follow-up",
    value: "4",
    description: "Invoices still waiting for payment confirmation after consultation closure.",
  },
  {
    title: "Doctors on active schedule",
    value: "18",
    description: "Doctors currently attached to open appointment slots in the live roster.",
  },
] as const;

export const dashboardFlow = [
  {
    step: "User",
    summary: "One account maps to one patient or one doctor profile.",
  },
  {
    step: "Appointment",
    summary: "Each booking binds one patient with one doctor.",
  },
  {
    step: "Prescription",
    summary: "One prescription is created per completed appointment.",
  },
  {
    step: "Billing",
    summary: "One invoice is created per completed appointment.",
  },
] as const;
