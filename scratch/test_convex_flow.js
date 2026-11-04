import { processIncomingMessage, getConvexClient } from '../lib/conversation.js';
import { api } from '../convex/_generated/api.js';

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

  // Test 1: Send "Hi" -> Section 15 Welcome Message
  console.log('--- Test 1: Patient says "Hi" (Section 15 Welcome Message) ---');
  let res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'Hi',
  });
  console.log('Bot replied:\n', res.text);
  if (!res.text.includes('Welcome to Cortex Hospital') || !res.text.includes('Book an Appointment')) {
    throw new Error('Test 1 failed: Expected Cortex Hospital welcome message');
  }
  console.log('✅ Test 1 Passed\n');

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

  // Test 6: Marathi Natural Language Query
  console.log('--- Test 6: Marathi Query: "मला डॉ. राऊत यांची वेळ हवी आहे" ---');
  await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber: TEST_PHONE });
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'मला डॉ. राऊत यांची वेळ हवी आहे',
  });
  console.log('Bot replied:\n', res.text);
  if (!res.text.includes('Dr. Vipeen Raut') && !res.text.includes('तारीख')) {
    throw new Error('Test 6 failed: Expected doctor selection or date prompt for Dr. Raut');
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

  console.log('🎉 ALL 8 TESTS PASSED SUCCESSFULLY! Cortex Hospital Assistant is fully operational.');
}

run().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
