'use server';
import { prisma } from '../../db/prisma';
import { revalidatePath } from 'next/cache';
import { logEvent } from '../../utils/sentry';
import { getAuthCookie, verifyAuthToken } from '../../lib/auth/auth';
import { getCurrentUser } from '../../lib/auth/current-user';

export async function createTicket(
  prevState: { success: boolean; message: string },
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      logEvent(
        'Unauthenticated create ticket attempted',
        'ticket',
        {},
        'warning'
      );
      return {
        success: false,
        message: 'You must be logged in to submit a ticket',
      };
    }
    const subject = formData.get('subject') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;

    if (!subject || !description || !priority) {
      logEvent(
        'Validation Error: Missing ticket fields',
        'ticket',
        { subject, description, priority },
        'warning'
      );
      return { success: false, message: 'All fields are required' };
    }

    // Get authenticated user id from cookie
    const token = await getAuthCookie();
    if (!token) {
      logEvent(
        'Unauthenticated: create ticket attempted',
        'ticket',
        {},
        'warning'
      );
      return {
        success: false,
        message: 'You must be logged in to submit a ticket',
      };
    }

    const payload = await verifyAuthToken(token);
    const userId = payload?.id;
    if (!userId) {
      logEvent(
        'Invalid auth token payload',
        'ticket',
        { tokenSnippet: token.slice(0, 10) },
        'error'
      );
      return { success: false, message: 'Authentication failed' };
    }

    // Create Ticket and associate with user
    const ticket = await prisma.ticket.create({
      data: {
        subject,
        description,
        priority,
        user: {
          connect: { id: user.id },
        },
      },
    });

    logEvent(
      `Ticket created successfully: ${ticket.id}`,
      'ticket',
      { ticketId: ticket.id },
      'info'
    );

    revalidatePath('/tickets');

    return { success: true, message: 'Ticket created successfully' };
  } catch (error) {
    logEvent(
      'An error occured while creating the ticket',
      'ticket',
      {
        formData: Object.fromEntries(formData.entries()),
      },
      'error',
      error
    );
    return {
      success: false,
      message: 'An error occurred while creating the ticket',
    };
  }
}

export async function getTickets() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      logEvent(
        'Unauthenticated get tickets attempted',
        'ticket',
        {},
        'warning'
      );
      return [];
    }
    const tickets = await prisma.ticket.findMany({
      where: { userId: user.id },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logEvent(
      'Fetched tickets successfully',
      'ticket',
      { count: tickets.length },
      'info'
    );

    return tickets;
  } catch (error) {
    logEvent(
      'An error occured while fetching tickets',
      'ticket',
      {},
      'error',
      error
    );

    return [];
  }
}

export async function getTicketById(id: string) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!ticket) {
      logEvent(
        `Ticket not found: ${id}`,
        'ticket',
        { ticketId: id },
        'warning'
      );
    }

    return ticket;
  } catch (error) {
    logEvent(
      'An error occured while fetching the ticket',
      'ticket',
      { ticketId: id },
      'error',
      error
    );
    return null;
  }
}

// Close ticket
export async function closeTicket(
  prevState: { success: boolean; message: string },
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const ticketId = Number(formData.get('ticketId'));

  if (!ticketId) {
    logEvent('Missing ticket ID', 'ticket', {}, 'warning');
    return { success: false, message: 'Ticket ID is required' };
  }

  const user = await getCurrentUser();
  if (!user) {
    logEvent(
      'Unauthenticated close ticket attempted',
      'ticket',
      { ticketId },
      'warning'
    );
    return {
      success: false,
      message: 'You must be logged in to close a ticket',
    };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket || ticket.userId !== user.id) {
    logEvent(
      'Unauthorized close ticket attempted',
      'ticket',
      { ticketId, userId: user.id },
      'warning'
    );
    return { success: false, message: 'Unauthorized to close this ticket' };
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'Closed' },
  });

  return { success: true, message: 'Ticket closed successfully' };
}
