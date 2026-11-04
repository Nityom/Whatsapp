import { NextResponse } from 'next/server';
import { CORTEX_HOSPITAL_CONFIG } from '@/lib/cortexConfig';

export async function GET() {
  const conf = CORTEX_HOSPITAL_CONFIG;
  return NextResponse.json({
    success: true,
    locations: [
      {
        id: 'cortex-hospital',
        name: conf.name,
        address: conf.address.fullFormatted,
        latitude: conf.coordinates.latitude,
        longitude: conf.coordinates.longitude,
        phone: conf.contacts.mobile,
        timings: conf.schedule.opdTimings,
        doctors: conf.doctors.map((d) => `${d.name} (${d.specialty})`),
      },
    ],
  });
}
