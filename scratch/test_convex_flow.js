import { processIncomingMessage, getConvexClient } from '../lib/conversation.js';
import { api } from '../convex/_generated/api.js';
import { getCortexConvexClient } from '../lib/cortexClient.js';

const TEST_PHONE = '919373280505'; // Dedicated test phone number

async function run() {
  console.log('🏥 STARTING CORTEX HOSPITAL AI ASSISTANT TEST SUITE\n');

  const convex = getConvexClient();

  // 0. Clean slate for test phone
  console.log('--- Step 0: Clear session for test phone ---');
  await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber: TEST_PHONE });
  let session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Initial step:', session?.currentStep || 'None');
  console.log('✅ Cleared\n');

  // Test 1: First message "Hi" -> Language Selection Prompt
  console.log('--- Test 1: Patient says "Hi" -> Language Selection Prompt ---');
  let res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'Hi',
  });
  console.log('Bot replied:\n', res.text);
  if (!res.text.includes('Welcome to Cortex Hospital') || !res.text.includes('English') || !res.text.includes('मराठी')) {
    throw new Error('Test 1 failed: Expected Language Selection prompt with English/Hindi/Marathi');
  }
  console.log('✅ Test 1 Passed\n');

  // Test 1b: Patient selects "1" (English) -> English Main Menu
  console.log('--- Test 1b: Patient selects "1" (English) ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '1',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Session Language:', session?.language);
  if (session?.language !== 'en' || !res.text.includes('Book an Appointment')) {
    throw new Error('Test 1b failed: Expected English main menu');
  }
  console.log('✅ Test 1b Passed\n');

  // Test 2: Natural Language Booking: "I want to see Dr. Vipeen Raut tomorrow"
  console.log('--- Test 2: Patient says "I want to see Dr. Vipeen Raut tomorrow" ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'I want to see Dr. Vipeen Raut tomorrow',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Convex currentStep:', session?.currentStep);
  if (session?.currentStep !== 'BOOKING_SELECT_SLOT') {
    throw new Error(`Test 2 failed: Step should be BOOKING_SELECT_SLOT, got ${session?.currentStep}`);
  }
  console.log('✅ Test 2 Passed\n');

  // Test 3: Emergency Detection & Medical Safety (Section 12)
  console.log('--- Test 3: Medical Emergency Safety Triage ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'I have severe chest pain and heavy bleeding',
  });
  console.log('Bot replied:\n', res.text);
  if (!res.text.includes('EMERGENCY MEDICAL ADVICE') || !res.text.includes('112')) {
    throw new Error('Test 3 failed: Expected emergency medical triage message');
  }
  console.log('✅ Test 3 Passed\n');

  // Test 4: Prescription Request & Secure OTP Protection (Section 3 & 4)
  console.log('--- Test 4: Secure Prescription Access (OTP Required) ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'Send me my last prescription',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('OTP step:', session?.currentStep, 'OTP code:', session?.verificationOtp);
  if (session?.currentStep !== 'OTP_VERIFICATION' || !session?.verificationOtp) {
    throw new Error('Test 4 failed: Expected OTP_VERIFICATION step');
  }
  console.log('✅ Test 4 Passed\n');

  // Test 5: Submit Verification Code
  console.log('--- Test 5: Patient submits OTP code ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: session.verificationOtp,
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Is verified:', session?.isVerified);
  if (!session?.isVerified) {
    throw new Error('Test 5 failed: Session should be verified');
  }
  console.log('✅ Test 5 Passed\n');

  // Test 6: Marathi Language Switching
  console.log('--- Test 6: Language switch to Marathi ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '10', // Change Language
  });
  console.log('Language prompt replied:\n', res.text);

  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '3', // Marathi
  });
  console.log('Marathi Menu replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  if (session?.language !== 'mr' || !res.text.includes('अपॉइंटमेंट बुक करा')) {
    throw new Error('Test 6 failed: Expected Marathi main menu');
  }
  console.log('✅ Test 6 Passed\n');

  // Test 7: Human Receptionist Handover (Section 11)
  console.log('--- Test 7: Human Receptionist Handover ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '9',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Is Handed Over:', session?.isHandedOver);
  if (!session?.isHandedOver || !res.text.includes('07152-255795')) {
    throw new Error('Test 7 failed: Expected receptionist phone numbers and handover');
  }
  console.log('✅ Test 7 Passed\n');

  // Test 8: Resume Assistant after Handover
  console.log('--- Test 8: Resume Assistant with "Menu" ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'Menu',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Is Handed Over after Menu:', session?.isHandedOver);
  if (session?.isHandedOver) {
    throw new Error('Test 8 failed: Assistant should have resumed');
  }
  console.log('✅ Test 8 Passed\n');

  // Test 9: Complete End-to-End Booking with Age in Dev Cortex PMS
  console.log('--- Test 9: Complete Booking with Age & Phone Verification in Dev Cortex PMS ---');
  await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber: '919876500001' });
  // Step 1: Select Language (English)
  await processIncomingMessage({ phoneNumber: '919876500001', type: 'text', text: 'Hi' });
  await processIncomingMessage({ phoneNumber: '919876500001', type: 'text', text: '1' }); // English

  // Step 2: Book with Doctor 1 (Dr. Vipeen Raut)
  await processIncomingMessage({ phoneNumber: '919876500001', type: 'text', text: '1' }); // Book appointment
  await processIncomingMessage({ phoneNumber: '919876500001', type: 'text', text: '1' }); // Dr. Vipeen Raut
  await processIncomingMessage({ phoneNumber: '919876500001', type: 'text', text: '2' }); // Tomorrow

  // Step 3: Select slot 1
  res = await processIncomingMessage({ phoneNumber: '919876500001', type: 'text', text: '1' });
  console.log('Slot chosen, prompt for name:\n', res.text);
  if (!res.text.includes('full name')) {
    throw new Error('Test 9 failed: Expected name prompt');
  }

  // Step 4: Enter Name
  res = await processIncomingMessage({ phoneNumber: '919876500001', type: 'text', text: 'Test Patient Sharma' });
  console.log('Name given, prompt for age:\n', res.text);
  if (!res.text.includes('age')) {
    throw new Error('Test 9 failed: Expected age prompt');
  }

  // Step 5: Enter Age (e.g. 42)
  res = await processIncomingMessage({ phoneNumber: '919876500001', type: 'text', text: '42' });
  console.log('Age given, prompt for gender:\n', res.text);
  if (!res.text.includes('gender')) {
    throw new Error('Test 9 failed: Expected gender prompt');
  }

  // Step 6: Enter Gender (1: Male)
  res = await processIncomingMessage({ phoneNumber: '919876500001', type: 'text', text: '1' });
  console.log('Gender given, prompt for address:\n', res.text);

  // Step 7: Enter Address (Wardha) -> Creates Booking!
  res = await processIncomingMessage({ phoneNumber: '919876500001', type: 'text', text: 'Wardha City' });
  console.log('Booking Confirmed Reply:\n', res.text);
  if (!res.text.includes('APPOINTMENT CONFIRMED') || !res.text.includes('42 years')) {
    throw new Error('Test 9 failed: Expected booking confirmation with 42 years');
  }

  // Verify directly in Dev Cortex PMS
  const pmsClient = getCortexConvexClient();
  const allAppts = await pmsClient.query('appointments:list');
  const found = allAppts.find((a) => a.phone === '9876500001' && a.name === 'Test Patient Sharma');
  if (!found) {
    throw new Error('Test 9 failed: Appointment was not found in Dev Cortex PMS appointments table!');
  }
  console.log('Found in Dev Cortex PMS:', {
    id: found._id,
    name: found.name,
    phone: found.phone,
    age: found.age,
    date: found.date,
    time: found.time,
    status: found.status,
  });
  if (found.age !== '42') {
    throw new Error(`Test 9 failed: Expected age '42', got '${found.age}'`);
  }
  console.log('✅ Test 9 Passed: Appointment successfully verified in Dev Cortex PMS!\n');

  console.log('🎉 ALL 9 TESTS PASSED SUCCESSFULLY! Cortex Hospital Assistant is fully operational.');
}

run().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
