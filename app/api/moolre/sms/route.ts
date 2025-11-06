import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_MOORLE_API_BASE_URL || 'https://api.moolre.com';
const SMS_API_KEY = process.env.NEXT_PUBLIC_MOORLE_SMS_API_KEY;
const DEFAULT_SENDER_ID = process.env.NEXT_PUBLIC_MOORLE_SMS_SENDER_ID || 'Moolre';

export async function POST(request: NextRequest) {
  if (!SMS_API_KEY) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'SMS API configuration missing. Please check environment variables.' 
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { recipient, message, senderId, messages } = body;

    // handle both single and bulk sends
    let messagesArray: Array<{ recipient: string; message: string }> = [];

    if (messages && Array.isArray(messages)) {
      // bulk send
      messagesArray = messages.map((msg: { recipient: string; message: string }) => ({
        recipient: msg.recipient.replace(/\s/g, ''),
        message: msg.message,
      }));
    } else if (recipient && message) {
      // single send
      messagesArray = [{
        recipient: recipient.replace(/\s/g, ''),
        message: message,
      }];
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either (recipient and message) or messages array is required' 
        },
        { status: 400 }
      );
    }

    // moolre needs senderid, use default if not provided
    const requestBody: any = {
      type: 1,
      senderid: (senderId && senderId.trim()) ? senderId.trim() : DEFAULT_SENDER_ID,
      messages: messagesArray,
    };

    const endpoint = '/open/sms/send';
    console.log('Sending SMS request to:', `${API_BASE_URL}${endpoint}`);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-VASKEY': SMS_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('Response status:', response.status);

    // sometimes they return html errors instead of json, gotta handle that
    let data;
    const text = await response.text();
    
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      // not json, probably an error page
      return NextResponse.json(
        { 
          success: false, 
          error: `API returned non-JSON response: ${text.substring(0, 200)}`,
          status: response.status
        },
        { status: response.status || 500 }
      );
    }

    // status can be string or number, normalize it
    const statusValue = typeof data.status === 'string' ? parseInt(data.status) : data.status;
    
    if (statusValue === 1) {
      return NextResponse.json({
        success: true,
        ...data
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: data.message || 'Failed to send SMS',
          ...data
        },
        { status: response.status || 500 }
      );
    }
  } catch (error) {
    console.error('SMS API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

