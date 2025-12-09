import { redirect } from 'next/navigation';
import NewTicketForm from './ticket-form';

const NewTicketPage = async () => {
  
  return (
    <div className='min-h-screen bg-blue-50 flex items-center justify-center px-4'>
      <NewTicketForm />
    </div>
  );
};

export default NewTicketPage;