import { getTickets } from '@/actions/ticket.actions';
import { logEvent } from '../../utils/sentry';
import Link from 'next/link';

const TicketsPage = async () => {
  const tickets = await getTickets();
  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-blue-600">
        Support Tickets
      </h1>
      {tickets.length === 0 ? (
        <p className="text-center text-gray-600">No Tickets Yet</p>
      ) : (
        <div className="space-y-4 max-w-3xl mx-auto">
          {tickets.map((ticket) => (
            <div key={ticket.id}>
              <h2>{ticket.subject}</h2>
              <div></div>
              <p className="text-gray-700">{ticket.description}</p>
              <p className="text-sm text-gray-500">
                Priority: {ticket.priority}
              </p>
              <Link
                href={`/tickets/${ticket.id}`}
                className="text-blue-600 hover:underline"
              >
                View Ticket
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketsPage;
