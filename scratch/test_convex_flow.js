import { processIncomingMessage, getConvexClient } from '../lib/conversation.js';
import { api } from '../convex/_generated/api.js';

const TEST_PHONE = '919876543299'; // Dedicated test phone number

async function run() {
  console.log('🚀 STARTING COMPREHENSIVE CONVEX CHATBOT TEST SUITE\n');

  const convex = getConvexClient();

  // 0. Ensure clean slate for test phone
  console.log('--- Step 0: Clear session for test phone ---');
  await convex.mutation(api.sessions.clearWhatsAppSession, { phoneNumber: TEST_PHONE });
  let session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Initial step:', session?.currentStep || 'None');
  console.log('✅ Cleared\n');

  // Test 1: Send "Hi"
  console.log('--- Test 1: Customer says "Hi" ---');
  let res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'Hi',
  });
  console.log('Bot replied:\n', res.text);
  if (!res.text.includes('Welcome to ScootyGo Rentals!')) {
    throw new Error('Test 1 failed: Expected welcome message');
  }
  console.log('✅ Test 1 Passed\n');

  // Test 2: Customer selects "1" (Book a Scooty/Bike)
  console.log('--- Test 2: Customer sends "1" ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '1',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Convex currentStep:', session?.currentStep);
  if (session?.currentStep !== 'WAITING_FOR_DATE') {
    throw new Error('Test 2 failed: Step should be WAITING_FOR_DATE');
  }
  console.log('✅ Test 2 Passed\n');

  // Test 3: The exact user bug reproduction: Customer sends "20 October"
  console.log('--- Test 3: Customer sends "20 October" (Must NOT reset to welcome!) ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '20 October',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Convex currentStep:', session?.currentStep);
  console.log('Convex startDate:', session?.bookingDraft?.startDate);
  if (session?.currentStep !== 'WAITING_FOR_PICKUP_TIME' || session?.bookingDraft?.startDate !== '20 October') {
    throw new Error('Test 3 failed: Did not advance to WAITING_FOR_PICKUP_TIME or lost date');
  }
  if (res.text.includes('Welcome to ScootyGo Rentals')) {
    throw new Error('Test 3 failed: Regression! Reset to Welcome menu!');
  }
  console.log('✅ Test 3 Passed: Date saved in Convex and advanced to pickup time!\n');

  // Test 4: Customer sends pickup time "10:00 AM"
  console.log('--- Test 4: Customer sends "10:00 AM" ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '10:00 AM',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Convex currentStep:', session?.currentStep);
  if (session?.currentStep !== 'WAITING_FOR_RETURN_TIME') {
    throw new Error('Test 4 failed: Step should be WAITING_FOR_RETURN_TIME');
  }
  console.log('✅ Test 4 Passed\n');

  // Test 5: Customer sends return time "6:00 PM"
  console.log('--- Test 5: Customer sends "6:00 PM" ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '6:00 PM',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Convex currentStep:', session?.currentStep);
  if (session?.currentStep !== 'WAITING_FOR_LOCATION') {
    throw new Error('Test 5 failed: Step should be WAITING_FOR_LOCATION');
  }
  console.log('✅ Test 5 Passed\n');

  // Test 6: Customer sends text instead of location
  console.log('--- Test 6: Customer sends text instead of location ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'I am in Baner',
  });
  console.log('Bot replied:\n', res.text);
  if (!res.text.includes('Please share your current location')) {
    throw new Error('Test 6 failed: Should prompt for WhatsApp location attachment');
  }
  console.log('✅ Test 6 Passed\n');

  // Test 7: Customer shares WhatsApp location (Lat: 18.5620, Lon: 73.7900 - Baner vicinity)
  console.log('--- Test 7: Customer shares WhatsApp Location (18.5620, 73.7900) ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'location',
    latitude: 18.5620,
    longitude: 73.7900,
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Nearest Location in Convex session:', session?.bookingDraft?.locationName);
  console.log('Approx Distance in km:', session?.bookingDraft?.distanceKm);
  console.log('Convex currentStep:', session?.currentStep);
  if (session?.bookingDraft?.locationName !== 'Baner') {
    throw new Error('Test 7 failed: Nearest location should be Baner');
  }
  if (!res.text.includes('Baner') || !res.text.includes('Honda Activa 6G')) {
    throw new Error('Test 7 failed: Available vehicles for Baner not listed');
  }
  console.log('✅ Test 7 Passed: Nearest location identified via Haversine and available vehicles listed!\n');

  // Test 8: Invalid vehicle selection test
  console.log('--- Test 8: Customer selects invalid vehicle "9" ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '9',
  });
  console.log('Bot replied:\n', res.text);
  if (!res.text.includes('Sorry, this vehicle is currently unavailable')) {
    throw new Error('Test 8 failed: Should reject invalid vehicle');
  }
  console.log('✅ Test 8 Passed: Rejection message and relist returned\n');

  // Test 9: Valid vehicle selection (1 - Honda Activa 6G)
  console.log('--- Test 9: Customer selects vehicle "1" ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '1',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Convex currentStep:', session?.currentStep);
  console.log('Selected vehicle:', session?.bookingDraft?.vehicleName);
  if (session?.currentStep !== 'WAITING_FOR_NAME') {
    throw new Error('Test 9 failed: Step should be WAITING_FOR_NAME');
  }
  console.log('✅ Test 9 Passed\n');

  // Test 10: Customer enters Name "Nityom"
  console.log('--- Test 10: Customer enters name "Nityom" ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'Nityom',
  });
  console.log('Bot replied:\n', res.text);
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  console.log('Convex currentStep:', session?.currentStep);
  console.log('Customer ID in Convex session:', session?.customerId);
  if (session?.currentStep !== 'WAITING_FOR_CONFIRMATION') {
    throw new Error('Test 10 failed: Step should be WAITING_FOR_CONFIRMATION');
  }
  if (!res.text.includes('https://www.google.com/maps/search/?api=1&query=18.559,73.7868')) {
    throw new Error('Test 10 failed: Dynamic Google Maps link missing or incorrect');
  }
  console.log('✅ Test 10 Passed: Customer created/linked and Booking Summary with Google Maps link displayed!\n');

  // Test 11: Customer confirms with "YES"
  console.log('--- Test 11: Customer confirms with "YES" ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: 'YES',
  });
  console.log('Bot replied:\n', res.text);
  console.log('Native WhatsApp Location Pin:', res.nativeLocation);
  if (!res.text.includes('Booking Confirmed!') || !res.text.includes('Booking ID:')) {
    throw new Error('Test 11 failed: Confirmation text missing');
  }
  if (!res.nativeLocation || res.nativeLocation.name !== 'ScootyGo Rentals - Baner') {
    throw new Error('Test 11 failed: Native WhatsApp Location payload missing');
  }

  // Extract booking ID
  const match = res.text.match(/SG-2026-\d+/);
  if (!match) throw new Error('Could not find SG-2026-XXXX booking ID');
  const bookingId = match[0];
  console.log('Created Booking ID:', bookingId);

  // Verify in Convex database
  const createdBooking = await convex.query(api.bookings.getBooking, { bookingId });
  if (!createdBooking) throw new Error('Booking not found in Convex database!');
  console.log('Convex Booking Record:', {
    bookingId: createdBooking.bookingId,
    customerName: createdBooking.customerName,
    status: createdBooking.status,
    totalAmount: createdBooking.totalAmount,
  });
  console.log('✅ Test 11 Passed: Real booking created in Convex and native location sent!\n');

  // Test 12: Customer sends "3" (My Booking)
  console.log('--- Test 12: Customer asks for "3" (My Booking) ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '3',
  });
  console.log('Bot replied:\n', res.text);
  if (!res.text.includes(bookingId)) {
    throw new Error('Test 12 failed: Expected newly created booking ID in my bookings list');
  }
  console.log('✅ Test 12 Passed: My Bookings returned newly created Convex booking!\n');

  // Test 13: Customer sends "2" (Check Prices)
  console.log('--- Test 13: Customer asks for "2" (Check Prices) ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '2',
  });
  console.log('Bot replied:\n', res.text);
  if (!res.text.includes('ScootyGo Rental Prices') || !res.text.includes('Honda Activa 6G')) {
    throw new Error('Test 13 failed: Prices list missing');
  }
  console.log('✅ Test 13 Passed: Dynamic prices retrieved from Convex!\n');

  // Test 14: Customer sends "4" (Support)
  console.log('--- Test 14: Customer asks for "4" (Support) ---');
  res = await processIncomingMessage({
    phoneNumber: TEST_PHONE,
    type: 'text',
    text: '4',
  });
  console.log('Bot replied:\n', res.text);
  if (!res.text.includes('ScootyGo Support')) {
    throw new Error('Test 14 failed: Support message missing');
  }
  console.log('✅ Test 14 Passed\n');

  // Test 15: Cancellation test ("NO")
  console.log('--- Test 15: Cancellation test ("NO") ---');
  await processIncomingMessage({ phoneNumber: TEST_PHONE, type: 'text', text: '1' });
  await processIncomingMessage({ phoneNumber: TEST_PHONE, type: 'text', text: '25 October' });
  await processIncomingMessage({ phoneNumber: TEST_PHONE, type: 'text', text: '10:00 AM' });
  await processIncomingMessage({ phoneNumber: TEST_PHONE, type: 'text', text: '6:00 PM' });
  await processIncomingMessage({ phoneNumber: TEST_PHONE, type: 'location', latitude: 18.5620, longitude: 73.7900 });
  await processIncomingMessage({ phoneNumber: TEST_PHONE, type: 'text', text: '1' });
  await processIncomingMessage({ phoneNumber: TEST_PHONE, type: 'text', text: 'Nityom' });
  res = await processIncomingMessage({ phoneNumber: TEST_PHONE, type: 'text', text: 'NO' });
  console.log('Bot replied on cancel:\n', res.text);
  if (!res.text.includes('Booking cancelled')) {
    throw new Error('Test 15 failed: Cancellation message missing');
  }
  session = await convex.query(api.sessions.getWhatsAppSession, { phoneNumber: TEST_PHONE });
  if (session?.currentStep !== 'WELCOME') {
    throw new Error('Test 15 failed: Session should be reset to WELCOME');
  }
  console.log('✅ Test 15 Passed: Cancellation resets session cleanly in Convex!\n');

  console.log('🎉 ALL 15 END-TO-END CONVEX INTEGRATION TESTS PASSED PERFECTLY!');
}

run().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
