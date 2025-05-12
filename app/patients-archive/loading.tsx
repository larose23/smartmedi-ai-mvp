export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Patient Archive</h1>
        </div>
      </div>
      <div className="flex justify-center my-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
      <div className="text-center text-gray-600">
        Loading patient archive...
      </div>
    </div>
  );
} 