import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_MOORLE_API_BASE_URL || 'https://api.moolre.com';
const API_KEY = process.env.NEXT_PUBLIC_MOORLE_PRIVATE_API_KEY;
const USERNAME = process.env.NEXT_PUBLIC_MOORLE_USERNAME;
const YOUR_ACCOUNT_NUMBER = process.env.NEXT_PUBLIC_MOORLE_ACCOUNT_NUMBER;

export async function POST(request: NextRequest) {
  if (!API_KEY || !USERNAME || !YOUR_ACCOUNT_NUMBER) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'API configuration missing. Please check environment variables.' 
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { accountNumber, bankCode, channel, currency } = body;

    const requestBody: any = {
      type: 1,
      receiver: accountNumber,
      channel: channel.toString(),
      currency: currency,
      accountnumber: YOUR_ACCOUNT_NUMBER,
    };

    // add bank code only for bank transfers
    if (channel === 2 && bankCode) {
      requestBody.sublistid = bankCode;
    }

    const response = await fetch(`${API_BASE_URL}/open/transact/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-USER': USERNAME,
        'X-API-KEY': API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      },
      { status: 500 }
    );
  }
}

