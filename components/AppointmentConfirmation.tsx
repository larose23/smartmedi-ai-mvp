import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/router';

interface AppointmentConfirmationProps {
  appointmentId: string;
  patientName: string;
  scheduledTime: string;
}

export const AppointmentConfirmation = ({
  appointmentId,
  patientName,
  scheduledTime,
}: AppointmentConfirmationProps) => {
  const router = useRouter();

  useEffect(() => {
    const showConfirmation = () => {
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <svg
                    className="h-10 w-10 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Appointment Booked!
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {patientName} scheduled for {new Date(scheduledTime).toLocaleString()}
                  </p>
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        router.push(`/patients-archive?appointment=${appointmentId}`);
                        toast.dismiss(t.id);
                      }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View in Archive
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        ),
        {
          duration: 5000,
          position: 'top-right',
        }
      );
    };

    showConfirmation();
  }, [appointmentId, patientName, scheduledTime, router]);

  return <Toaster />;
}; 