// Starter content for a new install. Everything here is editable from the admin panel.
function nextSaturday(weeksAhead = 0) {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7) + weeksAhead * 7);
  return d.toISOString().slice(0, 10);
}

const settings = {
  name: 'Silent Hill Hospital',
  tagline: 'Caring for mothers, babies and families',
  motto: 'For Uncompromised Quality Healthcare',
  level: 'Level 3 Health Facility',
  phone: '0700 000 000',
  whatsapp: '254711854476',
  email: 'info@silenthillhospital.example',
  address: 'Update your address in Admin → Site & contact',
  hours: 'Outpatient: Mon–Sun, 7:00 AM – 9:00 PM\nInpatient, maternity & ambulance: 24 hours',
  facebook: '',
  instagram: '',
  tiktok: '',
  logo: '',

  heroTitle: 'Motherhood, with care at every step',
  heroText: 'From your first antenatal visit to your baby’s first immunisation, the Silent Hill maternity team walks the whole journey with you.',
  aboutText: 'Silent Hill Hospital is a Level 3 health facility offering outpatient, inpatient, maternity, child health, laboratory, pharmacy and ambulance services under one roof. We are close to home, and we treat every patient like family.',

  maternityTitle: 'Maternity at Silent Hill',
  maternityText: 'Pregnancy is a journey, and you should never walk it alone. Our midwives, nurses and clinicians support you through antenatal care, delivery and life with your newborn.',
  maternityHighlights: 'Antenatal clinics and birth planning\nSkilled, friendly midwives\n24-hour labour ward and ambulance\nPostnatal and newborn care\nFamily planning counselling\nBaby showers and mother-education events',

  clinicTitle: 'Saturday Baby Clinic',
  clinicDay: 'Every Saturday',
  clinicTime: '9:00 AM – 1:00 PM',
  clinicText: 'A relaxed weekend clinic so working parents never have to miss their baby’s checks. Walk in with your child’s health card.',
  clinicCovers: 'Immunisation\nGrowth and weight monitoring\nNutrition and breastfeeding advice\nVitamin A and deworming\nDevelopmental milestone checks\nMinor illness review',
  clinicFee: 'Ask reception about clinic fees.',

  ambulanceTitle: 'Ambulance Services',
  ambulancePhone: '0700 000 000',
  ambulanceText: 'When every minute counts, call us. Our ambulance transports patients to Silent Hill Hospital and, when needed, to higher-level facilities with a nurse escort.',
  ambulanceFeatures: 'Emergency pick-up\nInter-facility referral transfers\nMothers in labour\nNurse escort on request\nAvailable 24 hours a day',

  catalogTitle: 'Our WhatsApp Catalog',
  catalogText: 'Browse our health packages, maternity essentials and baby-care products, then order or ask a question directly on WhatsApp.',
  catalogUrl: '',

  rightsIntro: 'Every person, patient or client, has a:',
  patientRights: [
    'Right to access health care',
    'Right to receive emergency treatment in any health facility',
    'Right to be informed all the provisions of one’s health insurance policy',
    'Right to choose a health care provider',
    'Right to quality health care',
    'Right to refuse treatment',
    'Right to confidentiality',
    'Right to informed consent to treatment',
    'Right to information',
    'Right to be treated with respect and dignity'
  ]
};

const services = [
  {
    title: 'Antenatal Care (ANC)', category: 'maternity', icon: '🤰', featured: true, order: 1,
    summary: 'Regular check-ups that keep you and your baby healthy from the first trimester to delivery.',
    covers: ['Confirmation of pregnancy and first booking', 'Blood pressure, weight and fetal monitoring', 'Routine blood and urine tests', 'Tetanus and other recommended immunisations', 'Iron, folic acid and nutrition counselling', 'Danger-sign education and birth planning'],
    steps: [
      { title: 'Book your first visit', text: 'Book online, on WhatsApp or at reception as soon as you know you are pregnant.' },
      { title: 'Meet your midwife', text: 'We record your history, examine you and set your expected delivery date.' },
      { title: 'Routine tests', text: 'Simple lab tests and screening to spot problems early.' },
      { title: 'Follow-up visits', text: 'We see you regularly and more often as your due date nears.' },
      { title: 'Birth plan', text: 'We agree where and how you will deliver and what to pack.' }
    ]
  },
  {
    title: 'Labour & Delivery', category: 'maternity', icon: '👶', featured: true, order: 2,
    summary: 'A safe, dignified and supportive delivery, with skilled midwives on duty 24 hours a day.',
    covers: ['Normal (vaginal) delivery', 'Continuous monitoring in labour', 'Immediate skin-to-skin contact and breastfeeding support', 'Newborn assessment and first care', 'Emergency referral with our ambulance if higher-level care is needed'],
    steps: [
      { title: 'Arrive or call us', text: 'Come in when labour starts or call the ambulance if you need transport.' },
      { title: 'Admission and assessment', text: 'A midwife checks you and your baby and explains what to expect.' },
      { title: 'Labour support', text: 'You are monitored and supported, and a birth partner is welcome.' },
      { title: 'Birth and bonding', text: 'Skin-to-skin, first feed and a full newborn check.' }
    ]
  },
  {
    title: 'Postnatal & Newborn Care', category: 'maternity', icon: '🍼', featured: true, order: 3,
    summary: 'Care for mother and baby after delivery, so recovery and the early weeks go smoothly.',
    covers: ['Mother’s recovery check-ups', 'Newborn checks and cord care', 'Breastfeeding and positioning support', 'BCG, polio and early immunisations', 'Family planning counselling', 'Mental wellbeing and baby-blues support'],
    steps: [
      { title: 'Before you go home', text: 'We check you both, teach feeding and cord care, and share danger signs.' },
      { title: 'Day 3 to week 1 check', text: 'An early review of mother and baby.' },
      { title: 'Six-week visit', text: 'A full mother check and family planning discussion.' },
      { title: 'Into the baby clinic', text: 'Your baby joins our Saturday Baby Clinic for growth checks and immunisation.' }
    ]
  },
  {
    title: 'Family Planning', category: 'maternity', icon: '🌸', order: 4,
    summary: 'Confidential counselling and a choice of methods, to plan your family when you are ready.',
    covers: ['Counselling for individuals and couples', 'Short- and long-acting methods', 'Emergency contraception', 'Preconception advice'],
    steps: [
      { title: 'Private counselling', text: 'We explain the options with no pressure.' },
      { title: 'Your choice', text: 'You choose the method that suits you.' },
      { title: 'Follow-up', text: 'Regular reviews and easy switching if needed.' }
    ]
  },
  {
    title: 'Child Health & Immunisation', category: 'child', icon: '💉', featured: true, order: 5,
    summary: 'Growth monitoring, vaccines and treatment for children, including the Saturday Baby Clinic.',
    covers: ['Routine childhood immunisation', 'Growth and nutrition monitoring', 'Treatment of common childhood illnesses', 'Vitamin A and deworming'],
    steps: [
      { title: 'Register your child', text: 'Bring the child health card, and we open one if there is none.' },
      { title: 'Check and vaccinate', text: 'Weight, height and the vaccines due for the age.' },
      { title: 'Advice and next date', text: 'We record everything and set the next visit.' }
    ]
  },
  {
    title: 'Outpatient Services (OPD)', category: 'general', icon: '🩺', featured: true, order: 6,
    summary: 'Consultation and treatment for adults and children without needing admission.',
    covers: ['General consultation', 'Diagnosis and treatment of common conditions', 'Minor procedures and wound care', 'Chronic disease follow-up such as hypertension and diabetes', 'Referral letters when specialist care is needed'],
    steps: [
      { title: 'Register at reception', text: 'Quick registration and triage.' },
      { title: 'See the clinician', text: 'Examination and diagnosis.' },
      { title: 'Tests and treatment', text: 'Lab tests and medicines on site.' },
      { title: 'Follow-up plan', text: 'We tell you what to do next and when to return.' }
    ]
  },
  {
    title: 'Inpatient Wards', category: 'general', icon: '🛏️', order: 7,
    summary: 'Clean, monitored beds for patients who need to be admitted, with round-the-clock nursing.',
    covers: ['Male, female and children’s wards', 'Nursing care 24 hours', 'Observation and short-stay admission', 'Discharge planning and referral'],
    steps: [
      { title: 'Admission', text: 'The clinician decides, and we explain the plan and costs.' },
      { title: 'Daily care', text: 'Regular reviews, medication and nursing care.' },
      { title: 'Discharge', text: 'Medicines, advice and a follow-up date.' }
    ]
  },
  {
    title: 'Laboratory & Pharmacy', category: 'diagnostics', icon: '🧪', order: 8,
    summary: 'On-site tests and medicines, so results and treatment come in one visit.',
    covers: ['Blood, urine and stool tests', 'Malaria, HIV and pregnancy tests', 'Blood sugar and haemoglobin', 'Dispensing of prescribed medicines'],
    steps: [
      { title: 'Get your request', text: 'The clinician sends the tests you need.' },
      { title: 'Sample and results', text: 'Most results are ready the same day.' },
      { title: 'Medicines', text: 'Collect your prescription at our pharmacy.' }
    ]
  },
  {
    title: 'Ambulance & Emergency Referral', category: 'emergency', icon: '🚑', featured: true, order: 9,
    summary: 'Emergency transport and safe referral to higher-level facilities, 24 hours a day.',
    covers: ['Emergency pick-up', 'Mothers in labour', 'Inter-facility transfers', 'Stabilisation before transfer'],
    steps: [
      { title: 'Call us', text: 'Give your location and what has happened.' },
      { title: 'We dispatch', text: 'The crew reaches you and gives first aid.' },
      { title: 'Safe transfer', text: 'You are taken to us or to the right facility for care.' }
    ]
  }
].map((s, i) => ({ image: '', published: true, featured: false, ...s, order: s.order ?? i }));

const events = [
  {
    title: 'Mama & Baby Shower Day', type: 'Baby shower', date: nextSaturday(3), time: '10:00 AM – 1:00 PM',
    venue: 'Silent Hill Hospital', capacity: 60, image: '', published: true,
    description: 'A joyful morning for expectant mothers: games, refreshments, gifts for the mums-to-be and short talks from our midwives.'
  },
  {
    title: 'Antenatal Education Class', type: 'Mother education', date: nextSaturday(1), time: '9:00 AM – 11:00 AM',
    venue: 'Silent Hill Hospital, Maternity Wing', capacity: 30, image: '', published: true,
    description: 'Learn about labour, breastfeeding, newborn care and danger signs, and bring your partner along.'
  }
];

const vouchers = [
  {
    title: 'Maternity Welcome Discount', value: 'Maternity discount', description: 'A discount for expectant mothers. Claim it, then show the code at reception.',
    terms: 'One voucher per mother. Show the voucher at reception.', currency: 'KES', price: 0, discountType: 'percent', discountValue: 0,
    slots: 0, opensAt: '', expires: '', active: true
  }
];

const blogs = [
  {
    title: 'Your first antenatal visit: what to expect', author: 'Maternity Team', image: '', published: true,
    excerpt: 'Booking early gives you and your baby the best start. Here is what happens at your first clinic visit.',
    body: 'Book your first antenatal visit as soon as you know you are pregnant.\n\nYour midwife will ask about your health and past pregnancies, check your blood pressure and weight, and set your expected delivery date. You will also have simple blood and urine tests.\n\nWe will talk about healthy eating, folic acid and iron, and the danger signs that mean you should come in straight away. Bring your partner or a family member if you like.\n\nThis article is general information. For advice about your own pregnancy, please see your midwife or doctor.'
  },
  {
    title: 'Why the Saturday Baby Clinic matters', author: 'Child Health Team', image: '', published: true,
    excerpt: 'Regular checks and vaccines protect your baby. Our Saturday clinic makes them easier to keep.',
    body: 'Vaccines and regular growth checks are among the best things you can do for your child’s health.\n\nOur Saturday Baby Clinic is designed for busy families. Bring your child’s health card and we will check weight and growth, give the vaccines that are due, and answer your questions about feeding and development.\n\nIf your baby is unwell during the week, do not wait for Saturday. Visit us any day.'
  }
];

const insurers = [
  { name: 'Social Health Authority (SHA)', status: 'accredited', note: 'Accredited facility', logo: '/img/sha-logo.jpg', order: 1, published: true },
  { name: 'Minet', status: 'coming', note: 'Coming soon', logo: '/img/ins-minet.png', order: 2, published: true },
  { name: 'CIC Insurance', status: 'coming', note: 'Coming soon', logo: '/img/ins-cic.png', order: 3, published: true },
  { name: 'APA Insurance', status: 'coming', note: 'Coming soon', logo: '/img/ins-apa.png', order: 4, published: true },
  { name: 'Britam', status: 'coming', note: 'Coming soon', logo: '/img/ins-britam.png', order: 5, published: true },
  { name: 'Jubilee Insurance', status: 'coming', note: 'Coming soon', logo: '/img/ins-jubilee.png', order: 6, published: true }
];

module.exports = { settings, services, events, vouchers, blogs, insurers };
