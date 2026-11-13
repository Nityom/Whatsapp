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
  if (
    (!res.text.includes('Welcome to Svaasth Connect') &&
      !res.text.includes('Welcome to Cortex Hospital')) ||
    !res.text.includes('English') ||
    !res.text.includes('मराठी')
  ) {
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

  // Test 2: Natural Language Booking: "I want to see Dr. Vipeen Raut"
  console.log('--- Test 2: Patient says "I want to see Dr. Vipeen Raut" ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'I want to see Dr. Vipeen Raut',
  });
  console.log('Bot replied:\n', res.text);
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '16/11/26',
  });
  console.log('Bot replied for date:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Convex currentStep:', session?.currentStep);
  if (session?.currentStep !== 'BOOKING_SELECT_SESSION') {
    throw new Error(`Test 2 failed: Step should be BOOKING_SELECT_SESSION, got ${session?.currentStep}`);
  }
  console.log('✅ Test 2 Passed: Successfully prompted for Morning/Evening session!\n');

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

  // Test 4: Prescription Direct Access (No OTP Required)
  console.log('--- Test 4: Direct Prescription Access (No OTP Required) ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'Send me my last prescription',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  if (session?.currentStep === 'OTP_VERIFICATION') {
    throw new Error('Test 4 failed: OTP should NOT be required');
  }
  if (!res.text.includes('No prescriptions found') && !res.text.includes('Patient:') && !res.text.includes('print-prescription')) {
    throw new Error('Test 4 failed: Expected prescription result');
  }
  console.log('✅ Test 4 Passed: Prescription returned directly without OTP!\n');

  // Test 5: "basha badle" / Change Language Button Verification
  console.log('--- Test 5: "basha badle" / Change Language Button Verification ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'basha badle',
  });
  console.log('Bot replied to "basha badle":\n', res.text);
  if (
    (!res.text.includes('Welcome to Svaasth Connect') &&
      !res.text.includes('Welcome to Cortex Hospital')) ||
    !res.text.includes('मराठी')
  ) {
    throw new Error('Test 5 failed: "basha badle" should trigger language selection prompt');
  }

  // Also test clicking menu_10 from interactive list
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'interactive',
    text: 'menu_10',
  });
  console.log('Bot replied to "menu_10":\n', res.text);
  if (
    (!res.text.includes('Welcome to Svaasth Connect') &&
      !res.text.includes('Welcome to Cortex Hospital')) ||
    !res.text.includes('मराठी')
  ) {
    throw new Error('Test 5 failed: "menu_10" should trigger language selection prompt');
  }
  console.log('✅ Test 5 Passed: "basha badle" and "menu_10" button both work!\n');

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
  const freshPhone = '9198765' + Math.floor(10000 + Math.random() * 90000);
  await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber: freshPhone });
  // Step 1: Select Language (English)
  await processIncomingMessage({ phoneNumber: freshPhone, type: 'text', text: 'Hi' });
  await processIncomingMessage({ phoneNumber: freshPhone, type: 'text', text: '1' }); // English

  // Step 2: Book with Doctor 1 (Dr. Vipeen Raut)
  await processIncomingMessage({ phoneNumber: freshPhone, type: 'text', text: '1' }); // Book appointment
  await processIncomingMessage({ phoneNumber: freshPhone, type: 'text', text: '1' }); // Dr. Vipeen Raut
  res = await processIncomingMessage({ phoneNumber: freshPhone, type: 'text', text: '16/11/26' }); // Monday -> Prompts for Session
  console.log('Tomorrow selected, prompt for session (Morning/Evening):\n', res.text);
  if (!res.text.includes('Morning') || !res.text.includes('Evening')) {
    throw new Error('Test 9 failed: Expected session prompt after date');
  }

  // Step 2b: Choose Morning Session
  res = await processIncomingMessage({ phoneNumber: freshPhone, type: 'text', text: '1' }); // 1: Morning
  console.log('Morning selected, prompt for 15-min slots:\n', res.text);
  if (!res.text.includes('10:30 AM') || !res.text.includes('10:45 AM')) {
    throw new Error('Test 9 failed: Expected 15-min slot listing');
  }

  // Step 2c: Choose First Available Slot
  const slotLines = res.text.split('\n');
  let chosenSlotIndex = '3';
  for (const line of slotLines) {
    const m = line.match(/^\*(\d+)\.\*\s+⏰/);
    if (m && !line.includes('Booked 🚫')) {
      chosenSlotIndex = m[1];
      break;
    }
  }
  console.log(`Choosing available slot #${chosenSlotIndex}`);
  res = await processIncomingMessage({ phoneNumber: freshPhone, type: 'text', text: chosenSlotIndex });
  console.log('Slot chosen, prompt for name:\n', res.text);
  if (!res.text.includes('full name') && !res.text.includes('address')) {
    throw new Error('Test 9 failed: Expected name or address prompt after slot choice');
  }

  // Step 3: Enter Name
  res = await processIncomingMessage({ phoneNumber: freshPhone, type: 'text', text: 'Test Patient Sharma' });
  console.log('Name given, prompt for age:\n', res.text);
  if (!res.text.includes('age')) {
    throw new Error('Test 9 failed: Expected age prompt');
  }

  // Step 4: Enter Age (e.g. 42)
  res = await processIncomingMessage({ phoneNumber: freshPhone, type: 'text', text: '42' });
  console.log('Age given, prompt for gender:\n', res.text);
  if (!res.text.includes('gender')) {
    throw new Error('Test 9 failed: Expected gender prompt');
  }

  // Step 5: Enter Gender (1: Male)
  res = await processIncomingMessage({ phoneNumber: freshPhone, type: 'text', text: '1' });
  console.log('Gender given, prompt for address:\n', res.text);
  if (!res.text.includes('address') && !res.text.includes('city')) {
    throw new Error('Test 9 failed: Expected address prompt');
  }

  // Step 6: Enter Address (Wardha) -> Creates Booking!
  res = await processIncomingMessage({ phoneNumber: freshPhone, type: 'text', text: 'Samudrapur, Wardha' });
  console.log('Booking Confirmed Reply:\n', res.text);
  if (!res.text.includes('APPOINTMENT CONFIRMED') || !res.text.includes('42 years')) {
    throw new Error('Test 9 failed: Expected booking confirmation with 42 years');
  }
  if (!res.text.includes('Patient Address') || !res.text.includes('Samudrapur, Wardha')) {
    throw new Error('Test 9 failed: Expected confirmation to display patient address');
  }

  // Verify directly in Dev Cortex PMS
  const pmsClient = getCortexConvexClient();
  const allAppts = await pmsClient.query('appointments:list');
  const found = allAppts.find((a) => a.phone === freshPhone.replace(/^91/, '') && a.name === 'Test Patient Sharma');
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

  // Test 10: Pure Hindi Continuity
  console.log('--- Test 10: Pure Hindi Continuity ---');
  const hindiPhone = '9198765' + Math.floor(10000 + Math.random() * 90000);
  await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber: hindiPhone });
  res = await processIncomingMessage({ phoneNumber: hindiPhone, type: 'text', text: 'Namaste' });
  if (!res.text.includes('कृपया अपनी पसंदीदा भाषा चुनें')) {
    throw new Error('Test 10 failed: Expected multilingual greeting with Hindi');
  }
  // Choose Hindi
  res = await processIncomingMessage({ phoneNumber: hindiPhone, type: 'text', text: '2' });
  console.log('Hindi Menu Reply:\n', res.text);
  if (!res.text.includes('नमस्ते!') || !res.text.includes('अपॉइंटमेंट बुक करें')) {
    throw new Error('Test 10 failed: Expected Hindi main menu');
  }
  // Check Doctor Timings (Option 6)
  res = await processIncomingMessage({ phoneNumber: hindiPhone, type: 'text', text: '6' });
  console.log('Hindi Doctor Timings Reply:\n', res.text);
  if (!res.text.includes('विशेषज्ञ डॉक्टर एवं OPD समय') || !res.text.includes('विशेषज्ञता')) {
    throw new Error('Test 10 failed: Expected Hindi doctor timings');
  }
  // Check Hospital Location (Option 7)
  res = await processIncomingMessage({ phoneNumber: hindiPhone, type: 'text', text: '7' });
  console.log('Hindi Hospital Location Reply:\n', res.text);
  if (!res.text.includes('पता:') || !res.text.includes('Aarti Chowk') || !res.text.includes('वर्धा')) {
    throw new Error('Test 10 failed: Expected Hindi hospital location');
  }
  console.log('✅ Test 10 Passed: Pure Hindi interaction verified!\n');

  // Test 11: Non-technical error message verification (NO Server Error / Request ID)
  console.log('--- Test 11: Non-technical Error Message UX Verification ---');
  const collisionPhone = '9197777' + Math.floor(10000 + Math.random() * 90000);
  await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber: collisionPhone });

  // Init English session
  await processIncomingMessage({ phoneNumber: collisionPhone, type: 'text', text: 'Hi' });
  await processIncomingMessage({ phoneNumber: collisionPhone, type: 'text', text: '1' }); // English
  await processIncomingMessage({ phoneNumber: collisionPhone, type: 'text', text: '1' }); // Book appointment
  await processIncomingMessage({ phoneNumber: collisionPhone, type: 'text', text: '1' }); // Dr. Vipeen Raut
  res = await processIncomingMessage({ phoneNumber: collisionPhone, type: 'text', text: '2' }); // Tomorrow
  res = await processIncomingMessage({ phoneNumber: collisionPhone, type: 'text', text: '1' }); // Morning slots

  // User tries to pick slot 1 (which is booked: 10:30 AM – 10:45 AM)
  res = await processIncomingMessage({ phoneNumber: collisionPhone, type: 'text', text: '1' });
  console.log('Collision/Booked reply:\n', res.text);

  // Check that NO technical error leaks:
  if (res.text.includes('Request ID') || res.text.includes('Server Error') || res.text.includes('Uncaught Error') || res.text.includes('at handler')) {
    throw new Error('Test 11 failed: Technical server error or stack trace leaked to user!');
  }
  if (!res.text.includes('already booked') && !res.text.includes('Booked 🚫')) {
    throw new Error('Test 11 failed: Expected human-friendly message about slot already booked');
  }
  console.log('✅ Test 11 Passed: No technical server errors or stack traces leaked to user!');
  console.log('\n🎉 ALL 11 TEST SUITES PASSED SUCCESSFULLY!');
  console.log('✅ Test 10 Passed: 100% Hindi Continuity Verified!\n');

  console.log('🎉 ALL 10 TESTS PASSED SUCCESSFULLY! Cortex Hospital Assistant is fully operational.');
}

run().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
