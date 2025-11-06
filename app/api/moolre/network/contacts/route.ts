import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for contacts (in production, use a database)
// This is a simple implementation - you can extend it to use a database
let contacts: Array<{ id: string; name: string; phone: string }> = [];

export async function GET() {
  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const newContact = {
      id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      phone: phone.replace(/\s/g, ''),
    };

    // Check if contact with same phone already exists
    const existingContact = contacts.find(c => c.phone === newContact.phone);
    if (existingContact) {
      return NextResponse.json(
        { success: false, error: 'Contact with this phone number already exists' },
        { status: 400 }
      );
    }

    contacts.push(newContact);
    return NextResponse.json({ success: true, contact: newContact });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const index = contacts.findIndex(c => c.id === id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    contacts.splice(index, 1);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete contact' },
      { status: 500 }
    );
  }
}

